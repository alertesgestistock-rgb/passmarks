import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';
import { resolveModel, type ModelConfig } from '../_shared/modelConfig.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ALLOWED_COUNTS = new Set([5, 10, 15]);

// Réserve prudente AVANT l'appel (l'IA n'a pas encore répondu) — proportionnelle
// au nombre de questions demandées ET au coût relatif du modèle choisi (via
// costMultiplier). La vraie facturation se fait APRÈS, au coût réel
// (usage.prompt_tokens/completion_tokens renvoyés par OpenRouter), via
// settle_ai_usage_cost — cf. migration 013_real_usage_billing.sql.
function reserveForCount(model: ModelConfig, count: number): number {
  const base = count <= 5 ? 1 : count <= 10 ? 2 : 3;
  return Math.max(1, Math.round(base * model.costMultiplier));
}

function jsonError(cors: Record<string, string>, message: string, status: number, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonError(cors, 'Method not allowed', 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(cors, 'Authentication required', 401);

  // Service role client — bypasse RLS, peut appeler settle_ai_usage_cost / deduct_tokens.
  // Même modèle d'accès que chat/index.ts (remplace le contournement JWT qui
  // était nécessaire côté Vercel, faute de service_role key configurée là-bas).
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

  const { subject, difficulty, count, aiModel } = body;
  if (!subject || !difficulty || !ALLOWED_COUNTS.has(count)) {
    return jsonError(cors, 'Invalid request parameters', 400);
  }

  // Choix de l'élève dans Settings ('precise' par défaut) — resolveModel()
  // ignore toute valeur qui n'est pas une des deux clés connues.
  const model = resolveModel(aiModel);
  // Traçabilité : voir la même ligne dans chat/index.ts.
  console.log('[quiz] model:', model.id, 'user:', user.id);

  // ── Vérif solde (lecture seule — pas de débit avant que l'IA réponde) ─────
  const reserve = reserveForCount(model, count);
  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const balance = (wallet as any)?.balance ?? 0;
  if (balance < reserve) return jsonError(cors, 'insufficient_tokens', 402, { balance });

  const systemPrompt = `Generate exactly ${count} multiple choice questions for ${difficulty} level ${subject}. Format your response as valid JSON only: { "questions": [{ "question": "Question text here", "correct_answer": "The correct answer", "incorrect_answers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"] }] }. Make questions challenging but fair.`;

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://passmarks.vercel.app',
        'X-Title': 'PassMark Quiz',
      },
      body: JSON.stringify({
        model: model.id,
        // 2000 suffit pour le JSON de questions avec Claude (pas de
        // raisonnement séparé). Pour un modèle à raisonnement obligatoire
        // (ex. Gemini), les tokens de réflexion consomment ce même budget
        // avant le JSON — on prend le plus large des deux pour ne pas
        // tronquer la sortie.
        max_tokens: Math.max(2000, model.maxTokens),
        ...(model.reasoningEffort ? { reasoning: { effort: model.reasoningEffort } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${count} ${difficulty} level ${subject} questions in the specified JSON format.` },
        ],
      }),
    });
  } catch (err) {
    // Aucun appel réussi → aucune facturation
    console.error('[quiz] fetch to OpenRouter failed:', (err as Error).message);
    return jsonError(cors, 'Could not generate quiz. Please try again.', 502);
  }

  if (!response.ok) {
    // OpenRouter a refusé — aucun jeton débité
    const errBody = await response.text().catch(() => '');
    console.error('[quiz] OpenRouter error:', response.status, errBody);
    return jsonError(cors, 'Could not generate quiz. Please try again.', 502);
  }

  const data = await response.json();
  let questions: unknown;
  try {
    const rawContent = data?.choices?.[0]?.message?.content ?? '';
    // Claude renvoie souvent le JSON entouré d'un bloc markdown (```json ... ```)
    // malgré la consigne "valid JSON only" — on retire les balises avant de parser.
    // Cause exacte du 502 constaté le 2026-09-01 (JSON.parse échouait sur le
    // caractère '`' en tout début de chaîne).
    const stripped = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(stripped);
    if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error('Invalid structure');
    questions = parsed.questions;
  } catch (err) {
    // Réponse reçue mais invalide — l'appel a quand même coûté un vrai $ chez
    // OpenRouter, donc on facture quand même au coût réel avant de renvoyer l'erreur.
    console.error('[quiz] failed to parse questions:', (err as Error).message, 'raw content:', JSON.stringify(data?.choices?.[0]?.message?.content));
    await settleQuizCost(supabase, user.id, model, data?.usage, reserve).catch(() => {});
    return jsonError(cors, 'Could not generate quiz. Please try again.', 502);
  }

  const balanceAfter = await settleQuizCost(supabase, user.id, model, data?.usage, reserve);

  return new Response(JSON.stringify({ questions, balance_after: balanceAfter }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

async function settleQuizCost(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  model: ModelConfig,
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
  reserve: number,
): Promise<number | null> {
  const promptTokens = Number(usage?.prompt_tokens) || 0;
  const completionTokens = Number(usage?.completion_tokens) || 0;

  if (promptTokens > 0 || completionTokens > 0) {
    const providerCostUsd =
      (promptTokens * model.pricing.input + completionTokens * model.pricing.output) / 1_000_000;
    const { data, error } = await supabase.rpc('settle_ai_usage_cost', {
      p_user_id: userId,
      p_provider_cost_usd: providerCostUsd,
      p_action: 'quiz_generation',
      p_min_tokens: 1, // jamais gratuit même si le coût réel calculé est infime
    });
    if (error) return null;
    return (data as any)?.[0]?.new_balance ?? null;
  }

  // Pas d'usage renvoyé par OpenRouter (cas rare) → repli sur la réserve forfaitaire.
  const { data: newBalance, error } = await supabase.rpc('deduct_tokens', {
    p_user_id: userId,
    p_cost: reserve,
    p_action: 'quiz_generation',
  });
  if (error) return null;
  return newBalance as number;
}
