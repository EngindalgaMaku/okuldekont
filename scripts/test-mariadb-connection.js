const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function testConnection() {
  console.log('🔍 MariaDB bağlantısı test ediliyor...')
  console.log('📋 Environment variables:')
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌')
  console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Not set')
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable bulunamadı!')
    console.log('💡 .env.local dosyasını oluşturun ve DATABASE_URL ekleyin')
    return
  }

  try {
    console.log('\n🔄 Prisma connection test...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database bağlantısı başarılı!')
    
    // Test query
    console.log('\n🔄 Test query çalıştırılıyor...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query başarılı:', result)
    
    // Check if tables exist
    console.log('\n🔄 Tablo kontrolü...')
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        LIMIT 5
      `
      console.log('📊 Bulunan tablolar:', tables)
      
      if (tables.length === 0) {
        console.log('⚠️  Tablo bulunamadı. Migration gerekebilir.')
        console.log('💡 Şunu çalıştırın: npx prisma migrate dev --name init')
      }
    } catch (tableError) {
      console.log('⚠️  Tablo kontrolü başarısız (normal olabilir):', tableError.message)
    }
    
  } catch (error) {
    console.log('❌ Bağlantı hatası:')
    console.log('   Error code:', error.code)
    console.log('   Message:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Çözüm önerileri:')
      console.log('   1. Host IP adresinizi bulun: ipconfig | findstr IPv4')
      console.log('   2. .env.local dosyasında DATABASE_URL\'i güncelleyin')
      console.log('   3. Port 5433\'ün açık olduğundan emin olun')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
  .then(() => {
    console.log('\n🎉 Test tamamlandı!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test başarısız:', error)
    process.exit(1)
  })