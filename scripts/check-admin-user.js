const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' },
      include: {
        adminProfile: true
      }
    });
    
    if (user) {
      console.log('✅ Admin kullanıcısı bulundu:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Password hash:', user.password ? 'Var' : 'Yok');
      console.log('- Admin profile:', user.adminProfile ? 'Var' : 'Yok');
    } else {
      console.log('❌ Admin kullanıcısı bulunamadı');
      
      // Tüm kullanıcıları listele
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true
        }
      });
      console.log('📋 Tüm kullanıcılar:');
      allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.role})`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    await prisma.$disconnect();
  }
}

checkAdminUser();