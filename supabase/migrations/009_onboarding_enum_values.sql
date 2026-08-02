-- ── New token_action_type values for the onboarding rewards system ────────
-- Must live in its own migration/transaction: Postgres forbids using a new
-- enum value in the same transaction that adds it, so 010_onboarding_rewards.sql
-- (which references these) has to run in a later migration.

ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'acquisition_source_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'phone_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'first_ai_question_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'referral_signup_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'first_token_purchase_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'first_paper_read_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'four_tools_bonus';
ALTER TYPE token_action_type ADD VALUE IF NOT EXISTS 'seven_day_streak_bonus';

-- Note: the old 'daily_bonus' value is left in place (Postgres can't drop enum
-- values, and historical token_transactions rows still reference it) — it will
-- simply never be written again now that claim_daily_tokens is dropped.
