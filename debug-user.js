const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAdminUser() {
  try {
    console.log('🔍 Admin user kontrolü...')
    
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' },
      include: { adminProfile: true }
    })
    
    if (!adminUser) {
      console.log('❌ Admin user bulunamadı!')
      return
    }
    
    console.log('✅ Admin user bulundu:')
    console.log('📧 Email:', adminUser.email)
    console.log('🔑 Role:', adminUser.role)
    console.log('👤 Profile:', adminUser.adminProfile ? 'Var' : 'Yok')
    
    // Test password
    const isValid = await bcrypt.compare('123456', adminUser.password)
    console.log('🔒 Password test (123456):', isValid ? '✅ Doğru' : '❌ Yanlış')
    
  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminUser()