-- ============================================================
-- SECURITY FIXES — À appliquer dans Supabase Dashboard
-- SQL Editor → New query → coller tout → Run
-- ============================================================

-- ── Fix 1 : Bloquer credit_tokens depuis le navigateur ──────
-- Seul le serveur (service_role) peut créditer des tokens.
-- Un utilisateur F12 ou Postman ne peut plus s'en octroyer.
REVOKE EXECUTE ON FUNCTION public.credit_tokens(uuid, integer, uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_tokens(uuid, integer, uuid)
  FROM anon;


-- ── Fix 2 : deduct_tokens — vérifier l'identité du caller ──
-- Si appelé avec un JWT user (navigateur/Postman), on vérifie
-- que p_user_id correspond bien au compte connecté.
-- Si appelé depuis notre serveur (anon key sans JWT user),
-- auth.uid() est NULL → autorisé (le serveur vérifie lui-même).
CREATE OR REPLACE FUNCTION public.deduct_tokens(
  p_user_id   uuid,
  p_cost      integer,
  p_action    token_action_type,
  p_ref       uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance   integer;
  new_balance integer;
BEGIN
  -- Bloquer un user connecté qui essaierait de vider le wallet
  -- d'un autre utilisateur via Postman ou la console F12
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Verrou exclusif sur la ligne pour éviter la double-dépense
  SELECT balance INTO v_balance
  FROM token_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  IF v_balance < p_cost THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  UPDATE token_wallets
  SET
    balance     = balance - p_cost,
    total_spent = total_spent + p_cost,
    updated_at  = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;

  INSERT INTO token_transactions (user_id, amount, action_type, reference_id, balance_after)
  VALUES (p_user_id, -p_cost, p_action, p_ref, new_balance);

  RETURN new_balance;
END;
$$;


-- ── Fix 3 : token_wallets — lecture seule pour les users ────
-- Supprime toutes les policies existantes sur token_wallets
-- et en crée une seule : SELECT uniquement.
-- INSERT/UPDATE/DELETE ne passent QUE par les fonctions
-- SECURITY DEFINER (credit_tokens, deduct_tokens) côté serveur.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'token_wallets' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.token_wallets', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "wallets_select_own"
  ON public.token_wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Vérification : affiche les policies actives sur token_wallets
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'token_wallets' AND schemaname = 'public';
