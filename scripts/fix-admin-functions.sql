-- Drop existing function and recreate with simpler approach
DROP FUNCTION IF EXISTS get_admin_users();

-- Create a simpler get_admin_users function
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', a.id,
            'ad', a.ad,
            'soyad', a.soyad,
            'email', a.email,
            'yetki_seviyesi', a.yetki_seviyesi,
            'aktif', a.aktif,
            'created_at', a.created_at,
            'updated_at', a.updated_at
        )
        ORDER BY a.created_at DESC
    ) INTO result
    FROM public.admin_kullanicilar a;
    
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_admin_users: %', SQLERRM;
        RETURN '[]'::json;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users() TO anon;

-- Test the function
SELECT get_admin_users();