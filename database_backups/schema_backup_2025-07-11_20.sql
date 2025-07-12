-- Supabase Schema Yedeği
-- Tarih: 2025-07-11T20:56:43.210Z

-- =============================================================
-- TRIGGERS (4 adet)
-- =============================================================

-- Dekont onay durumu değiştiğinde otomatik tarih güncelleme
-- Tablo: dekontlar
-- Fonksiyon: update_dekont_onay_tarihi

-- Dekont ekleme/güncelleme sırasında varsayılan değerleri ayarlama
-- Tablo: dekontlar
-- Fonksiyon: set_default_dekont_values

-- Ödeme son tarihi otomatik hesaplama
-- Tablo: dekontlar
-- Fonksiyon: set_default_odeme_son_tarihi

-- Super admin deaktivasyonunu engelleme
-- Tablo: admin_kullanicilar
-- Fonksiyon: prevent_super_admin_deactivation

-- =============================================================
-- INDEXES (4 adet)
-- =============================================================

-- Dekontlar tablosu öğrenci performans indexi
CREATE INDEX IF NOT EXISTS idx_dekontlar_ogrenci ON dekontlar (ogrenci_id);

-- Dekontlar tablosu işletme performans indexi
CREATE INDEX IF NOT EXISTS idx_dekontlar_isletme ON dekontlar (isletme_id);

-- Dekontlar tablosu tarih performans indexi
CREATE INDEX IF NOT EXISTS idx_dekontlar_ay_yil ON dekontlar (ay, yil);

-- Dekontlar tablosu onay durumu performans indexi
CREATE INDEX IF NOT EXISTS idx_dekontlar_onay_durumu ON dekontlar (onay_durumu);

