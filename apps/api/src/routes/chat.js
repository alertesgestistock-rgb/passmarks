import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/message', async (req, res) => {
	const apiKey = req.headers['x-claude-api-key'];

	if (!apiKey) {
		return res.status(400).json({ error: 'Claude API key required' });
	}

	const { messages, system } = req.body;

	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: 'messages must be a non-empty array' });
	}

	logger.info(`Chat message, history length: ${messages.length}`);

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 1500,
			system,
			messages,
		}),
	});

	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		const status = response.status;
		if (status === 401) return res.status(401).json({ error: 'Invalid API key' });
		if (status === 429) return res.status(429).json({ error: 'Rate limit reached. Try again later.' });
		return res.status(status).json({ error: err.error?.message || 'Claude API error' });
	}

	const data = await response.json();
	res.json({ content: data.content[0].text });
});

export default router;
