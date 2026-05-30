import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

function toOpenAIMessages(system, messages) {
	const result = [{ role: 'system', content: system }];

	for (const msg of messages) {
		if (typeof msg.content === 'string') {
			result.push({ role: msg.role, content: msg.content });
		} else if (Array.isArray(msg.content)) {
			const parts = msg.content.map(part => {
				if (part.type === 'image' && part.source?.type === 'base64') {
					return {
						type: 'image_url',
						image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` },
					};
				}
				if (part.type === 'text') return { type: 'text', text: part.text };
				return part;
			});
			result.push({ role: msg.role, content: parts });
		}
	}

	return result;
}

router.post('/message', async (req, res) => {
	const apiKey = process.env.OPENROUTER_API_KEY?.trim();

	if (!apiKey) {
		logger.error('OPENROUTER_API_KEY is not set in environment');
		return res.status(500).json({ error: 'Service not configured' });
	}

	const { messages, system } = req.body;

	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: 'messages must be a non-empty array' });
	}

	logger.info(`Chat message via OpenRouter, history length: ${messages.length}`);

	try {
		const response = await fetch(OPENROUTER_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
				'HTTP-Referer': 'https://passmark.app',
				'X-Title': 'PassMark AI Tutor',
			},
			body: JSON.stringify({
				model: MODEL,
				max_tokens: 1500,
				messages: toOpenAIMessages(system, messages),
			}),
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			const status = response.status;
			logger.error(`OpenRouter error ${status}: ${JSON.stringify(err)}`);
			if (status === 429) return res.status(429).json({ error: 'Rate limit reached. Try again later.' });
			return res.status(status).json({ error: err.error?.message || 'AI service error' });
		}

		const data = await response.json();
		res.json({ content: data.choices[0].message.content });
	} catch (err) {
		logger.error(`OpenRouter fetch failed: ${err.message}`);
		res.status(502).json({ error: 'Could not reach AI service. Please try again.' });
	}
});

export default router;
