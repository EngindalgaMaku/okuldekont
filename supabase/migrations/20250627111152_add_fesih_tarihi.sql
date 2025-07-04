-- Stajlar tablosuna fesih tarihi ekleme
ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS fesih_tarihi date;

-- Staj durumlarını güncelle (fesih durumu ekle)
-- Mevcut durumlar: 'aktif', 'tamamlandi', 'iptal'
-- Yeni durum: 'fesih'

-- Mevcut aktif stajları kontrol et ve bitmiş olanları tamamlandı yap
UPDATE stajlar 
SET durum = 'tamamlandi' 
WHERE bitis_tarihi < CURRENT_DATE AND durum = 'aktif' AND fesih_tarihi IS NULL;
