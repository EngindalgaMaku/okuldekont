-- Fix RLS policies for system_settings table

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Admin can manage system settings" ON public.system_settings;

-- Create more permissive policy for system settings
CREATE POLICY "Allow all operations on system_settings" ON public.system_settings
    FOR ALL USING (true);

-- Grant full access to authenticated users (adjust as needed)
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO anon;

-- Grant usage on sequence
GRANT USAGE, SELECT ON SEQUENCE system_settings_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE system_settings_id_seq TO anon;

-- Update the functions to be more permissive
CREATE OR REPLACE FUNCTION update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use upsert (INSERT ... ON CONFLICT)
    INSERT INTO public.system_settings (setting_key, setting_value, updated_at)
    VALUES (p_setting_key, p_setting_value, NOW())
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        updated_at = EXCLUDED.updated_at;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_system_setting: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Update get function to be more robust
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key TEXT)
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_system_setting: %', SQLERRM;
        RETURN NULL;
END;
$$;