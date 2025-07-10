-- Drop existing table and related objects if they exist
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP FUNCTION IF EXISTS update_system_setting(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_system_setting(TEXT);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
('school_name', 'Hüsniye Özdilek MTAL', 'School name displayed throughout the system'),
('coordinator_deputy_head_name', '', 'Coordinator deputy head name for task documents'),
('email_notifications', 'true', 'Enable email notifications'),
('auto_approval', 'false', 'Enable automatic approval for dekontlar'),
('max_file_size', '5', 'Maximum file size in MB'),
('allowed_file_types', 'pdf,jpg,png', 'Allowed file types for uploads'),
('maintenance_mode', 'false', 'System maintenance mode status');

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on system_settings" ON public.system_settings
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO anon;
GRANT USAGE, SELECT ON SEQUENCE system_settings_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE system_settings_id_seq TO anon;

-- Create function to update system settings
CREATE OR REPLACE FUNCTION update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use upsert (INSERT ... ON CONFLICT)
    INSERT INTO public.system_settings (key, value, updated_at)
    VALUES (p_setting_key, p_setting_value, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_system_setting: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create function to get system setting
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT value INTO result
    FROM public.system_settings
    WHERE key = p_setting_key;
    
    RETURN COALESCE(result, NULL);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_system_setting: %', SQLERRM;
        RETURN NULL;
END;
$$;