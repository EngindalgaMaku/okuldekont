-- Drop existing objects safely to ensure a clean slate
DROP FUNCTION IF EXISTS public.update_system_setting(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_system_setting(TEXT);
DROP TABLE IF EXISTS public.system_settings;

-- Create system_settings table with the correct schema
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
CREATE POLICY "Allow admin full access" ON public.system_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read settings" ON public.system_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
('school_name', 'Hüsniye Özdilek MTAL', 'Okul Adı'),
('coordinator_deputy_head_name', '', 'Koordinatör Müdür Yardımcısı Adı Soyadı'),
('email_notifications', 'true', 'E-posta Bildirimleri'),
('auto_approval', 'false', 'Otomatik Onay'),
('max_file_size', '5', 'Maksimum Dosya Boyutu (MB)'),
('allowed_file_types', 'pdf,jpg,png', 'İzin Verilen Dosya Türleri'),
('maintenance_mode', 'false', 'Bakım Modu'),
('show_performance_monitoring', 'false', 'Performans İzleme')
ON CONFLICT (key) DO NOTHING;

-- Create function to update system settings
CREATE OR REPLACE FUNCTION public.update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.system_settings 
    SET value = p_setting_value, updated_at = NOW()
    WHERE key = p_setting_key;
    
    IF NOT FOUND THEN
        INSERT INTO public.system_settings (key, value)
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
    SELECT value INTO result
    FROM public.system_settings
    WHERE key = p_setting_key;
    
    RETURN COALESCE(result, NULL);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO service_role;