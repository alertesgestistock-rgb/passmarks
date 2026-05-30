import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY,
);

// Map package name → Chariow product ID (set in env)
const CHARIOW_PRODUCT_IDS = {
	'Starter':   process.env.CHARIOW_PRODUCT_STARTER,
	'Standard':  process.env.CHARIOW_PRODUCT_STANDARD,
	'Intensif':  process.env.CHARIOW_PRODUCT_INTENSIF,
	'Exam Mode': process.env.CHARIOW_PRODUCT_EXAM_MODE,
};

// POST /chariow/checkout
// Body: { package_id }
// Returns: { checkout_url }
router.post('/checkout', requireAuth, async (req, res) => {
	const { package_id } = req.body;
	const userId = req.user.id;

	if (!package_id) {
		return res.status(400).json({ error: 'package_id is required' });
	}

	const { data: pkg, error: pkgError } = await supabaseAdmin
		.from('token_packages')
		.select('*')
		.eq('id', package_id)
		.eq('is_active', true)
		.single();

	if (pkgError || !pkg) {
		return res.status(404).json({ error: 'Package not found' });
	}

	const productId = CHARIOW_PRODUCT_IDS[pkg.name];
	if (!productId) {
		logger.error(`No Chariow product ID configured for package: ${pkg.name}`);
		return res.status(503).json({ error: 'Payment not configured for this package' });
	}

	const apiKey = process.env.CHARIOW_API_KEY;
	if (!apiKey) {
		return res.status(503).json({ error: 'Payment service not configured' });
	}

	try {
		// Get user email for pre-filling checkout
		const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

		const chariowRes = await fetch('https://api.chariow.com/v1/checkout/sessions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				product_id: productId,
				customer_email: user?.email,
				metadata: { user_id: userId, package_id },
			}),
		});

		if (!chariowRes.ok) {
			const err = await chariowRes.json().catch(() => ({}));
			logger.error(`Chariow checkout error: ${JSON.stringify(err)}`);
			return res.status(502).json({ error: 'Could not create payment session' });
		}

		const { id: checkoutId, url: checkoutUrl } = await chariowRes.json();

		// Record pending purchase
		await supabaseAdmin.from('token_purchases').insert({
			user_id: userId,
			package_id: pkg.id,
			tokens_granted: pkg.tokens,
			amount_paid: pkg.price_xaf,
			payment_method: 'chariow',
			chariow_checkout_id: checkoutId,
			status: 'pending',
		});

		res.json({ checkout_url: checkoutUrl });
	} catch (err) {
		logger.error(`Chariow checkout failed: ${err.message}`);
		res.status(502).json({ error: 'Payment service unavailable' });
	}
});

// POST /chariow/webhook
// Called by Chariow when a sale completes
router.post('/webhook', async (req, res) => {
	const secret = process.env.CHARIOW_WEBHOOK_SECRET;

	// Verify HMAC signature if secret is configured
	if (secret) {
		const signature = req.headers['x-chariow-signature'] ?? req.headers['x-signature'];
		if (!signature) {
			return res.status(401).json({ error: 'Missing signature' });
		}
		const rawBody = JSON.stringify(req.body);
		const expected = crypto
			.createHmac('sha256', secret)
			.update(rawBody)
			.digest('hex');
		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
			logger.error('Chariow webhook signature mismatch');
			return res.status(401).json({ error: 'Invalid signature' });
		}
	}

	const event = req.body;
	logger.info(`Chariow webhook event: ${event.event ?? event.type}`);

	// Handle sale completed (Chariow uses 'sale.completed' or 'payment.success')
	const isSaleComplete = ['sale.completed', 'payment.success', 'sale.created'].includes(
		event.event ?? event.type
	);

	if (!isSaleComplete) {
		return res.status(200).json({ received: true });
	}

	const checkoutId = event.data?.checkout_id ?? event.checkout_id ?? event.data?.id;
	const saleId = event.data?.id ?? event.id;

	if (!checkoutId) {
		logger.error('Chariow webhook: missing checkout_id', event);
		return res.status(200).json({ received: true });
	}

	const { data: purchase, error } = await supabaseAdmin
		.from('token_purchases')
		.select('*')
		.eq('chariow_checkout_id', checkoutId)
		.maybeSingle();

	if (error || !purchase) {
		logger.error(`Chariow webhook: purchase not found for checkout ${checkoutId}`);
		return res.status(200).json({ received: true });
	}

	// Idempotency — already confirmed
	if (purchase.status === 'confirmed') {
		return res.status(200).json({ received: true });
	}

	try {
		// Mark purchase confirmed
		await supabaseAdmin
			.from('token_purchases')
			.update({
				status: 'confirmed',
				chariow_sale_id: String(saleId),
				confirmed_at: new Date().toISOString(),
			})
			.eq('id', purchase.id);

		// Credit tokens atomically
		await supabaseAdmin.rpc('credit_tokens', {
			p_user_id: purchase.user_id,
			p_amount: purchase.tokens_granted,
			p_purchase_id: purchase.id,
		});

		logger.info(`Tokens credited: ${purchase.tokens_granted} → user ${purchase.user_id}`);
		res.status(200).json({ received: true });
	} catch (err) {
		logger.error(`Chariow webhook processing failed: ${err.message}`);
		res.status(500).json({ error: 'Webhook processing failed' });
	}
});

export default router;
