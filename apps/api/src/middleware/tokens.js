import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY,
);

// costFn: number | (req) => number
// actionFn: string | (req) => string
export function requireTokens(costFn, actionFn) {
	return async (req, res, next) => {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const cost = typeof costFn === 'function' ? costFn(req) : costFn;
		const action = typeof actionFn === 'function' ? actionFn(req) : actionFn;

		try {
			const { data: newBalance, error } = await supabaseAdmin.rpc('deduct_tokens', {
				p_user_id: userId,
				p_cost: cost,
				p_action: action,
			});

			if (error) {
				if (error.message?.includes('insufficient_tokens')) {
					const { data: wallet } = await supabaseAdmin
						.from('token_wallets')
						.select('balance')
						.eq('user_id', userId)
						.single();
					return res.status(402).json({
						error: 'insufficient_tokens',
						balance: wallet?.balance ?? 0,
					});
				}
				logger.error(`RPC deduct_tokens error: ${error.message}`);
				throw error;
			}

			req.tokenCost = cost;
			req.balanceAfter = newBalance;
			next();
		} catch (err) {
			logger.error(`Token deduction failed: ${err.message}`);
			res.status(500).json({ error: 'Token system error' });
		}
	};
}

// Detect if the last user message contains an image
export function chatTokenCost(req) {
	const messages = req.body?.messages ?? [];
	const lastUser = [...messages].reverse().find(m => m.role === 'user');
	const hasImage = Array.isArray(lastUser?.content) &&
		lastUser.content.some(p => p.type === 'image');
	return hasImage ? 4 : 1;
}

export function chatActionType(req) {
	const messages = req.body?.messages ?? [];
	const lastUser = [...messages].reverse().find(m => m.role === 'user');
	const hasImage = Array.isArray(lastUser?.content) &&
		lastUser.content.some(p => p.type === 'image');
	return hasImage ? 'image' : 'message';
}
