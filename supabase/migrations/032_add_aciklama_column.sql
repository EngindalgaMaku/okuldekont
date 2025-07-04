-- Dekontlar tablosuna aciklama sütunu ekleme
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS aciklama TEXT; 