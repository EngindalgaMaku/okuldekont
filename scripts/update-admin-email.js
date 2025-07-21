const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminEmail() {
  console.log('👨‍💼 Admin kullanıcısının email\'i güncelleniyor...\n');
  
  try {
    // Mevcut admin kullanıcılarını bul
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        adminProfile: true
      }
    });

    console.log(`📊 Bulunan admin kullanıcı sayısı: ${adminUsers.length}\n`);

    if (adminUsers.length === 0) {
      console.log('❌ Hiç admin kullanıcı bulunamadı!');
      return;
    }

    // İlk admin kullanıcısının email'ini güncelle
    const adminToUpdate = adminUsers[0];
    
    console.log(`🔍 Güncellenecek admin:`);
    console.log(`   - ID: ${adminToUpdate.id}`);
    console.log(`   - Mevcut Email: ${adminToUpdate.email}`);
    console.log(`   - Profil: ${adminToUpdate.adminProfile?.name || 'Bilinmiyor'}\n`);

    // User tablosundaki email'i güncelle
    await prisma.user.update({
      where: { id: adminToUpdate.id },
      data: { email: 'admin@ozdilek' }
    });

    // AdminProfile tablosundaki email'i de güncelle (eğer varsa)
    if (adminToUpdate.adminProfile) {
      await prisma.adminProfile.update({
        where: { id: adminToUpdate.adminProfile.id },
        data: { email: 'admin@ozdilek' }
      });
    }

    console.log('✅ Admin email\'i başarıyla güncellendi!');
    console.log('   - Yeni Email: admin@ozdilek\n');

    // Kontrol et
    const updatedAdmin = await prisma.user.findUnique({
      where: { id: adminToUpdate.id },
      include: {
        adminProfile: true
      }
    });

    console.log('🔍 Güncelleme sonrası kontrol:');
    console.log(`   - User Email: ${updatedAdmin.email}`);
    console.log(`   - AdminProfile Email: ${updatedAdmin.adminProfile?.email || 'Yok'}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminEmail();