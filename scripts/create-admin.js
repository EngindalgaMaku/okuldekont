const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Admin kullanıcısı var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' }
    });

    if (existingUser) {
      console.log('Admin kullanıcısı mevcut, şifre güncelleniyor...');
      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Şifreyi güncelle
      await prisma.user.update({
        where: { email: 'admin@ozdilek' },
        data: { password: hashedPassword }
      });
      
      console.log('Admin kullanıcısı şifresi güncellendi!');
      console.log('Email: admin@ozdilek');
      console.log('Şifre: admin123');
      return;
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Admin kullanıcısı yarat
    const user = await prisma.user.create({
      data: {
        email: 'admin@ozdilek',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    // Admin profile yarat
    await prisma.adminProfile.create({
      data: {
        name: 'Admin',
        email: 'admin@ozdilek',
        role: 'ADMIN',
        userId: user.id
      }
    });

    console.log('Admin kullanıcısı başarıyla yaratıldı!');
    console.log('Email: admin@ozdilek');
    console.log('Şifre: admin123');
  } catch (error) {
    console.error('Admin kullanıcısı yaratılırken hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();