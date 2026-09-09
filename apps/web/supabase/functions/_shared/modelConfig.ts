// Configuration IA centralisée — un seul endroit pour définir les modèles
// disponibles pour chat/index.ts, quiz/index.ts et aiTutor.ts, et pour garder
// le tarif de facturation synchronisé avec ce qui est réellement appelé.
// Avant cette config, MODEL et MODEL_PRICING_USD_PER_MTOK étaient dupliqués
// dans 3 fichiers — un changement de modèle demandait de les modifier
// partout et risquait un tarif désynchronisé du vrai modèle appelé.
//
// Vérifié contre le catalogue OpenRouter en direct le 2026-09-09 (cf.
// conversation avec l'utilisateur) : valeurs de reasoning_effort disponibles
// pour ce modèle précis, support de cache_control par provider, et exclusion
// du tier "flex" par défaut (rien à configurer pour l'éviter, OpenRouter ne
// l'utilise que si on le demande explicitement via :floor/service_tier).
//
// Deux clés exposées côté élève dans Settings (voir SettingsPage.jsx) :
// 'precise' (Claude, par défaut) et 'fast' (Gemini, moins cher). L'élève
// choisit, le front envoie la clé choisie dans le corps de la requête
// (`aiModel`), resolveModel() la valide côté serveur — jamais fait confiance
// à un modèle arbitraire envoyé par le client, seulement à l'une des deux
// clés connues.

export type ModelKey = 'precise' | 'fast';

export type ModelConfig = {
  id: string;
  // $ / 1M tokens — sert au calcul du coût réel avant settle_ai_usage_cost.
  pricing: { input: number; output: number };
  // cache_control (breakpoint de cache prompt) n'est documenté fiable que
  // sur Anthropic, Google Vertex AI, Azure et Bedrock — PAS sur le provider
  // "Google AI Studio". gemini-3.1-pro-preview route sur les deux providers
  // Google via OpenRouter, donc pas moyen de garantir quel provider sert la
  // requête : on désactive cache_control plutôt que risquer un breakpoint
  // silencieusement ignoré selon le tirage.
  supportsCacheControl: boolean;
  // max_tokens envoyé à OpenRouter. Pour un modèle à raisonnement, les
  // tokens de réflexion consomment ce même budget avant la réponse visible —
  // laisser de la marge sous peine de réponse tronquée.
  maxTokens: number;
  // Effort de raisonnement (thinkingLevel côté Google) — obligatoire pour
  // gemini-3.1-pro-preview. Ses tokens sont facturés comme des tokens de
  // sortie (prix "output"), donc pas gratuits. 'low' pour un coût prévisible
  // au départ ; ne monter à 'medium'/'high' qu'après avoir comparé le vrai
  // coût et la vraie qualité en test (le nombre réel de tokens de réflexion
  // par niveau n'est pas documenté publiquement par Google/OpenRouter).
  reasoningEffort?: 'low' | 'medium' | 'high';
  // Multiplicateur appliqué aux planchers de jetons (BASE_FLOORS ci-dessous)
  // pour les actions PDF/image/suivi-de-contexte — reflète le vrai coût
  // relatif du modèle (Gemini ≈ 0.7x le coût de Claude en moyenne pondérée
  // input/output) plutôt que de garder le même forfait fixe peu importe le
  // modèle choisi par l'élève.
  costMultiplier: number;
};

export const MODELS: Record<ModelKey, ModelConfig> = {
  precise: {
    id: 'anthropic/claude-sonnet-4-5',
    pricing: { input: 3, output: 15 },
    supportsCacheControl: true,
    maxTokens: 4000,
    costMultiplier: 1,
  },
  fast: {
    id: 'google/gemini-3.1-pro-preview',
    pricing: { input: 2, output: 12 },
    supportsCacheControl: false,
    reasoningEffort: 'low',
    maxTokens: 6000,
    costMultiplier: 0.7,
  },
};

// Valeur par défaut si l'élève n'a jamais choisi (nouveaux comptes, bot
// Telegram qui n'expose pas ce réglage) ou si une clé invalide arrive.
export const DEFAULT_MODEL_KEY: ModelKey = 'precise';

// Point de bascule pour les chemins sans préférence par élève (le bot
// Telegram — pas de Settings côté bot pour l'instant). Piloté par une
// variable d'environnement pour pouvoir forcer 'fast' globalement sans
// redéployer, tout en gardant 'precise' par défaut.
const envKey = (Deno.env.get('AI_MODEL') || DEFAULT_MODEL_KEY).trim();
export const ACTIVE_MODEL: ModelConfig = MODELS[envKey as ModelKey] ?? MODELS[DEFAULT_MODEL_KEY];

/**
 * Résout la clé de modèle envoyée par le client vers sa config — ne fait
 * jamais confiance à autre chose qu'une des deux clés connues ('precise'/
 * 'fast'). Une valeur absente, invalide, ou falsifiée retombe sur le modèle
 * par défaut, jamais sur un id de modèle arbitraire.
 */
export function resolveModel(preference?: unknown): ModelConfig {
  if (preference === 'fast' || preference === 'precise') return MODELS[preference];
  return MODELS[DEFAULT_MODEL_KEY];
}

// Planchers de jetons de base (avant application du costMultiplier) pour les
// actions qui ne sont pas de simples messages texte — reprend les valeurs
// forfaitaires historiques de detectCost() dans chat/index.ts.
const BASE_FLOORS: Record<string, number> = {
  message_with_context: 2,
  image: 4,
  pdf: 4,
};

/**
 * Plancher de jetons pour une action donnée, ajusté au coût relatif du
 * modèle choisi. Toujours au moins 1 jeton — jamais gratuit même pour le
 * modèle le moins cher. Les messages texte simples n'ont pas de plancher
 * (0, cf. detectCost) : cette fonction ne s'applique qu'aux actions à
 * forfait (PDF, image, suivi de contexte).
 */
export function getFloor(model: ModelConfig, actionType: string): number {
  const base = BASE_FLOORS[actionType];
  if (base == null) return 0;
  return Math.max(1, Math.round(base * model.costMultiplier));
}
