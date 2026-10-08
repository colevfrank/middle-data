-- Optional slider follow-up after each scenario (gated by ENABLE_SCENARIO_SLIDER_FOLLOWUPS).
-- Columns stay nullable so disabling the feature leaves existing rows fine.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS s1_slider_value SMALLINT,  -- minimum $/month discount (0–20)
  ADD COLUMN IF NOT EXISTS s1_slider_none BOOLEAN,    -- declined on slider page
  ADD COLUMN IF NOT EXISTS s2_slider_value SMALLINT,  -- minimum % of revenue (0–99)
  ADD COLUMN IF NOT EXISTS s2_slider_none BOOLEAN;    -- declined on slider page
