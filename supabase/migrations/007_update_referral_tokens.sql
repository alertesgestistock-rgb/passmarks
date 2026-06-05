-- Update referral rewards: referrer gets 10 tokens, referred gets 5 tokens
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

  PERFORM credit_tokens(v_referrer_id, 10, NULL::UUID);
  PERFORM credit_tokens(p_referred_id, 5, NULL::UUID);

  RETURN jsonb_build_object('success', true);
END;
$$;
