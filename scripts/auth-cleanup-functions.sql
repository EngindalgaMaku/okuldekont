-- Auth Cleanup Functions for Supabase
-- Execute this SQL in Supabase SQL Editor

-- 1. Function to get auth user statistics
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
  -- Get total users
  SELECT COUNT(*) INTO total_count FROM auth.users;
  
  -- Get anonymous users (users with email like '%@anon.local')
  SELECT COUNT(*) INTO anon_count 
  FROM auth.users 
  WHERE email LIKE '%@anon.local' OR aud = 'anonymous';
  
  -- Get authenticated users
  SELECT COUNT(*) INTO auth_count 
  FROM auth.users 
  WHERE email NOT LIKE '%@anon.local' AND aud != 'anonymous';
  
  -- Get expired anonymous users (older than 7 days)
  SELECT COUNT(*) INTO expired_count 
  FROM auth.users 
  WHERE (email LIKE '%@anon.local' OR aud = 'anonymous')
    AND created_at < NOW() - INTERVAL '7 days';
  
  -- Get last cleanup date from system settings
  SELECT value::TIMESTAMP INTO last_cleanup 
  FROM system_settings 
  WHERE key = 'last_auth_cleanup_date';
  
  -- Build result
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

-- 2. Function to cleanup expired anonymous users
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  deleted_count INTEGER := 0;
  error_message TEXT;
BEGIN
  BEGIN
    -- Delete anonymous users older than 7 days
    WITH deleted_users AS (
      DELETE FROM auth.users 
      WHERE (email LIKE '%@anon.local' OR aud = 'anonymous')
        AND created_at < NOW() - INTERVAL '7 days'
      RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_users;
    
    -- Update last cleanup date
    INSERT INTO system_settings (key, value, description, updated_at)
    VALUES (
      'last_auth_cleanup_date', 
      NOW()::TEXT,
      'Last automatic auth cleanup date',
      NOW()
    )
    ON CONFLICT (key) 
    DO UPDATE SET 
      value = NOW()::TEXT,
      updated_at = NOW();
    
    -- Build success result
    result := json_build_object(
      'success', true,
      'deleted_count', deleted_count,
      'cleanup_date', NOW(),
      'message', format('Successfully deleted %s expired anonymous users', deleted_count)
    );
    
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    
    -- Build error result
    result := json_build_object(
      'success', false,
      'deleted_count', 0,
      'error', error_message,
      'message', 'Failed to cleanup anonymous users'
    );
  END;
  
  RETURN result;
END;
$$;

-- Test the functions
SELECT get_auth_user_statistics();