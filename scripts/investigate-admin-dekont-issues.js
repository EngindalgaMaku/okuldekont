const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function investigateAdminDekontIssues() {
  try {
    await prisma.$connect();
    console.log("🔍 ADMIN DEKONTLAR API SORUNLARI ARAŞTIRMASI");
    console.log("═".repeat(70));

    // Get Elif's both internships
    const elifsInternships = await prisma.staj.findMany({
      where: {
        student: {
          name: "Elif",
          surname: "Poyraz",
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
          },
        },
        educationYear: {
          select: {
            id: true,
            year: true,
            active: true,
          },
        },
      },
    });

    console.log("📋 ELIF POYRAZ TÜM STAJLARI:");
    console.log("─".repeat(50));
    elifsInternships.forEach((staj, i) => {
      console.log(`   ${i + 1}. ${staj.company?.name}`);
      console.log(
        `      Teacher: ${staj.teacher?.name} ${staj.teacher?.surname}`
      );
      console.log(`      Status: ${staj.status}`);
      console.log(
        `      Start: ${staj.startDate?.toISOString().split("T")[0]}`
      );
      console.log(`      End: ${staj.endDate?.toISOString().split("T")[0]}`);
      console.log(
        `      Termination: ${
          staj.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(
        `      Education Year: ${staj.educationYear?.year} (Active: ${staj.educationYear?.active})`
      );
      console.log(`      Staj ID: ${staj.id}`);
      console.log("");
    });

    // Current date for TERMINATED filtering logic
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    console.log("🔍 ADMIN DEKONTLAR API CURRENT LOGIC TEST:");
    console.log("─".repeat(50));

    // Test current admin dekontlar query (NO TERMINATED FILTERING)
    const currentAdminQuery = await prisma.dekont.findMany({
      where: {
        archived: false,
        staj: {
          student: {
            name: "Elif",
            surname: "Poyraz",
          },
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
      `Current Admin API shows ${currentAdminQuery.length} Elif dekontlar:`
    );
    currentAdminQuery.forEach((dekont, i) => {
      console.log(
        `   ${i + 1}. ${dekont.staj?.company?.name} - ${dekont.month}/${
          dekont.year
        } - ${dekont.amount}₺ - ${dekont.status}`
      );
      console.log(
        `      Teacher: ${dekont.staj?.teacher?.name} ${dekont.staj?.teacher?.surname}`
      );
    });

    console.log("\n🔍 DASHBOARD-STATS STYLE TERMINATED FILTERING TEST:");
    console.log("─".repeat(50));

    // Test with dashboard-stats style TERMINATED filtering
    const fixedAdminQuery = await prisma.dekont.findMany({
      where: {
        archived: false,
        staj: {
          student: {
            name: "Elif",
            surname: "Poyraz",
          },
          // Apply same TERMINATED filtering as dashboard-stats
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
      `Fixed Admin API would show ${fixedAdminQuery.length} Elif dekontlar:`
    );
    fixedAdminQuery.forEach((dekont, i) => {
      console.log(
        `   ${i + 1}. ${dekont.staj?.company?.name} - ${dekont.month}/${
          dekont.year
        } - ${dekont.amount}₺ - ${dekont.status}`
      );
      console.log(
        `      Teacher: ${dekont.staj?.teacher?.name} ${dekont.staj?.teacher?.surname}`
      );
    });

    console.log("\n🔍 COMPANY-BASED DEKONT CALCULATION TEST:");
    console.log("─".repeat(50));

    // Test dekont calculation per company
    for (const staj of elifsInternships) {
      const companyDekontlar = await prisma.dekont.findMany({
        where: {
          studentId: staj.studentId,
          companyId: staj.companyId,
        },
        select: {
          id: true,
          month: true,
          year: true,
          amount: true,
          status: true,
        },
      });

      const totalAmount = companyDekontlar.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      console.log(`${staj.company?.name}:`);
      console.log(`   Dekont Count: ${companyDekontlar.length}`);
      console.log(`   Total Amount: ${totalAmount}₺`);
      console.log(
        `   Status: ${staj.status} ${
          staj.terminationDate
            ? "(Terminated: " +
              staj.terminationDate.toISOString().split("T")[0] +
              ")"
            : ""
        }`
      );

      companyDekontlar.forEach((dekont, i) => {
        console.log(
          `   ${i + 1}. ${dekont.month}/${dekont.year} - ${dekont.amount}₺ - ${
            dekont.status
          }`
        );
      });
      console.log("");
    }

    console.log("🔍 TOTAL STUDENTS CALCULATION TEST:");
    console.log("─".repeat(50));

    // Test current total students calculation (from admin dekontlar API lines 242-266)
    const currentTotalStudentsQuery = await prisma.staj.findMany({
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
      currentTotalStudentsQuery.map((s) => s.studentId)
    );
    const totalStudentsRequiringDekont = uniqueStudentIds.size;

    console.log(
      `Total students requiring dekont: ${totalStudentsRequiringDekont}`
    );

    const elifInTotal = currentTotalStudentsQuery.find(
      (s) => s.student.name === "Elif" && s.student.surname === "Poyraz"
    );
    console.log(`Elif in total calculation: ${elifInTotal ? "YES" : "NO"}`);

    console.log("\n🎯 PROBLEM DIAGNOSIS:");
    console.log("─".repeat(50));
    console.log("1. ADMIN DEKONTLAR API PROBLEM:");
    console.log("   - Main dekont query (rawData) has NO TERMINATED filtering");
    console.log("   - But totalStudents calculation HAS TERMINATED filtering");
    console.log(
      "   - This causes Elif to appear in dekont list but not be counted in total"
    );
    console.log("");
    console.log("2. COMPANY-BASED CALCULATION:");
    console.log(
      "   - Dekont calculation IS already company-based (companyId filter)"
    );
    console.log("   - Each company has separate dekont amounts");
    console.log("   - NOT double-counting the same dekont");
    console.log("");
    console.log("3. SOLUTION:");
    console.log(
      "   - Add TERMINATED filtering to main dekont query in admin API"
    );
    console.log(
      "   - Use same logic as dashboard-stats and dekont-status APIs"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investigateAdminDekontIssues();
