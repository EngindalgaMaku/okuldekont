const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudents() {
  try {
    const students = await prisma.student.findMany({
      where: { alanId: 'cmd57qp4v0003qvb0ewmp61je' },
      include: {
        company: {
          include: {
            teacher: true
          }
        }
      },
      take: 5
    });
    
    console.log('Students with companies:');
    students.forEach(student => {
      console.log(`- ${student.name} ${student.surname}`);
      console.log(`  Company: ${student.company ? student.company.name : 'None'}`);
      console.log(`  Teacher: ${student.company?.teacher ? `${student.company.teacher.name} ${student.company.teacher.surname}` : 'None'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudents();