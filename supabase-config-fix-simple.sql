-- ============================================
-- SIMPLE FIX: Config Table Setup
-- Copy-paste this entire script to Supabase SQL Editor
-- ============================================

-- 1. Clean up duplicates (if any)
DELETE FROM config
WHERE id NOT IN (
  SELECT MAX(id)
  FROM config
  GROUP BY deskripsi
);

-- 2. Add unique constraint
ALTER TABLE config
ADD CONSTRAINT config_deskripsi_unique UNIQUE (deskripsi);

-- 3. Setup auto-increment for id
CREATE SEQUENCE IF NOT EXISTS config_id_seq;
SELECT setval('config_id_seq', COALESCE((SELECT MAX(id) FROM config), 0) + 1, false);
ALTER TABLE config ALTER COLUMN id SET DEFAULT nextval('config_id_seq');
ALTER SEQUENCE config_id_seq OWNED BY config.id;

-- 4. Verify setup
SELECT 'Constraints:' as info;
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'config'::regclass;

SELECT 'Column Info:' as info;
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'config';

-- Done! Now you can use upsert in your code.
