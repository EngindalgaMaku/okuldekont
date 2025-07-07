require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL ve Service Role Key gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Admin migration çalıştırılıyor...')
    
    // Migration dosyasını oku
    const migrationPath = path.join(__dirname, '../supabase/migrations/033_add_admin_roles.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // SQL'i satırlara böl ve çalıştır
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Çalıştırılıyor:', statement.substring(0, 100) + '...')
        const { error } = await supabase.rpc('exec_sql', { 
          sql_text: statement + ';' 
        })
        
        if (error) {
          console.error('Hata:', error)
        } else {
          console.log('✅ Başarılı')
        }
      }
    }
    
    console.log('Migration tamamlandı!')
    
  } catch (error) {
    console.error('Migration hatası:', error)
  }
}

runMigration()