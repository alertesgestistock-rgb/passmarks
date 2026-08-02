-- ── Past paper view tracking ──────────────────────────────────────────────
-- Lightweight log of "user opened this paper", used as an eligibility signal
-- for the onboarding rewards system (010_onboarding_rewards.sql).

CREATE TABLE IF NOT EXISTS paper_views (
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paper_id   UUID        NOT NULL REFERENCES gce_papers(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paper_id)
);

ALTER TABLE paper_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paper_views_select_own" ON paper_views
  FOR SELECT USING (auth.uid() = user_id);

-- log_paper_view — called from the past-papers reader on open.
-- ON CONFLICT DO NOTHING keeps it idempotent (re-opening a paper is a no-op).
CREATE OR REPLACE FUNCTION log_paper_view(p_paper_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO paper_views (user_id, paper_id)
  VALUES (auth.uid(), p_paper_id)
  ON CONFLICT (user_id, paper_id) DO NOTHING;
END;
$$;
