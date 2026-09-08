import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';
import { SYSTEM_PROMPT } from './systemPrompt.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

// Prix réel Anthropic (repris de Raconty, qui utilise le même modèle) — $/1M tokens.
// Sert à calculer le vrai coût de chaque appel à partir de usage.prompt_tokens /
// usage.completion_tokens renvoyés par OpenRouter, au lieu du forfait fixe (1/2/4)
// qui ne reflète pas la vraie taille du message. Le forfait reste utilisé comme
// réserve prudente AVANT l'appel (voir detectCost plus bas) ; la vraie facturation
// se fait APRÈS, via settle_ai_usage_cost (cf. migration 013_real_usage_billing.sql).
const MODEL_PRICING_USD_PER_MTOK = { input: 3, output: 15 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonError(corsHeaders: Record<string, string>, message: string, status: number, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function detectCost(messages: unknown[], hasPdfPath = false): { cost: number; actionType: string } {
  if (hasPdfPath) return { cost: 4, actionType: 'pdf' };

  const lastUser = [...messages].reverse().find((m: any) => m.role === 'user') as any;

  // Vision in last message
  const hasVision =
    Array.isArray(lastUser?.content) &&
    lastUser.content.some((p: any) => p.type === 'image' || p.type === 'image_url');
  if (hasVision) return { cost: 4, actionType: 'image' };

  // PDF in last message
  const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
  if (text.startsWith('[PDF:')) return { cost: 4, actionType: 'pdf' };

  // Follow-up in a conversation with PDF/image context
  const hasPdfContext = (messages as any[]).some((m: any) => {
    if (m.role !== 'user') return false;
    if (typeof m.content === 'string' && m.content.startsWith('[PDF:')) return true;
    if (Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image' || p.type === 'image_url')) return true;
    return false;
  });
  if (hasPdfContext) return { cost: 2, actionType: 'message_with_context' };

  return { cost: 1, actionType: 'message' };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function toOpenAIMessages(messages: unknown[]) {
  const result: any[] = [
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

  // Cache breakpoint sur le dernier message de l'HISTORIQUE (donc juste avant le
  // nouveau message utilisateur, toujours le dernier élément de `result`) — tout
  // ce qui précède ce point (system prompt + tour(s) précédents) est alors lu
  // depuis le cache Anthropic (~10% du prix) au lieu d'être refacturé en entier
  // à chaque nouveau message de la conversation. Sans ça, seul le system prompt
  // profitait du cache. Pas de breakpoint à poser si la conversation vient de
  // commencer (result.length <= 2 : system + le tout premier message user).
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

  const { messages, pdfPath, currentPage } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonError(cors, 'messages must be a non-empty array', 400);
  }

  // ── Vérif solde (lecture seule — pas de débit avant que l'IA réponde) ─────
  const { cost, actionType } = detectCost(messages, !!pdfPath);
  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const balance = (wallet as any)?.balance ?? 0;
  if (balance < cost) {
    return jsonError(cors, 'insufficient_tokens', 402, { balance });
  }

  // ── Injection des pages PDF depuis le cache serveur ──────────────────────
  let finalMessages = messages;
  if (pdfPath && typeof pdfPath === 'string') {
    try {
      const { data: metaBlob } = await supabase.storage
        .from('pdf-page-cache')
        .download(`${pdfPath}/meta.json`);

      if (metaBlob) {
        const meta = JSON.parse(await metaBlob.text());
        const numPages: number = meta.numPages || 0;
        const page = Math.max(1, Math.min(currentPage || 1, numPages));

        // Fenêtre glissante [page-1, page, page+1, page+2], max 4 pages
        const pagesToFetch: number[] = [];
        for (let p = Math.max(1, page - 1); p <= Math.min(numPages, page + 2) && pagesToFetch.length < 4; p++) {
          pagesToFetch.push(p);
        }

        const imageContents: unknown[] = [];
        for (const p of pagesToFetch) {
          const { data: img } = await supabase.storage
            .from('pdf-page-cache')
            .download(`${pdfPath}/page-${p}.jpg`);
          if (img) {
            const b64 = arrayBufferToBase64(await img.arrayBuffer());
            imageContents.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
          }
        }

        if (imageContents.length > 0) {
          finalMessages = messages.map((m: any, i: number) => {
            if (i !== messages.length - 1 || m.role !== 'user') return m;
            const textParts = typeof m.content === 'string'
              ? [{ type: 'text', text: m.content }]
              : (Array.isArray(m.content) ? m.content : []);
            return { ...m, content: [...imageContents, ...textParts] };
          });
        }
      }
    } catch (err) {
      console.error('[chat] pdf injection error:', (err as Error).message);
    }
  }

  // ── Appel OpenRouter avec timeout strict ─────────────────────────────────
  // Sans timeout, si OpenRouter freeze le heartbeat masque le problème indéfiniment
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(new Error('OpenRouter timeout after 90s')), 90_000);

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER_URL, {
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
        // Demande à OpenRouter d'envoyer un dernier chunk avec le vrai usage
        // (prompt_tokens/completion_tokens) juste avant [DONE] — nécessaire pour
        // facturer au coût réel au lieu du forfait. Voir doc OpenRouter streaming :
        // https://openrouter.ai/docs/api_reference/streaming
        stream_options: { include_usage: true },
        messages: toOpenAIMessages(finalMessages),
      }),
      signal: ac.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('timeout');
    return jsonError(cors, isTimeout ? 'AI service timed out. Please try again.' : 'Failed to reach AI service.', 504);
  }

  if (!upstream.ok) {
    clearTimeout(timeoutId);
    const err = await upstream.json().catch(() => ({})) as any;
    console.error('[chat] upstream error:', upstream.status, err?.error?.message ?? err);
    if (upstream.status === 429) return jsonError(cors, 'Too many requests. Please wait a moment and try again.', 429);
    return jsonError(cors, 'AI service temporarily unavailable. Please try again in a few seconds.', 503);
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
      const dec = new TextDecoder();
      let started = false;
      let usage: { prompt_tokens: number; completion_tokens: number } | null = null;

      // Règlement de la facturation — appelée à la fin normale du stream ET en
      // cas d'interruption (abort/erreur en cours de route) dès que l'IA avait
      // commencé à répondre, pour ne jamais perdre la facturation d'un appel
      // déjà payé chez OpenRouter.
      const settleAndNotify = async () => {
        if (!started) return;
        let settleResult: { data: unknown; error: unknown } | null = null;
        if (usage) {
          const providerCostUsd =
            (usage.prompt_tokens * MODEL_PRICING_USD_PER_MTOK.input +
              usage.completion_tokens * MODEL_PRICING_USD_PER_MTOK.output) / 1_000_000;
          // Plancher conservé pour pdf/image/message_with_context (paiement déjà
          // réservé sur cette base) ; laissé à 0 pour un message texte simple afin
          // que l'accumulateur de reliquat joue pleinement son rôle.
          const minTokens = actionType === 'message' ? 0 : cost;
          settleResult = await supabase.rpc('settle_ai_usage_cost', {
            p_user_id: user.id,
            p_provider_cost_usd: providerCostUsd,
            p_action: actionType,
            p_min_tokens: minTokens,
          });
        } else {
          // Pas de chunk d'usage reçu (stream coupé avant la fin, ou OpenRouter
          // n'a pas renvoyé le chunk attendu) → repli sur le forfait, comme avant.
          settleResult = await supabase.rpc('deduct_tokens', {
            p_user_id: user.id,
            p_cost: cost,
            p_action: actionType,
          });
        }
        const { data, error: settleError } = settleResult;
        // settle_ai_usage_cost renvoie [{new_balance, tokens_charged}], deduct_tokens renvoie un integer
        const newBalance = Array.isArray(data) ? data[0]?.new_balance : data;
        if (!settleError && typeof newBalance === 'number') {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ b: newBalance })}\n\n`));
          } catch { /* client déjà déconnecté */ }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Sanitize: intercept OpenRouter error events before forwarding to client
          // + capture le chunk final d'usage réel (stream_options.include_usage)
          const raw = dec.decode(value, { stream: true });
          let sanitized = raw;
          for (const line of raw.split('\n')) {
            const clean = line.trim();
            if (!clean.startsWith('data: ') || clean === 'data: [DONE]') continue;
            try {
              const parsed = JSON.parse(clean.slice(6));
              if (parsed?.error) {
                console.error('[chat] stream error from upstream:', JSON.stringify(parsed.error));
                sanitized = sanitized.replace(
                  line,
                  `data: ${JSON.stringify({ error: 'AI service temporarily unavailable. Please try again in a few seconds.' })}`,
                );
              }
              // OpenRouter envoie un dernier chunk (choices vide) juste avant [DONE]
              // avec le vrai usage — cf. https://openrouter.ai/docs/api_reference/streaming
              if (parsed?.usage?.prompt_tokens != null) {
                usage = {
                  prompt_tokens: Number(parsed.usage.prompt_tokens) || 0,
                  completion_tokens: Number(parsed.usage.completion_tokens) || 0,
                };
              }
            } catch { /* not JSON, skip */ }
          }

          started = true;
          controller.enqueue(encoder.encode(sanitized));
        }

        await settleAndNotify();
      } catch (err: any) {
        // Si l'abort a coupé le stream en cours de lecture, envoyer une erreur au client
        const isTimeout = err?.name === 'AbortError' || err?.message?.includes('timeout');
        if (isTimeout && !started) {
          // Aucun chunk reçu → pas de déduction, juste un message d'erreur
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'AI service timed out. Please try again.' })}\n\n`),
            );
          } catch { /* client déjà déconnecté */ }
        } else if (started) {
          // L'IA avait commencé à répondre avant l'interruption → facturer quand
          // même (coût déjà engagé chez OpenRouter), sans faire échouer la requête.
          await settleAndNotify().catch((e) => console.error('[chat] settleAndNotify after interrupt failed:', e));
        }
      } finally {
        clearTimeout(timeoutId);
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
