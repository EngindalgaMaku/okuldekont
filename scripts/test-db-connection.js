const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query test successful:', result)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('\nPlease check:')
    console.log('1. MariaDB/MySQL server is running')
    console.log('2. Database credentials in .env file')
    console.log('3. Database exists and user has proper permissions')
    console.log('\nExample DATABASE_URL:')
    console.log('mysql://username:password@localhost:3306/okul_dekont')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()