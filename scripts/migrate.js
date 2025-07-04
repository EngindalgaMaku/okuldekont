const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables from file if not in process.env
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
    
    return envVars
  } catch (error) {
    return {}
  }
}

const envVars = loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Environment variables:')
console.log('URL:', supabaseUrl ? '✅ OK' : '❌ Missing')
console.log('SERVICE KEY:', supabaseServiceRoleKey ? '✅ OK' : '❌ Missing')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase bilgileri eksik!')
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
      if (error.message.includes('function "exec_sql" does not exist')) {
        // RPC fonksiyonu yoksa direkt SQL çalıştır
        const { error: sqlError } = await supabase.sql(sqlCommand)
        if (sqlError) throw sqlError
      } else {
        throw error
      }
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
        } else {
          failed++
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
    console.log('🔗 Manuel: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
  }
}

// Test bağlantısı
async function testConnection() {
  try {
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1)
    if (error) throw error
    console.log('✅ Supabase bağlantısı başarılı')
    return true
  } catch (error) {
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
  } else {
    console.log('📋 Manuel SQL çalıştırın:')
    console.log('🔗 https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
  }
}

main() 