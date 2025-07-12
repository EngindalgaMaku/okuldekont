-- =====================================================
-- Auth Cleanup Functions for Supabase
-- =====================================================
-- Execute this in Supabase SQL Editor (Database > SQL Editor)
-- These functions provide auth user statistics and cleanup capabilities

-- Function 1: Get auth user statistics
CREATE OR REPLACE FUNCTION get_auth_user_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    anon_count INTEGER;
    auth_count INTEGER;
    expired_count INTEGER;
    last_cleanup TIMESTAMP;
BEGIN
    -- Get total user count
    SELECT COUNT(*) INTO total_count FROM auth.users;
    
    -- Get anonymous user count (users without email or with empty email)
    SELECT COUNT(*) INTO anon_count 
    FROM auth.users 
    WHERE email IS NULL OR email = '' OR email LIKE '%@example.com';
    
    -- Get authenticated user count (users with real email)
    SELECT COUNT(*) INTO auth_count 
    FROM auth.users 
    WHERE email IS NOT NULL AND email != '' AND email NOT LIKE '%@example.com';
    
    -- Get expired anonymous users (older than 1 day and no recent sign in)
    SELECT COUNT(*) INTO expired_count
    FROM auth.users
    WHERE (email IS NULL OR email = '' OR email LIKE '%@example.com')
    AND created_at < NOW() - INTERVAL '1 day'
    AND (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '1 day');
    
    -- Get last cleanup date (placeholder - implement cleanup logging if needed)
    last_cleanup := NULL;
    
    -- Build result JSON
    result := json_build_object(
        'total_users', total_count,
        'anonymous_users', anon_count,
        'authenticated_users', auth_count,
        'expired_anonymous', expired_count,
        'last_cleanup_date', last_cleanup
    );
    
    RETURN result;
END;
$$;

-- Function 2: Cleanup expired anonymous users
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    deleted_count INTEGER;
    user_ids UUID[];
BEGIN
    -- Get list of expired anonymous user IDs
    -- These are users without real email addresses and older than 1 day
    SELECT ARRAY(
        SELECT id
        FROM auth.users
        WHERE (email IS NULL OR email = '' OR email LIKE '%@example.com')
        AND created_at < NOW() - INTERVAL '1 day'
        AND (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '1 day')
        LIMIT 1000  -- Safety limit to prevent accidental mass deletion
    ) INTO user_ids;
    
    -- Count how many will be deleted
    deleted_count := array_length(user_ids, 1);
    
    -- If no users to delete, return early
    IF deleted_count IS NULL OR deleted_count = 0 THEN
        result := json_build_object(
            'success', true,
            'deleted_count', 0,
            'message', 'No expired anonymous users found'
        );
        RETURN result;
    END IF;
    
    -- Delete expired anonymous users (safely)
    DELETE FROM auth.users
    WHERE id = ANY(user_ids)
    AND (email IS NULL OR email = '' OR email LIKE '%@example.com')  -- Extra safety check
    AND created_at < NOW() - INTERVAL '1 day';
    
    -- Get actual deleted count
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Expired anonymous users cleaned up successfully'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'deleted_count', 0
        );
        RETURN result;
END;
$$;

-- Grant permissions to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION get_auth_user_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_anonymous_users() TO authenticated;

-- Test the functions (optional)
-- SELECT get_auth_user_statistics();
-- SELECT cleanup_expired_anonymous_users();

-- =====================================================
-- DEPLOYMENT NOTES:
-- =====================================================
-- 1. Copy and paste this entire SQL into Supabase SQL Editor
-- 2. Click "Run" to execute
-- 3. Verify functions are created successfully
-- 4. Test the auth management tab in admin panel
-- =====================================================