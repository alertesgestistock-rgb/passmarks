-- ── Onboarding rewards (replaces the old flat daily-token bonus) ──────────
-- 8 one-time tasks worth 20 tokens total, each claimable once, tracked
-- server-side so eligibility can't be spoofed from the browser.
--
-- Eligibility signals reuse PassMark's real activity tables. Note:
-- quiz_sessions / ai_sessions / ai_messages exist in the schema but are
-- currently unused (0 rows, nothing in the app writes to them) — quiz
-- completion is tracked in profiles.stats->>'quizzesCompleted' and AI Tutor
-- activity in conversations/messages, so those are used instead.

-- 1. profiles: onboarding-specific columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS self_reported_acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS self_reported_acquisition_detail TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acquisition_prompt_dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- 2. Guard: these columns (+ phone/phone_country) can only change via the
--    SECURITY DEFINER RPCs below, never a direct client-side profiles.update().
CREATE OR REPLACE FUNCTION protect_onboarding_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('role', true) IN ('anon', 'authenticated') THEN
    IF NEW.self_reported_acquisition_source IS DISTINCT FROM OLD.self_reported_acquisition_source
       OR NEW.self_reported_acquisition_detail IS DISTINCT FROM OLD.self_reported_acquisition_detail
       OR NEW.acquisition_answered_at IS DISTINCT FROM OLD.acquisition_answered_at
       OR NEW.acquisition_prompt_dismissed_at IS DISTINCT FROM OLD.acquisition_prompt_dismissed_at
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.phone_country IS DISTINCT FROM OLD.phone_country
    THEN
      RAISE EXCEPTION 'onboarding_fields_are_readonly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_onboarding_profile_fields ON profiles;
CREATE TRIGGER trg_protect_onboarding_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_onboarding_profile_fields();

-- 3. onboarding_rewards — one row per claimed task, UNIQUE(user_id, reward_type)
--    is what makes claiming idempotent/race-safe via ON CONFLICT DO NOTHING.
CREATE TABLE IF NOT EXISTS onboarding_rewards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type     TEXT        NOT NULL CHECK (reward_type IN (
                                'acquisition_source', 'phone', 'first_ai_question',
                                'referral_signup', 'first_token_purchase',
                                'first_paper_read', 'four_tools', 'seven_day_streak'
                              )),
  tokens_granted  INTEGER     NOT NULL CHECK (tokens_granted > 0),
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_type)
);

ALTER TABLE onboarding_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_rewards_select_own" ON onboarding_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- 4. grant_onboarding_reward — service_role-only ledger primitive.
--    Not directly callable by clients; only reached via claim_onboarding_reward
--    and the other RPCs below (all SECURITY DEFINER, so the privilege check
--    happens once at their own call site, not at this inner call).
CREATE OR REPLACE FUNCTION grant_onboarding_reward(
  p_user_id     UUID,
  p_reward_type TEXT,
  p_action      token_action_type
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount      INTEGER;
  v_reward_id   UUID;
  v_new_balance INTEGER;
BEGIN
  v_amount := CASE p_reward_type
    WHEN 'acquisition_source'   THEN 2
    WHEN 'phone'                THEN 2
    WHEN 'first_ai_question'    THEN 3
    WHEN 'referral_signup'      THEN 3
    WHEN 'first_token_purchase' THEN 2
    WHEN 'first_paper_read'     THEN 2
    WHEN 'four_tools'           THEN 3
    WHEN 'seven_day_streak'     THEN 3
    ELSE NULL
  END;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'unknown_reward_type';
  END IF;

  INSERT INTO onboarding_rewards (user_id, reward_type, tokens_granted)
  VALUES (p_user_id, p_reward_type, v_amount)
  ON CONFLICT (user_id, reward_type) DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  UPDATE token_wallets
  SET balance = balance + v_amount,
      total_earned = total_earned + v_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO token_transactions (user_id, amount, action_type, reference_id, balance_after)
  VALUES (p_user_id, v_amount, p_action, v_reward_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'tokens_added', v_amount, 'balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION grant_onboarding_reward(UUID, TEXT, token_action_type) FROM authenticated, anon;

-- 5. Streak helper — distinct AI-Tutor-active days (conversations/messages,
--    the tables that are actually populated), "gaps and islands" run length.
CREATE OR REPLACE FUNCTION _onboarding_streak(p_user_id UUID, p_timezone TEXT)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_longest INTEGER;
  v_current INTEGER;
  v_last_day DATE;
  v_today DATE;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::DATE;

  WITH activity_days AS (
    SELECT DISTINCT (m.created_at AT TIME ZONE p_timezone)::DATE AS day
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id AND m.role = 'user'
  ), grouped AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::INTEGER AS grp
    FROM activity_days
  ), runs AS (
    SELECT max(day) AS last_day, count(*)::INTEGER AS length
    FROM grouped GROUP BY grp
  )
  SELECT coalesce(max(length), 0),
         (SELECT last_day FROM runs ORDER BY last_day DESC LIMIT 1),
         (SELECT length FROM runs ORDER BY last_day DESC LIMIT 1)
  INTO v_longest, v_last_day, v_current
  FROM runs;

  -- Grace of 1 day: a streak isn't broken just because "today" hasn't happened yet.
  IF v_last_day IS NULL OR v_last_day < v_today - 1 THEN
    v_current := 0;
  END IF;

  RETURN QUERY SELECT coalesce(v_current, 0), coalesce(v_longest, 0);
END;
$$;

-- 6. get_onboarding_progress — single source of truth the frontend polls.
CREATE OR REPLACE FUNCTION get_onboarding_progress()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_timezone TEXT;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_quiz_done BOOLEAN;
  v_ai_done BOOLEAN;
  v_calendar_done BOOLEAN;
  v_papers_done BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT timezone INTO v_timezone FROM profiles WHERE id = v_uid;
  SELECT current_streak, longest_streak INTO v_current_streak, v_longest_streak
  FROM _onboarding_streak(v_uid, coalesce(v_timezone, 'UTC'));

  SELECT coalesce((stats->>'quizzesCompleted')::INTEGER, 0) > 0 INTO v_quiz_done
  FROM profiles WHERE id = v_uid;

  SELECT EXISTS (
    SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE c.user_id = v_uid AND m.role = 'user'
  ) INTO v_ai_done;

  SELECT EXISTS (SELECT 1 FROM calendar_events WHERE user_id = v_uid) INTO v_calendar_done;
  SELECT EXISTS (SELECT 1 FROM paper_views WHERE user_id = v_uid) INTO v_papers_done;

  RETURN jsonb_build_object(
    'acquisition_source', jsonb_build_object(
      'eligible', (SELECT acquisition_answered_at IS NOT NULL FROM profiles WHERE id = v_uid),
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'acquisition_source'),
      'tokens', 2
    ),
    'phone', jsonb_build_object(
      'eligible', (SELECT phone IS NOT NULL FROM profiles WHERE id = v_uid),
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'phone'),
      'tokens', 2
    ),
    'first_ai_question', jsonb_build_object(
      'eligible', v_ai_done,
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'first_ai_question'),
      'tokens', 3
    ),
    'referral_signup', jsonb_build_object(
      'eligible', EXISTS (SELECT 1 FROM referrals WHERE referrer_id = v_uid),
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'referral_signup'),
      'tokens', 3
    ),
    'first_token_purchase', jsonb_build_object(
      'eligible', EXISTS (SELECT 1 FROM token_purchases WHERE user_id = v_uid AND status = 'confirmed'),
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'first_token_purchase'),
      'tokens', 2
    ),
    'first_paper_read', jsonb_build_object(
      'eligible', v_papers_done,
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'first_paper_read'),
      'tokens', 2
    ),
    'four_tools', jsonb_build_object(
      'eligible', v_quiz_done AND v_ai_done AND v_calendar_done AND v_papers_done,
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'four_tools'),
      'tokens', 3
    ),
    'seven_day_streak', jsonb_build_object(
      'eligible', v_current_streak >= 7,
      'claimed', EXISTS (SELECT 1 FROM onboarding_rewards WHERE user_id = v_uid AND reward_type = 'seven_day_streak'),
      'tokens', 3,
      'current_streak', v_current_streak,
      'longest_streak', v_longest_streak
    )
  );
END;
$$;

-- 7. claim_onboarding_reward — re-verifies eligibility server-side (never
--    trusts the client) before crediting.
CREATE OR REPLACE FUNCTION claim_onboarding_reward(p_reward_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_timezone TEXT;
  v_current_streak INTEGER;
  v_eligible BOOLEAN := false;
  v_action token_action_type;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  CASE p_reward_type
    WHEN 'acquisition_source' THEN
      SELECT acquisition_answered_at IS NOT NULL INTO v_eligible FROM profiles WHERE id = v_uid;
      v_action := 'acquisition_source_bonus';
    WHEN 'phone' THEN
      SELECT phone IS NOT NULL INTO v_eligible FROM profiles WHERE id = v_uid;
      v_action := 'phone_bonus';
    WHEN 'first_ai_question' THEN
      SELECT EXISTS (
        SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
        WHERE c.user_id = v_uid AND m.role = 'user'
      ) INTO v_eligible;
      v_action := 'first_ai_question_bonus';
    WHEN 'referral_signup' THEN
      SELECT EXISTS (SELECT 1 FROM referrals WHERE referrer_id = v_uid) INTO v_eligible;
      v_action := 'referral_signup_bonus';
    WHEN 'first_token_purchase' THEN
      SELECT EXISTS (SELECT 1 FROM token_purchases WHERE user_id = v_uid AND status = 'confirmed') INTO v_eligible;
      v_action := 'first_token_purchase_bonus';
    WHEN 'first_paper_read' THEN
      SELECT EXISTS (SELECT 1 FROM paper_views WHERE user_id = v_uid) INTO v_eligible;
      v_action := 'first_paper_read_bonus';
    WHEN 'four_tools' THEN
      SELECT coalesce((stats->>'quizzesCompleted')::INTEGER, 0) > 0 INTO v_eligible FROM profiles WHERE id = v_uid;
      v_eligible := v_eligible
        AND EXISTS (SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = v_uid AND m.role = 'user')
        AND EXISTS (SELECT 1 FROM calendar_events WHERE user_id = v_uid)
        AND EXISTS (SELECT 1 FROM paper_views WHERE user_id = v_uid);
      v_action := 'four_tools_bonus';
    WHEN 'seven_day_streak' THEN
      SELECT timezone INTO v_timezone FROM profiles WHERE id = v_uid;
      SELECT current_streak INTO v_current_streak FROM _onboarding_streak(v_uid, coalesce(v_timezone, 'UTC'));
      v_eligible := v_current_streak >= 7;
      v_action := 'seven_day_streak_bonus';
    ELSE
      RAISE EXCEPTION 'unknown_reward_type';
  END CASE;

  IF NOT v_eligible THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_eligible');
  END IF;

  RETURN grant_onboarding_reward(v_uid, p_reward_type, v_action);
END;
$$;

-- 8. submit_acquisition_source — "Comment as-tu connu PassMark ?" modal
CREATE OR REPLACE FUNCTION submit_acquisition_source(
  p_source TEXT,
  p_other_text TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_source NOT IN ('youtube','google','facebook_instagram','whatsapp_telegram','tiktok','friend','other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
  END IF;

  IF p_source = 'other' AND coalesce(trim(p_other_text), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'detail_required');
  END IF;

  UPDATE profiles
  SET self_reported_acquisition_source = p_source,
      self_reported_acquisition_detail = left(p_other_text, 300),
      acquisition_answered_at = now(),
      timezone = coalesce(p_timezone, timezone)
  WHERE id = v_uid;

  RETURN grant_onboarding_reward(v_uid, 'acquisition_source', 'acquisition_source_bonus');
END;
$$;

-- 9. dismiss_acquisition_prompt — "later" button, only if not yet answered
CREATE OR REPLACE FUNCTION dismiss_acquisition_prompt(p_timezone TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE profiles
  SET acquisition_prompt_dismissed_at = now(),
      timezone = coalesce(p_timezone, timezone)
  WHERE id = v_uid AND acquisition_answered_at IS NULL;
END;
$$;

-- 10. claim_phone_bonus — phone-number capture step ("Compléter mon profil")
CREATE OR REPLACE FUNCTION claim_phone_bonus(p_phone TEXT, p_phone_country TEXT DEFAULT '237')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF coalesce(trim(p_phone), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_required');
  END IF;

  UPDATE profiles
  SET phone = p_phone, phone_country = coalesce(p_phone_country, phone_country)
  WHERE id = v_uid;

  RETURN grant_onboarding_reward(v_uid, 'phone', 'phone_bonus');
END;
$$;

-- 11. set_onboarding_timezone — called once per session with the browser's
--     IANA timezone so streak/day math uses the user's local calendar day.
CREATE OR REPLACE FUNCTION set_onboarding_timezone(p_timezone TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE profiles SET timezone = p_timezone WHERE id = auth.uid();
END;
$$;

-- 12. Retire the old flat daily-bonus system entirely.
DROP FUNCTION IF EXISTS claim_daily_tokens(UUID);
