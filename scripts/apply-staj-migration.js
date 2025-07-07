const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oawafbisxzjfmlqejrfs.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hd2FmYmlzeHpqZm1scWVqcmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA5NjA3MCwiZXhwIjoyMDQ3NjcyMDcwfQ.tMGVYTpEW0V2TuLKNLzOC3J_lDn6lsJDNL2LFpTJxtc'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyStajMigration() {
  try {
    console.log('🚀 Staj tablosu migration uygulanıyor...')
    
    // Migration SQL'ini oku
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '036_add_missing_staj_columns.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration dosyası okundu')
    console.log('SQL:', migrationSQL.substring(0, 200) + '...')
    
    // Migration'ı uygula
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      console.error('❌ Migration hatası:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration başarıyla uygulandı!')
    console.log('📊 Sonuç:', data)
    
    // Tablo durumunu kontrol et
    const { data: tableInfo, error: tableError } = await supabase
      .from('stajlar')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('⚠️ Tablo kontrol hatası:', tableError)
    } else {
      console.log('✅ Stajlar tablosu erişilebilir')
    }
    
  } catch (error) {
    console.error('💥 Beklenmeyen hata:', error)
    process.exit(1)
  }
}

applyStajMigration()