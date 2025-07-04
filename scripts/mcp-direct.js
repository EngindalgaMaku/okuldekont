const fs = require('fs')
const path = require('path')
const https = require('https')

const SUPABASE_URL = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

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