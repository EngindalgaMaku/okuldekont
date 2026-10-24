-- Basit öğretmenler tablosu düzeltme scripti

-- Önce mevcut politikaları temizle
DROP POLICY IF EXISTS "ogretmenler_public_select" ON ogretmenler;
DROP POLICY IF EXISTS "Enable read access for all users" ON ogretmenler;
DROP POLICY IF EXISTS "ogretmenler_select_policy" ON ogretmenler;

-- Genel okuma politikası ekle
CREATE POLICY "ogretmenler_public_read" ON ogretmenler
    FOR SELECT 
    USING (true);

-- RLS'yi etkinleştir (eğer değilse)
ALTER TABLE ogretmenler ENABLE ROW LEVEL SECURITY;

-- Test sorguları
SELECT 'Politika durumu:' as info;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'ogretmenler';

SELECT 'Tablo durumu:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'ogretmenler';

SELECT 'Veri testi:' as info;
SELECT COUNT(*) as toplam_ogretmen FROM ogretmenler;

SELECT 'İlk 3 öğretmen:' as info;
SELECT id, ad, soyad FROM ogretmenler LIMIT 3;