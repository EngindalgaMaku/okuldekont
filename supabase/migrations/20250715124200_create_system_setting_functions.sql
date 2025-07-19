-- Drop existing functions safely to avoid signature conflicts
DROP FUNCTION IF EXISTS public.update_system_setting(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_system_setting(TEXT);

-- Create function to update system settings
CREATE OR REPLACE FUNCTION public.update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.system_settings 
    SET setting_value = p_setting_value, updated_at = NOW()
    WHERE setting_key = p_setting_key;
    
    IF NOT FOUND THEN
        INSERT INTO public.system_settings (setting_key, setting_value)
        VALUES (p_setting_key, p_setting_value);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_system_setting(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_system_setting(TEXT, TEXT) TO service_role;


-- Create function to get system setting
CREATE OR REPLACE FUNCTION public.get_system_setting(p_setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT setting_value INTO result
    FROM public.system_settings
    WHERE setting_key = p_setting_key;
    
    RETURN COALESCE(result, NULL);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO service_role;