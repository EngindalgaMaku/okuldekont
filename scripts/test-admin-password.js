const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAdminPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' }
    });
    
    if (!user) {
      console.log('❌ Admin kullanıcısı bulunamadı');
      return;
    }
    
    console.log('✅ Admin kullanıcısı bulundu');
    console.log('- Email:', user.email);
    console.log('- Password hash:', user.password);
    
    // Test password: 123456
    const testPassword = '123456';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('🔐 Password test:');
    console.log('- Test password:', testPassword);
    console.log('- Is valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('🔧 Şifreyi yeniden hash\'liyorum...');
      const newHashedPassword = await bcrypt.hash(testPassword, 10);
      
      await prisma.user.update({
        where: { email: 'admin@ozdilek' },
        data: { password: newHashedPassword }
      });
      
      console.log('✅ Şifre güncellendi');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    await prisma.$disconnect();
  }
}

testAdminPassword();