-- ── Retire the legacy phone-bonus mechanisms ──────────────────────────────
-- Two old paths granted tokens for adding a phone number, both superseded by
-- the onboarding_rewards 'phone' task (+2 tokens, 010_onboarding_rewards.sql):
--
-- 1. Trigger on_phone_added -> handle_phone_bonus(): fired AFTER UPDATE on
--    profiles whenever phone went NULL -> NOT NULL, granting +25 tokens.
--    Left in place, this would double-credit alongside the new
--    claim_phone_bonus RPC (which also writes profiles.phone) the first
--    time a user adds their number: 2 + 25 = 27 tokens instead of 2.
-- 2. claim_phone_bonus(p_user_id uuid, p_phone text, p_phone_country text):
--    an older 20-token variant gated on token_wallets.phone_bonus_claimed,
--    no longer called from the frontend.

DROP TRIGGER IF EXISTS on_phone_added ON profiles;
DROP FUNCTION IF EXISTS handle_phone_bonus();
DROP FUNCTION IF EXISTS claim_phone_bonus(UUID, TEXT, TEXT);

-- token_wallets.phone_bonus_claimed is left in place (unused, historical) —
-- same reasoning as the token_action_type enum values in 009: no data loss,
-- just dead weight.
