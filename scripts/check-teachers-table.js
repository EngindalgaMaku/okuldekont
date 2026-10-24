const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTeachersTable() {
  try {
    console.log('🔍 Teachers tablosu kontrol ediliyor...')

    // Raw SQL ile tablo yapısını kontrol et
    const columns = await prisma.$queryRaw`
      SHOW COLUMNS FROM teachers
    `
    
    console.log('📋 Teachers tablosu kolonları:')
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })

    // tcNo kolonu var mı kontrol et
    const hasTcNo = columns.some(col => col.Field === 'tcNo')
    console.log(`\n🔍 tcNo kolonu: ${hasTcNo ? '✅ VAR' : '❌ YOK'}`)

    if (!hasTcNo) {
      console.log('\n⚠️ tcNo kolonu eksik! Migration çalıştırılmalı.')
      
      // tcNo kolonunu ekle
      console.log('🔄 tcNo kolonu ekleniyor...')
      await prisma.$executeRaw`
        ALTER TABLE teachers ADD COLUMN tcNo VARCHAR(191) NULL UNIQUE
      `
      console.log('✅ tcNo kolonu eklendi!')
    }

    // Test için birkaç teacher kaydı kontrol et
    const teacherCount = await prisma.teacherProfile.count()
    console.log(`\n📊 Toplam teacher sayısı: ${teacherCount}`)

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeachersTable()