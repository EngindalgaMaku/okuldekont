const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixBackupTableNames() {
  console.log('🔧 Fixing backup table naming issues...')

  try {
    // Check existing tables
    console.log('1️⃣ Checking existing backup tables...')
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%backup%'
        ORDER BY table_name;
      `
    })

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      return
    }

    console.log('📋 Found backup tables:', tables)

    // Create backup_operations table (the one UI expects)
    console.log('2️⃣ Creating backup_operations table...')
    const createTableSql = `
      -- Create backup_operations table if not exists
      CREATE TABLE IF NOT EXISTS backup_operations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          backup_name TEXT NOT NULL,
          backup_date TIMESTAMPTZ DEFAULT NOW(),
          backup_type TEXT DEFAULT 'full',
          backup_size_kb BIGINT,
          table_count INTEGER,
          record_count BIGINT,
          trigger_count INTEGER,
          index_count INTEGER,
          policy_count INTEGER,
          rpc_function_count INTEGER,
          backup_status TEXT DEFAULT 'in_progress',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE backup_operations ENABLE ROW LEVEL SECURITY;

      -- Create admin policy (simplified)
      DROP POLICY IF EXISTS "Admin can manage backups" ON backup_operations;
      CREATE POLICY "Admin can manage backups" ON backup_operations
          FOR ALL USING (
              EXISTS (
                  SELECT 1 FROM admin_kullanicilar
                  WHERE email = auth.jwt() ->> 'email'
              )
          );

      -- Update function for timestamp
      CREATE OR REPLACE FUNCTION update_backup_operations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for updated_at
      DROP TRIGGER IF EXISTS backup_operations_updated_at ON backup_operations;
      CREATE TRIGGER backup_operations_updated_at
          BEFORE UPDATE ON backup_operations
          FOR EACH ROW
          EXECUTE FUNCTION update_backup_operations_updated_at();
    `

    const { error: createError } = await supabase.rpc('exec_sql', {
      query: createTableSql
    })

    if (createError) {
      console.error('❌ Error creating backup_operations table:', createError)
      return
    }

    console.log('✅ backup_operations table created successfully!')

    // Copy data from database_backups to backup_operations if database_backups exists
    console.log('3️⃣ Copying data from database_backups to backup_operations if needed...')
    const copyDataSql = `
      INSERT INTO backup_operations (
          id, backup_name, backup_date, backup_type, backup_size_kb,
          table_count, record_count, trigger_count, index_count, 
          policy_count, rpc_function_count, backup_status, notes, created_at
      )
      SELECT 
          id, backup_name, backup_date, backup_type, backup_size_kb,
          table_count, record_count, trigger_count, index_count, 
          policy_count, rpc_function_count, backup_status, notes, created_at
      FROM database_backups
      WHERE NOT EXISTS (
          SELECT 1 FROM backup_operations bo WHERE bo.id = database_backups.id
      );
    `

    try {
      const { error: copyError } = await supabase.rpc('exec_sql', {
        query: copyDataSql
      })

      if (copyError) {
        console.log('ℹ️ No data to copy or table does not exist:', copyError.message)
      } else {
        console.log('✅ Data copied successfully from database_backups to backup_operations!')
      }
    } catch (error) {
      console.log('ℹ️ Copy operation skipped:', error.message)
    }

    // Verify the table exists and has data
    console.log('4️⃣ Verifying backup_operations table...')
    const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
      query: 'SELECT COUNT(*) as count FROM backup_operations;'
    })

    if (verifyError) {
      console.error('❌ Error verifying table:', verifyError)
    } else {
      console.log('📊 backup_operations table verification:', verifyData)
    }

    console.log('🎉 Backup table naming issue fixed!')

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

fixBackupTableNames()
  .then(() => {
    console.log('\n✅ Fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  })