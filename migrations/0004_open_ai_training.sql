-- Second open-response field: whether AI training changes the answer.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS open_data_ai_training TEXT;
