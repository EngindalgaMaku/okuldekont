const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deployAuthCleanupFunctions() {
  console.log('🚀 Auth Cleanup Functions Deployment Started...')

  try {
    // 1. Create get_auth_user_statistics function
    console.log('📊 Creating get_auth_user_statistics function...')
    
    const statsFunction = `
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
        
        -- Get anonymous user count (users without email)
        SELECT COUNT(*) INTO anon_count 
        FROM auth.users 
        WHERE email IS NULL OR email = '';
        
        -- Get authenticated user count (users with email)
        SELECT COUNT(*) INTO auth_count 
        FROM auth.users 
        WHERE email IS NOT NULL AND email != '';
        
        -- Get expired anonymous users (older than 7 days)
        SELECT COUNT(*) INTO expired_count 
        FROM auth.users 
        WHERE (email IS NULL OR email = '') 
        AND created_at < NOW() - INTERVAL '7 days';
        
        -- Get last cleanup date (placeholder - you can implement cleanup logging)
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
    `

    const { error: statsError } = await supabase.rpc('exec_sql', { sql: statsFunction })
    if (statsError) {
      console.error('❌ Failed to create get_auth_user_statistics:', statsError.message)
      throw statsError
    }
    console.log('✅ get_auth_user_statistics function created successfully')

    // 2. Create cleanup_expired_anonymous_users function
    console.log('🧹 Creating cleanup_expired_anonymous_users function...')
    
    const cleanupFunction = `
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
        SELECT ARRAY(
          SELECT id 
          FROM auth.users 
          WHERE (email IS NULL OR email = '') 
          AND created_at < NOW() - INTERVAL '7 days'
          AND last_sign_in_at < NOW() - INTERVAL '7 days' OR last_sign_in_at IS NULL
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
        
        -- Delete expired anonymous users
        DELETE FROM auth.users 
        WHERE id = ANY(user_ids);
        
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
    `

    const { error: cleanupError } = await supabase.rpc('exec_sql', { sql: cleanupFunction })
    if (cleanupError) {
      console.error('❌ Failed to create cleanup_expired_anonymous_users:', cleanupError.message)
      throw cleanupError
    }
    console.log('✅ cleanup_expired_anonymous_users function created successfully')

    // 3. Test the functions
    console.log('🧪 Testing auth cleanup functions...')
    
    const { data: statsData, error: testStatsError } = await supabase.rpc('get_auth_user_statistics')
    if (testStatsError) {
      console.error('❌ Test failed for get_auth_user_statistics:', testStatsError.message)
      throw testStatsError
    }
    console.log('✅ get_auth_user_statistics test successful:', statsData)

    console.log('🎉 Auth Cleanup Functions Deployment Completed Successfully!')
    console.log('')
    console.log('📋 Functions Created:')
    console.log('  ✓ get_auth_user_statistics() - Returns auth user statistics')
    console.log('  ✓ cleanup_expired_anonymous_users() - Cleans up expired anonymous users')
    console.log('')
    console.log('🔧 You can now use the Auth Management tab in the admin panel!')

  } catch (error) {
    console.error('💥 Deployment failed:', error.message)
    process.exit(1)
  }
}

// Alternative deployment using direct SQL execution if RPC is not available
async function deployWithDirectSQL() {
  console.log('🔄 Attempting direct SQL deployment...')
  
  const fs = require('fs')
  const path = require('path')
  
  try {
    const sqlPath = path.join(__dirname, 'auth-cleanup-functions.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 Executing SQL file directly...')
    // Note: This would require a different approach in production
    console.log('⚠️  Please execute the SQL in scripts/auth-cleanup-functions.sql manually in Supabase SQL Editor')
    console.log('')
    console.log('SQL Content:')
    console.log('=' * 50)
    console.log(sqlContent)
    console.log('=' * 50)
    
  } catch (error) {
    console.error('❌ Failed to read SQL file:', error.message)
  }
}

// Run deployment
deployAuthCleanupFunctions().catch(() => {
  console.log('')
  console.log('⚠️  Primary deployment failed. Alternative approach:')
  deployWithDirectSQL()
})