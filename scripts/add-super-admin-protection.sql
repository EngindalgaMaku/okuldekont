-- Add database-level protection for super admin
-- This ensures super admin active status cannot be changed even at database level

-- Create a trigger function to prevent super admin aktif changes
CREATE OR REPLACE FUNCTION prevent_super_admin_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update and the user is super admin
    IF TG_OP = 'UPDATE' AND OLD.yetki_seviyesi = 'super_admin' THEN
        -- Don't allow aktif to be changed from true to false
        IF OLD.aktif = true AND NEW.aktif = false THEN
            RAISE EXCEPTION 'Süper admin aktif durumu değiştirilemez. Güvenlik koruması aktif.';
        END IF;
        
        -- Always keep super admin active
        NEW.aktif = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS protect_super_admin_status ON public.admin_kullanicilar;

-- Create trigger
CREATE TRIGGER protect_super_admin_status
    BEFORE UPDATE ON public.admin_kullanicilar
    FOR EACH ROW
    EXECUTE FUNCTION prevent_super_admin_deactivation();

-- Update the update_admin_user function to include this protection
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
DECLARE
    current_role VARCHAR(20);
BEGIN
    -- Check current user role
    SELECT yetki_seviyesi INTO current_role
    FROM public.admin_kullanicilar
    WHERE id = p_id;
    
    -- If user is super admin and trying to change aktif status, ignore it
    IF current_role = 'super_admin' AND p_aktif IS NOT NULL THEN
        -- Log the attempt but don't apply the change
        RAISE LOG 'Attempted to change super admin active status - blocked';
        -- Remove aktif from update
        p_aktif = NULL;
    END IF;
    
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