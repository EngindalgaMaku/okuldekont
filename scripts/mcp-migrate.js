const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

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