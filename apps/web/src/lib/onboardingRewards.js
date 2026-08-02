// Kept in sync by convention with the CASE in grant_onboarding_reward()
// (supabase/migrations/010_onboarding_rewards.sql). Used as a display-only
// fallback before get_onboarding_progress responds.
export const ONBOARDING_REWARD_TOKENS = {
  acquisition_source: 2,
  phone: 2,
  first_ai_question: 3,
  referral_signup: 3,
  first_token_purchase: 2,
  first_paper_read: 2,
  four_tools: 3,
  seven_day_streak: 3,
};

export const ONBOARDING_REWARD_TOTAL = Object.values(ONBOARDING_REWARD_TOKENS).reduce((a, b) => a + b, 0);

export const ONBOARDING_REWARD_KEYS = Object.keys(ONBOARDING_REWARD_TOKENS);
