const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'minimal',
})

async function createSuperuser() {
  try {
    console.log('🔄 Creating superuser admin@ozdilek...')
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('123456', 10)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@ozdilek' }
    })
    
    if (existingUser) {
      console.log('👤 User already exists, updating...')
      
      // Update password
      await prisma.user.update({
        where: { email: 'admin@ozdilek' },
        data: { 
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      
      // Update or create admin profile
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { email: 'admin@ozdilek' }
      })
      
      if (adminProfile) {
        await prisma.adminProfile.update({
          where: { email: 'admin@ozdilek' },
          data: { 
            name: 'Özdilek Admin',
            role: 'ADMIN'
          }
        })
      } else {
        await prisma.adminProfile.create({
          data: {
            name: 'Özdilek Admin',
            email: 'admin@ozdilek',
            role: 'ADMIN',
            userId: existingUser.id
          }
        })
      }
      
    } else {
      console.log('🆕 Creating new superuser...')
      
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@ozdilek',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      
      // Create admin profile
      await prisma.adminProfile.create({
        data: {
          name: 'Özdilek Admin',
          email: 'admin@ozdilek',
          role: 'ADMIN',
          userId: newUser.id
        }
      })
    }
    
    console.log('✅ Superuser created successfully!')
    console.log('📧 Email: admin@ozdilek')
    console.log('🔐 Password: 123456')
    console.log('👑 Role: ADMIN')
    
  } catch (error) {
    console.error('❌ Error creating superuser:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperuser()