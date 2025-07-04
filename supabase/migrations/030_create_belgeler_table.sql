CREATE TABLE IF NOT EXISTS public.belgeler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isletme_id UUID REFERENCES public.isletmeler(id) ON DELETE CASCADE NOT NULL,
    ad TEXT NOT NULL,
    tur TEXT NOT NULL,
    dosya_url TEXT,
    yukleme_tarihi TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.belgeler IS 'İşletmeler tarafından yüklenen sözleşme, fesih belgesi gibi dosyaları saklar.';

-- RLS Politikalarını Aktif Et
ALTER TABLE public.belgeler ENABLE ROW LEVEL SECURITY;

-- Saklama (Storage) Politikaları
-- 'belgeler' adlı bucket'ın public olduğundan emin olun.
-- Bu politikalar anonim kullanıcıların bile (PIN ile giriş yapanlar) dosya yüklemesine ve görmesine izin verir.

-- Anonim kullanıcılar dosya listeyebilir
CREATE POLICY "anon_select_belgeler" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'belgeler');

-- Anonim kullanıcılar dosya yükleyebilir
CREATE POLICY "anon_insert_belgeler" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'belgeler');

-- Veritabanı Tablo Politikaları

-- Adminler tüm belgelere erişebilir
CREATE POLICY "admin_all_access" ON public.belgeler
FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM public.get_user_role(auth.uid())) = true
);

-- İşletmeler kendi belgelerini yönetebilir
CREATE POLICY "isletme_manage_own_belgeler" ON public.belgeler
FOR ALL
TO authenticated
USING (
  (get_user_isletme_id(auth.uid())) = isletme_id
)
WITH CHECK (
  (get_user_isletme_id(auth.uid())) = isletme_id
);

-- İlgili öğretmenler, sorumlu oldukları işletmelerin belgelerini görebilir
CREATE POLICY "ogretmen_read_isletme_belgeler" ON public.belgeler
FOR SELECT
TO authenticated
USING (
  isletme_id IN (SELECT id FROM public.isletmeler WHERE ogretmen_id = (SELECT get_user_ogretmen_id(auth.uid())))
); 