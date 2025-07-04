-- Stajlar tablosuna fesih tarihi ekleme
ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS fesih_tarihi date;

-- Öğrenciler tablosundaki isletme_id alanını NULL'a çevirme (öğrenci artık birden fazla işletmede çalışabilir)
-- Bu alan artık sadece aktif staj için kullanılacak
UPDATE ogrenciler SET isletme_id = NULL WHERE isletme_id IS NOT NULL;

-- Staj durumları güncelleme
-- 'aktif' -> öğrenci hala çalışıyor
-- 'tamamlandi' -> normal bitiş
-- 'fesih' -> erken bitiş/fesih

-- Mevcut aktif stajları kontrol et
UPDATE stajlar 
SET durum = 'tamamlandi' 
WHERE bitis_tarihi < CURRENT_DATE AND durum = 'aktif';

-- Öğrenciler tablosundaki isletme_id'yi aktif stajlara göre güncelle
UPDATE ogrenciler 
SET isletme_id = s.isletme_id
FROM stajlar s
WHERE ogrenciler.id = s.ogrenci_id 
AND s.durum = 'aktif'
AND s.fesih_tarihi IS NULL; 