// Recherche web (Tavily) — outil partagé entre chat/index.ts (web, streaming)
// et aiTutor.ts (bot Telegram, non-streaming), pour ne jamais laisser les deux
// diverger sur la définition du tool ou la logique d'appel à Tavily.
//
// Optionnel : si aucune TAVILY_API_KEY n'est configurée côté secrets Supabase,
// le tool n'est simplement jamais proposé au modèle par les deux appelants —
// aucune régression tant que le secret n'est pas ajouté par l'utilisateur.

const TAVILY_URL = 'https://api.tavily.com/search';

// Plusieurs clés (comptes gratuits distincts) supportées : TAVILY_API_KEY,
// TAVILY_API_KEY_2, TAVILY_API_KEY_3 — chacune a son propre quota gratuit
// mensuel chez Tavily, donc en avoir plusieurs multiplie d'autant le volume
// gratuit disponible pour l'app. tavilySearch() essaie la première clé, et ne
// bascule sur la suivante que si Tavily répond "quota dépassé" (429) — jamais
// sur une autre erreur, pour ne pas masquer un vrai problème (clé invalide,
// panne Tavily) derrière un faux "ça a marché avec la 2e clé".
const TAVILY_API_KEYS = [
  Deno.env.get('TAVILY_API_KEY')?.trim(),
  Deno.env.get('TAVILY_API_KEY_2')?.trim(),
  Deno.env.get('TAVILY_API_KEY_3')?.trim(),
].filter((k): k is string => !!k);

export const TAVILY_CONFIGURED = TAVILY_API_KEYS.length > 0;

export const WEB_SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      "Search the live web for current, real-time, or recent information that isn't reliably known from training data alone — e.g. recent news, current events, today's exchange rates, or anything the student explicitly asks you to look up online. Do NOT use it for GCE syllabus content, standard formulas, past-paper questions, or well-established facts — only when a live/current answer is genuinely needed.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A concise, specific web search query.' },
      },
      required: ['query'],
    },
  },
};

export type ToolCallAcc = { id: string; name: string; args: string };
export type SearchOutcome =
  | { answer: string | null; results: { title: string; url: string; content: string }[] }
  | { error: string };

export async function tavilySearch(query: string): Promise<SearchOutcome> {
  if (TAVILY_API_KEYS.length === 0) return { error: 'Web search is not configured.' };

  let lastError: string | null = null;
  for (let i = 0; i < TAVILY_API_KEYS.length; i++) {
    try {
      const res = await fetch(TAVILY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEYS[i],
          query,
          search_depth: 'basic',
          max_results: 5,
          include_answer: true,
        }),
      });

      if (res.status === 429 && i < TAVILY_API_KEYS.length - 1) {
        // Quota mensuel de cette clé épuisé — bascule sur la suivante. Toute
        // autre erreur (clé invalide, panne Tavily) n'est PAS masquée par un
        // essai silencieux sur la clé suivante — elle remonte directement.
        console.error(`[webSearch] Tavily key #${i + 1} rate-limited, trying next key`);
        continue;
      }
      if (!res.ok) return { error: `Search request failed (${res.status})` };

      const data = await res.json();
      return {
        answer: typeof data?.answer === 'string' ? data.answer : null,
        results: Array.isArray(data?.results)
          ? data.results.slice(0, 5).map((r: any) => ({ title: r.title, url: r.url, content: r.content }))
          : [],
      };
    } catch (err) {
      lastError = (err as Error).message;
      console.error('[webSearch] tavily search error:', lastError);
    }
  }

  return { error: 'Search request failed.' };
}

/**
 * Transforme les tool_calls accumulés (bruts, format OpenAI) en message
 * assistant + messages "tool" (résultats Tavily exécutés), prêts à être
 * ajoutés à la conversation pour le tour de suivi. Partagé pour que le
 * format envoyé à OpenRouter ne diverge jamais entre les deux appelants.
 */
export async function resolveToolCalls(toolCalls: ToolCallAcc[]) {
  const toolCallDefs = toolCalls.map((tc) => ({
    id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
    type: 'function',
    function: { name: tc.name, arguments: tc.args || '{}' },
  }));
  const assistantToolCallMsg = { role: 'assistant', content: null, tool_calls: toolCallDefs };

  const toolResultMsgs: unknown[] = [];
  for (let i = 0; i < toolCalls.length; i++) {
    let query = '';
    try { query = JSON.parse(toolCalls[i].args || '{}')?.query ?? ''; } catch { /* args malformés */ }
    const result = query ? await tavilySearch(query) : { error: 'Missing search query.' };
    toolResultMsgs.push({ role: 'tool', tool_call_id: toolCallDefs[i].id, content: JSON.stringify(result) });
  }

  return { assistantToolCallMsg, toolResultMsgs };
}
