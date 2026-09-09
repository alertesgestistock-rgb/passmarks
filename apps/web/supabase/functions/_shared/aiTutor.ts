// Non-streaming AI tutor call, for callers that need the whole answer at once
// (the Telegram bot: a chat bubble is sent complete, there is no SSE consumer).
//
// Deliberately mirrors chat/index.ts on everything that must not diverge:
// same model, same system prompt, same cost tiers, same real-usage billing via
// settle_ai_usage_cost. chat/index.ts stays untouched — it keeps its SSE path
// for the web app.

import { SYSTEM_PROMPT } from '../chat/systemPrompt.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TRANSCRIPTION_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
const MODEL = 'anthropic/claude-sonnet-4-5';
const MODEL_PRICING_USD_PER_MTOK = { input: 3, output: 15 };

// Speech-to-text for voice messages/audio files sent to the bot. Whisper
// Large V3 Turbo on OpenRouter — reuses the same OPENROUTER_API_KEY secret
// already configured, no new provider integration needed. Verified pricing
// and /audio/transcriptions request/response shape via OpenRouter's docs
// (2026-09-09): input_audio as base64 JSON, response.text + response.usage.
const TRANSCRIPTION_MODEL = 'openai/whisper-large-v3-turbo';
const TRANSCRIPTION_PRICING_USD_PER_MTOK = 3.33; // prompt-only pricing, no completion cost

// A voice question is billed like a typed one: cost scales with how much
// text it turned into, not a flat "voice message" tax. 400 chars/token
// mirrors a typical short GCE question (which floors at 1 token as plain
// text) — so a quick spoken question costs the same as typing it, and only
// a long dictated paragraph costs more, exactly like it would if typed out.
const VOICE_CHARS_PER_TOKEN = 400;

export function voiceFloorTokens(transcriptText: string): number {
  return Math.max(1, Math.ceil(transcriptText.length / VOICE_CHARS_PER_TOKEN));
}

export type TranscriptionResult =
  | { ok: true; text: string; costUsd: number }
  | { ok: false; reason: 'empty' | 'transcription_failed' | 'not_configured' };

/** Transcribes a voice message or audio file to text via OpenRouter. */
export async function transcribeVoice(audioBase64: string, format: string): Promise<TranscriptionResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  try {
    const res = await fetch(OPENROUTER_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
        'X-Title': 'PassMark AI Tutor (Telegram)',
      },
      body: JSON.stringify({
        model: TRANSCRIPTION_MODEL,
        input_audio: { data: audioBase64, format },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[aiTutor] transcription upstream error:', res.status, err.slice(0, 500));
      return { ok: false, reason: 'transcription_failed' };
    }

    const payload = await res.json();
    const text: string = (payload?.text ?? '').trim();
    if (!text) return { ok: false, reason: 'empty' };

    const totalTokens = Number(payload?.usage?.total_tokens ?? 0);
    const costUsd = (totalTokens * TRANSCRIPTION_PRICING_USD_PER_MTOK) / 1_000_000;

    return { ok: true, text, costUsd };
  } catch (err) {
    console.error('[aiTutor] transcription request failed:', (err as Error).message);
    return { ok: false, reason: 'transcription_failed' };
  }
}

// Abuse guard. The web app is throttled in practice by its UI; a bot chat is
// not — messages can be scripted — so AI actions are capped per rolling minute.
// Counted from token_transactions (one row per billed AI action), so no extra
// table is needed and the limit covers web + bot together.
export const MAX_AI_ACTIONS_PER_MINUTE = 8;

export type TutorMessage = {
  role: 'user' | 'assistant';
  content: string | unknown[];
};

export type TutorResult =
  | { ok: true; text: string; newBalance: number | null }
  | { ok: false; reason: 'insufficient_tokens'; balance: number }
  | { ok: false; reason: 'rate_limited' }
  | { ok: false; reason: 'ai_unavailable' | 'not_configured' };

function detectCost(messages: TutorMessage[]): { cost: number; actionType: string } {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user') as any;

  const hasVision =
    Array.isArray(lastUser?.content) &&
    lastUser.content.some((p: any) => p.type === 'image' || p.type === 'image_url');
  if (hasVision) return { cost: 4, actionType: 'image' };

  const hasImageContext = messages.some(
    (m: any) => m.role === 'user' && Array.isArray(m.content) &&
      m.content.some((p: any) => p.type === 'image' || p.type === 'image_url'),
  );
  if (hasImageContext) return { cost: 2, actionType: 'message_with_context' };

  return { cost: 1, actionType: 'message' };
}

function toOpenAIMessages(messages: TutorMessage[]) {
  const result: any[] = [
    { role: 'system', content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] },
  ];
  for (const msg of messages as any[]) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map((part: any) => {
        if (part.type === 'image' && part.source?.type === 'base64') {
          return { type: 'image_url', image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` } };
        }
        if (part.type === 'text') return { type: 'text', text: part.text };
        return part;
      });
      result.push({ role: msg.role, content: parts });
    }
  }

  // Cache breakpoint on the last history message, so prior turns are read from
  // Anthropic's cache (~10% of the price) instead of being re-billed in full.
  if (result.length > 2) {
    const lastHistoryMsg = result[result.length - 2];
    if (typeof lastHistoryMsg.content === 'string') {
      lastHistoryMsg.content = [{ type: 'text', text: lastHistoryMsg.content, cache_control: { type: 'ephemeral' } }];
    } else if (Array.isArray(lastHistoryMsg.content) && lastHistoryMsg.content.length > 0) {
      const lastPart = lastHistoryMsg.content[lastHistoryMsg.content.length - 1];
      if (lastPart && typeof lastPart === 'object') lastPart.cache_control = { type: 'ephemeral' };
    }
  }

  return result;
}

/**
 * Rolling-minute cap on billed AI actions, shared across web and bot.
 *
 * Only debits count: token_transactions also records credits (signup_bonus,
 * purchase, referral and onboarding bonuses), and those must not eat into a
 * student's question allowance — someone who just topped up would otherwise
 * start their next question already one slot down. Debits are negative
 * amounts, credits positive.
 */
export async function isRateLimited(supabase: any, userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from('token_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lt('amount', 0)
    .gte('created_at', oneMinuteAgo);

  if (error) {
    console.error('[aiTutor] rate limit check failed:', error);
    return false; // fail open — never block a paying user on our own bug
  }
  return (count ?? 0) >= MAX_AI_ACTIONS_PER_MINUTE;
}

export async function askTutor(
  supabase: any,
  userId: string,
  messages: TutorMessage[],
  // Set by the voice-message path: the char-based floor from
  // voiceFloorTokens() (replaces detectCost's tier) and the transcription's
  // own real cost (folded into the same debit as the answer, so a voice
  // question is one line in token_transactions, not two).
  voiceOverride?: { minTokens: number; transcriptionCostUsd: number },
): Promise<TutorResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  if (await isRateLimited(supabase, userId)) return { ok: false, reason: 'rate_limited' };

  const { cost, actionType } = voiceOverride
    ? { cost: voiceOverride.minTokens, actionType: 'voice' }
    : detectCost(messages);

  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  const balance = wallet?.balance ?? 0;
  if (balance < cost) return { ok: false, reason: 'insufficient_tokens', balance };

  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(new Error('OpenRouter timeout after 90s')), 90_000);

  let payload: any;
  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
        'X-Title': 'PassMark AI Tutor (Telegram)',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: toOpenAIMessages(messages),
      }),
      signal: ac.signal,
    });

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => '');
      console.error('[aiTutor] upstream error:', upstream.status, err.slice(0, 500));
      return { ok: false, reason: 'ai_unavailable' };
    }
    payload = await upstream.json();
  } catch (err) {
    console.error('[aiTutor] request failed:', (err as Error).message);
    return { ok: false, reason: 'ai_unavailable' };
  } finally {
    clearTimeout(timeoutId);
  }

  const text: string = payload?.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) return { ok: false, reason: 'ai_unavailable' };

  // Bill on real usage when OpenRouter reports it, exactly like the web path.
  let newBalance: number | null = null;
  const usage = payload?.usage;
  try {
    if (usage?.prompt_tokens != null) {
      const providerCostUsd =
        (Number(usage.prompt_tokens) * MODEL_PRICING_USD_PER_MTOK.input +
          Number(usage.completion_tokens ?? 0) * MODEL_PRICING_USD_PER_MTOK.output) / 1_000_000
        + (voiceOverride?.transcriptionCostUsd ?? 0);
      const { data } = await supabase.rpc('settle_ai_usage_cost', {
        p_user_id: userId,
        p_provider_cost_usd: providerCostUsd,
        p_action: actionType,
        p_min_tokens: actionType === 'message' ? 0 : cost,
      });
      newBalance = Array.isArray(data) ? data[0]?.new_balance ?? null : null;
    } else {
      const { data } = await supabase.rpc('deduct_tokens', {
        p_user_id: userId,
        p_cost: cost,
        p_action: actionType,
      });
      newBalance = typeof data === 'number' ? data : null;
    }
  } catch (err) {
    // The answer is already paid for upstream; never drop it over a billing hiccup.
    console.error('[aiTutor] billing failed:', err);
  }

  return { ok: true, text, newBalance };
}
