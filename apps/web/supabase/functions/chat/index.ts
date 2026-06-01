import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';
import { SYSTEM_PROMPT } from './systemPrompt.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonError(corsHeaders: Record<string, string>, message: string, status: number, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function detectCost(messages: unknown[]): { cost: number; actionType: string } {
  const lastUser = [...messages].reverse().find((m: any) => m.role === 'user') as any;
  const hasVision =
    Array.isArray(lastUser?.content) &&
    lastUser.content.some((p: any) => p.type === 'image' || p.type === 'image_url');
  if (hasVision) return { cost: 4, actionType: 'image' };
  const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
  if (text.startsWith('[PDF:')) return { cost: 4, actionType: 'pdf' };
  return { cost: 1, actionType: 'message' };
}

function toOpenAIMessages(messages: unknown[]) {
  const result: unknown[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    },
  ];
  for (const msg of messages as any[]) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map((part: any) => {
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

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonError(cors, 'Method not allowed', 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(cors, 'Authentication required', 401);

  // Service role client — bypasse RLS, peut appeler deduct_tokens + credit_tokens
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonError(cors, 'Authentication required', 401);

  // ── Validation ────────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();
  if (!apiKey) return jsonError(cors, 'Service not configured', 500);

  let body: any;
  try { body = await req.json(); } catch { return jsonError(cors, 'Invalid JSON body', 400); }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonError(cors, 'messages must be a non-empty array', 400);
  }

  // ── Vérif solde (lecture seule — pas de débit avant que l'IA réponde) ─────
  const { cost, actionType } = detectCost(messages);
  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const balance = (wallet as any)?.balance ?? 0;
  if (balance < cost) {
    return jsonError(cors, 'insufficient_tokens', 402, { balance });
  }

  // ── Appel OpenRouter ──────────────────────────────────────────────────────
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
      max_tokens: 4000,
      stream: true,
      messages: toOpenAIMessages(messages),
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({})) as any;
    if (upstream.status === 429) return jsonError(cors, 'Rate limit reached. Try again later.', 429);
    return jsonError(cors, err.error?.message ?? 'AI service error', upstream.status);
  }

  // ── Stream SSE avec heartbeat ─────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat toutes les 15s — empêche MTN/Orange de couper la connexion mobile
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keep-alive\n\n')); } catch { /* connexion fermée */ }
      }, 15000);

      const reader = upstream.body!.getReader();
      let deductPromise: Promise<{ data: unknown; error: unknown }> | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Débiter dès le 1er chunk — l'IA a commencé, on est facturé
          if (deductPromise === null) {
            deductPromise = supabase.rpc('deduct_tokens', {
              p_user_id: user.id,
              p_cost: cost,
              p_action: actionType,
            });
          }

          controller.enqueue(value);
        }

        // Attendre la déduction et envoyer le nouveau solde
        if (deductPromise) {
          const { data: newBalance, error: deductError } = await deductPromise;
          if (!deductError && typeof newBalance === 'number') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ b: newBalance })}\n\n`),
            );
          }
        }
      } catch {
        // Stream interrompu — si la déduction était lancée, elle continue en arrière-plan
        // L'élève est facturé si l'IA avait commencé à répondre
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
