-- Alanlar tablosunu UUID'ye geçir
ALTER TABLE alanlar ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Referans veren tabloları güncelle
-- Öğrenciler tablosu için geçici sütun
ALTER TABLE ogrenciler ADD COLUMN temp_alan_uuid UUID;
UPDATE ogrenciler o 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE o.alan_id = a.id;

-- Öğretmenler tablosu için geçici sütun
ALTER TABLE ogretmenler ADD COLUMN temp_alan_uuid UUID;
UPDATE ogretmenler o 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE o.alan_id = a.id;

-- Sınıflar tablosu için geçici sütun
ALTER TABLE siniflar ADD COLUMN temp_alan_uuid UUID;
UPDATE siniflar s 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE s.alan_id = a.id;

-- İşletme alanlar tablosu için geçici sütun
ALTER TABLE isletme_alanlar ADD COLUMN temp_alan_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE ia.alan_id = a.id;

-- Eski foreign key kısıtlamalarını kaldır
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_alan_id_fkey;
ALTER TABLE ogretmenler DROP CONSTRAINT IF EXISTS ogretmenler_alan_id_fkey;
ALTER TABLE siniflar DROP CONSTRAINT IF EXISTS siniflar_alan_id_fkey;
ALTER TABLE isletme_alanlar DROP CONSTRAINT IF EXISTS isletme_alanlar_alan_id_fkey;

-- Eski ID sütunlarını kaldır
ALTER TABLE ogrenciler DROP COLUMN alan_id;
ALTER TABLE ogretmenler DROP COLUMN alan_id;
ALTER TABLE siniflar DROP COLUMN alan_id;
ALTER TABLE isletme_alanlar DROP COLUMN alan_id;

-- Geçici sütunları yeniden adlandır
ALTER TABLE ogrenciler RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE ogretmenler RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE siniflar RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE isletme_alanlar RENAME COLUMN temp_alan_uuid TO alan_id;

-- Alanlar tablosunu güncelle
ALTER TABLE alanlar DROP CONSTRAINT alanlar_pkey CASCADE;
ALTER TABLE alanlar DROP COLUMN id;
ALTER TABLE alanlar RENAME COLUMN uuid_id TO id;
ALTER TABLE alanlar ADD PRIMARY KEY (id);

-- Yeni foreign key kısıtlamalarını ekle
ALTER TABLE ogrenciler ADD CONSTRAINT ogrenciler_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE ogretmenler ADD CONSTRAINT ogretmenler_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE siniflar ADD CONSTRAINT siniflar_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE isletme_alanlar ADD CONSTRAINT isletme_alanlar_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id); 