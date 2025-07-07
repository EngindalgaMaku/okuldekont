-- Koordinatör tablosunun durumunu kontrol et
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_name = 'ogrenci_koordinatorleri';

-- Eğer tablo varsa, sütunlarını kontrol et
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ogrenci_koordinatorleri' AND table_schema = 'public'
ORDER BY ordinal_position;

-- RLS politikalarını kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'ogrenci_koordinatorleri';