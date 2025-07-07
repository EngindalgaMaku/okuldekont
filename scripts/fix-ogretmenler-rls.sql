-- Öğretmenler tablosu RLS politikalarını kontrol et ve düzelt

-- Mevcut politikaları göster
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ogretmenler';

-- Eğer öğretmenler tablosunda public okuma politikası yoksa ekle
DO $$
BEGIN
    -- Önce mevcut select politikasını kaldır (varsa)
    DROP POLICY IF EXISTS "ogretmenler_public_select" ON ogretmenler;
    
    -- Yeni public select politikası ekle
    CREATE POLICY "ogretmenler_public_select" ON ogretmenler
        FOR SELECT 
        USING (true);
        
    RAISE NOTICE 'Öğretmenler tablosu için public select politikası oluşturuldu';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Politika oluşturulurken hata: %', SQLERRM;
END
$$;

-- RLS durumunu kontrol et
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'ogretmenler';

-- Test sorgusu
SELECT COUNT(*) as toplam_ogretmen FROM ogretmenler;
SELECT id, ad, soyad FROM ogretmenler LIMIT 5;