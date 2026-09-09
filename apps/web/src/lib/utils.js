
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// "AI Tutor speed" choice from Settings ('fast'/'precise', see
// SettingsPage.jsx) — sent as `aiModel` on every /chat and /quiz request
// (AITutorPage.jsx, QuizSetupScreen.jsx). Wrapped in try/catch: localStorage
// can throw in some contexts (private browsing, blocked site data) — falls
// back to the edge functions' own default ('precise') rather than breaking
// the request. The edge functions never trust anything but these two keys
// (resolveModel() in supabase/functions/_shared/modelConfig.ts).
export function getPreferredAiModel() {
  try {
    const saved = JSON.parse(localStorage.getItem('passmark_settings') || '{}');
    return saved.aiModel === 'fast' ? 'fast' : 'precise';
  } catch {
    return 'precise';
  }
}
