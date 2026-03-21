-- Supabase Database Schema
-- EEHS QMS System

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  inisial VARCHAR(10),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Table: daftar_alat
-- ============================================
CREATE TABLE IF NOT EXISTS daftar_alat (
  no SERIAL PRIMARY KEY,
  no_id VARCHAR(50) UNIQUE,
  description TEXT,
  type_model VARCHAR(255),
  sn VARCHAR(255),
  year INTEGER,
  crit_product VARCHAR(50),
  crit_process VARCHAR(50),
  crit_safety VARCHAR(50),
  crit_env VARCHAR(50),
  pm_overall VARCHAR(50),
  pm_6monthly VARCHAR(50),
  pm_yearly VARCHAR(50),
  pm_internal_external VARCHAR(50),
  calib_yesno VARCHAR(10),
  calib_schedule VARCHAR(255),
  location VARCHAR(255),
  status_pm VARCHAR(50),
  status_calibration VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_daftar_alat_no_id ON daftar_alat(no_id);
CREATE INDEX idx_daftar_alat_location ON daftar_alat(location);

-- ============================================
-- Table: jadwal_kalibrasi
-- ============================================
CREATE TABLE IF NOT EXISTS jadwal_kalibrasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alat_no INTEGER REFERENCES daftar_alat(no) ON DELETE CASCADE,
  tanggal_kalibrasi DATE,
  tanggal_kalibrasi_berikutnya DATE,
  status VARCHAR(50),
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_jadwal_kalibrasi_alat ON jadwal_kalibrasi(alat_no);
CREATE INDEX idx_jadwal_kalibrasi_tanggal ON jadwal_kalibrasi(tanggal_kalibrasi);

-- ============================================
-- Table: log_aktivitas
-- ============================================
CREATE TABLE IF NOT EXISTS log_aktivitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'kalibrasi', 'pm', 'general'
  alat_no INTEGER REFERENCES daftar_alat(no) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  aktivitas TEXT NOT NULL,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_log_aktivitas_type ON log_aktivitas(type);
CREATE INDEX idx_log_aktivitas_tanggal ON log_aktivitas(tanggal);
CREATE INDEX idx_log_aktivitas_alat ON log_aktivitas(alat_no);

-- ============================================
-- Table: config
-- ============================================
CREATE TABLE IF NOT EXISTS config (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_alat ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_kalibrasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Public read access (adjust based on your needs)
CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON daftar_alat FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON jadwal_kalibrasi FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON log_aktivitas FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON config FOR SELECT USING (true);

-- Public write access (adjust based on your needs - consider authentication)
CREATE POLICY "Allow public insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON users FOR DELETE USING (true);

CREATE POLICY "Allow public insert" ON daftar_alat FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON daftar_alat FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON daftar_alat FOR DELETE USING (true);

CREATE POLICY "Allow public insert" ON jadwal_kalibrasi FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON jadwal_kalibrasi FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON jadwal_kalibrasi FOR DELETE USING (true);

CREATE POLICY "Allow public insert" ON log_aktivitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON log_aktivitas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON log_aktivitas FOR DELETE USING (true);

CREATE POLICY "Allow public insert" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON config FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON config FOR DELETE USING (true);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daftar_alat_updated_at BEFORE UPDATE ON daftar_alat
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jadwal_kalibrasi_updated_at BEFORE UPDATE ON jadwal_kalibrasi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_log_aktivitas_updated_at BEFORE UPDATE ON log_aktivitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
