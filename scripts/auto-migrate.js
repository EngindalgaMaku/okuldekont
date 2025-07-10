const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables'dan bilgileri al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Migration dosyalarını okuma fonksiyonu
async function readMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  const migrations = []
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    migrations.push({
      name: file,
      content: content
    })
  }
  return migrations
}

// SQL komutlarını çalıştırma fonksiyonu
async function executeSQL(sqlCommand, fileName) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: sqlCommand })
    if (error) {
      // RPC fonksiyonu yoksa direkt SQL çalıştır
      const { error: sqlError } = await supabase.sql(sqlCommand)
      if (sqlError) throw sqlError
    }
    return true
  } catch (error) {
    console.error(`❌ SQL Hatası (${fileName}):`, error.message)
    return false
  }
}

async function runMigrations() {
  try {
    console.log('🚀 Migration başlatılıyor...')
    
    const migrations = await readMigrationFiles()
    let success = 0
    let failed = 0
    
    for (const migration of migrations) {
      console.log(`\n📄 Migration çalıştırılıyor: ${migration.name}`)
      
      // SQL komutlarını ayır ve sırayla çalıştır
      const commands = migration.content
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0)
      
      for (const cmd of commands) {
        const result = await executeSQL(cmd, migration.name)
        if (result) {
          success++
          console.log(`✅ Başarılı: ${cmd.substring(0, 50)}...`)
        } else {
          failed++
          console.log(`❌ Başarısız: ${cmd.substring(0, 50)}...`)
        }
      }
    }
    
    if (failed === 0) {
      console.log('\n🎉 Tüm migration işlemleri başarılı!')
      console.log(`✅ ${success} komut çalıştırıldı`)
    } else {
      console.log(`\n⚠️ ${success} başarılı, ${failed} başarısız`)
      console.log('📋 Başarısız olan komutları manuel kontrol edin')
    }
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message)
  }
}

// Test bağlantısı
async function testConnection() {
  try {
    const { data, error } = await supabase.from('alanlar').select('*').limit(1)
    if (error) throw error
    console.log('✅ Supabase bağlantısı başarılı')
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('✅ Supabase bağlantısı başarılı (tablolar henüz yok)')
      return true
    }
    console.error('❌ Bağlantı hatası:', error.message)
    return false
  }
}

async function main() {
  console.log('🎓 Hüsniye Özdilek MTAL - Migration')
  console.log('='.repeat(50))
  
  const connected = await testConnection()
  if (connected) {
    await runMigrations()
  }
}

main() 