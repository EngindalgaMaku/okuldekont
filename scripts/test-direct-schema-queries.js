import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectSchemaQueries() {
  console.log('🔍 Testing Direct Schema Queries...\n');

  // Test 1: Try to query triggers directly
  console.log('=== Testing Direct pg_trigger Query ===');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          p.proname as function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgisinternal = false
        ORDER BY c.relname, t.tgname;
      `
    });
    
    if (error) {
      console.log('❌ Error querying triggers:', error);
    } else {
      console.log('✅ Direct trigger query result:', data);
    }
  } catch (err) {
    console.log('❌ Exception querying triggers:', err.message);
  }

  // Test 2: Try to query indexes directly  
  console.log('\n=== Testing Direct pg_indexes Query ===');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%pkey'
        ORDER BY tablename, indexname;
      `
    });
    
    if (error) {
      console.log('❌ Error querying indexes:', error);
    } else {
      console.log('✅ Direct indexes query result:', data);
    }
  } catch (err) {
    console.log('❌ Exception querying indexes:', err.message);
  }

  // Test 3: Try information_schema approach
  console.log('\n=== Testing information_schema.triggers ===');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name;
      `
    });
    
    if (error) {
      console.log('❌ Error querying information_schema.triggers:', error);
    } else {
      console.log('✅ Information schema triggers result:', data);
    }
  } catch (err) {
    console.log('❌ Exception querying information_schema.triggers:', err.message);
  }

  // Test 4: Check what RLS policies exist
  console.log('\n=== Testing pg_policies Query ===');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });
    
    if (error) {
      console.log('❌ Error querying policies:', error);
    } else {
      console.log('✅ Direct policies query result:', data);
    }
  } catch (err) {
    console.log('❌ Exception querying policies:', err.message);
  }

  // Test 5: Check what our current RPC functions return
  console.log('\n=== Testing Our Custom RPC Functions ===');
  
  try {
    const { data: triggers, error: triggerError } = await supabase.rpc('get_schema_triggers');
    console.log('📊 get_schema_triggers result:', triggers?.length || 0, 'triggers');
    if (triggerError) console.log('❌ get_schema_triggers error:', triggerError);
  } catch (err) {
    console.log('❌ get_schema_triggers exception:', err.message);
  }

  try {
    const { data: indexes, error: indexError } = await supabase.rpc('get_schema_indexes');  
    console.log('📊 get_schema_indexes result:', indexes?.length || 0, 'indexes');
    if (indexError) console.log('❌ get_schema_indexes error:', indexError);
  } catch (err) {
    console.log('❌ get_schema_indexes exception:', err.message);
  }

  try {
    const { data: policies, error: policyError } = await supabase.rpc('get_schema_policies');
    console.log('📊 get_schema_policies result:', policies?.length || 0, 'policies');
    if (policyError) console.log('❌ get_schema_policies error:', policyError);
  } catch (err) {
    console.log('❌ get_schema_policies exception:', err.message);
  }

  console.log('\n=== Analysis Complete ===');
}

testDirectSchemaQueries().catch(console.error);