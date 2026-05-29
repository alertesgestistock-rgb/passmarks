import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
	const apiKey = req.headers['x-claude-api-key'];

	// Validate API key
	if (!apiKey) {
		return res.status(400).json({ error: 'Claude API key required' });
	}

	const { subject, difficulty, count } = req.body;

	// Validate subject
	if (!subject || typeof subject !== 'string' || subject.trim() === '') {
		return res.status(400).json({ error: 'subject must be a non-empty string' });
	}

	// Validate difficulty
	if (!difficulty || typeof difficulty !== 'string' || difficulty.trim() === '') {
		return res.status(400).json({ error: 'difficulty must be a non-empty string' });
	}

	// Validate count
	if (![5, 10, 15].includes(count)) {
		return res.status(400).json({ error: 'count must be 5, 10, or 15' });
	}

	const systemPrompt = `Generate exactly ${count} multiple choice questions for ${difficulty} level ${subject}. Format your response as valid JSON only: { "questions": [{ "question": "Question text here", "correct_answer": "The correct answer", "incorrect_answers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"] }] }. Make questions challenging but fair.`;

	logger.info(`Generating ${count} questions for ${difficulty} ${subject}`);

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 2000,
			system: systemPrompt,
			messages: [
				{
					role: 'user',
					content: `Generate ${count} ${difficulty} level ${subject} questions in the specified JSON format.`,
				},
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();

	const responseText = data.content[0].type === 'text' ? data.content[0].text : '';

	let parsedData;
	try {
		parsedData = JSON.parse(responseText);
	} catch (parseError) {
		logger.error('Failed to parse Claude response as JSON:', parseError);
		throw new Error('Failed to parse quiz data from Claude API');
	}

	if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
		throw new Error('Invalid quiz data structure from Claude API');
	}

	res.json(parsedData.questions);
});

export default router;
