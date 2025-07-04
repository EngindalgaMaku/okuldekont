-- Öğretmenlerin dekont onaylama yetkisini kaldır
DROP POLICY IF EXISTS "Öğretmenler dekontları onaylayabilir" ON dekontlar;

-- Öğretmenler sadece görüntüleme yetkisine sahip olsun
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

-- Yöneticiler için onaylama politikası
CREATE POLICY "Yöneticiler dekontları onaylayabilir"
ON dekontlar FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM yoneticiler y 
        WHERE y.id = (auth.uid())::integer
    )
); 