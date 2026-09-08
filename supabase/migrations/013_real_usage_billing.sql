-- ── Facturation IA au coût réel (façon Raconty) ─────────────────────────────
-- DÉJÀ APPLIQUÉE EN BASE (hors tracking supabase migrations — vérifié le
-- 2026-09-08 : settle_ai_usage_cost() et admin_ai_cost_summary tournent déjà
-- en prod avec exactement la signature ci-dessous, alors que cette migration
-- n'apparaît pas dans `list_migrations`). Ce fichier reste comme trace de
-- l'origine du changement, pas comme un script à exécuter — ne pas le
-- rejouer sans vérifier d'abord l'état réel de la base (cf. mémoire
-- "passmark-db-migration-mismatch" : les fichiers locaux ne sont pas fiables
-- pour savoir ce qui est vraiment appliqué côté remote).
--
-- Avant ce changement, chaque message/quiz coûtait un forfait fixe de jetons
-- (1/2/4) choisi à la main, sans lien avec le vrai coût OpenRouter — un message
-- de 20 mots et une dissertation de 3000 mots coûtaient pareil, et la
-- génération de quiz n'était pas du tout facturée (bug distinct, corrigé côté
-- code par api/quiz/generate.js).
--
-- Nouveau mécanisme : chaque appel IA ajoute son coût réel en dollars
-- (usage.prompt_tokens * prix_input + usage.completion_tokens * prix_output,
-- lu directement dans la réponse OpenRouter) à un reliquat par utilisateur.
-- On ne débite un jeton entier que quand le reliquat atteint USD_PER_TOKEN.
-- Le surplus repart au message suivant — jamais perdu, jamais arrondi à la
-- hausse à chaque appel.
--
-- USD_PER_TOKEN = 0,01 $ : calé sur le coût réel moyen estimé d'un message
-- texte simple avec Claude Sonnet 4.5 (system prompt caché + historique
-- raisonnable). À ajuster une fois que tu as les vrais chiffres du dashboard
-- OpenRouter (Raconty utilise 0,03 $ mais leurs modèles par défaut sont moins
-- chers que Claude — l'ancrage doit refléter TON usage réel, pas copier le
-- leur tel quel).

-- 1. Reliquat de coût réel par wallet, en dollars, non encore converti en jeton.
alter table public.token_wallets
  add column if not exists pending_cost_usd numeric(10,6) not null default 0;

comment on column public.token_wallets.pending_cost_usd is
  'Reliquat de coût IA réel (en $) en dessous du seuil d''un jeton entier (USD_PER_TOKEN), cumulé jusqu''au prochain palier. Voir settle_ai_usage_cost().';

-- 2. Nouveau type d'action pour la génération de quiz (jamais facturée avant).
alter type token_action_type add value if not exists 'quiz_generation';

-- 3. settle_ai_usage_cost — appelée APRÈS un appel IA réussi, avec le coût
--    réel en dollars calculé côté edge function à partir de la réponse
--    OpenRouter (usage.prompt_tokens / usage.completion_tokens réels, jamais
--    une estimation).
--
--    p_min_tokens : garde-fou optionnel (défaut 0) pour les actions où tu
--    veux conserver un plancher connu (ex. image/pdf) même si le calcul au
--    coût réel donnerait moins — laisse à 0 pour laisser jouer pleinement
--    l'accumulateur (recommandé pour les messages texte simples).
--
--    Le coût étant déjà engagé chez OpenRouter au moment de l'appel, cette
--    fonction NE BLOQUE JAMAIS sur solde insuffisant (contrairement à
--    deduct_tokens) — elle clamp à 0 si besoin plutôt que de faire échouer
--    la requête après coup. Le vrai garde-fou anti-abus reste la vérification
--    de solde AVANT l'appel IA (déjà en place côté edge function, avec le
--    forfait comme réserve prudente).
create or replace function public.settle_ai_usage_cost(
  p_user_id uuid,
  p_provider_cost_usd numeric,
  p_action token_action_type,
  p_ref uuid default null,
  p_min_tokens integer default 0,
  p_usd_per_token numeric default 0.01
) returns table (new_balance integer, tokens_charged integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance        integer;
  v_pending        numeric;
  v_new_pending    numeric;
  v_tokens         integer;
  v_new_balance    integer;
begin
  if auth.uid() is not null and auth.uid() != p_user_id then
    raise exception 'unauthorized';
  end if;

  select balance, pending_cost_usd into v_balance, v_pending
  from token_wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    -- Pas de wallet (ne devrait pas arriver, le trigger handle_new_profile_wallet
    -- en crée un à l'inscription) — rien à débiter, on renvoie 0 proprement.
    return query select 0, 0;
    return;
  end if;

  v_new_pending := coalesce(v_pending, 0) + greatest(p_provider_cost_usd, 0);
  v_tokens := floor(v_new_pending / p_usd_per_token)::integer;
  if p_min_tokens > v_tokens then
    v_tokens := p_min_tokens;
  end if;

  -- Jamais de solde négatif : le coût est déjà dépensé chez OpenRouter, on ne
  -- peut pas "annuler" l'appel — on débite au maximum ce qu'il reste.
  if v_tokens > v_balance then
    v_tokens := v_balance;
  end if;

  v_new_pending := v_new_pending - (v_tokens * p_usd_per_token);
  if v_new_pending < 0 then v_new_pending := 0; end if;

  update token_wallets
  set balance         = balance - v_tokens,
      total_spent      = total_spent + v_tokens,
      pending_cost_usd = v_new_pending,
      updated_at       = now()
  where user_id = p_user_id
  returning balance into v_new_balance;

  if v_tokens > 0 then
    insert into token_transactions (user_id, amount, action_type, reference_id, balance_after)
    values (p_user_id, -v_tokens, p_action, p_ref, v_new_balance);
  end if;

  return query select v_new_balance, v_tokens;
end;
$$;

-- Pas de REVOKE ici, volontairement : même modèle d'accès que deduct_tokens /
-- credit_tokens (SECURITY DEFINER, exécutable par défaut avec la clé anon) —
-- appelée depuis du code serveur de confiance (edge functions Deno + fonctions
-- Vercel), jamais directement depuis le navigateur. Le garde-fou reste le check
-- auth.uid() à l'intérieur de la fonction : NULL (clé anon serveur) → autorisé,
-- sinon doit correspondre à p_user_id.

-- 4. Vue admin basique (point 7 du plan) — coût réel accumulé vs jetons
--    effectivement débités, par utilisateur. Pas un dashboard React complet
--    (hors scope raisonnable ici) mais une visibilité immédiate en SQL :
--    SELECT * FROM admin_ai_cost_summary ORDER BY tokens_spent_est_usd DESC;
create or replace view public.admin_ai_cost_summary as
select
  u.id as user_id,
  au.email,
  w.balance,
  w.total_earned,
  w.total_spent,
  w.total_spent * 0.03 as tokens_spent_est_revenue_usd, -- prix moyen vendu/jeton (~$0.03, cf. packages)
  w.pending_cost_usd as unsettled_real_cost_usd,
  (select count(*) from token_transactions t where t.user_id = w.user_id and t.amount < 0) as ai_calls_billed
from token_wallets w
join public.profiles u on u.id = w.user_id
left join auth.users au on au.id = w.user_id;

comment on view public.admin_ai_cost_summary is
  'Vue de lecture admin : jetons dépensés par utilisateur, revenu estimé associé (au prix de vente moyen), et reliquat de coût réel non encore converti en jeton. À affiner avec les vrais prix par package si besoin de précision.';
