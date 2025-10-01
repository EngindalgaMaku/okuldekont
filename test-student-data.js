const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkStudents() {
  try {
    const students = await prisma.student.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        surname: true,
        number: true,
        className: true,
        alanId: true,
        alan: { select: { name: true } },
        stajlar: {
          where: { archived: false },
          select: {
            status: true,
            company: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    console.log("Available students for testing:");
    console.log("=====================================");
    students.forEach((student, i) => {
      console.log(`${i + 1}. ${student.name} ${student.surname}`);
      console.log(`   Number: ${student.number}`);
      console.log(`   Class: ${student.className}`);
      console.log(`   Field: ${student.alan?.name || "No field"}`);
      console.log(`   Status: ${student.stajlar[0]?.status || "Unassigned"}`);
      console.log(`   Company: ${student.stajlar[0]?.company?.name || "None"}`);
      console.log("");
    });

    const totalCount = await prisma.student.count();
    console.log(`Total students in database: ${totalCount}`);

    // Check unassigned students
    const unassignedCount = await prisma.student.count({
      where: {
        AND: [
          { OR: [{ companyId: null }, { companyId: "" }] },
          {
            stajlar: {
              none: {
                status: "ACTIVE",
                archived: false,
              },
            },
          },
        ],
      },
    });
    console.log(`Unassigned students: ${unassignedCount}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
  }
}

checkStudents();
