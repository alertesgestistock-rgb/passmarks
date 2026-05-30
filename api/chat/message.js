import { verifyToken } from '../lib/auth.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const config = { runtime: 'edge' };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Balance-After',
  };
}

function jsonError(message, status, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function toOpenAIMessages(system, messages) {
  // cache_control marks the system prompt as cacheable — Anthropic reuses it
  // across requests instead of reprocessing it (90% cost saving on input tokens,
  // minimum 1024 tokens required for the cache to engage).
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
  return {
    cost: hasVision ? 4 : 1,
    actionType: hasVision ? 'image' : 'message',
  };
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
      // Fetch current balance to return to the frontend
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

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  // Auth — local JWT verification (<1ms, no network roundtrip)
  let userId;
  try {
    ({ userId } = await verifyToken(req.headers.get('Authorization')));
  } catch {
    return jsonError('Authentication required', 401);
  }

  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY)?.trim();
  if (!apiKey) return jsonError('Service not configured', 500);

  let body;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON body', 400); }

  const { messages, system } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonError('messages must be a non-empty array', 400);
  }

  // Token deduction — atomic via FOR UPDATE stored procedure
  const { cost, actionType } = detectCost(messages);
  let balanceAfter;
  try {
    const result = await deductTokens(userId, cost, actionType);
    if (!result.ok) {
      return jsonError('insufficient_tokens', 402, { balance: result.balance });
    }
    balanceAfter = result.balanceAfter;
  } catch {
    return jsonError('Token system error', 500);
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
    if (upstream.status === 429) return jsonError('Rate limit reached. Try again later.', 429);
    return jsonError(err.error?.message || 'AI service error', upstream.status);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Balance-After': String(balanceAfter),
    },
  });
}
