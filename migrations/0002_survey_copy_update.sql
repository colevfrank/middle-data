-- Align schema with SURVEY_PAGES.md wording pass (20 data types, new Block A items, etc.)

ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_data_type_check;
ALTER TABLE participants ADD CONSTRAINT participants_data_type_check CHECK (data_type BETWEEN 1 AND 20);

ALTER TABLE participants ALTER COLUMN postq_upset_if_leaked TYPE TEXT USING postq_upset_if_leaked::text;

ALTER TABLE participants ADD COLUMN IF NOT EXISTS postq_identifiability SMALLINT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS postq_usefulness SMALLINT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS postq_replaceability SMALLINT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS postq_control SMALLINT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS postq_concerns_other TEXT;
