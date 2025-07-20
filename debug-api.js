const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAPI() {
  try {
    const alanId = 'cmd57qp4v0003qvb0ewmp61je';
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get students with related data including coordinator teacher
    const students = await prisma.student.findMany({
      where: { alanId: alanId },
      include: {
        alan: true,
        company: {
          include: {
            teacher: true // Include coordinator teacher
          }
        },
        class: true
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ],
      take: limit,
      skip: offset
    });

    // Transform data to match expected interface
    const transformedStudents = students.map(student => ({
      id: student.id,
      ad: student.name, // Match the component interface
      soyad: student.surname,
      no: student.number || '',
      sinif: student.className,
      alanId: student.alanId,
      company: student.company ? {
        id: student.company.id,
        name: student.company.name,
        contact: student.company.contact,
        teacher: student.company.teacher ? {
          id: student.company.teacher.id,
          name: student.company.teacher.name,
          surname: student.company.teacher.surname
        } : null
      } : null
    }));

    console.log('Transformed API Response:');
    console.log(JSON.stringify({ students: transformedStudents }, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPI();