-- ============================================
-- Config Table: Add Unique Constraint & Auto-increment
-- ============================================

-- Step 1: Check for duplicate deskripsi values
SELECT deskripsi, COUNT(*) as count
FROM config
GROUP BY deskripsi
HAVING COUNT(*) > 1;

-- Step 2: If there are duplicates, clean them up first
-- Keep only the most recent record (highest id) for each deskripsi
-- Uncomment and run if you have duplicates:
/*
DELETE FROM config
WHERE id NOT IN (
  SELECT MAX(id)
  FROM config
  GROUP BY deskripsi
);
*/

-- Step 3: Add unique constraint on deskripsi column
ALTER TABLE config
ADD CONSTRAINT config_deskripsi_unique UNIQUE (deskripsi);

-- Step 4: Create sequence for auto-increment id (if not exists)
CREATE SEQUENCE IF NOT EXISTS config_id_seq;

-- Step 5: Set the sequence to start from the next available id
SELECT setval('config_id_seq', COALESCE((SELECT MAX(id) FROM config), 0) + 1, false);

-- Step 6: Set default value for id column to use sequence
ALTER TABLE config
ALTER COLUMN id SET DEFAULT nextval('config_id_seq');

-- Step 7: Associate the sequence with the column
ALTER SEQUENCE config_id_seq OWNED BY config.id;

-- Step 8: Verify the changes
SELECT 
  conname as constraint_name, 
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'config'::regclass;

-- Step 9: Check column defaults
SELECT 
  column_name, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'config'
ORDER BY ordinal_position;

-- ============================================
-- Sample data for testing (optional)
-- ============================================
/*
INSERT INTO config (deskripsi, value) VALUES
  ('nama sistem', 'EEHS Dashboard'),
  ('versi sistem', '1.0'),
  ('nama perusahaan', 'PT Anugrah Amartha Global'),
  ('noref daftaralat', 'AGIS-WI-ENG-001-LD1_v5.0'),
  ('noref kalibrasi', 'AGIS-WI-ENG-016-LD1_v5.0')
ON CONFLICT (deskripsi) DO UPDATE
  SET value = EXCLUDED.value;
*/

