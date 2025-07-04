-- İşletme koordinatörleri tablosu
DROP TABLE IF EXISTS public.isletme_koordinatorler;

CREATE TABLE public.isletme_koordinatorler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    isletme_id uuid REFERENCES public.isletmeler(id) ON DELETE CASCADE,
    alan_id uuid REFERENCES public.alanlar(id) ON DELETE CASCADE,
    ogretmen_id uuid REFERENCES public.ogretmenler(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(isletme_id, alan_id) -- Bir işletmenin her alanı için sadece bir koordinatör olabilir
);

-- RLS politikaları
ALTER TABLE public.isletme_koordinatorler ENABLE ROW LEVEL SECURITY;

-- Tüm authenticated kullanıcılar için politika
CREATE POLICY "Authenticated kullanıcılar tüm işlemleri yapabilir"
    ON public.isletme_koordinatorler
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Öğretmen politikaları
CREATE POLICY "Öğretmenler kendi koordinatör kayıtlarını görebilir"
    ON public.isletme_koordinatorler
    FOR SELECT
    TO authenticated
    USING (
        ogretmen_id = auth.uid()
    ); 