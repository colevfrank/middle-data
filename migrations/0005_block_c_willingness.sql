-- Block C: three willingness items shown after Block B (added after the pilot).
-- Nullable: pilot rows have no block_c_order and skip Block C.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS block_c_order INT[],                   -- Block C question ids (19-21)
  ADD COLUMN IF NOT EXISTS postq_willing_if_self_benefit SMALLINT,   -- C1: 1-5
  ADD COLUMN IF NOT EXISTS postq_willing_if_others_benefit SMALLINT, -- C2: 1-5
  ADD COLUMN IF NOT EXISTS postq_willing_if_no_revenue SMALLINT;     -- C3: 1-5
