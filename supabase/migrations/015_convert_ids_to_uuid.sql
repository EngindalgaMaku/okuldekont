-- Önce admin_kullanicilar tablosunu UUID'ye geçir
ALTER TABLE admin_kullanicilar ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Öğretmenler tablosunu UUID'ye geçir
ALTER TABLE ogretmenler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Referans veren tabloları güncelle
-- İşletmeler tablosu için geçici sütun
ALTER TABLE isletmeler ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE isletmeler i 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE i.ogretmen_id = o.id;

-- Stajlar tablosu için geçici sütun
ALTER TABLE stajlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE stajlar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;

-- Dekontlar tablosu için geçici sütun
ALTER TABLE dekontlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE dekontlar d 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE d.ogretmen_id = o.id;

-- Sınıflar tablosu için geçici sütun
ALTER TABLE siniflar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE siniflar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;

-- İşletme alanlar tablosu için geçici sütun
ALTER TABLE isletme_alanlar ADD COLUMN temp_koordinator_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_koordinator_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE ia.koordinator_ogretmen_id = o.id;

-- Eski foreign key kısıtlamalarını kaldır
ALTER TABLE isletmeler DROP CONSTRAINT IF EXISTS fk_isletmeler_ogretmen;
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS fk_stajlar_ogretmen;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS fk_dekontlar_ogretmen;
ALTER TABLE siniflar DROP CONSTRAINT IF EXISTS fk_siniflar_ogretmen;
ALTER TABLE isletme_alanlar DROP CONSTRAINT IF EXISTS fk_isletme_alanlar_koordinator;

-- Eski ID sütunlarını kaldır
ALTER TABLE isletmeler DROP COLUMN ogretmen_id;
ALTER TABLE stajlar DROP COLUMN ogretmen_id;
ALTER TABLE dekontlar DROP COLUMN ogretmen_id;
ALTER TABLE siniflar DROP COLUMN ogretmen_id;
ALTER TABLE isletme_alanlar DROP COLUMN koordinator_ogretmen_id;

-- Geçici sütunları yeniden adlandır
ALTER TABLE isletmeler RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE siniflar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE isletme_alanlar RENAME COLUMN temp_koordinator_uuid TO koordinator_ogretmen_id;

-- Öğretmenler tablosunu güncelle
ALTER TABLE ogretmenler DROP CONSTRAINT ogretmenler_pkey CASCADE;
ALTER TABLE ogretmenler DROP COLUMN id;
ALTER TABLE ogretmenler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogretmenler ADD PRIMARY KEY (id);

-- Admin kullanıcılar tablosunu güncelle
ALTER TABLE admin_kullanicilar DROP CONSTRAINT admin_kullanicilar_pkey CASCADE;
ALTER TABLE admin_kullanicilar DROP COLUMN id;
ALTER TABLE admin_kullanicilar RENAME COLUMN uuid_id TO id;
ALTER TABLE admin_kullanicilar ADD PRIMARY KEY (id);

-- Yeni foreign key kısıtlamalarını ekle
ALTER TABLE isletmeler ADD CONSTRAINT fk_isletmeler_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE stajlar ADD CONSTRAINT fk_stajlar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE dekontlar ADD CONSTRAINT fk_dekontlar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE siniflar ADD CONSTRAINT fk_siniflar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE isletme_alanlar ADD CONSTRAINT fk_isletme_alanlar_koordinator FOREIGN KEY (koordinator_ogretmen_id) REFERENCES ogretmenler(id);

-- RLS politikalarını güncelle
DROP POLICY IF EXISTS "Öğretmenler kendi öğrencilerinin dekontlarını sadece görüntüleyebilir" ON dekontlar;
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını sadece görüntüleyebilir"
ON dekontlar FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM stajlar s
        JOIN ogrenciler o ON o.id = s.ogrenci_id
        JOIN ogretmenler og ON og.id = auth.uid()::uuid
        WHERE s.ogrenci_id = dekontlar.ogrenci_id
        AND s.ogretmen_id = og.id
    )
);

-- Admin politikasını güncelle
DROP POLICY IF EXISTS "Yöneticiler dekontları onaylayabilir" ON dekontlar;
CREATE POLICY "Yöneticiler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM admin_kullanicilar a 
        WHERE a.id = auth.uid()::uuid
    )
); 