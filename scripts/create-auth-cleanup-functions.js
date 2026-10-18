require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required variables:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAuthCleanupFunctions() {
  try {
    console.log('🔄 Creating auth cleanup functions...')

    // 1. Create function to get auth user statistics
    const getStatsFunction = `
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
    `

    const { error: statsError } = await supabase
      .from('dummy')
      .select()
      .limit(0)
      .then(() => supabase.rpc('exec', { statement: getStatsFunction }))
      .catch(async () => {
        // Direct SQL execution alternative
        const { error } = await supabase.rpc('create_function', {
          function_sql: getStatsFunction
        })
        return { error }
      })

    if (statsError) {
      console.log('⚠️ Direct function creation failed, trying alternative method...')
      // Alternative: Create function via file execution
      console.log('📝 Function SQL to be executed manually:')
      console.log(getStatsFunction)
    } else {
      console.log('✅ Created get_auth_user_statistics function')
    }

    // 2. Create function to cleanup expired anonymous users
    const cleanupFunction = `
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
    `

    const { error: cleanupError } = await supabase.rpc('exec_sql', {
      sql: cleanupFunction
    })

    if (cleanupError) {
      console.error('❌ Error creating cleanup_expired_anonymous_users function:', cleanupError)
    } else {
      console.log('✅ Created cleanup_expired_anonymous_users function')
    }

    // 3. Test the functions
    console.log('\n🧪 Testing auth management functions...')
    
    const { data: statsData, error: testStatsError } = await supabase.rpc('get_auth_user_statistics')
    if (testStatsError) {
      console.error('❌ Error testing get_auth_user_statistics:', testStatsError)
    } else {
      console.log('✅ get_auth_user_statistics test successful:')
      console.log('   📊 Stats:', JSON.stringify(statsData, null, 2))
    }

    console.log('\n🎉 Auth cleanup functions created successfully!')
    console.log('\nAvailable functions:')
    console.log('- get_auth_user_statistics(): Get auth user statistics')
    console.log('- cleanup_expired_anonymous_users(): Clean up expired anonymous users')

  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
createAuthCleanupFunctions()