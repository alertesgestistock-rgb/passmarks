-- =============================================================================
-- Rôle admin sur profiles — adapté du même mécanisme sur Raconty
-- (apps/web/supabase/migrations/20260808000001_admin_role_on_profiles.sql).
--
-- ⚠️ PAS ENCORE EXÉCUTÉ EN BASE. À lancer par l'utilisateur lui-même via :
--   npm run supabase -- db query --linked --file "C:/Users/user/Documents/PassMark/Passmark_App/supabase/migrations/20260909180000_015_admin_role_on_profiles.sql"
-- (jamais `db push` — voir la note sur le mismatch de migrations local/remote).
--
-- Objectif : donner une base de vérité SERVEUR pour savoir qui est admin,
-- utilisée par is_admin(uuid) dans AdminStepUpGate.jsx (/boss).
-- =============================================================================

-- 1) Colonne role, additive et sans risque pour les lignes existantes
--    (défaut 'user' : personne ne devient admin par accident).
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

comment on column public.profiles.role is
  'Rôle applicatif : ''user'' (défaut) ou ''admin''. Utilisé par is_admin() et '
  'la policy admin ci-dessous. Non modifiable par l''utilisateur via le client '
  '(voir check_profile_role_unchanged() et la policy UPDATE recréée ici).';

-- 1bis) La policy "users_update_own" existante (001_init.sql) n'a pas de
--       with_check : sans le correctif ci-dessous, n'importe quel utilisateur
--       connecté pourrait s'auto-promouvoir admin avec
--       `supabase.from('profiles').update({ role: 'admin' })`. On ferme ce
--       trou avant que la colonne role n'existe jamais en prod.
create or replace function public.check_profile_role_unchanged(new_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role text;
begin
  select role into old_role from public.profiles where id = auth.uid();
  return new_role is not distinct from old_role;
end;
$$;

comment on function public.check_profile_role_unchanged(text) is
  'Empêche un utilisateur de modifier son propre role via un UPDATE client '
  '(PostgREST/supabase-js). Seul un accès qui bypass RLS (service_role, '
  '`supabase db query`) peut changer role — jamais le client.';

drop policy if exists "users_update_own" on public.profiles;
create policy "users_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and public.check_profile_role_unchanged(role)
  );

-- 2) Fonction utilitaire SECURITY DEFINER pour vérifier le rôle sans
--    provoquer de récursion RLS.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

comment on function public.is_admin(uuid) is
  'Vérifie si un utilisateur a le rôle admin. SECURITY DEFINER pour être '
  'utilisable dans des policies RLS sur profiles sans récursion.';

-- 3) Un admin peut lire tous les profils (nécessaire pour l'onglet
--    Utilisateurs de /boss). N'ouvre PAS l'écriture.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin((select auth.uid())));

-- 4) Attribution manuelle du rôle admin à ton compte.
--    Idempotent (peut être relancé sans effet de bord).
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and u.email = 'akamba932@gmail.com'
  and p.role <> 'admin';
