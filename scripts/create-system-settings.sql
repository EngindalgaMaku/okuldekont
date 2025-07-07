-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode setting
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('maintenance_mode', 'false', 'System maintenance mode status')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert other default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('school_name', 'Hüsniye Özdilek MTAL', 'School name displayed throughout the system'),
('email_notifications', 'true', 'Enable email notifications'),
('auto_approval', 'false', 'Enable automatic approval for dekontlar'),
('max_file_size', '5', 'Maximum file size in MB'),
('allowed_file_types', 'pdf,jpg,png', 'Allowed file types for uploads')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admin access
CREATE POLICY "Admin can manage system settings" ON public.system_settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to update system settings
CREATE OR REPLACE FUNCTION update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin (you may need to adjust this check based on your auth system)
    
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

-- Create function to get system setting
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
END;
$$;