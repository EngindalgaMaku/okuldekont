const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('Creating admin user...')
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Create user with admin role
    const user = await prisma.user.create({
      data: {
        email: 'admin@admin.com',
        password: hashedPassword,
        role: 'ADMIN',
        adminProfile: {
          create: {
            name: 'Admin User'
          }
        }
      },
      include: {
        adminProfile: true
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('📧 Email: admin@admin.com')
    console.log('🔐 Password: admin123')
    console.log('👤 User ID:', user.id)
    console.log('🛡️ Role:', user.role)
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin user already exists!')
    } else {
      console.error('❌ Error creating admin user:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()