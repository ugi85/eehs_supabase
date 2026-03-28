-- ============================================================
-- Fix sequence daftaralat agar sinkron dengan data yang ada
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Reset sequence ke MAX(no) + 1
SELECT setval(
  pg_get_serial_sequence('daftaralat', 'no'),
  COALESCE((SELECT MAX(no) FROM daftaralat), 0) + 1,
  false
);

-- 2. Verifikasi — harus menampilkan nilai > MAX(no) saat ini
SELECT 
  COALESCE((SELECT MAX(no) FROM daftaralat), 0) AS current_max,
  last_value AS sequence_value
FROM daftaralat_no_seq;

-- 3. (Opsional) Buat RPC helper agar bisa dipanggil dari frontend
CREATE OR REPLACE FUNCTION reset_daftaralat_sequence()
RETURNS void AS $$
BEGIN
  PERFORM setval(
    pg_get_serial_sequence('daftaralat', 'no'),
    COALESCE((SELECT MAX(no) FROM daftaralat), 0) + 1,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
