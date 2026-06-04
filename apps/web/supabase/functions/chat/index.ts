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
      let deductPromise: Promise<{ data: unknown; error: unknown }> | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Sanitize: intercept OpenRouter error events before forwarding to client
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
            } catch { /* not JSON, skip */ }
          }

          // Débiter dès le 1er chunk — l'IA a commencé, on est facturé
          if (deductPromise === null) {
            deductPromise = supabase.rpc('deduct_tokens', {
              p_user_id: user.id,
              p_cost: cost,
              p_action: actionType,
            });
          }

          controller.enqueue(encoder.encode(sanitized));
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
      } catch (err: any) {
        // Si l'abort a coupé le stream en cours de lecture, envoyer une erreur au client
        const isTimeout = err?.name === 'AbortError' || err?.message?.includes('timeout');
        if (isTimeout && deductPromise === null) {
          // Aucun chunk reçu → pas de déduction, juste un message d'erreur
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'AI service timed out. Please try again.' })}\n\n`),
            );
          } catch { /* client déjà déconnecté */ }
        }
        // Si deductPromise !== null, l'IA avait commencé à répondre → l'élève est facturé
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
