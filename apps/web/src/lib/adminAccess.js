// -----------------------------------------------------------------------------
// Garde d'accès admin — VERSION TEMPORAIRE / LOCALE UNIQUEMENT.
//
// Il n'existe pas encore de colonne `role` dans `profiles` côté Supabase (choix
// volontaire : aucune modif BDD tant que ce n'est pas validé). En attendant, on
// autorise l'accès à /boss via une simple liste d'emails en dur, connue
// uniquement du frontend.
//
// ⚠️ Ce n'est PAS une vraie sécurité : ça ne fait que cacher le lien dans l'UI.
// Tant qu'aucune donnée réelle n'est branchée sur /boss (uniquement des
// données factices pour l'instant), ce n'est pas un problème. Le jour où on
// branche de vraies données, il faudra impérativement :
//   1) ajouter une colonne `role` sur `profiles` (migration SQL dédiée),
//   2) activer des policies RLS qui vérifient ce rôle côté serveur,
// avant de faire confiance à ce fichier pour quoi que ce soit de sensible.
// -----------------------------------------------------------------------------

const ADMIN_EMAILS_ALLOWLIST = [
  'akamba932@gmail.com',
];

export function isAdminUser(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS_ALLOWLIST.includes(user.email.toLowerCase());
}
