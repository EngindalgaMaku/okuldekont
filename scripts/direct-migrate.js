const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// .env dosyasını projenin kök dizininden yükle
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

// Veritabanı bağlantı bilgilerini .env dosyasından al
const dbHost = process.env.SUPABASE_DB_HOST
const dbPassword = process.env.SUPABASE_DB_PASSWORD
const dbUser = 'postgres' // Supabase'de varsayılan kullanıcı
const dbName = 'postgres' // Supabase'de varsayılan veritabanı
const dbPort = 5432 // Supabase'de varsayılan port

if (!dbHost || !dbPassword) {
  console.error('SUPABASE_DB_HOST ve SUPABASE_DB_PASSWORD environment değişkenleri gerekli!')
  process.exit(1)
}

const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

const pool = new Pool({
  connectionString,
})

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

async function runMigrations() {
  let client
  try {
    console.log('🚀 Veritabanına bağlanılıyor...')
    client = await pool.connect()
    console.log('✅ Veritabanı bağlantısı başarılı.')
    console.log('🚀 Migration başlatılıyor...')
    
    const migrations = await readMigrationFiles()
    let successCount = 0
    let failedCount = 0
    
    for (const migration of migrations) {
      if (migration.content.trim().length === 0) {
        console.log(`\n📄 ${migration.name} boş, geçiliyor.`)
        continue
      }

      console.log(`\n📄 Migration çalıştırılıyor: ${migration.name}`)
      try {
        await client.query(migration.content)
        console.log(`   ✅ Başarılı: ${migration.name}`)
        successCount++
      } catch (error) {
        console.error(`   ❌ Hata (${migration.name}):`, error.message)
        failedCount++
      }
    }
    
    console.log('='.repeat(50))
    if (failedCount === 0) {
      console.log(`\n🎉 Tüm migration işlemleri başarılı! (${successCount} dosya)`)
    } else {
      console.log(`\n⚠️ ${successCount} başarılı, ${failedCount} başarısız.`)
      console.log('📋 Lütfen yukarıdaki hataları kontrol edin.')
    }
    
  } catch (error) {
    console.error('❌ Kritik Hata:', error.message)
  } finally {
    if (client) {
      await client.release()
      console.log('\n🔌 Veritabanı bağlantısı kapatıldı.')
    }
    await pool.end()
  }
}

runMigrations()