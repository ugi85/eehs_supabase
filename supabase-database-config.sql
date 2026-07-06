-- ============================================================
-- TABEL KONFIGURASI DATABASE SWITCH
-- ============================================================
-- Tabel untuk menyimpan konfigurasi database yang aktif
-- Hanya admin yang bisa mengubah setting ini

-- Create table for database configuration
CREATE TABLE IF NOT EXISTS config_database (
  id SERIAL PRIMARY KEY,
  database_type VARCHAR(50) NOT NULL DEFAULT 'supabase', -- 'supabase' atau 'spreadsheet'
  spreadsheet_id VARCHAR(255), -- ID Google Sheets jika menggunakan spreadsheet
  spreadsheet_url TEXT, -- URL lengkap Google Sheets
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255),
  notes TEXT
);

-- Insert default config (menggunakan Supabase sebagai default)
INSERT INTO config_database (database_type, is_active, notes)
VALUES ('supabase', TRUE, 'Default database configuration')
ON CONFLICT DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_config_database_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_config_database_timestamp ON config_database;
CREATE TRIGGER trigger_update_config_database_timestamp
  BEFORE UPDATE ON config_database
  FOR EACH ROW
  EXECUTE FUNCTION update_config_database_timestamp();

-- Add RLS (Row Level Security)
ALTER TABLE config_database ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user bisa membaca config
CREATE POLICY "Allow read access to all users" ON config_database
  FOR SELECT USING (true);

-- Policy: Hanya authenticated users yang bisa update (akan dicek di aplikasi level untuk role admin)
CREATE POLICY "Allow update for authenticated users" ON config_database
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Hanya authenticated users yang bisa insert
CREATE POLICY "Allow insert for authenticated users" ON config_database
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE config_database IS 'Tabel konfigurasi database yang digunakan sistem (Supabase atau Spreadsheet)';
COMMENT ON COLUMN config_database.database_type IS 'Tipe database: supabase atau spreadsheet';
COMMENT ON COLUMN config_database.spreadsheet_id IS 'ID Google Sheets jika menggunakan spreadsheet mode';
COMMENT ON COLUMN config_database.spreadsheet_url IS 'URL lengkap Google Sheets';
COMMENT ON COLUMN config_database.is_active IS 'Status aktif konfigurasi ini';
