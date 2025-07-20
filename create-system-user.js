const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSystemUser() {
  try {
    console.log('🔧 System user oluşturuluyor...');
    
    // Check if system user already exists
    let systemUser = await prisma.user.findUnique({
      where: { email: 'system@okul-dekont.local' }
    });
    
    if (systemUser) {
      console.log('✅ System user zaten mevcut:', systemUser.id);
      return systemUser.id;
    }
    
    // Create system user
    systemUser = await prisma.user.create({
      data: {
        email: 'system@okul-dekont.local',
        password: 'dummy-password-not-used',
        role: 'ADMIN'
      }
    });
    
    // Create admin profile for system user
    await prisma.adminProfile.create({
      data: {
        name: 'System Admin',
        userId: systemUser.id,
        role: 'ADMIN'
      }
    });
    
    console.log('✅ System user oluşturuldu:', systemUser.id);
    return systemUser.id;
    
  } catch (error) {
    console.error('❌ System user oluşturma hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSystemUser();