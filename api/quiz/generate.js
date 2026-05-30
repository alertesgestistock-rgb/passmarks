import { verifyToken } from '../lib/auth.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyToken(req.headers.authorization);
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY)?.trim();
  if (!apiKey) return res.status(500).json({ error: 'Service not configured' });

  const { subject, difficulty, count } = req.body;
  if (!subject || !difficulty || ![5, 10, 15].includes(count)) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  const systemPrompt = `Generate exactly ${count} multiple choice questions for ${difficulty} level ${subject}. Format your response as valid JSON only: { "questions": [{ "question": "Question text here", "correct_answer": "The correct answer", "incorrect_answers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"] }] }. Make questions challenging but fair.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
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

    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('Invalid structure');
    return res.status(200).json(parsed.questions);
  } catch {
    return res.status(502).json({ error: 'Could not generate quiz. Please try again.' });
  }
}
