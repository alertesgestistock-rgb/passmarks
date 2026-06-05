-- ── Referral system ────────────────────────────────────────────────────────

-- 1. Add referral_code column to profiles (unique, set once)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Referrals table — one row per successful referral
CREATE TABLE IF NOT EXISTS referrals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)  -- each user can only be referred once
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 3. set_referral_code — called from the profile UI
--    Validates format, checks uniqueness, immutable once set.
CREATE OR REPLACE FUNCTION set_referral_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_existing TEXT;
BEGIN
  IF p_code !~ '^[a-zA-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code must be exactly 6 letters/numbers');
  END IF;

  SELECT referral_code INTO v_existing FROM profiles WHERE id = p_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code already set and cannot be changed');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = p_code AND id <> p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is already taken');
  END IF;

  UPDATE profiles SET referral_code = p_code WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'code', p_code);
END;
$$;

-- 4. apply_referral — called after signup when a code was entered
--    Credits 20 tokens to referrer, 10 tokens to the new user.
CREATE OR REPLACE FUNCTION apply_referral(p_code TEXT, p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = p_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use your own referral code');
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already used a referral code');
  END IF;

  INSERT INTO referrals (referrer_id, referred_id) VALUES (v_referrer_id, p_referred_id);

  PERFORM credit_tokens(v_referrer_id, 20, NULL::UUID);
  PERFORM credit_tokens(p_referred_id, 10, NULL::UUID);

  RETURN jsonb_build_object('success', true);
END;
$$;