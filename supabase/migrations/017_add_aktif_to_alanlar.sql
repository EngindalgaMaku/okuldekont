-- Alanlar tablosuna aktif kolonu ekle
ALTER TABLE alanlar 
ADD COLUMN IF NOT EXISTS aktif BOOLEAN DEFAULT true;

-- Mevcut kayıtları aktif olarak işaretle
UPDATE alanlar SET aktif = true WHERE aktif IS NULL; 