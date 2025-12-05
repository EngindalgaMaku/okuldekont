const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function testAdminDekontFix() {
  try {
    await prisma.$connect();
    console.log("🔧 ADMIN DEKONTLAR API FIX TEST");
    console.log("═".repeat(70));

    // Current date for TERMINATED filtering logic
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    console.log(
      `Current date reference: ${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}`
    );
    console.log("");

    // Test new admin dekontlar query with TERMINATED filtering
    console.log("🔍 TESTING FIXED ADMIN DEKONTLAR QUERY:");
    console.log("─".repeat(50));

    const fixedAdminQuery = await prisma.dekont.findMany({
      where: {
        archived: false,
        staj: {
          OR: [
            // Non-terminated students
            { status: { not: "TERMINATED" } },
            // Terminated students who worked during the month
            {
              AND: [
                { status: "TERMINATED" },
                {
                  OR: [
                    // Has terminationDate and it's >= month start
                    {
                      AND: [
                        { terminationDate: { not: null } },
                        {
                          terminationDate: {
                            gte: new Date(currentYear, currentMonth - 1, 1),
                          },
                        },
                      ],
                    },
                    // No terminationDate but endDate >= month start (fallback for data integrity)
                    {
                      AND: [
                        { terminationDate: null },
                        {
                          endDate: {
                            gte: new Date(currentYear, currentMonth - 1, 1),
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                name: true,
                surname: true,
              },
            },
            company: {
              select: {
                name: true,
              },
            },
            teacher: {
              select: {
                name: true,
                surname: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `Total dekontlar with TERMINATED filtering: ${fixedAdminQuery.length}`
    );

    // Check Elif specifically
    const elifDekontlar = fixedAdminQuery.filter(
      (d) =>
        d.staj?.student?.name === "Elif" &&
        d.staj?.student?.surname === "Poyraz"
    );

    console.log(`Elif dekontlar count: ${elifDekontlar.length}`);
    console.log("");

    if (elifDekontlar.length > 0) {
      console.log("Elif dekontlar details:");
      elifDekontlar.forEach((dekont, i) => {
        console.log(
          `   ${i + 1}. ${dekont.staj?.company?.name} - ${dekont.month}/${
            dekont.year
          } - ${dekont.amount}₺ - ${dekont.status}`
        );
        console.log(
          `      Teacher: ${dekont.staj?.teacher?.name} ${dekont.staj?.teacher?.surname}`
        );
      });
    } else {
      console.log(
        "✅ Elif dekontlar correctly filtered out (no TERMINATED dekontlar showing)"
      );
    }

    console.log("\n🔍 COMPARING WITH totalStudents CALCULATION:");
    console.log("─".repeat(50));

    // Test totalStudents calculation (should match dekont filtering now)
    const totalStudentsQuery = await prisma.staj.findMany({
      where: {
        archived: false,
        company: {
          companyType: "PRIVATE",
        },
        AND: [
          { status: { not: "TERMINATED" } },
          {
            OR: [
              { terminationDate: null },
              {
                terminationDate: {
                  gte: new Date(currentYear, currentMonth - 1, 1),
                },
              },
            ],
          },
        ],
      },
      select: {
        studentId: true,
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    const uniqueStudentIds = new Set(
      totalStudentsQuery.map((s) => s.studentId)
    );
    const totalStudentsRequiringDekont = uniqueStudentIds.size;

    console.log(
      `Total students requiring dekont: ${totalStudentsRequiringDekont}`
    );

    const elifInTotal = totalStudentsQuery.find(
      (s) => s.student.name === "Elif" && s.student.surname === "Poyraz"
    );
    console.log(`Elif in total calculation: ${elifInTotal ? "YES" : "NO"}`);

    // Get unique students from dekont query
    const dekontStudentIds = new Set(
      fixedAdminQuery.map((d) => d.staj?.studentId).filter(Boolean)
    );
    console.log(`Unique students with dekontlar: ${dekontStudentIds.size}`);

    console.log("\n🎯 CONSISTENCY CHECK:");
    console.log("─".repeat(50));

    if (elifDekontlar.length > 0 && elifInTotal) {
      console.log(
        "❌ ISSUE: Elif still appears in both dekont list and total calculation"
      );
      console.log(
        "   This means TERMINATED filtering is not working correctly"
      );
    } else if (elifDekontlar.length === 0 && !elifInTotal) {
      console.log(
        "✅ SUCCESS: Elif is correctly filtered out from both queries"
      );
      console.log("   TERMINATED filtering is working correctly");
    } else if (elifDekontlar.length > 0 && !elifInTotal) {
      console.log(
        "⚠️ INCONSISTENCY: Elif appears in dekont list but not in total calculation"
      );
      console.log("   This indicates a mismatch between the two queries");
    } else {
      console.log(
        "⚠️ INCONSISTENCY: Elif is in total calculation but not in dekont list"
      );
      console.log("   This indicates a mismatch between the two queries");
    }

    console.log("\n📊 SUMMARY:");
    console.log("─".repeat(50));
    console.log(`Total dekontlar shown: ${fixedAdminQuery.length}`);
    console.log(
      `Total students requiring dekont: ${totalStudentsRequiringDekont}`
    );
    console.log(`Elif dekontlar: ${elifDekontlar.length}`);
    console.log(`Elif in total: ${elifInTotal ? "YES" : "NO"}`);

    // Test company-based separation
    console.log("\n🏢 COMPANY-BASED SEPARATION TEST:");
    console.log("─".repeat(50));

    // Get all students with multiple companies
    const studentsWithMultipleCompanies = await prisma.student.findMany({
      where: {
        stajlar: {
          some: {
            archived: false,
          },
        },
      },
      include: {
        stajlar: {
          where: {
            archived: false,
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const multiCompanyStudents = studentsWithMultipleCompanies.filter(
      (student) => {
        const companyIds = new Set(student.stajlar.map((s) => s.companyId));
        return companyIds.size > 1;
      }
    );

    console.log(
      `Students with multiple companies: ${multiCompanyStudents.length}`
    );

    if (multiCompanyStudents.length > 0) {
      console.log("\nStudents with multiple companies:");
      multiCompanyStudents.forEach((student) => {
        const companies = [
          ...new Set(student.stajlar.map((s) => s.company?.name)),
        ];
        console.log(
          `   ${student.name} ${student.surname}: ${companies.join(", ")}`
        );
      });

      // Check if dekont amounts are correctly separated
      for (const student of multiCompanyStudents.slice(0, 3)) {
        // Test first 3
        console.log(
          `\nDekont separation for ${student.name} ${student.surname}:`
        );

        for (const staj of student.stajlar) {
          const dekontlar = await prisma.dekont.findMany({
            where: {
              studentId: student.id,
              companyId: staj.companyId,
            },
          });

          const totalAmount = dekontlar.reduce(
            (sum, d) => sum + (Number(d.amount) || 0),
            0
          );
          console.log(
            `   ${staj.company?.name}: ${dekontlar.length} dekont, ${totalAmount}₺ total`
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminDekontFix();
