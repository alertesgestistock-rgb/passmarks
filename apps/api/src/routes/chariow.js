import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY,
);

// Direct Chariow product page URLs — no API key required
const CHARIOW_PRODUCT_URLS = {
	'Mini':      'https://qtygsppu.mychariow.shop/prd_gtb491ym',
	'Starter':   'https://qtygsppu.mychariow.shop/prd_bshwvbhv',
	'Standard':  'https://qtygsppu.mychariow.shop/prd_ms38i0pm',
	'Intensif':  'https://qtygsppu.mychariow.shop/prd_if0k9j9i',
	'Exam Mode': 'https://qtygsppu.mychariow.shop/prd_iqi1c2o5',
};

// Chariow product ID → package name (used in webhook)
const PRODUCT_ID_TO_PACKAGE = {
	'prd_gtb491ym': 'Mini',
	'prd_bshwvbhv': 'Starter',
	'prd_ms38i0pm': 'Standard',
	'prd_if0k9j9i': 'Intensif',
	'prd_iqi1c2o5': 'Exam Mode',
};

// POST /chariow/checkout
// Body: { package_id }
// Returns: { checkout_url } — frontend redirects the user there
router.post('/checkout', requireAuth, async (req, res) => {
	const { package_id } = req.body;
	const userId = req.user.id;

	if (!package_id) return res.status(400).json({ error: 'package_id is required' });

	const { data: pkg, error: pkgError } = await supabaseAdmin
		.from('token_packages')
		.select('*')
		.eq('id', package_id)
		.eq('is_active', true)
		.single();

	if (pkgError || !pkg) return res.status(404).json({ error: 'Package not found' });

	const checkoutUrl = CHARIOW_PRODUCT_URLS[pkg.name];
	if (!checkoutUrl) {
		logger.error(`No Chariow URL configured for package: ${pkg.name}`);
		return res.status(503).json({ error: 'Payment not configured for this package' });
	}

	// Record a pending purchase so we have a trace
	await supabaseAdmin.from('token_purchases').insert({
		user_id: userId,
		package_id: pkg.id,
		tokens_granted: pkg.tokens,
		amount_paid: pkg.price_xaf,
		payment_method: 'chariow',
		status: 'pending',
	});

	res.json({ checkout_url: checkoutUrl });
});

// POST /chariow/webhook?secret=CHARIOW_WEBHOOK_SECRET
// Chariow calls this (Pulse) when a sale is completed
// Security: secret token in query parameter
router.post('/webhook', async (req, res) => {
	const secret = process.env.CHARIOW_WEBHOOK_SECRET;

	if (secret && req.query.secret !== secret) {
		logger.error('Chariow webhook: invalid secret');
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const event = req.body;
	logger.info(`Chariow pulse: ${JSON.stringify(event).slice(0, 300)}`);

	// Extract fields — Chariow pulse format is flexible
	const saleId    = event.id ?? event.sale_id ?? event.data?.id;
	const buyerEmail = event.customer_email ?? event.buyer_email ?? event.email
		?? event.data?.customer?.email ?? event.data?.email;
	const productId = event.product_id ?? event.data?.product_id ?? event.data?.product?.id;

	if (!saleId || !buyerEmail || !productId) {
		logger.warn('Chariow webhook: missing fields — logged for inspection', event);
		return res.status(200).json({ received: true });
	}

	// Idempotency: skip already-processed sales
	const { data: existing } = await supabaseAdmin
		.from('token_purchases')
		.select('id, status')
		.eq('chariow_sale_id', String(saleId))
		.maybeSingle();

	if (existing?.status === 'confirmed') {
		return res.status(200).json({ received: true });
	}

	// Find package from product ID
	const packageName = PRODUCT_ID_TO_PACKAGE[productId];
	if (!packageName) {
		logger.error(`Chariow webhook: unknown product ID ${productId}`);
		return res.status(200).json({ received: true });
	}

	const { data: pkg } = await supabaseAdmin
		.from('token_packages')
		.select('*')
		.eq('name', packageName)
		.single();

	if (!pkg) {
		logger.error(`Chariow webhook: DB package not found for ${packageName}`);
		return res.status(200).json({ received: true });
	}

	// Find PassMark user by buyer email
	const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
	const user = users?.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());

	if (!user) {
		logger.error(`Chariow webhook: no PassMark account for email ${buyerEmail}`);
		return res.status(200).json({ received: true });
	}

	try {
		// Insert confirmed purchase (upsert to avoid duplicates on retry)
		const { data: purchase } = await supabaseAdmin
			.from('token_purchases')
			.upsert({
				user_id: user.id,
				package_id: pkg.id,
				tokens_granted: pkg.tokens,
				amount_paid: pkg.price_xaf,
				payment_method: 'chariow',
				chariow_sale_id: String(saleId),
				status: 'confirmed',
				confirmed_at: new Date().toISOString(),
			}, { onConflict: 'chariow_sale_id' })
			.select()
			.single();

		// Credit tokens atomically
		await supabaseAdmin.rpc('credit_tokens', {
			p_user_id: user.id,
			p_amount:  pkg.tokens,
			p_purchase_id: purchase.id,
		});

		logger.info(`✓ ${pkg.tokens} tokens credited to ${buyerEmail} (${packageName})`);
		res.status(200).json({ received: true });
	} catch (err) {
		logger.error(`Chariow webhook failed: ${err.message}`);
		res.status(500).json({ error: 'Webhook processing failed' });
	}
});

export default router;
