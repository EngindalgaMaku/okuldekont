-- Migration 001
CREATE TABLE egitim_yillari (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  yil text NOT NULL UNIQUE,
  aktif boolean NOT NULL DEFAULT false
);
CREATE TABLE alanlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL UNIQUE
);
CREATE TABLE ogretmenler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  soyad text NOT NULL,
  pin text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE isletmeler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  yetkili_kisi text NOT NULL,
  pin text NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE ogrenciler (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  soyad text NOT NULL,
  sinif text NOT NULL,
  alan_id bigint REFERENCES alanlar(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE stajlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ogrenci_id bigint REFERENCES ogrenciler(id) NOT NULL,
  isletme_id bigint REFERENCES isletmeler(id) NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id) NOT NULL,
  egitim_yili_id bigint REFERENCES egitim_yillari(id) NOT NULL,
  baslangic_tarihi date NOT NULL,
  bitis_tarihi date NOT NULL,
  durum text NOT NULL DEFAULT 'aktif',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE dekontlar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staj_id bigint REFERENCES stajlar(id) NOT NULL,
  isletme_id bigint REFERENCES isletmeler(id) NOT NULL,
  ogretmen_id bigint REFERENCES ogretmenler(id) NOT NULL,
  miktar decimal(10,2),
  odeme_tarihi date NOT NULL,
  dekont_dosyasi text NOT NULL,
  onay_durumu text NOT NULL DEFAULT 'bekliyor',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE alanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmenler ENABLE ROW LEVEL SECURITY;
ALTER TABLE isletmeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogrenciler ENABLE ROW LEVEL SECURITY;
ALTER TABLE stajlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE dekontlar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all" ON alanlar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON ogretmenler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON isletmeler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON ogrenciler FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON stajlar FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read all" ON dekontlar FOR SELECT USING (auth.role() = 'authenticated');
INSERT INTO egitim_yillari (yil, aktif) VALUES ('2025-2026', true);
INSERT INTO alanlar (ad) VALUES 
('Bilişim Teknolojileri'),
('Muhasebe ve Finansman'),
('Pazarlama ve Perakende');
INSERT INTO ogretmenler (ad, soyad, pin) VALUES
('Ahmet', 'Yılmaz', '1234'),
('Ayşe', 'Demir', '4321'),
('Mehmet', 'Kaya', '5678');
INSERT INTO isletmeler (ad, yetkili_kisi, pin, ogretmen_id) VALUES
('Tekno A.Ş.', 'Ali Can', '1111', 1),
('Finans Ltd.', 'Veli Yıldız', '2222', 2),
('Market A.Ş.', 'Zeynep Ak', '3333', 3);
INSERT INTO ogrenciler (ad, soyad, sinif, alan_id) VALUES
('Mustafa', 'Şahin', '11-A', 1),
('Fatma', 'Yıldız', '11-B', 2),
('Zehra', 'Çelik', '11-C', 3);
INSERT INTO stajlar (ogrenci_id, isletme_id, ogretmen_id, egitim_yili_id, baslangic_tarihi, bitis_tarihi) VALUES
(1, 1, 1, 1, '2025-09-01', '2026-01-31'),
(2, 2, 2, 1, '2025-09-01', '2026-01-31'),
(3, 3, 3, 1, '2025-09-01', '2026-01-31'); 

-- Migration 002
create or replace function disable_rls(table_name text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('alter table %I disable row level security', table_name);
end;
$$; 

-- Migration 003
ALTER TABLE isletmeler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "İşletmeler herkes tarafından görüntülenebilir"
ON isletmeler FOR SELECT
USING (true);
ALTER TABLE ogrenciler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Öğrenciler herkes tarafından görüntülenebilir"
ON ogrenciler FOR SELECT
USING (true);
ALTER TABLE stajlar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stajlar herkes tarafından görüntülenebilir"
ON stajlar FOR SELECT
USING (true);
ALTER TABLE dekontlar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dekontlar herkes tarafından görüntülenebilir"
ON dekontlar FOR SELECT
USING (true);
CREATE POLICY "İşletmeler kendi dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
);
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
);
ALTER TABLE alanlar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alanlar herkes tarafından görüntülenebilir"
ON alanlar FOR SELECT
USING (true);
ALTER TABLE egitim_yillari ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eğitim yılları herkes tarafından görüntülenebilir"
ON egitim_yillari FOR SELECT
USING (true);
ALTER TABLE ogretmenler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Öğretmenler herkes tarafından görüntülenebilir"
ON ogretmenler FOR SELECT
USING (true); 

-- Migration 004
ALTER TABLE ogrenciler
ADD COLUMN IF NOT EXISTS tc_no text,
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS veli_adi text,
ADD COLUMN IF NOT EXISTS veli_telefon text;
ALTER TABLE isletmeler
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS adres text,
ADD COLUMN IF NOT EXISTS vergi_no text;
ALTER TABLE ogretmenler
ADD COLUMN IF NOT EXISTS telefon text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS alan_id bigint REFERENCES alanlar(id);
ALTER TABLE alanlar
ADD COLUMN IF NOT EXISTS aciklama text;
DROP POLICY IF EXISTS "İşletmeler kendi dekontlarını ekleyebilir" ON dekontlar;
DROP POLICY IF EXISTS "Öğretmenler kendi öğrencilerinin dekontlarını ekleyebilir" ON dekontlar;
CREATE POLICY "İşletmeler kendi dekontlarını yönetebilir"
ON dekontlar
USING (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.isletme_id = isletme_id
  )
);
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını yönetebilir"
ON dekontlar
USING (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stajlar s
    WHERE s.id = staj_id
    AND s.ogretmen_id = ogretmen_id
  )
);
DO $$ BEGIN
    CREATE TYPE staj_durum AS ENUM ('aktif', 'tamamlandi', 'iptal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE dekont_onay_durum AS ENUM ('bekliyor', 'onaylandi', 'reddedildi');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
ALTER TABLE stajlar 
ALTER COLUMN durum TYPE staj_durum USING durum::staj_durum;
ALTER TABLE dekontlar 
ALTER COLUMN onay_durumu TYPE dekont_onay_durum USING onay_durumu::dekont_onay_durum; 

-- Migration 005
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$; 

-- Migration 006
DROP POLICY IF EXISTS "Authenticated users can read all" ON alanlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON ogretmenler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON isletmeler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON ogrenciler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON stajlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON dekontlar;
DROP POLICY IF EXISTS "Authenticated users can read all" ON egitim_yillari;
CREATE POLICY "Allow all for authenticated users" ON alanlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON ogretmenler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON isletmeler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON ogrenciler
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON stajlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON dekontlar
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON egitim_yillari
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated'); 

-- Migration 007
CREATE POLICY "Allow anonymous read access to isletmeler"
  ON public.isletmeler FOR SELECT
  TO anon
  USING (true);
CREATE POLICY "Allow anonymous read access to ogretmenler"
  ON public.ogretmenler FOR SELECT
  TO anon
  USING (true);
CREATE POLICY "Allow anonymous read access to egitim_yillari"
  ON public.egitim_yillari FOR SELECT
  TO anon
  USING (true); 

-- Migration 008
CREATE TABLE egitim_yillari (
    id SERIAL PRIMARY KEY,
    yil VARCHAR(20) NOT NULL UNIQUE,
    aktif BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
INSERT INTO egitim_yillari (yil, aktif) VALUES 
('2024-2025', true);
ALTER TABLE egitim_yillari ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Egitim yillari okuma" ON egitim_yillari
    FOR SELECT USING (true);
CREATE POLICY "Egitim yillari guncelleme" ON egitim_yillari
    FOR ALL USING (true); 

-- Migration 009
CREATE TABLE IF NOT EXISTS siniflar (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ad text NOT NULL,
  alan_id bigint REFERENCES alanlar(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE siniflar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Siniflar okuma" ON siniflar
    FOR SELECT USING (true);
CREATE POLICY "Siniflar yonetim" ON siniflar
    FOR ALL USING (true);
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS no text;
INSERT INTO siniflar (ad, alan_id) VALUES
  ('9-A', 1),
  ('9-B', 1),
  ('10-A', 1),
  ('10-B', 1),
  ('11-A', 1),
  ('11-B', 1),
  ('12-A', 1),
  ('12-B', 1)
ON CONFLICT DO NOTHING; 

-- Migration 010
ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS fesih_tarihi date;
UPDATE ogrenciler SET isletme_id = NULL WHERE isletme_id IS NOT NULL;
UPDATE stajlar 
SET durum = 'tamamlandi' 
WHERE bitis_tarihi < CURRENT_DATE AND durum = 'aktif';
UPDATE ogrenciler 
SET isletme_id = s.isletme_id
FROM stajlar s
WHERE ogrenciler.id = s.ogrenci_id 
AND s.durum = 'aktif'
AND s.fesih_tarihi IS NULL; 

-- Migration 011
ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS dosya_url TEXT;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('belgeler', 'belgeler', true, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'belgeler');
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'belgeler');
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (bucket_id = 'belgeler');
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'belgeler'); 

-- Migration 012
ALTER TABLE dekontlar
ADD COLUMN IF NOT EXISTS ogrenci_id INTEGER REFERENCES ogrenciler(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS odeme_son_tarihi DATE NOT NULL,
ADD COLUMN IF NOT EXISTS onay_durumu VARCHAR(50) DEFAULT 'BEKLEMEDE' CHECK (onay_durumu IN ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI')),
ADD COLUMN IF NOT EXISTS ay INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS yil INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS onaylayan_ogretmen_id INTEGER REFERENCES ogretmenler(id),
ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
ADD COLUMN IF NOT EXISTS red_nedeni TEXT;
CREATE INDEX IF NOT EXISTS idx_dekontlar_ogrenci ON dekontlar(ogrenci_id);
CREATE INDEX IF NOT EXISTS idx_dekontlar_isletme ON dekontlar(isletme_id);
CREATE INDEX IF NOT EXISTS idx_dekontlar_ay_yil ON dekontlar(ay, yil);
CREATE INDEX IF NOT EXISTS idx_dekontlar_onay_durumu ON dekontlar(onay_durumu);
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını görebilir"
ON dekontlar FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM ogrenciler o
        WHERE o.id = dekontlar.ogrenci_id
        AND o.ogretmen_id = auth.uid()
    )
);
CREATE POLICY "Öğretmenler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM ogrenciler o
        WHERE o.id = dekontlar.ogrenci_id
        AND o.ogretmen_id = auth.uid()
    )
);
CREATE POLICY "İşletmeler kendi dekontlarını görebilir"
ON dekontlar FOR SELECT
USING (isletme_id = auth.uid());
CREATE POLICY "İşletmeler kendi dekontlarını ekleyebilir"
ON dekontlar FOR INSERT
WITH CHECK (isletme_id = auth.uid());
CREATE OR REPLACE FUNCTION update_dekont_onay_tarihi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onay_durumu != OLD.onay_durumu THEN
        IF NEW.onay_durumu = 'ONAYLANDI' THEN
            NEW.onay_tarihi = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER dekont_onay_durumu_degistiginde
    BEFORE UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION update_dekont_onay_tarihi(); 

-- Migration 013
ALTER TABLE dekontlar
ADD COLUMN IF NOT EXISTS odeme_son_tarihi DATE,
ADD COLUMN IF NOT EXISTS ay INTEGER,
ADD COLUMN IF NOT EXISTS yil INTEGER,
ADD COLUMN IF NOT EXISTS onaylayan_ogretmen_id INTEGER REFERENCES ogretmenler(id),
ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
ADD COLUMN IF NOT EXISTS red_nedeni TEXT;
UPDATE dekontlar
SET odeme_son_tarihi = odeme_tarihi + INTERVAL '10 days',
    ay = EXTRACT(MONTH FROM odeme_tarihi)::INTEGER,
    yil = EXTRACT(YEAR FROM odeme_tarihi)::INTEGER;
ALTER TABLE dekontlar
ALTER COLUMN odeme_son_tarihi SET NOT NULL,
ALTER COLUMN ay SET NOT NULL,
ALTER COLUMN yil SET NOT NULL;
CREATE OR REPLACE FUNCTION set_default_dekont_values()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.odeme_son_tarihi IS NULL THEN
        NEW.odeme_son_tarihi := NEW.odeme_tarihi + INTERVAL '10 days';
    END IF;
    IF NEW.ay IS NULL THEN
        NEW.ay := EXTRACT(MONTH FROM NEW.odeme_tarihi)::INTEGER;
    END IF;
    IF NEW.yil IS NULL THEN
        NEW.yil := EXTRACT(YEAR FROM NEW.odeme_tarihi)::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_set_default_dekont_values
    BEFORE INSERT OR UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION set_default_dekont_values(); 

-- Migration 013 fix
UPDATE dekontlar
SET odeme_son_tarihi = odeme_tarihi + INTERVAL '10 days'
WHERE odeme_son_tarihi IS NULL;
ALTER TABLE dekontlar
ALTER COLUMN odeme_son_tarihi SET NOT NULL;
UPDATE dekontlar
SET ay = EXTRACT(MONTH FROM odeme_tarihi)::INTEGER
WHERE ay IS NULL;
UPDATE dekontlar
SET yil = EXTRACT(YEAR FROM odeme_tarihi)::INTEGER
WHERE yil IS NULL;
ALTER TABLE dekontlar
ALTER COLUMN ay SET NOT NULL,
ALTER COLUMN yil SET NOT NULL;
CREATE OR REPLACE FUNCTION set_default_odeme_son_tarihi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.odeme_son_tarihi IS NULL THEN
        NEW.odeme_son_tarihi := NEW.odeme_tarihi + INTERVAL '10 days';
    END IF;
    IF NEW.ay IS NULL THEN
        NEW.ay := EXTRACT(MONTH FROM NEW.odeme_tarihi)::INTEGER;
    END IF;
    IF NEW.yil IS NULL THEN
        NEW.yil := EXTRACT(YEAR FROM NEW.odeme_tarihi)::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_set_default_odeme_son_tarihi
    BEFORE INSERT OR UPDATE ON dekontlar
    FOR EACH ROW
    EXECUTE FUNCTION set_default_odeme_son_tarihi(); 

-- Migration 014
DROP POLICY IF EXISTS "Öğretmenler dekontları onaylayabilir" ON dekontlar;
CREATE POLICY "Öğretmenler kendi öğrencilerinin dekontlarını sadece görüntüleyebilir"
ON dekontlar FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM stajlar s
        JOIN ogrenciler o ON o.id = s.ogrenci_id
        JOIN ogretmenler og ON og.id = (auth.uid())::integer
        WHERE s.ogrenci_id = dekontlar.ogrenci_id
        AND s.ogretmen_id = og.id
    )
);
CREATE POLICY "Yöneticiler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM yoneticiler y 
        WHERE y.id = (auth.uid())::integer
    )
); 

-- Migration 015
ALTER TABLE admin_kullanicilar ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE ogretmenler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE isletmeler ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE isletmeler i 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE i.ogretmen_id = o.id;
ALTER TABLE stajlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE stajlar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;
ALTER TABLE dekontlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE dekontlar d 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE d.ogretmen_id = o.id;
ALTER TABLE siniflar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE siniflar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;
ALTER TABLE isletme_alanlar ADD COLUMN temp_koordinator_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_koordinator_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE ia.koordinator_ogretmen_id = o.id;
ALTER TABLE isletmeler DROP CONSTRAINT IF EXISTS fk_isletmeler_ogretmen;
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS fk_stajlar_ogretmen;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS fk_dekontlar_ogretmen;
ALTER TABLE siniflar DROP CONSTRAINT IF EXISTS fk_siniflar_ogretmen;
ALTER TABLE isletme_alanlar DROP CONSTRAINT IF EXISTS fk_isletme_alanlar_koordinator;
ALTER TABLE isletmeler DROP COLUMN ogretmen_id;
ALTER TABLE stajlar DROP COLUMN ogretmen_id;
ALTER TABLE dekontlar DROP COLUMN ogretmen_id;
ALTER TABLE siniflar DROP COLUMN ogretmen_id;
ALTER TABLE isletme_alanlar DROP COLUMN koordinator_ogretmen_id;
ALTER TABLE isletmeler RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE siniflar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE isletme_alanlar RENAME COLUMN temp_koordinator_uuid TO koordinator_ogretmen_id;
ALTER TABLE ogretmenler DROP CONSTRAINT ogretmenler_pkey CASCADE;
ALTER TABLE ogretmenler DROP COLUMN id;
ALTER TABLE ogretmenler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogretmenler ADD PRIMARY KEY (id);
ALTER TABLE admin_kullanicilar DROP CONSTRAINT admin_kullanicilar_pkey CASCADE;
ALTER TABLE admin_kullanicilar DROP COLUMN id;
ALTER TABLE admin_kullanicilar RENAME COLUMN uuid_id TO id;
ALTER TABLE admin_kullanicilar ADD PRIMARY KEY (id);
ALTER TABLE isletmeler ADD CONSTRAINT fk_isletmeler_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE stajlar ADD CONSTRAINT fk_stajlar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE dekontlar ADD CONSTRAINT fk_dekontlar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE siniflar ADD CONSTRAINT fk_siniflar_ogretmen FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE isletme_alanlar ADD CONSTRAINT fk_isletme_alanlar_koordinator FOREIGN KEY (koordinator_ogretmen_id) REFERENCES ogretmenler(id);
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

-- Migration 015 teacher
ALTER TABLE ogretmenler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE isletmeler ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE isletmeler i 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE i.ogretmen_id = o.id;
ALTER TABLE stajlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE stajlar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;
ALTER TABLE dekontlar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE dekontlar d 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE d.ogretmen_id = o.id;
ALTER TABLE siniflar ADD COLUMN temp_ogretmen_uuid UUID;
UPDATE siniflar s 
SET temp_ogretmen_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE s.ogretmen_id = o.id;
ALTER TABLE isletme_alanlar ADD COLUMN temp_koordinator_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_koordinator_uuid = o.uuid_id 
FROM ogretmenler o 
WHERE ia.koordinator_ogretmen_id = o.id;
ALTER TABLE isletmeler DROP CONSTRAINT IF EXISTS isletmeler_ogretmen_id_fkey;
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogretmen_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_ogretmen_id_fkey;
ALTER TABLE isletmeler DROP COLUMN ogretmen_id;
ALTER TABLE stajlar DROP COLUMN ogretmen_id;
ALTER TABLE dekontlar DROP COLUMN ogretmen_id;
ALTER TABLE isletmeler RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE stajlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE dekontlar RENAME COLUMN temp_ogretmen_uuid TO ogretmen_id;
ALTER TABLE ogretmenler DROP CONSTRAINT ogretmenler_pkey CASCADE;
ALTER TABLE ogretmenler DROP COLUMN id;
ALTER TABLE ogretmenler RENAME COLUMN uuid_id TO id;
ALTER TABLE ogretmenler ADD PRIMARY KEY (id);
ALTER TABLE isletmeler ADD CONSTRAINT isletmeler_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_ogretmen_id_fkey FOREIGN KEY (ogretmen_id) REFERENCES ogretmenler(id);
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

-- Migration 016
ALTER TABLE yoneticiler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE dekontlar ADD COLUMN temp_yonetici_uuid UUID;
UPDATE dekontlar d 
SET temp_yonetici_uuid = y.uuid_id 
FROM yoneticiler y 
WHERE d.yonetici_id = y.id;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS fk_dekontlar_yonetici;
ALTER TABLE dekontlar DROP COLUMN yonetici_id;
ALTER TABLE dekontlar RENAME COLUMN temp_yonetici_uuid TO yonetici_id;
ALTER TABLE yoneticiler DROP CONSTRAINT yoneticiler_pkey CASCADE;
ALTER TABLE yoneticiler DROP COLUMN id;
ALTER TABLE yoneticiler RENAME COLUMN uuid_id TO id;
ALTER TABLE yoneticiler ADD PRIMARY KEY (id);
ALTER TABLE dekontlar ADD CONSTRAINT fk_dekontlar_yonetici FOREIGN KEY (yonetici_id) REFERENCES yoneticiler(id);
DROP POLICY IF EXISTS "Yöneticiler dekontları onaylayabilir" ON dekontlar;
CREATE POLICY "Yöneticiler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM yoneticiler y 
        WHERE y.id = auth.uid()::uuid
    )
); 

-- Migration 017
ALTER TABLE alanlar 
ADD COLUMN IF NOT EXISTS aktif BOOLEAN DEFAULT true;
UPDATE alanlar SET aktif = true WHERE aktif IS NULL; 

-- Migration 018
DROP TABLE IF EXISTS public.isletme_koordinatorler;
CREATE TABLE public.isletme_koordinatorler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    isletme_id uuid REFERENCES public.isletmeler(id) ON DELETE CASCADE,
    alan_id uuid REFERENCES public.alanlar(id) ON DELETE CASCADE,
    ogretmen_id uuid REFERENCES public.ogretmenler(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(isletme_id, alan_id)
);
ALTER TABLE public.isletme_koordinatorler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated kullanıcılar tüm işlemleri yapabilir"
    ON public.isletme_koordinatorler
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Öğretmenler kendi koordinatör kayıtlarını görebilir"
    ON public.isletme_koordinatorler
    FOR SELECT
    TO authenticated
    USING (
        ogretmen_id = auth.uid()
    ); 

-- Migration 019
ALTER TABLE isletmeler ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE stajlar ADD COLUMN temp_isletme_uuid UUID;
UPDATE stajlar s 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE s.isletme_id = i.id;
ALTER TABLE dekontlar ADD COLUMN temp_isletme_uuid UUID;
UPDATE dekontlar d 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE d.isletme_id = i.id;
ALTER TABLE ogrenciler ADD COLUMN temp_isletme_uuid UUID;
UPDATE ogrenciler o 
SET temp_isletme_uuid = i.uuid_id 
FROM isletmeler i 
WHERE o.isletme_id = i.id;
ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_isletme_id_fkey;
ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_isletme_id_fkey;
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_isletme_id_fkey;
ALTER TABLE stajlar DROP COLUMN isletme_id;
ALTER TABLE dekontlar DROP COLUMN isletme_id;
ALTER TABLE ogrenciler DROP COLUMN isletme_id;
ALTER TABLE stajlar RENAME COLUMN temp_isletme_uuid TO isletme_id;
ALTER TABLE dekontlar RENAME COLUMN temp_isletme_uuid TO isletme_id;
ALTER TABLE ogrenciler RENAME COLUMN temp_isletme_uuid TO isletme_id;
ALTER TABLE isletmeler DROP CONSTRAINT isletmeler_pkey CASCADE;
ALTER TABLE isletmeler DROP COLUMN id;
ALTER TABLE isletmeler RENAME COLUMN uuid_id TO id;
ALTER TABLE isletmeler ADD PRIMARY KEY (id);
ALTER TABLE stajlar ADD CONSTRAINT stajlar_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id);
ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id);
ALTER TABLE ogrenciler ADD CONSTRAINT ogrenciler_isletme_id_fkey FOREIGN KEY (isletme_id) REFERENCES isletmeler(id); 

-- Migration 020
ALTER TABLE alanlar ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
ALTER TABLE ogrenciler ADD COLUMN temp_alan_uuid UUID;
UPDATE ogrenciler o 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE o.alan_id = a.id;
ALTER TABLE ogretmenler ADD COLUMN temp_alan_uuid UUID;
UPDATE ogretmenler o 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE o.alan_id = a.id;
ALTER TABLE siniflar ADD COLUMN temp_alan_uuid UUID;
UPDATE siniflar s 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE s.alan_id = a.id;
ALTER TABLE isletme_alanlar ADD COLUMN temp_alan_uuid UUID;
UPDATE isletme_alanlar ia 
SET temp_alan_uuid = a.uuid_id 
FROM alanlar a 
WHERE ia.alan_id = a.id;
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_alan_id_fkey;
ALTER TABLE ogretmenler DROP CONSTRAINT IF EXISTS ogretmenler_alan_id_fkey;
ALTER TABLE siniflar DROP CONSTRAINT IF EXISTS siniflar_alan_id_fkey;
ALTER TABLE isletme_alanlar DROP CONSTRAINT IF EXISTS isletme_alanlar_alan_id_fkey;
ALTER TABLE ogrenciler DROP COLUMN alan_id;
ALTER TABLE ogretmenler DROP COLUMN alan_id;
ALTER TABLE siniflar DROP COLUMN alan_id;
ALTER TABLE isletme_alanlar DROP COLUMN alan_id;
ALTER TABLE ogrenciler RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE ogretmenler RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE siniflar RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE isletme_alanlar RENAME COLUMN temp_alan_uuid TO alan_id;
ALTER TABLE alanlar DROP CONSTRAINT alanlar_pkey CASCADE;
ALTER TABLE alanlar DROP COLUMN id;
ALTER TABLE alanlar RENAME COLUMN uuid_id TO id;
ALTER TABLE alanlar ADD PRIMARY KEY (id);
ALTER TABLE ogrenciler ADD CONSTRAINT ogrenciler_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE ogretmenler ADD CONSTRAINT ogretmenler_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE siniflar ADD CONSTRAINT siniflar_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id);
ALTER TABLE isletme_alanlar ADD CONSTRAINT isletme_alanlar_alan_id_fkey FOREIGN KEY (alan_id) REFERENCES alanlar(id); 

-- Migration 021
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stajlar' 
        AND column_name = 'id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_pkey CASCADE;
        ALTER TABLE stajlar DROP COLUMN IF EXISTS id;
        ALTER TABLE stajlar RENAME COLUMN uuid_id TO id;
        ALTER TABLE stajlar ADD PRIMARY KEY (id);
    END IF;
END $$;
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dekontlar' 
        AND column_name = 'id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_pkey CASCADE;
        ALTER TABLE dekontlar DROP COLUMN IF EXISTS id;
        ALTER TABLE dekontlar RENAME COLUMN uuid_id TO id;
        ALTER TABLE dekontlar ADD PRIMARY KEY (id);
    END IF;
END $$;
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dekontlar' 
        AND column_name = 'staj_id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS temp_staj_uuid UUID;
        ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_staj_id_fkey;
        UPDATE dekontlar d 
        SET temp_staj_uuid = s.id 
        FROM stajlar s 
        WHERE d.staj_id = s.id::bigint;
        ALTER TABLE dekontlar DROP COLUMN staj_id;
        ALTER TABLE dekontlar RENAME COLUMN temp_staj_uuid TO staj_id;
        ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_staj_id_fkey 
        FOREIGN KEY (staj_id) REFERENCES stajlar(id);
    END IF;
END $$;
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stajlar' 
        AND column_name = 'ogrenci_id' 
        AND data_type = 'bigint'
    ) THEN
        ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
        ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogrenci_id_fkey;
        UPDATE stajlar s 
        SET temp_ogrenci_uuid = o.id 
        FROM ogrenciler o 
        WHERE s.ogrenci_id = o.id::bigint;
        ALTER TABLE stajlar DROP COLUMN ogrenci_id;
        ALTER TABLE stajlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;
        ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogrenci_id_fkey 
        FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);
    END IF;
END $$; 

-- Migration 022
CREATE OR REPLACE FUNCTION check_isletme_pin_giris(
  p_isletme_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_isletme RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_isletme
  FROM isletmeler
  WHERE id = p_isletme_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'İşletme bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM isletme_giris_denemeleri
  WHERE isletme_id = p_isletme_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_isletme.pin = p_girilen_pin THEN
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(
  p_ogretmen_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_ogretmen
  FROM ogretmenler
  WHERE id = p_ogretmen_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_ogretmen.pin = p_girilen_pin THEN
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TABLE IF NOT EXISTS isletme_giris_denemeleri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id UUID REFERENCES isletmeler(id),
  giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_adresi TEXT,
  user_agent TEXT,
  basarili BOOLEAN DEFAULT false,
  kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS ogretmen_giris_denemeleri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ogretmen_id UUID REFERENCES ogretmenler(id),
  giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_adresi TEXT,
  user_agent TEXT,
  basarili BOOLEAN DEFAULT false,
  kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
); 

-- Migration 023
DROP FUNCTION IF EXISTS check_isletme_pin_giris(uuid,text,text,text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(uuid,text,text,text);
CREATE OR REPLACE FUNCTION check_isletme_pin_giris(
  p_isletme_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_isletme RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_isletme
  FROM isletmeler
  WHERE id = p_isletme_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'İşletme bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM isletme_giris_denemeleri
  WHERE isletme_id = p_isletme_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_isletme.pin = p_girilen_pin THEN
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(
  p_ogretmen_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_ogretmen
  FROM ogretmenler
  WHERE id = p_ogretmen_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_ogretmen.pin = p_girilen_pin THEN
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Migration 024
DROP FUNCTION IF EXISTS check_isletme_pin_giris(uuid, text, text, text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(uuid, text, text, text);
CREATE FUNCTION check_isletme_pin_giris(
  p_isletme_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_isletme RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_isletme
  FROM isletmeler
  WHERE id = p_isletme_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'İşletme bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM isletme_giris_denemeleri
  WHERE isletme_id = p_isletme_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_isletme.pin = p_girilen_pin THEN
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO isletme_giris_denemeleri (
      isletme_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_isletme_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE FUNCTION check_ogretmen_pin_giris(
  p_ogretmen_id UUID,
  p_girilen_pin TEXT,
  p_ip_adresi TEXT,
  p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
  v_ogretmen RECORD;
  v_yanlis_giris_sayisi INTEGER;
  v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
  v_son_giris_denemesi TIMESTAMP;
  v_kilitlenme_tarihi TIMESTAMP;
BEGIN
  SELECT * INTO v_ogretmen
  FROM ogretmenler
  WHERE id = p_ogretmen_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Öğretmen bulunamadı.',
      'kilitli', false
    );
  END IF;
  SELECT 
    COUNT(*) as yanlis_giris,
    MAX(giris_tarihi) as son_deneme,
    MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
  INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
  FROM ogretmen_giris_denemeleri
  WHERE ogretmen_id = p_ogretmen_id
    AND giris_tarihi > NOW() - v_kilitlenme_suresi
    AND basarili = false;
  IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
    RETURN json_build_object(
      'basarili', false,
      'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
      'kilitli', true,
      'kilitlenme_tarihi', v_kilitlenme_tarihi
    );
  END IF;
  IF v_ogretmen.pin = p_girilen_pin THEN
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      true
    );
    RETURN json_build_object(
      'basarili', true,
      'mesaj', 'Giriş başarılı.',
      'kilitli', false
    );
  ELSE
    INSERT INTO ogretmen_giris_denemeleri (
      ogretmen_id,
      giris_tarihi,
      ip_adresi,
      user_agent,
      basarili,
      kilitlenme_tarihi
    ) VALUES (
      p_ogretmen_id,
      NOW(),
      p_ip_adresi,
      p_user_agent,
      false,
      CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
    RETURN json_build_object(
      'basarili', false,
      'mesaj', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
        ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
      END,
      'kilitli', v_yanlis_giris_sayisi >= 4,
      'kilitlenme_tarihi', CASE 
        WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
        ELSE NULL
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Migration 025
CREATE TABLE IF NOT EXISTS isletme_giris_denemeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isletme_id UUID REFERENCES isletmeler(id),
    giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_adresi TEXT,
    user_agent TEXT,
    basarili BOOLEAN DEFAULT false,
    kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ogretmen_giris_denemeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogretmen_id UUID REFERENCES ogretmenler(id),
    giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_adresi TEXT,
    user_agent TEXT,
    basarili BOOLEAN DEFAULT false,
    kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for login attempt tables
ALTER TABLE isletme_giris_denemeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmen_giris_denemeleri ENABLE ROW LEVEL SECURITY;

-- Create policies for login attempt tables
CREATE POLICY "Allow authenticated users to read login attempts"
ON isletme_giris_denemeleri FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read login attempts"
ON ogretmen_giris_denemeleri FOR SELECT
TO authenticated
USING (true);

-- Allow the functions to insert login attempts
CREATE POLICY "Allow function to insert login attempts"
ON isletme_giris_denemeleri FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow function to insert login attempts"
ON ogretmen_giris_denemeleri FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure the PIN verification functions are up to date
CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(
    p_ogretmen_id UUID,
    p_girilen_pin TEXT,
    p_ip_adresi TEXT,
    p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
    v_ogretmen RECORD;
    v_yanlis_giris_sayisi INTEGER;
    v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
    v_son_giris_denemesi TIMESTAMP;
    v_kilitlenme_tarihi TIMESTAMP;
BEGIN
    SELECT * INTO v_ogretmen
    FROM ogretmenler
    WHERE id = p_ogretmen_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Öğretmen bulunamadı.',
            'kilitli', false
        );
    END IF;
    
    SELECT
        COUNT(*) as yanlis_giris,
        MAX(giris_tarihi) as son_deneme,
        MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
    INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
    FROM ogretmen_giris_denemeleri
    WHERE ogretmen_id = p_ogretmen_id
        AND giris_tarihi > NOW() - v_kilitlenme_suresi
        AND basarili = false;
    
    IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
        RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
            'kilitli', true,
            'kilitlenme_tarihi', v_kilitlenme_tarihi
        );
    END IF;
    
    IF v_ogretmen.pin = p_girilen_pin THEN
        INSERT INTO ogretmen_giris_denemeleri (
            ogretmen_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili
        ) VALUES (
            p_ogretmen_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            true
        );
        RETURN json_build_object(
            'basarili', true,
            'mesaj', 'Giriş başarılı.',
            'kilitli', false
        );
    ELSE
        INSERT INTO ogretmen_giris_denemeleri (
            ogretmen_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili,
            kilitlenme_tarihi
        ) VALUES (
            p_ogretmen_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            false,
            CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
                ELSE NULL
            END
        );
        RETURN json_build_object(
            'basarili', false,
            'mesaj', CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
                ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
            END,
            'kilitli', v_yanlis_giris_sayisi >= 4,
            'kilitlenme_tarihi', CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
                ELSE NULL
            END
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration 026: System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode setting
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('maintenance_mode', 'false', 'System maintenance mode status')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert other default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('school_name', 'Hüsniye Özdilek MTAL', 'School name displayed throughout the system'),
('email_notifications', 'true', 'Enable email notifications'),
('auto_approval', 'false', 'Enable automatic approval for dekontlar'),
('max_file_size', '5', 'Maximum file size in MB'),
('allowed_file_types', 'pdf,jpg,png', 'Allowed file types for uploads')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admin access
CREATE POLICY "Admin can manage system settings" ON public.system_settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create policy to allow authenticated users to read settings
CREATE POLICY "Authenticated users can read system settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- Create function to update system settings
CREATE OR REPLACE FUNCTION update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin (you may need to adjust this check based on your auth system)
    
    UPDATE public.system_settings
    SET setting_value = p_setting_value, updated_at = NOW()
    WHERE setting_key = p_setting_key;
    
    IF NOT FOUND THEN
        INSERT INTO public.system_settings (setting_key, setting_value)
        VALUES (p_setting_key, p_setting_value);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Create function to get system setting
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT setting_value INTO result
    FROM public.system_settings
    WHERE setting_key = p_setting_key;
    
    RETURN COALESCE(result, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION check_isletme_pin_giris(
    p_isletme_id UUID,
    p_girilen_pin TEXT,
    p_ip_adresi TEXT,
    p_user_agent TEXT
) RETURNS JSON AS $$
DECLARE
    v_isletme RECORD;
    v_yanlis_giris_sayisi INTEGER;
    v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
    v_son_giris_denemesi TIMESTAMP;
    v_kilitlenme_tarihi TIMESTAMP;
BEGIN
    SELECT * INTO v_isletme
    FROM isletmeler
    WHERE id = p_isletme_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'basarili', false,
            'mesaj', 'İşletme bulunamadı.',
            'kilitli', false
        );
    END IF;
    
    SELECT
        COUNT(*) as yanlis_giris,
        MAX(giris_tarihi) as son_deneme,
        MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
    INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
    FROM isletme_giris_denemeleri
    WHERE isletme_id = p_isletme_id
        AND giris_tarihi > NOW() - v_kilitlenme_suresi
        AND basarili = false;
    
    IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
        RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
            'kilitli', true,
            'kilitlenme_tarihi', v_kilitlenme_tarihi
        );
    END IF;
    
    IF v_isletme.pin = p_girilen_pin THEN
        INSERT INTO isletme_giris_denemeleri (
            isletme_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili
        ) VALUES (
            p_isletme_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            true
        );
        RETURN json_build_object(
            'basarili', true,
            'mesaj', 'Giriş başarılı.',
            'kilitli', false
        );
    ELSE
        INSERT INTO isletme_giris_denemeleri (
            isletme_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili,
            kilitlenme_tarihi
        ) VALUES (
            p_isletme_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            false,
            CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
                ELSE NULL
            END
        );
        RETURN json_build_object(
            'basarili', false,
            'mesaj', CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
                ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
            END,
            'kilitli', v_yanlis_giris_sayisi >= 4,
            'kilitlenme_tarihi', CASE
                WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
                ELSE NULL
            END
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration 027: Duplicate Teachers Cleanup
-- Remove duplicate teachers (same name, different areas) and keep only one per person
WITH duplicate_teachers AS (
    SELECT
        ad,
        soyad,
        MIN(created_at) as first_created,
        COUNT(*) as duplicate_count
    FROM ogretmenler
    GROUP BY ad, soyad
    HAVING COUNT(*) > 1
),
teachers_to_keep AS (
    SELECT DISTINCT ON (o.ad, o.soyad)
        o.id,
        o.ad,
        o.soyad,
        o.pin,
        o.created_at,
        o.aktif
    FROM ogretmenler o
    INNER JOIN duplicate_teachers dt ON o.ad = dt.ad AND o.soyad = dt.soyad
    ORDER BY o.ad, o.soyad, o.created_at ASC
),
teachers_to_delete AS (
    SELECT o.id
    FROM ogretmenler o
    INNER JOIN duplicate_teachers dt ON o.ad = dt.ad AND o.soyad = dt.soyad
    WHERE o.id NOT IN (SELECT id FROM teachers_to_keep)
)
-- Update foreign key references before deleting duplicates
UPDATE isletmeler SET ogretmen_id = (
    SELECT ttk.id
    FROM teachers_to_keep ttk
    INNER JOIN ogretmenler old_o ON ttk.ad = old_o.ad AND ttk.soyad = old_o.soyad
    WHERE old_o.id = isletmeler.ogretmen_id
    LIMIT 1
) WHERE ogretmen_id IN (SELECT id FROM teachers_to_delete);

UPDATE stajlar SET ogretmen_id = (
    SELECT ttk.id
    FROM teachers_to_keep ttk
    INNER JOIN ogretmenler old_o ON ttk.ad = old_o.ad AND ttk.soyad = old_o.soyad
    WHERE old_o.id = stajlar.ogretmen_id
    LIMIT 1
) WHERE ogretmen_id IN (SELECT id FROM teachers_to_delete);

UPDATE dekontlar SET ogretmen_id = (
    SELECT ttk.id
    FROM teachers_to_keep ttk
    INNER JOIN ogretmenler old_o ON ttk.ad = old_o.ad AND ttk.soyad = old_o.soyad
    WHERE old_o.id = dekontlar.ogretmen_id
    LIMIT 1
) WHERE ogretmen_id IN (SELECT id FROM teachers_to_delete);

-- Update login attempts table
UPDATE ogretmen_giris_denemeleri SET ogretmen_id = (
    SELECT ttk.id
    FROM teachers_to_keep ttk
    INNER JOIN ogretmenler old_o ON ttk.ad = old_o.ad AND ttk.soyad = old_o.soyad
    WHERE old_o.id = ogretmen_giris_denemeleri.ogretmen_id
    LIMIT 1
) WHERE ogretmen_id IN (SELECT id FROM teachers_to_delete);

-- Update coordination table if exists
UPDATE isletme_koordinatorler SET ogretmen_id = (
    SELECT ttk.id
    FROM teachers_to_keep ttk
    INNER JOIN ogretmenler old_o ON ttk.ad = old_o.ad AND ttk.soyad = old_o.soyad
    WHERE old_o.id = isletme_koordinatorler.ogretmen_id
    LIMIT 1
) WHERE ogretmen_id IN (SELECT id FROM teachers_to_delete);

-- Now delete duplicate teachers
DELETE FROM ogretmenler WHERE id IN (SELECT id FROM teachers_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE ogretmenler ADD CONSTRAINT unique_teacher_name UNIQUE (ad, soyad);

-- Update sample data to ensure no duplicates in future migrations
-- Reset default teachers with proper data
INSERT INTO ogretmenler (ad, soyad, pin, aktif) VALUES
('Engin', 'Dalga', '1234', true),
('Ayşe', 'Şahin', '4321', true),
('Mehmet', 'Kaya', '5678', true),
('Zeynep', 'Yılmaz', '9999', true),
('Fatma', 'Demir', '8888', true)
ON CONFLICT (ad, soyad) DO NOTHING;

-- Log the cleanup results
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count remaining teachers
    SELECT COUNT(*) INTO duplicate_count FROM ogretmenler;
    RAISE NOTICE 'Duplicate teacher cleanup completed. Remaining teachers: %', duplicate_count;
END $$;