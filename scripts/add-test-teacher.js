const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🎯 Creating test teacher: Öğretmen1 Soyad1 with PIN 1234')
    
    // Get first available alan (field)
    const alan = await prisma.alan.findFirst({
      where: { active: true }
    })
    
    if (!alan) {
      console.error('❌ No active alan found. Please create an alan first.')
      return
    }
    
    console.log(`📚 Using alan: ${alan.name} (ID: ${alan.id})`)
    
    // Create User record
    const user = await prisma.user.create({
      data: {
        email: `ogretmen1@system.local`,
        password: 'dummy_password_not_used', // PIN is used for teacher login
        role: 'TEACHER'
      }
    })
    
    console.log(`👤 Created user with ID: ${user.id}`)
    
    // Create TeacherProfile record
    const teacher = await prisma.teacherProfile.create({
      data: {
        name: 'Öğretmen1',
        surname: 'Soyad1',
        pin: '1234',
        userId: user.id,
        alanId: alan.id,
        phone: '555-0001',
        email: 'ogretmen1@example.com'
      }
    })
    
    console.log(`👨‍🏫 Created teacher profile with ID: ${teacher.id}`)
    console.log(`✅ Successfully created teacher: ${teacher.name} ${teacher.surname}`)
    console.log(`🔐 PIN: ${teacher.pin}`)
    console.log(`📧 Email: ${teacher.email}`)
    console.log(`📱 Phone: ${teacher.phone}`)
    console.log(`🎓 Alan: ${alan.name}`)
    
  } catch (error) {
    console.error('❌ Error creating test teacher:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()