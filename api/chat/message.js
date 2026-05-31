import { createClient } from '@supabase/supabase-js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-Balance-After');
}

function toOpenAIMessages(system, messages) {
  const result = [{
    role: 'system',
    content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
  }];
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

function detectCost(messages) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const hasVision = Array.isArray(lastUser?.content) &&
    lastUser.content.some(p => p.type === 'image' || p.type === 'image_url');
  return { cost: hasVision ? 4 : 1, actionType: hasVision ? 'image' : 'message' };
}

async function deductTokens(userId, cost, actionType) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/deduct_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ p_user_id: userId, p_cost: cost, p_action: actionType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.message === 'insufficient_tokens') {
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${encodeURIComponent(userId)}&select=balance`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const wallets = await walletRes.json().catch(() => []);
      return { ok: false, balance: wallets[0]?.balance ?? 0 };
    }
    throw new Error('Token system error');
  }
  const balanceAfter = await res.json();
  return { ok: true, balanceAfter };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Authentication required' });

  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY)?.trim();
  if (!apiKey) return res.status(500).json({ error: 'Service not configured' });

  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  // Atomic token deduction via FOR UPDATE stored procedure
  const { cost, actionType } = detectCost(messages);
  let balanceAfter;
  try {
    const result = await deductTokens(user.id, cost, actionType);
    if (!result.ok) {
      return res.status(402).json({ error: 'insufficient_tokens', balance: result.balance });
    }
    balanceAfter = result.balanceAfter;
  } catch {
    return res.status(500).json({ error: 'Token system error' });
  }

  const upstream = await fetch(OPENROUTER_URL, {
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
      stream: true,
      messages: toOpenAIMessages(system, messages),
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    if (upstream.status === 429) return res.status(429).json({ error: 'Rate limit reached. Try again later.' });
    return res.status(upstream.status).json({ error: err.error?.message || 'AI service error' });
  }

  // Stream response back — Node.js Runtime, respects maxDuration: 60 in vercel.json
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('X-Balance-After', String(balanceAfter));
  res.flushHeaders();

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}
