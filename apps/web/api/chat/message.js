import { createClient } from '@supabase/supabase-js';

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
          return { type: 'image_url', image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` } };
        }
        if (part.type === 'text') return { type: 'text', text: part.text };
        return part;
      });
      result.push({ role: msg.role, content: parts });
    }
  }
  return result;
}

async function requireAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return res.status(500).json({ error: 'Service not configured' });

  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
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
      if (response.status === 429) return res.status(429).json({ error: 'Rate limit reached. Try again later.' });
      return res.status(response.status).json({ error: err.error?.message || 'AI service error' });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.choices[0].message.content });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach AI service. Please try again.' });
  }
}
