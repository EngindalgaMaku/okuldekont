const { PrismaClient } = require('@prisma/client');

async function testTeacherHistory() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing TeacherHistory table...');
    
    // Test if table exists
    const count = await prisma.teacherHistory.count();
    console.log('TeacherHistory table exists. Total records:', count);
    
    // Check for specific teacher
    const teacherId = 'cmf2gq0u00005pb0ko9ug220u';
    const teacherRecords = await prisma.teacherHistory.findMany({
      where: { teacherId },
      include: {
        teacher: {
          select: { name: true, surname: true }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
    
    console.log(`Records for teacher ${teacherId}:`, teacherRecords.length);
    if (teacherRecords.length > 0) {
      console.log('Sample record:', JSON.stringify(teacherRecords[0], null, 2));
    }
    
    // Check recent records
    const recentRecords = await prisma.teacherHistory.findMany({
      take: 5,
      orderBy: { validFrom: 'desc' },
      include: {
        teacher: {
          select: { name: true, surname: true }
        }
      }
    });
    
    console.log('Recent teacher history records:', recentRecords.length);
    recentRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.teacher?.name} ${record.teacher?.surname} - ${record.changeType} - ${record.fieldName}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTeacherHistory();
