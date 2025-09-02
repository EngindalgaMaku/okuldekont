const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function simpleCheck() {
  try {
    console.log('🔍 Basit veritabanı kontrolü...\n')
    
    // Tüm aktif stajları getir
    const stajlar = await prisma.staj.findMany({
      include: {
        student: true,
        company: true,
        teacher: true
      }
    })
    
    console.log(`📊 Toplam staj sayısı: ${stajlar.length}\n`)
    
    // Aktif stajları filtrele
    const aktifStajlar = stajlar.filter(s => s.status === 'ACTIVE')
    console.log(`✅ Aktif staj sayısı: ${aktifStajlar.length}\n`)
    
    // Her stajı listele
    aktifStajlar.forEach((staj, index) => {
      const ogrenci = `${staj.student?.name || ''} ${staj.student?.surname || ''}`.trim()
      const sirket = staj.company?.name || 'Bilinmeyen'
      const koordinator = staj.teacher ? `${staj.teacher.name || ''} ${staj.teacher.surname || ''}`.trim() : 'ATANMAMIŞ'
      
      console.log(`${index + 1}. ${ogrenci} - ${sirket} - ${koordinator}`)
    })
    
    // Meltem Özalit'i ara
    const meltemStajlari = aktifStajlar.filter(staj => 
      staj.teacher && (
        staj.teacher.name?.toLowerCase().includes('meltem') ||
        staj.teacher.surname?.toLowerCase().includes('özalit') ||
        staj.teacher.surname?.toLowerCase().includes('ozalit')
      )
    )
    
    if (meltemStajlari.length > 0) {
      console.log(`\n⚠️ Meltem Özalit'in atandığı ${meltemStajlari.length} staj bulundu:`)
      meltemStajlari.forEach(staj => {
        const ogrenci = `${staj.student?.name || ''} ${staj.student?.surname || ''}`.trim()
        const sirket = staj.company?.name || 'Bilinmeyen'
        console.log(`  - ${ogrenci} (${sirket})`)
      })
    } else {
      console.log('\n✅ Meltem Özalit atanmış staj bulunamadı')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Hata:', error.message)
    await prisma.$disconnect()
  }
}

simpleCheck()
