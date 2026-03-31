-- ============================================================
-- Supabase Actual Database Schema
-- EEHS QMS System
-- Last updated: sesuai screenshot Supabase dashboard
-- ============================================================

-- ============================================================
-- Table: daftaralat
-- ============================================================
CREATE TABLE IF NOT EXISTS daftaralat (
  no        int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  no_id     text,
  description text,
  type_model  text,
  sn          text,
  year        text,
  product     text,   -- Crit Product (Y/N)
  process     text,   -- Crit Process (Y/N)
  safety      text,   -- Crit Safety (Y/N)
  environment text,   -- Crit Environment (Y/N)
  pm_yn       text,   -- PM Y/N
  "6_monthly" text,   -- PM 6 Monthly schedule
  yearly      text,   -- PM Yearly schedule
  internal_external text, -- PM Internal/External
  y_n         text,   -- Calibration Y/N
  schedule    text,   -- Calibration Schedule
  area        text,
  location    text,
  status      text    -- 'active' | 'obsolete'
);

-- ============================================================
-- Table: kalibrasi
-- ============================================================
CREATE TABLE IF NOT EXISTS kalibrasi (
  no               int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  no_id            text,
  description      text,
  calibration_id   text,
  parameter        text,
  process_range    text,
  reject_error_limit text,
  int              text,   -- Interval (bulan)
  due_date         text,   -- Bulan jatuh tempo (e.g. 'Jan')
  remark           text,
  criticality      text
);

-- ============================================================
-- Table: logaktivitas
-- ============================================================
CREATE TABLE IF NOT EXISTS logaktivitas (
  no                 int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  no_id              text,
  calibration_id     text,
  jenis              text,   -- 'Kalibrasi' | 'PM'
  execute_date       text,   -- Format YYYY-MM-DD
  pic                text,
  keterangan         text,
  backlog_status     varchar(20),  -- null | 'pending' | 'completed'
  backlog_notes      text,
  backlog_updated_at timestamptz,
  backlog_updated_by varchar(100)
);

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id_user    text PRIMARY KEY,
  nama       text NOT NULL,
  inisial    text,
  email      text UNIQUE NOT NULL,
  password   text NOT NULL,  -- SHA-256 hash
  role       text NOT NULL DEFAULT 'user',  -- 'superadmin' | 'admin' | 'user'
  "createdAt" text,
  "updatedAt" text
);

-- ============================================================
-- Table: config
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
  id        int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  deskripsi text,
  value     text
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daftaralat_no_id    ON daftaralat(no_id);
CREATE INDEX IF NOT EXISTS idx_daftaralat_status   ON daftaralat(status);
CREATE INDEX IF NOT EXISTS idx_kalibrasi_no_id     ON kalibrasi(no_id);
CREATE INDEX IF NOT EXISTS idx_kalibrasi_cal_id    ON kalibrasi(calibration_id);
CREATE INDEX IF NOT EXISTS idx_logaktivitas_no_id  ON logaktivitas(no_id);
CREATE INDEX IF NOT EXISTS idx_logaktivitas_jenis  ON logaktivitas(jenis);
CREATE INDEX IF NOT EXISTS idx_logaktivitas_backlog ON logaktivitas(backlog_status) WHERE backlog_status IS NOT NULL;

-- ============================================================
-- Backlog columns (run if not exists)
-- ============================================================
ALTER TABLE logaktivitas ADD COLUMN IF NOT EXISTS backlog_status     varchar(20)   DEFAULT NULL;
ALTER TABLE logaktivitas ADD COLUMN IF NOT EXISTS backlog_notes      text          DEFAULT NULL;
ALTER TABLE logaktivitas ADD COLUMN IF NOT EXISTS backlog_updated_at timestamptz   DEFAULT NULL;
ALTER TABLE logaktivitas ADD COLUMN IF NOT EXISTS backlog_updated_by varchar(100)  DEFAULT NULL;
ALTER TABLE logaktivitas ADD COLUMN IF NOT EXISTS backlog_history    jsonb         DEFAULT '[]'::jsonb;

-- ============================================================
-- DB Trigger: sync daftaralat.status saat log keterangan = 'obsolete'
-- (trg_sync_daftaralat_status — dibuat manual di Supabase)
-- ============================================================
