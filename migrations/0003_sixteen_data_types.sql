-- Back to 16 data types (ids renumbered; see SPEC.md). NOT VALID: enforced for new
-- rows only, so any earlier pilot rows with ids 17–20 don't block the migration.

ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_data_type_check;
ALTER TABLE participants ADD CONSTRAINT participants_data_type_check CHECK (data_type BETWEEN 1 AND 16) NOT VALID;
