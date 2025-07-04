-- Dekontlar tablosunda odeme_tarihi sütununa default değer ekleme
ALTER TABLE dekontlar ALTER COLUMN odeme_tarihi SET DEFAULT CURRENT_TIMESTAMP; 