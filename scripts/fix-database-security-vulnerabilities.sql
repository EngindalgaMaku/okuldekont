-- 🔒 DATABASE SECURITY FIXES
-- Fixes "Function Search Path Mutable" vulnerabilities
-- Execute this in Supabase SQL Editor to secure all functions

-- ==========================================
-- CRITICAL SECURITY FIX
-- ==========================================
-- All functions must have SECURITY DEFINER SET search_path = ''
-- This prevents SQL injection through schema manipulation

-- ==========================================
-- STEP 1: DROP DEPENDENT OBJECTS
-- ==========================================
-- Drop triggers that depend on functions we need to recreate

DROP TRIGGER IF EXISTS protect_super_admin_status ON admin_kullanicilar;
DROP TRIGGER IF EXISTS protect_super_admin_status ON admin_users;
DROP TRIGGER IF EXISTS set_backup_updated_at ON backup_operations;

-- ==========================================
-- STEP 2: DROP EXISTING FUNCTIONS
-- ==========================================
-- Drop functions that need to be recreated with proper security

DROP FUNCTION IF EXISTS check_ogretmen_pin(text);
DROP FUNCTION IF EXISTS check_isletme_pin(text);
DROP FUNCTION IF EXISTS check_ogretmen_pin_giris(text);
DROP FUNCTION IF EXISTS check_isletme_pin_giris(text);
DROP FUNCTION IF EXISTS check_ogretmen_kilit_durumu(uuid);
DROP FUNCTION IF EXISTS check_installation_status();
DROP FUNCTION IF EXISTS complete_installation();
DROP FUNCTION IF EXISTS start_installation();
DROP FUNCTION IF EXISTS reset_installation();
DROP FUNCTION IF EXISTS is_user_admin(text);
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS get_system_setting(text);
DROP FUNCTION IF EXISTS update_system_setting(text, text);
DROP FUNCTION IF EXISTS cleanup_expired_anonymous_users();
DROP FUNCTION IF EXISTS get_gorev_belgeleri_detayli();
DROP FUNCTION IF EXISTS prevent_super_admin_deactivation();
DROP FUNCTION IF EXISTS update_backup_operations_updated_at();

-- ==========================================
-- STEP 2: RECREATE WITH SECURITY
-- ==========================================

-- ==========================================
-- 1. PERFORMANCE FUNCTIONS
-- ==========================================

-- Fix get_estimated_count function
CREATE OR REPLACE FUNCTION get_estimated_count(table_name text)
RETURNS integer 
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    result integer;
BEGIN
    EXECUTE format('SELECT (reltuples::bigint) FROM pg_class WHERE relname = %L', table_name) INTO result;
    RETURN COALESCE(result, 0);
END;
$$;

-- ==========================================
-- 2. AUTHENTICATION FUNCTIONS
-- ==========================================

-- Fix check_ogretmen_pin function
CREATE OR REPLACE FUNCTION check_ogretmen_pin(input_pin text)
RETURNS TABLE(
    id uuid,
    ad text,
    soyad text,
    email text,
    telefon text,
    alan_id bigint,
    pin text
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.ad, o.soyad, o.email, o.telefon, o.alan_id, o.pin
    FROM public.ogretmenler o
    WHERE o.pin = input_pin;
END;
$$;

-- Fix check_isletme_pin function  
CREATE OR REPLACE FUNCTION check_isletme_pin(input_pin text)
RETURNS TABLE(
    id uuid,
    ad text,
    email text,
    telefon text,
    adres text,
    pin text
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.ad, i.email, i.telefon, i.adres, i.pin
    FROM public.isletmeler i
    WHERE i.pin = input_pin;
END;
$$;

-- Fix check_ogretmen_pin_giris function
CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(input_pin text)
RETURNS TABLE(
    id uuid,
    ad text,
    soyad text,
    email text,
    alan_id bigint,
    kilit_durumu boolean,
    yanlis_giris_sayisi integer
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.ad, o.soyad, o.email, o.alan_id, 
           COALESCE(o.kilit_durumu, false) as kilit_durumu,
           COALESCE(o.yanlis_giris_sayisi, 0) as yanlis_giris_sayisi
    FROM public.ogretmenler o
    WHERE o.pin = input_pin;
END;
$$;

-- Fix check_isletme_pin_giris function
CREATE OR REPLACE FUNCTION check_isletme_pin_giris(input_pin text)
RETURNS TABLE(
    id uuid,
    ad text,
    email text,
    telefon text,
    kilit_durumu boolean,
    yanlis_giris_sayisi integer
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.ad, i.email, i.telefon,
           COALESCE(i.kilit_durumu, false) as kilit_durumu,
           COALESCE(i.yanlis_giris_sayisi, 0) as yanlis_giris_sayisi
    FROM public.isletmeler i
    WHERE i.pin = input_pin;
END;
$$;

-- Fix check_ogretmen_kilit_durumu function
CREATE OR REPLACE FUNCTION check_ogretmen_kilit_durumu(ogretmen_id uuid)
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    kilit_var boolean := false;
BEGIN
    SELECT COALESCE(kilit_durumu, false) 
    INTO kilit_var
    FROM public.ogretmenler 
    WHERE id = ogretmen_id;
    
    RETURN kilit_var;
END;
$$;

-- ==========================================
-- 3. INSTALLATION FUNCTIONS  
-- ==========================================

-- Fix check_installation_status function
CREATE OR REPLACE FUNCTION check_installation_status()
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    is_installed boolean := false;
BEGIN
    SELECT COALESCE(
        (SELECT value::boolean FROM public.system_settings WHERE key = 'installation_complete'), 
        false
    ) INTO is_installed;
    
    RETURN is_installed;
END;
$$;

-- Fix complete_installation function
CREATE OR REPLACE FUNCTION complete_installation()
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES ('installation_complete', 'true', NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = 'true', updated_at = NOW();
    
    RETURN true;
END;
$$;

-- Fix start_installation function
CREATE OR REPLACE FUNCTION start_installation()
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES ('installation_in_progress', 'true', NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = 'true', updated_at = NOW();
    
    RETURN true;
END;
$$;

-- Fix reset_installation function
CREATE OR REPLACE FUNCTION reset_installation()
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.system_settings 
    SET value = 'false', updated_at = NOW()
    WHERE key IN ('installation_complete', 'installation_in_progress');
    
    RETURN true;
END;
$$;

-- ==========================================
-- 4. ADMIN USER FUNCTIONS
-- ==========================================

-- Fix is_user_admin function
CREATE OR REPLACE FUNCTION is_user_admin(user_email text)
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    admin_count integer := 0;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM public.admin_users 
    WHERE email = user_email AND active = true;
    
    RETURN admin_count > 0;
END;
$$;

-- Fix get_admin_users function
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
    id uuid,
    email text,
    created_at timestamptz,
    active boolean,
    super_admin boolean
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.email, a.created_at, a.active, a.super_admin
    FROM public.admin_users a
    ORDER BY a.created_at DESC;
END;
$$;

-- ==========================================
-- 5. SYSTEM SETTINGS FUNCTIONS
-- ==========================================

-- Fix get_system_setting function
CREATE OR REPLACE FUNCTION get_system_setting(setting_key text)
RETURNS text
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    setting_value text;
BEGIN
    SELECT value INTO setting_value
    FROM public.system_settings
    WHERE key = setting_key;
    
    RETURN setting_value;
END;
$$;

-- Fix update_system_setting function
CREATE OR REPLACE FUNCTION update_system_setting(setting_key text, setting_value text)
RETURNS boolean
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (setting_key, setting_value, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = setting_value, updated_at = NOW();
    
    RETURN true;
END;
$$;

-- ==========================================
-- 6. CLEANUP FUNCTIONS
-- ==========================================

-- Fix cleanup_expired_anonymous_users function
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS integer
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Delete anonymous users older than 24 hours
    DELETE FROM auth.users 
    WHERE email LIKE '%@anonymous.local' 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ==========================================
-- 7. GOREV BELGESI FUNCTIONS
-- ==========================================

-- Fix get_gorev_belgeleri_detayli function
CREATE OR REPLACE FUNCTION get_gorev_belgeleri_detayli()
RETURNS TABLE(
    id uuid,
    ogrenci_id uuid,
    ogretmen_id uuid,
    isletme_id uuid,
    baslangic_tarihi date,
    bitis_tarihi date,
    created_at timestamptz
)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.ogrenci_id, s.ogretmen_id, s.isletme_id, 
           s.baslangic_tarihi, s.bitis_tarihi, s.created_at
    FROM public.stajlar s
    ORDER BY s.created_at DESC;
END;
$$;

-- ==========================================
-- 8. SECURITY TRIGGER FUNCTIONS
-- ==========================================

-- Fix prevent_super_admin_deactivation function
CREATE OR REPLACE FUNCTION prevent_super_admin_deactivation()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    -- Prevent deactivating super admin
    IF OLD.super_admin = true AND NEW.active = false THEN
        RAISE EXCEPTION 'Super admin cannot be deactivated';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix update_backup_operations_updated_at function
CREATE OR REPLACE FUNCTION update_backup_operations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ==========================================
-- 9. GRANT NECESSARY PERMISSIONS
-- ==========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_estimated_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ogretmen_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_isletme_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ogretmen_pin_giris(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_isletme_pin_giris(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ogretmen_kilit_durumu(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_installation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_setting(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gorev_belgeleri_detayli() TO authenticated;

-- Grant admin-only functions to service role
GRANT EXECUTE ON FUNCTION complete_installation() TO service_role;
GRANT EXECUTE ON FUNCTION start_installation() TO service_role;
GRANT EXECUTE ON FUNCTION reset_installation() TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_users() TO service_role;
GRANT EXECUTE ON FUNCTION update_system_setting(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_anonymous_users() TO service_role;

-- ==========================================
-- 10. RECREATE TRIGGERS
-- ==========================================

-- Recreate super admin protection trigger (if admin_users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        CREATE TRIGGER protect_super_admin_status
        BEFORE UPDATE ON admin_users
        FOR EACH ROW
        EXECUTE FUNCTION prevent_super_admin_deactivation();
    END IF;
END $$;

-- Recreate trigger for admin_kullanicilar table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_kullanicilar') THEN
        CREATE TRIGGER protect_super_admin_status
        BEFORE UPDATE ON admin_kullanicilar
        FOR EACH ROW
        EXECUTE FUNCTION prevent_super_admin_deactivation();
    END IF;
END $$;

-- Recreate backup operations trigger (if backup_operations table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_operations') THEN
        CREATE TRIGGER set_backup_updated_at
        BEFORE UPDATE ON backup_operations
        FOR EACH ROW
        EXECUTE FUNCTION update_backup_operations_updated_at();
    END IF;
END $$;

-- ==========================================
-- 11. VERIFICATION QUERY
-- ==========================================

-- Check if all functions are now secure
SELECT
    proname as function_name,
    prosecdef as is_security_definer,
    proconfig as function_config
FROM pg_proc
WHERE proname IN (
    'get_estimated_count',
    'check_ogretmen_pin',
    'check_isletme_pin',
    'check_ogretmen_pin_giris',
    'check_isletme_pin_giris',
    'check_ogretmen_kilit_durumu',
    'check_installation_status',
    'complete_installation',
    'start_installation',
    'reset_installation',
    'is_user_admin',
    'get_admin_users',
    'get_system_setting',
    'update_system_setting',
    'cleanup_expired_anonymous_users',
    'get_gorev_belgeleri_detayli',
    'prevent_super_admin_deactivation',
    'update_backup_operations_updated_at'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ==========================================
-- SECURITY IMPROVEMENTS COMPLETED:
-- ==========================================
-- ✅ All functions now have SECURITY DEFINER SET search_path = ''
-- ✅ Prevents SQL injection through schema manipulation
-- ✅ Proper permission grants for different user roles
-- ✅ Essential functions recreated with security best practices
-- ✅ Triggers recreated after function dependencies resolved
--
-- Note: Some complex backup/restore functions may need
-- individual attention based on their specific logic