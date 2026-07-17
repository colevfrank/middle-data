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
  data_type SMALLINT NOT NULL CHECK (data_type BETWEEN 1 AND 16),
  use_case CHAR(2) NOT NULL CHECK (use_case IN ('B1','B2')),

  -- Randomized orderings
  scenario_order INT[] NOT NULL,        -- permutation of [1,2]
  post_question_order INT[] NOT NULL,   -- permutation of [1..14] (13 questions + attention check)

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

  -- Scenario 1: discount valuation (single-select: least acceptable discount)
  s1_min_share TEXT,   -- tier code ('1off'…'20off') or 'none'

  -- Scenario 2: data marketplace (single-select: least acceptable revenue share)
  s2_min_share TEXT,   -- '10' / '50' / '90' or 'none'
  s2_reason TEXT,
  s2_reason_other TEXT,

  -- Post-scenario questions, Block A (about the data type)
  postq_importance SMALLINT,             -- A1: 1-5
  postq_sensitivity SMALLINT,            -- A2: 1-5
  postq_ownership SMALLINT,              -- A3: 1-5
  postq_share_public SMALLINT,           -- A4: 0-3
  postq_buy_sell_appropriate SMALLINT,   -- A5: 1-5
  postq_upset_if_leaked SMALLINT,        -- A6: 1-5

  -- Post-scenario questions, Block B (about compensation for the use case)
  postq_comp_by_amount TEXT,             -- B1: yes/no/unsure
  postq_comp_per_use TEXT,               -- B2: yes/no/unsure
  postq_comp_by_effort TEXT,             -- B3: yes/no/unsure
  postq_comp_by_originality TEXT,        -- B4: yes/no/unsure
  postq_coworker_sells_feel TEXT,        -- B5
  postq_credit_ack SMALLINT,             -- B6: 1-5
  postq_concerns TEXT[],                 -- B7: multi-select

  -- Attention check (pooled + randomized with the post-scenario questions)
  attention_check_value SMALLINT,
  attention_check_pass BOOLEAN,

  -- Open-ended response (own screen, after the post-scenario battery)
  open_data_revenue TEXT,

  -- Screen 21: AI usage & literacy
  ai_tools_freq TEXT,
  social_media_freq TEXT,
  search_engine_freq TEXT,
  tech_current TEXT,
  tech_ever TEXT,

  -- Demographics
  age_band TEXT,
  gender TEXT,
  gender_other TEXT,
  education TEXT,

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
