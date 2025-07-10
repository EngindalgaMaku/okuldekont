const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables'dan bilgileri al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSystemSettings() {
  try {
    console.log('Setting up system settings...')

    // Create system_settings table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.system_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (createTableError) {
      console.log('Table might already exist, continuing...')
    }

    // Insert default settings
    const defaultSettings = [
      { key: 'maintenance_mode', value: 'false', description: 'System maintenance mode status' },
      { key: 'school_name', value: 'Hüsniye Özdilek MTAL', description: 'School name displayed throughout the system' },
      { key: 'email_notifications', value: 'true', description: 'Enable email notifications' },
      { key: 'auto_approval', value: 'false', description: 'Enable automatic approval for dekontlar' },
      { key: 'max_file_size', value: '5', description: 'Maximum file size in MB' },
      { key: 'allowed_file_types', value: 'pdf,jpg,png', description: 'Allowed file types for uploads' }
    ]

    for (const setting of defaultSettings) {
      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: setting.key,
          setting_value: setting.value,
          description: setting.description
        })
        .select()

      if (error && error.code !== '23505') { // 23505 is unique violation, which is expected
        console.error(`Error inserting ${setting.key}:`, error)
      } else {
        console.log(`✓ Setting ${setting.key} configured`)
      }
    }

    // Create RPC functions
    console.log('Creating RPC functions...')

    // Function to update system setting
    const { error: updateFuncError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION update_system_setting(p_setting_key TEXT, p_setting_value TEXT)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
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
      `
    })

    if (updateFuncError) {
      console.log('Update function error (might already exist):', updateFuncError.message)
    } else {
      console.log('✓ Update function created')
    }

    // Function to get system setting
    const { error: getFuncError } = await supabase.rpc('exec_sql', {
      query: `
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
      `
    })

    if (getFuncError) {
      console.log('Get function error (might already exist):', getFuncError.message)
    } else {
      console.log('✓ Get function created')
    }

    console.log('✅ System settings setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error setting up system settings:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  setupSystemSettings()
}

module.exports = { setupSystemSettings }