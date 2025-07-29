const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixTeachersSchema() {
  try {
    console.log('🔍 Teachers tablosu schema düzeltiliyor...')

    // Mevcut kolonları kontrol et
    const columns = await prisma.$queryRaw`
      SHOW COLUMNS FROM teachers
    `
    
    const existingColumns = columns.map(col => col.Field)
    console.log('📋 Mevcut kolonlar:', existingColumns.join(', '))

    // Eksik kolonları tanımla
    const requiredColumns = [
      { name: 'tcNo', sql: 'ALTER TABLE teachers ADD COLUMN tcNo VARCHAR(191) NULL UNIQUE' },
      { name: 'position', sql: 'ALTER TABLE teachers ADD COLUMN position VARCHAR(191) NULL' }
    ]

    // Eksik kolonları ekle
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`🔄 ${column.name} kolonu ekleniyor...`)
        await prisma.$executeRawUnsafe(column.sql)
        console.log(`✅ ${column.name} kolonu eklendi!`)
      } else {
        console.log(`✅ ${column.name} kolonu zaten mevcut`)
      }
    }

    // Final kontrol
    const updatedColumns = await prisma.$queryRaw`
      SHOW COLUMNS FROM teachers
    `
    
    console.log('\n📋 Güncellenmiş kolonlar:')
    updatedColumns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.Field} (${col.Type})`)
    })

    console.log('\n🎉 Teachers tablosu schema\'sı düzeltildi!')

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTeachersSchema()