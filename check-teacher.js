const { prisma } = require('./src/lib/prisma.ts');

async function checkData() {
  try {
    const teachers = await prisma.teacher.findMany({
      where: {
        name: 'Deniz',
        surname: 'Aydın'
      },
      include: {
        alan: true
      }
    });
    
    console.log('Deniz Aydın teachers:', JSON.stringify(teachers, null, 2));
    
    const companies = await prisma.company.findMany({
      include: {
        teacher: {
          include: {
            alan: true
          }
        }
      }
    });
    
    console.log('Companies with teacher info:', JSON.stringify(companies.filter(c => c.teacher?.name === 'Deniz'), null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();