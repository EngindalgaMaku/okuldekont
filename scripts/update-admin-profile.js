const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'minimal',
})

async function updateAdminProfile() {
  try {
    console.log('🔄 Updating admin profile with email...')
    
    // Find the admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@admin.com'
      },
      include: {
        adminProfile: true
      }
    })

    if (!adminUser) {
      console.error('❌ Admin user not found')
      return
    }

    console.log('👤 Found admin user:', adminUser.email)

    if (adminUser.adminProfile) {
      // Update existing admin profile
      await prisma.adminProfile.update({
        where: {
          id: adminUser.adminProfile.id
        },
        data: {
          email: adminUser.email
        }
      })
      console.log('✅ Updated existing admin profile with email')
    } else {
      // Create admin profile if it doesn't exist
      await prisma.adminProfile.create({
        data: {
          name: 'Admin User',
          email: adminUser.email,
          role: 'ADMIN',
          userId: adminUser.id
        }
      })
      console.log('✅ Created new admin profile with email')
    }

    // Verify the update
    const updatedProfile = await prisma.adminProfile.findUnique({
      where: {
        email: adminUser.email
      }
    })

    console.log('🎉 Admin profile updated successfully:', updatedProfile)
    
  } catch (error) {
    console.error('❌ Error updating admin profile:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminProfile()