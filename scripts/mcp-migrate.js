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

// Migration dosyalarını okuma
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

// MCP üzerinden SQL çalıştırma
async function executeMcpSQL(sqlCommand, fileName) {
  try {
    // MCP'nin exec_sql fonksiyonunu kullan
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sqlCommand
    })

    if (error) {
      console.error(`❌ MCP SQL Hatası (${fileName}):`, error.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`❌ MCP Hatası (${fileName}):`, error.message)
    return false
  }
}

async function runMigrations() {
  try {
    console.log('🚀 MCP Migration başlatılıyor...')
    
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
        const result = await executeMcpSQL(cmd, migration.name)
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
      console.log('\n🎉 Tüm MCP migration işlemleri başarılı!')
      console.log(`✅ ${success} komut çalıştırıldı`)
    } else {
      console.log(`\n⚠️ ${success} başarılı, ${failed} başarısız`)
      console.log('📋 Başarısız olan komutları kontrol edin')
    }
    
  } catch (error) {
    console.error('❌ MCP Migration hatası:', error.message)
  }
}

// MCP bağlantı testi
async function testMcpConnection() {
  try {
    // MCP bağlantısını test et
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'SELECT 1'
    })

    if (error) throw error
    
    console.log('✅ MCP bağlantısı başarılı')
    return true
  } catch (error) {
    console.error('❌ MCP bağlantı hatası:', error.message)
    return false
  }
}

async function main() {
  console.log('🎓 Hüsniye Özdilek MTAL - MCP Migration')
  console.log('='.repeat(50))
  
  const connected = await testMcpConnection()
  if (connected) {
    await runMigrations()
  }
}

main() 