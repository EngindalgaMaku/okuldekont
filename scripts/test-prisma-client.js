const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'minimal',
})

async function testPrismaClient() {
  try {
    console.log('🔍 Testing Prisma Client connection...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Test simple query
    const userCount = await prisma.user.count()
    console.log(`📊 User count: ${userCount}`)
    
    // Test admin profile query
    const adminProfiles = await prisma.adminProfile.findMany()
    console.log(`👥 Admin profiles: ${adminProfiles.length}`)
    
    console.log('✅ All Prisma tests passed!')
    
  } catch (error) {
    console.error('❌ Prisma client test failed:', error)
    console.error('Error details:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testPrismaClient()