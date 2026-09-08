// ── Feature flags ────────────────────────────────────────────────────────
// Un seul endroit pour activer/désactiver une fonctionnalité pas encore
// terminée partout où elle apparaît dans l'app (nav, quick actions, textes
// d'onboarding...). Pour la rendre visible à nouveau : repasser le flag à
// true ici, rien d'autre à toucher.

// Quiz generator : back-end (edge function `quiz` + facturation au coût
// réel) déjà en place, mais le parcours n'est pas jugé terminé côté produit.
// Caché de la nav, des quick actions du Home, et du texte d'onboarding
// "Explorer 4 outils" tant que ce flag est à false.
export const QUIZ_ENABLED = false;
