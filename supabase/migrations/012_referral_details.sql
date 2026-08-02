-- get_referral_details — returns the referrer's list of referred friends
-- (name, avatar, join date, whether they've made a confirmed token purchase).
-- profiles RLS only allows selecting your own row, so a plain client-side
-- join against other users' profiles would return nothing; this SECURITY
-- DEFINER function does the join server-side, scoped to auth.uid().
CREATE OR REPLACE FUNCTION get_referral_details()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_friends jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('friends', '[]'::jsonb);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'name', p.name,
      'avatar_url', p.avatar_url,
      'joined_at', r.created_at,
      'converted', EXISTS (
        SELECT 1 FROM token_purchases tp
        WHERE tp.user_id = r.referred_id AND tp.status = 'confirmed'
      )
    ) ORDER BY r.created_at DESC
  )
  INTO v_friends
  FROM referrals r
  JOIN profiles p ON p.id = r.referred_id
  WHERE r.referrer_id = v_uid;

  RETURN jsonb_build_object('friends', COALESCE(v_friends, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION get_referral_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_referral_details() TO authenticated;
