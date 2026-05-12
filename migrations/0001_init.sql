-- Survey experiment schema

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,

  -- Prolific identifiers
  prolific_pid TEXT UNIQUE NOT NULL,
  study_id TEXT,
  session_id TEXT,

  -- Server-side session
  session_token UUID UNIQUE NOT NULL,

  -- Condition assignment (server-only)
  data_type SMALLINT NOT NULL CHECK (data_type BETWEEN 1 AND 11),
  use_case CHAR(2) NOT NULL CHECK (use_case IN ('B1','B2')),

  -- Randomized orderings
  scenario_order INT[] NOT NULL,
  supp_question_order INT[] NOT NULL,
  attitude_item_order INT[] NOT NULL,
  s4_option_order INT[] NOT NULL,
  comp_model_order INT[] NOT NULL,
  attention_check_position SMALLINT NOT NULL,

  -- State machine
  current_screen TEXT NOT NULL DEFAULT 'consent',

  -- Screen 3: Learn more
  learn_more_clicked BOOLEAN DEFAULT FALSE,
  learn_more_click_ts TIMESTAMPTZ,

  -- Screen 4: Comprehension (3 T/F items per COMPREHENSION.md)
  comp_check_1_correct BOOLEAN,
  comp_check_2_correct BOOLEAN,
  comp_check_3_correct BOOLEAN,
  comp_check_retry BOOLEAN DEFAULT FALSE,

  -- Consent
  consent_age_ok BOOLEAN,
  consent_read BOOLEAN,
  consent_participate BOOLEAN,

  -- Scenario 1: discount valuation
  s1_share_1off BOOLEAN,
  s1_share_3off BOOLEAN,
  s1_share_5off BOOLEAN,
  s1_share_8off BOOLEAN,
  s1_share_12off BOOLEAN,
  s1_share_20off BOOLEAN,
  s1_none BOOLEAN,

  -- Scenario 2: feature tradeoff
  s2_response TEXT CHECK (s2_response IN ('yes','no','not_sure')),

  -- Scenario 3: data marketplace
  s3_share_10 BOOLEAN,
  s3_share_50 BOOLEAN,
  s3_share_90 BOOLEAN,
  s3_none BOOLEAN,
  s3_reason TEXT,
  s3_reason_other TEXT,

  -- Supplementary
  supp_sensitivity SMALLINT,           -- S1: 1-5
  supp_harm SMALLINT,                  -- S2: 1-5
  supp_compensation_feel TEXT,         -- S3
  supp_primary_concern TEXT,           -- S4
  supp_service_improvement SMALLINT,   -- S5: 1-5
  supp_understanding SMALLINT,         -- S6: 1-5
  supp_take_back TEXT,                 -- S7
  supp_value_to_companies SMALLINT,    -- S8: 1-5
  supp_currently_share TEXT,           -- S9

  -- Compensation rankings (1-5 unique)
  rank_per_transaction SMALLINT,
  rank_royalty SMALLINT,
  rank_subscription SMALLINT,
  rank_dividend SMALLINT,
  rank_wage SMALLINT,

  -- Compensation fairness/practicality (1-5)
  fair_per_transaction SMALLINT,
  fair_royalty SMALLINT,
  fair_subscription SMALLINT,
  fair_dividend SMALLINT,
  fair_wage SMALLINT,
  practical_per_transaction SMALLINT,
  practical_royalty SMALLINT,
  practical_subscription SMALLINT,
  practical_dividend SMALLINT,
  practical_wage SMALLINT,

  -- AI usage
  ai_usage TEXT,

  -- Attitudes (1-7) — fixed columns, content stored in display order via attitude_item_order
  attitude_1 SMALLINT,
  attitude_2 SMALLINT,
  attitude_3 SMALLINT,
  attitude_4 SMALLINT,
  attitude_5 SMALLINT,
  attitude_6 SMALLINT,
  attention_check_pass BOOLEAN,
  attention_check_value SMALLINT,

  -- Demographics
  age_band TEXT,
  gender TEXT,
  gender_other TEXT,
  education TEXT,
  income_band TEXT,
  employment TEXT,
  tech_industry TEXT,

  -- Lifecycle
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_participants_cell ON participants (data_type, use_case);
CREATE INDEX IF NOT EXISTS idx_participants_completed ON participants (completed);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  timestamp_shown TIMESTAMPTZ,
  timestamp_submitted TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INT,
  input_events JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_participant ON events (participant_id);
CREATE INDEX IF NOT EXISTS idx_events_screen ON events (screen_id);
