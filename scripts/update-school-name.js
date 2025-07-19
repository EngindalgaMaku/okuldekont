const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSchoolName() {
  try {
    const correctSchoolName = 'Anadolu Meslek Lisesi';
    
    // school_name anahtarını güncelle
    await prisma.systemSetting.upsert({
      where: { key: 'school_name' },
      update: { value: correctSchoolName },
      create: { key: 'school_name', value: correctSchoolName }
    });
    
    // okul_adi anahtarını güncelle
    await prisma.systemSetting.upsert({
      where: { key: 'okul_adi' },
      update: { value: correctSchoolName },
      create: { key: 'okul_adi', value: correctSchoolName }
    });
    
    console.log('✅ Okul adı başarıyla güncellendi:', correctSchoolName);
    
    // Sonuçları kontrol et
    const schoolSetting = await prisma.systemSetting.findUnique({
      where: { key: 'school_name' }
    });
    
    const okulAdiSetting = await prisma.systemSetting.findUnique({
      where: { key: 'okul_adi' }
    });
    
    console.log('📋 Güncellenmiş değerler:');
    console.log('- school_name:', schoolSetting?.value);
    console.log('- okul_adi:', okulAdiSetting?.value);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    await prisma.$disconnect();
  }
}

updateSchoolName();