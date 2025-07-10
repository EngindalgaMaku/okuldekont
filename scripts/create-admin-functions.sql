-- Create or recreate admin_kullanicilar table if needed
CREATE TABLE IF NOT EXISTS public.admin_kullanicilar (
    id UUID PRIMARY KEY,
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    yetki_seviyesi VARCHAR(20) DEFAULT 'operator' CHECK (yetki_seviyesi IN ('operator', 'admin', 'super_admin')),
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_kullanicilar ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow admin operations" ON public.admin_kullanicilar;
CREATE POLICY "Allow admin operations" ON public.admin_kullanicilar
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.admin_kullanicilar TO authenticated;
GRANT ALL ON public.admin_kullanicilar TO anon;

-- Function to get admin users
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
    id UUID,
    ad VARCHAR(100),
    soyad VARCHAR(100),
    email VARCHAR(255),
    yetki_seviyesi VARCHAR(20),
    aktif BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.ad,
        a.soyad,
        a.email,
        a.yetki_seviyesi,
        a.aktif,
        a.created_at,
        a.updated_at
    FROM public.admin_kullanicilar a
    ORDER BY a.created_at DESC;
END;
$$;

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user(
    p_id UUID,
    p_ad VARCHAR(100),
    p_soyad VARCHAR(100),
    p_email VARCHAR(255),
    p_yetki_seviyesi VARCHAR(20) DEFAULT 'operator'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_kullanicilar (id, ad, soyad, email, yetki_seviyesi, aktif)
    VALUES (p_id, p_ad, p_soyad, p_email, p_yetki_seviyesi, true);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_admin_user: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function to update admin user
CREATE OR REPLACE FUNCTION update_admin_user(
    p_id UUID,
    p_ad VARCHAR(100) DEFAULT NULL,
    p_soyad VARCHAR(100) DEFAULT NULL,
    p_yetki_seviyesi VARCHAR(20) DEFAULT NULL,
    p_aktif BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.admin_kullanicilar
    SET 
        ad = COALESCE(p_ad, ad),
        soyad = COALESCE(p_soyad, soyad),
        yetki_seviyesi = COALESCE(p_yetki_seviyesi, yetki_seviyesi),
        aktif = COALESCE(p_aktif, aktif),
        updated_at = NOW()
    WHERE id = p_id;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_admin_user: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function to delete admin user
CREATE OR REPLACE FUNCTION delete_admin_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user info before deletion
    SELECT ad, soyad, yetki_seviyesi INTO user_record
    FROM public.admin_kullanicilar
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Kullanıcı bulunamadı'
        );
    END IF;
    
    -- Don't allow deletion of super admin
    IF user_record.yetki_seviyesi = 'super_admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Süper admin kullanıcısı silinemez'
        );
    END IF;
    
    -- Delete the user
    DELETE FROM public.admin_kullanicilar WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', format('%s %s başarıyla silindi', user_record.ad, user_record.soyad)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Kullanıcı silinirken hata: %s', SQLERRM)
        );
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS TABLE (
    is_admin BOOLEAN,
    yetki_seviyesi VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN a.id IS NOT NULL AND a.aktif = true THEN true ELSE false END as is_admin,
        a.yetki_seviyesi
    FROM public.admin_kullanicilar a
    WHERE a.id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, NULL::VARCHAR(20);
    END IF;
END;
$$;