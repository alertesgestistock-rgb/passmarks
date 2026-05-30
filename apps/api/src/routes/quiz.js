import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

router.post('/generate', async (req, res) => {
	const apiKey = process.env.OPENROUTER_API_KEY;

	if (!apiKey) {
		logger.error('OPENROUTER_API_KEY is not set in environment');
		return res.status(500).json({ error: 'Service not configured' });
	}

	const { subject, difficulty, count } = req.body;

	if (!subject || typeof subject !== 'string' || subject.trim() === '') {
		return res.status(400).json({ error: 'subject must be a non-empty string' });
	}

	if (!difficulty || typeof difficulty !== 'string' || difficulty.trim() === '') {
		return res.status(400).json({ error: 'difficulty must be a non-empty string' });
	}

	if (![5, 10, 15].includes(count)) {
		return res.status(400).json({ error: 'count must be 5, 10, or 15' });
	}

	const systemPrompt = `Generate exactly ${count} multiple choice questions for ${difficulty} level ${subject}. Format your response as valid JSON only: { "questions": [{ "question": "Question text here", "correct_answer": "The correct answer", "incorrect_answers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"] }] }. Make questions challenging but fair.`;

	logger.info(`Generating ${count} questions for ${difficulty} ${subject} via OpenRouter`);

	const response = await fetch(OPENROUTER_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
			'HTTP-Referer': 'https://passmark.app',
			'X-Title': 'PassMark Quiz',
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 2000,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: `Generate ${count} ${difficulty} level ${subject} questions in the specified JSON format.` },
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const responseText = data.choices[0].message.content;

	let parsedData;
	try {
		parsedData = JSON.parse(responseText);
	} catch (parseError) {
		logger.error('Failed to parse response as JSON:', parseError);
		throw new Error('Failed to parse quiz data from API');
	}

	if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
		throw new Error('Invalid quiz data structure from API');
	}

	res.json(parsedData.questions);
});

export default router;
