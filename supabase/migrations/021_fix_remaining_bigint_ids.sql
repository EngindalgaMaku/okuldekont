-- Kalan bigint ID'leri UUID'ye dönüştürme
-- Stajlar tablosunu kontrol et ve güncelle
DO $$ 
BEGIN
    -- Stajlar tablosunda bigint olan kolonları kontrol et
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stajlar' 
        AND column_name = 'id' 
        AND data_type = 'bigint'
    ) THEN
        -- Geçici UUID kolonu ekle
        ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        
        -- Primary key kısıtlamasını kaldır
        ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_pkey CASCADE;
        
        -- ID kolonunu kaldır ve UUID kolonunu yeniden adlandır
        ALTER TABLE stajlar DROP COLUMN IF EXISTS id;
        ALTER TABLE stajlar RENAME COLUMN uuid_id TO id;
        
        -- Yeni primary key ekle
        ALTER TABLE stajlar ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Dekontlar tablosunu kontrol et ve güncelle
DO $$ 
BEGIN
    -- Dekontlar tablosunda bigint olan kolonları kontrol et
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dekontlar' 
        AND column_name = 'id' 
        AND data_type = 'bigint'
    ) THEN
        -- Geçici UUID kolonu ekle
        ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
        
        -- Primary key kısıtlamasını kaldır
        ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_pkey CASCADE;
        
        -- ID kolonunu kaldır ve UUID kolonunu yeniden adlandır
        ALTER TABLE dekontlar DROP COLUMN IF EXISTS id;
        ALTER TABLE dekontlar RENAME COLUMN uuid_id TO id;
        
        -- Yeni primary key ekle
        ALTER TABLE dekontlar ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Staj ID referanslarını güncelle
DO $$ 
BEGIN
    -- Dekontlar tablosunda staj_id kolonu varsa ve bigint ise
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dekontlar' 
        AND column_name = 'staj_id' 
        AND data_type = 'bigint'
    ) THEN
        -- Geçici UUID kolonu ekle
        ALTER TABLE dekontlar ADD COLUMN IF NOT EXISTS temp_staj_uuid UUID;
        
        -- Foreign key kısıtlamasını kaldır
        ALTER TABLE dekontlar DROP CONSTRAINT IF EXISTS dekontlar_staj_id_fkey;
        
        -- Staj ID'yi UUID'ye dönüştür
        UPDATE dekontlar d 
        SET temp_staj_uuid = s.id 
        FROM stajlar s 
        WHERE d.staj_id = s.id::bigint;
        
        -- Eski kolonu kaldır ve yeni kolonu yeniden adlandır
        ALTER TABLE dekontlar DROP COLUMN staj_id;
        ALTER TABLE dekontlar RENAME COLUMN temp_staj_uuid TO staj_id;
        
        -- Yeni foreign key kısıtlaması ekle
        ALTER TABLE dekontlar ADD CONSTRAINT dekontlar_staj_id_fkey 
        FOREIGN KEY (staj_id) REFERENCES stajlar(id);
    END IF;
END $$;

-- Öğrenci ID referanslarını güncelle
DO $$ 
BEGIN
    -- Stajlar tablosunda ogrenci_id kolonu varsa ve bigint ise
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stajlar' 
        AND column_name = 'ogrenci_id' 
        AND data_type = 'bigint'
    ) THEN
        -- Geçici UUID kolonu ekle
        ALTER TABLE stajlar ADD COLUMN IF NOT EXISTS temp_ogrenci_uuid UUID;
        
        -- Foreign key kısıtlamasını kaldır
        ALTER TABLE stajlar DROP CONSTRAINT IF EXISTS stajlar_ogrenci_id_fkey;
        
        -- Öğrenci ID'yi UUID'ye dönüştür
        UPDATE stajlar s 
        SET temp_ogrenci_uuid = o.id 
        FROM ogrenciler o 
        WHERE s.ogrenci_id = o.id::bigint;
        
        -- Eski kolonu kaldır ve yeni kolonu yeniden adlandır
        ALTER TABLE stajlar DROP COLUMN ogrenci_id;
        ALTER TABLE stajlar RENAME COLUMN temp_ogrenci_uuid TO ogrenci_id;
        
        -- Yeni foreign key kısıtlaması ekle
        ALTER TABLE stajlar ADD CONSTRAINT stajlar_ogrenci_id_fkey 
        FOREIGN KEY (ogrenci_id) REFERENCES ogrenciler(id);
    END IF;
END $$; 