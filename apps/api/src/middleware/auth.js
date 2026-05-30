import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY,
);

export async function requireAuth(req, res, next) {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (!token) {
		return res.status(401).json({ error: 'Authentication required' });
	}

	try {
		const timeout = new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Auth timeout')), 5000)
		);
		const authCall = supabase.auth.getUser(token);
		const { data: { user }, error } = await Promise.race([authCall, timeout]);
		if (error || !user) {
			return res.status(401).json({ error: 'Invalid or expired session' });
		}
		req.user = user;
		next();
	} catch {
		return res.status(503).json({ error: 'Auth service unavailable. Try again.' });
	}
}
