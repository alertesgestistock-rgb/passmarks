import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';
import { SYSTEM_PROMPT } from './systemPrompt.ts';
import { getFloor, resolveModel, type ModelConfig } from '../_shared/modelConfig.ts';
import { TAVILY_CONFIGURED, WEB_SEARCH_TOOL, resolveToolCalls, type ToolCallAcc } from '../_shared/webSearch.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonError(corsHeaders: Record<string, string>, message: string, status: number, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Le modèle est résolu par requête (choix de l'élève dans Settings, envoyé
// comme `aiModel` dans le corps — cf. resolveModel() qui ne fait confiance
// qu'à 'precise'/'fast', jamais à un id de modèle arbitraire). Les planchers
// PDF/image/suivi-de-contexte sont ajustés au coût relatif du modèle choisi
// via getFloor() — un message texte simple reste sans plancher (0), la
// facturation réelle (settle_ai_usage_cost) fait tout le travail.
function detectCost(model: ModelConfig, messages: unknown[], hasPdfPath = false): { cost: number; actionType: string } {
  if (hasPdfPath) return { cost: getFloor(model, 'pdf'), actionType: 'pdf' };

  const lastUser = [...messages].reverse().find((m: any) => m.role === 'user') as any;

  // Vision in last message
  const hasVision =
    Array.isArray(lastUser?.content) &&
    lastUser.content.some((p: any) => p.type === 'image' || p.type === 'image_url');
  if (hasVision) return { cost: getFloor(model, 'image'), actionType: 'image' };

  // PDF in last message
  const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
  if (text.startsWith('[PDF:')) return { cost: getFloor(model, 'pdf'), actionType: 'pdf' };

  // Follow-up in a conversation with PDF/image context
  const hasPdfContext = (messages as any[]).some((m: any) => {
    if (m.role !== 'user') return false;
    if (typeof m.content === 'string' && m.content.startsWith('[PDF:')) return true;
    if (Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image' || p.type === 'image_url')) return true;
    return false;
  });
  if (hasPdfContext) return { cost: getFloor(model, 'message_with_context'), actionType: 'message_with_context' };

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

function toOpenAIMessages(model: ModelConfig, messages: unknown[]) {
  // cache_control (breakpoint de cache prompt façon Anthropic) n'est fiable
  // que sur certains providers (cf. modelConfig.ts) — on ne le pose pas du
  // tout pour un modèle qui ne le supporte pas plutôt que d'envoyer un champ
  // silencieusement ignoré selon le provider tiré par OpenRouter.
  const useCache = model.supportsCacheControl;

  const result: any[] = [
    {
      role: 'system',
      content: useCache
        ? [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]
        : SYSTEM_PROMPT,
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

  if (!useCache) return result;

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

  const { messages, pdfPath, currentPage, aiModel } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return jsonError(cors, 'messages must be a non-empty array', 400);
  }

  // Choix de l'élève dans Settings ('precise' par défaut) — resolveModel()
  // ignore toute valeur qui n'est pas une des deux clés connues.
  const model = resolveModel(aiModel);
  // Traçabilité : rien d'autre (DB, transactions) ne conserve quel modèle a
  // servi un message donné — sans cette ligne, impossible de vérifier après
  // coup si le choix Fast/Precise a bien été respecté pour un utilisateur.
  console.log('[chat] model:', model.id, 'user:', user.id);

  // ── Vérif solde (lecture seule — pas de débit avant que l'IA réponde) ─────
  const { cost, actionType } = detectCost(model, messages, !!pdfPath);
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
  const apiMessages = toOpenAIMessages(model, finalMessages);

  function buildPayload(msgs: unknown[], withTools: boolean) {
    return {
      model: model.id,
      max_tokens: model.maxTokens,
      // Effort de raisonnement (Gemini) — ses tokens sont facturés comme
      // de la sortie, donc capturés par le calcul de coût réel plus bas
      // sans changement nécessaire côté facturation. Absent pour un modèle
      // qui n'en a pas besoin (ex. Claude).
      ...(model.reasoningEffort ? { reasoning: { effort: model.reasoningEffort } } : {}),
      stream: true,
      // Demande à OpenRouter d'envoyer un dernier chunk avec le vrai usage
      // (prompt_tokens/completion_tokens) juste avant [DONE] — nécessaire pour
      // facturer au coût réel au lieu du forfait. Voir doc OpenRouter streaming :
      // https://openrouter.ai/docs/api_reference/streaming
      stream_options: { include_usage: true },
      messages: msgs,
      // Web search n'est proposé au modèle que si au moins une TAVILY_API_KEY
      // est configurée ET qu'on veut bien l'offrir sur cet appel (jamais sur
      // le second tour, pour éviter une boucle de recherches en chaîne).
      ...(withTools && TAVILY_CONFIGURED ? { tools: [WEB_SEARCH_TOOL] } : {}),
    };
  }

  async function callOpenRouter(payload: unknown, signal: AbortSignal) {
    return fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
        'X-Title': 'PassMark AI Tutor',
      },
      body: JSON.stringify(payload),
      signal,
    });
  }

  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(new Error('OpenRouter timeout after 90s')), 90_000);

  let upstream: Response;
  try {
    upstream = await callOpenRouter(buildPayload(apiMessages, true), ac.signal);
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

      let started = false;
      const usageAcc = { prompt_tokens: 0, completion_tokens: 0 };
      let hasUsage = false;

      // Règlement de la facturation — appelée à la fin normale du stream ET en
      // cas d'interruption (abort/erreur en cours de route) dès que l'IA avait
      // commencé à répondre, pour ne jamais perdre la facturation d'un appel
      // déjà payé chez OpenRouter. usageAcc cumule les DEUX tours si une
      // recherche web a eu lieu (le second appel a aussi un coût réel).
      const settleAndNotify = async () => {
        if (!started) return;
        let settleResult: { data: unknown; error: unknown } | null = null;
        if (hasUsage) {
          const providerCostUsd =
            (usageAcc.prompt_tokens * model.pricing.input +
              usageAcc.completion_tokens * model.pricing.output) / 1_000_000;
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

      // Lit un stream OpenRouter ligne par ligne. Quand forwardContent=true, les
      // deltas de texte réel sont retransmis au client au format minimal déjà
      // attendu par le front ({choices:[{delta:{content}}]} — cf. AITutorPage.jsx).
      // Les deltas de tool_calls ne sont JAMAIS montrés au client (ce sont des
      // instructions internes, pas une réponse) : ils sont accumulés à part et
      // remontés une fois le tour terminé, avec finish_reason et l'usage réel.
      async function pumpStream(response: Response, forwardContent: boolean) {
        const reader = response.body!.getReader();
        const dec = new TextDecoder();
        let buf = '';
        const toolCallsAcc: Record<number, ToolCallAcc> = {};
        let finishReason: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? ''; // ligne potentiellement coupée entre deux lectures réseau

          for (const line of lines) {
            const clean = line.trim();
            if (!clean.startsWith('data: ') || clean === 'data: [DONE]') continue;
            let parsed: any;
            try { parsed = JSON.parse(clean.slice(6)); } catch { continue; }

            if (parsed?.error) {
              console.error('[chat] stream error from upstream:', JSON.stringify(parsed.error));
              if (forwardContent) {
                try {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ error: 'AI service temporarily unavailable. Please try again in a few seconds.' })}\n\n`,
                  ));
                } catch { /* client déjà déconnecté */ }
              }
              continue;
            }

            // OpenRouter envoie un dernier chunk (choices vide) juste avant [DONE]
            // avec le vrai usage — cf. https://openrouter.ai/docs/api_reference/streaming
            if (parsed?.usage?.prompt_tokens != null) {
              usageAcc.prompt_tokens += Number(parsed.usage.prompt_tokens) || 0;
              usageAcc.completion_tokens += Number(parsed.usage.completion_tokens) || 0;
              hasUsage = true;
            }

            const choice = parsed?.choices?.[0];
            if (choice?.finish_reason) finishReason = choice.finish_reason;

            const delta = choice?.delta;
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { id: '', name: '', args: '' };
                if (tc.id) toolCallsAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallsAcc[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCallsAcc[idx].args += tc.function.arguments;
              }
            } else if (delta?.content && forwardContent) {
              started = true;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: delta.content } }] })}\n\n`,
              ));
            }
          }
        }

        return { finishReason, toolCalls: Object.values(toolCallsAcc).filter((tc) => tc.name) };
      }

      try {
        // Premier tour : réponse directe, OU demande de recherche web (tool_calls).
        const first = await pumpStream(upstream, true);

        if (first.finishReason === 'tool_calls' && first.toolCalls.length > 0) {
          // Exécute chaque recherche demandée puis relance un second tour avec
          // les résultats injectés — c'est CE second tour qui produit la réponse
          // réellement visible par l'élève (le premier n'a émis que des
          // tool_calls, jamais de texte, donc rien n'a encore été streamé).
          const { assistantToolCallMsg, toolResultMsgs } = await resolveToolCalls(first.toolCalls);

          const ac2 = new AbortController();
          const timeoutId2 = setTimeout(() => ac2.abort(new Error('OpenRouter timeout after 60s')), 60_000);
          try {
            const followupMessages = [...apiMessages, assistantToolCallMsg, ...toolResultMsgs];
            const upstream2 = await callOpenRouter(buildPayload(followupMessages, false), ac2.signal);
            if (upstream2.ok) {
              await pumpStream(upstream2, true);
            } else {
              console.error('[chat] follow-up (post-search) upstream error:', upstream2.status);
              if (!started) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ error: 'AI service temporarily unavailable. Please try again in a few seconds.' })}\n\n`,
                ));
              }
            }
          } finally {
            clearTimeout(timeoutId2);
          }
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
