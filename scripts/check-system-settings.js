const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSystemSettings() {
  try {
    console.log('🔍 Sistem ayarları kontrol ediliyor...')
    
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    })
    
    console.log('📊 Mevcut sistem ayarları:', settings.length, 'adet')
    
    if (settings.length === 0) {
      console.log('⚠️  Sistem ayarları bulunamadı!')
      
      // Okul adı ayarını ekle
      console.log('➕ Okul adı ayarı ekleniyor...')
      await prisma.systemSetting.create({
        data: {
          key: 'okul_adi',
          value: 'Anadolu Meslek Lisesi'
        }
      })
      
      // Aktif eğitim yılı ayarını ekle
      await prisma.systemSetting.create({
        data: {
          key: 'aktif_egitim_yili',
          value: '2024-2025'
        }
      })
      
      console.log('✅ Sistem ayarları eklendi!')
    } else {
      console.log('📋 Mevcut ayarlar:')
      settings.forEach((setting, index) => {
        console.log(`${index + 1}. ${setting.key}: ${setting.value}`)
      })
      
      // Okul adı ayarını kontrol et
      const schoolNameSetting = settings.find(s => s.key === 'okul_adi')
      if (!schoolNameSetting) {
        console.log('⚠️  okul_adi ayarı bulunamadı, ekleniyor...')
        await prisma.systemSetting.create({
          data: {
            key: 'okul_adi',
            value: 'Anadolu Meslek Lisesi'
          }
        })
        console.log('✅ okul_adi ayarı eklendi!')
      }
      
      // Aktif eğitim yılı ayarını kontrol et
      const educationYearSetting = settings.find(s => s.key === 'aktif_egitim_yili')
      if (!educationYearSetting) {
        console.log('⚠️  aktif_egitim_yili ayarı bulunamadı, ekleniyor...')
        await prisma.systemSetting.create({
          data: {
            key: 'aktif_egitim_yili',
            value: '2024-2025'
          }
        })
        console.log('✅ aktif_egitim_yili ayarı eklendi!')
      }
    }
    
  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSystemSettings()