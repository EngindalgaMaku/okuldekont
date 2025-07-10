const fs = require('fs')
const path = require('path')
const https = require('https')
const { createClient } = require('@supabase/supabase-js')

// Environment variables'dan bilgileri al
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

async function testSupabaseConnection() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    if (!response.ok) {
      throw new Error(`Supabase bağlantısı başarısız: ${response.status} ${response.statusText}`)
    }
    console.log('Supabase bağlantısı başarılı!')
  } catch (error) {
    console.error('Supabase bağlantısı hatası:', error.message)
    process.exit(1)
  }
}

// SQL'i direkt çalıştır
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(data)
        }
      })
    })

    req.on('error', (error) => reject(error))
    req.write(JSON.stringify({ query: sql }))
    req.end()
  })
}

// Migration dosyalarını oku
async function readMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations')
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      name: file,
      content: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }))
}

async function runMigrations() {
  try {
    console.log('🚀 MCP Migration başlatılıyor...')
    
    const migrations = await readMigrations()
    let success = 0
    let failed = 0
    
    for (const migration of migrations) {
      console.log(`\n📄 Migration çalıştırılıyor: ${migration.name}`)
      
      const commands = migration.content
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0)
      
      for (const cmd of commands) {
        try {
          const result = await executeSql(cmd)
          if (result.error) {
            failed++
            console.log(`❌ Hata: ${cmd.substring(0, 50)}...`)
            console.log(`   ${result.error}`)
          } else {
            success++
            console.log(`✅ Başarılı: ${cmd.substring(0, 50)}...`)
          }
        } catch (error) {
          failed++
          console.log(`❌ Hata: ${cmd.substring(0, 50)}...`)
          console.log(`   ${error.message}`)
        }
      }
    }
    
    console.log('\n=== MCP Migration Sonucu ===')
    console.log(`✅ Başarılı: ${success} komut`)
    console.log(`❌ Başarısız: ${failed} komut`)
    
  } catch (error) {
    console.error('❌ MCP Migration hatası:', error.message)
  }
}

runMigrations() 