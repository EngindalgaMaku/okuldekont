-- Add extended fields to isletmeler table
-- Migration: Add new business information fields

-- Add new columns to isletmeler table
ALTER TABLE isletmeler 
ADD COLUMN IF NOT EXISTS faaliyet_alani TEXT,
ADD COLUMN IF NOT EXISTS vergi_numarasi TEXT,
ADD COLUMN IF NOT EXISTS banka_hesap_no TEXT,
ADD COLUMN IF NOT EXISTS calisan_sayisi TEXT,
ADD COLUMN IF NOT EXISTS katki_payi_talebi TEXT,
ADD COLUMN IF NOT EXISTS usta_ogretici_adi TEXT,
ADD COLUMN IF NOT EXISTS usta_ogretici_telefon TEXT;

-- Add comments to describe the fields
COMMENT ON COLUMN isletmeler.faaliyet_alani IS 'İşletmenin faaliyet alanı ve öğrenci verilme temeli';
COMMENT ON COLUMN isletmeler.vergi_numarasi IS 'İşletmenin vergi numarası';
COMMENT ON COLUMN isletmeler.banka_hesap_no IS 'Devlet katkı payı için banka hesap numarası';
COMMENT ON COLUMN isletmeler.calisan_sayisi IS 'İşletmedeki çalışan sayısı';
COMMENT ON COLUMN isletmeler.katki_payi_talebi IS 'Devlet katkı payı talebi durumu (evet/hayir)';
COMMENT ON COLUMN isletmeler.usta_ogretici_adi IS 'Usta öğretici adı soyadı';
COMMENT ON COLUMN isletmeler.usta_ogretici_telefon IS 'Usta öğretici telefon numarası';