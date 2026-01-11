const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testTerminationDekontBusinessRule() {
  console.log("🔍 TESTING TERMINATION vs DEKONT REQUEST BUSINESS RULE");
  console.log("=".repeat(60));

  try {
    // Test scenario parameters
    const terminationDate = new Date("2025-10-31"); // October 2025 termination
    const dekontRequestMonth = 11; // November 2025 dekont request
    const dekontRequestYear = 2025;

    console.log("📋 TEST SCENARIO:");
    console.log(
      `- Termination Date: ${terminationDate.toLocaleDateString("tr-TR")}`
    );
    console.log(`- Dekont Request: ${dekontRequestMonth}/${dekontRequestYear}`);
    console.log("");

    // Find TERMINATED students with termination in October 2025
    const terminatedStudents = await prisma.staj.findMany({
      where: {
        status: "TERMINATED",
        terminationDate: {
          gte: new Date("2025-10-01"),
          lt: new Date("2025-11-01"),
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            className: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 5,
    });

    console.log(
      `📊 Found ${terminatedStudents.length} students terminated in October 2025`
    );

    if (terminatedStudents.length === 0) {
      console.log(
        "⚠️ No terminated students found for October 2025. Creating test data..."
      );

      // Create test terminated student
      const testStudent = await prisma.student.findFirst({
        include: { stajlar: true },
      });

      if (testStudent && testStudent.stajlar.length > 0) {
        const testStaj = testStudent.stajlar[0];
        await prisma.staj.update({
          where: { id: testStaj.id },
          data: {
            status: "TERMINATED",
            terminationDate: terminationDate,
          },
        });

        console.log(
          `✅ Created test terminated student: ${testStudent.name} ${testStudent.surname}`
        );
        terminatedStudents.push({
          ...testStaj,
          student: testStudent,
          terminationDate: terminationDate,
        });
      }
    }

    console.log("\n🔍 TESTING BUSINESS LOGIC IN EACH API:\n");

    // Test 1: Dashboard Stats API Logic
    console.log("1️⃣ DASHBOARD-STATS API FILTERING:");
    console.log("-".repeat(40));

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    console.log(`Current Date: ${currentDate.toLocaleDateString("tr-TR")}`);
    console.log(
      `Dashboard uses current month: ${currentMonth}/${currentYear} for filtering`
    );

    const dashboardFilter = {
      OR: [
        { status: { not: "TERMINATED" } },
        {
          AND: [
            { status: "TERMINATED" },
            {
              OR: [
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
              ],
            },
          ],
        },
      ],
    };

    const dashboardResults = await prisma.staj.findMany({
      where: dashboardFilter,
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const terminatedInDashboard = dashboardResults.filter(
      (s) => s.status === "TERMINATED"
    );
    console.log(
      `Dashboard would include ${terminatedInDashboard.length} terminated students`
    );

    // Test 2: Dekont Status API Logic
    console.log("\n2️⃣ DEKONT-STATUS API FILTERING:");
    console.log("-".repeat(40));

    const dekontStatusFilter = {
      OR: [
        { status: { not: "TERMINATED" } },
        {
          AND: [
            { status: "TERMINATED" },
            {
              OR: [
                {
                  AND: [
                    { terminationDate: { not: null } },
                    {
                      terminationDate: {
                        gte: new Date(
                          dekontRequestYear,
                          dekontRequestMonth - 1,
                          1
                        ),
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const dekontStatusResults = await prisma.staj.findMany({
      where: dekontStatusFilter,
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const terminatedInDekontStatus = dekontStatusResults.filter(
      (s) => s.status === "TERMINATED"
    );
    console.log(
      `Dekont-status would include ${terminatedInDekontStatus.length} terminated students for Nov 2025`
    );

    // Test 3: Admin Dekontlar GET Logic
    console.log("\n3️⃣ ADMIN-DEKONTLAR GET API FILTERING:");
    console.log("-".repeat(40));

    const adminDekontlarResults = await prisma.staj.findMany({
      where: dashboardFilter, // Same as dashboard (uses current date)
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const terminatedInAdminDekontlar = adminDekontlarResults.filter(
      (s) => s.status === "TERMINATED"
    );
    console.log(
      `Admin-dekontlar GET would include ${terminatedInAdminDekontlar.length} terminated students`
    );

    // Test 4: Admin Dekontlar POST Validation
    console.log("\n4️⃣ ADMIN-DEKONTLAR POST VALIDATION:");
    console.log("-".repeat(40));

    for (const staj of terminatedStudents.slice(0, 3)) {
      if (staj.terminationDate) {
        const fesihTarihi = new Date(staj.terminationDate);
        const fesihYear = fesihTarihi.getFullYear();
        const fesihMonth = fesihTarihi.getMonth() + 1;

        const wouldBlock =
          dekontRequestYear > fesihYear ||
          (dekontRequestYear === fesihYear && dekontRequestMonth > fesihMonth);

        console.log(`Student: ${staj.student.name} ${staj.student.surname}`);
        console.log(`  Termination: ${fesihMonth}/${fesihYear}`);
        console.log(
          `  Nov 2025 dekont request: ${
            wouldBlock ? "❌ BLOCKED" : "✅ ALLOWED"
          }`
        );
      }
    }

    // Test 5: Actual dekont existence check
    console.log("\n5️⃣ EXISTING DEKONT CHECK:");
    console.log("-".repeat(40));

    const novemberDekontlar = await prisma.dekont.findMany({
      where: {
        month: dekontRequestMonth,
        year: dekontRequestYear,
        staj: {
          status: "TERMINATED",
          terminationDate: {
            lt: new Date(dekontRequestYear, dekontRequestMonth - 1, 1),
          },
        },
      },
      include: {
        staj: {
          include: {
            student: { select: { name: true, surname: true } },
          },
        },
      },
    });

    console.log(
      `Found ${novemberDekontlar.length} November 2025 dekontlar from students terminated before November`
    );

    if (novemberDekontlar.length > 0) {
      console.log("⚠️ BUSINESS RULE VIOLATION DETECTED:");
      novemberDekontlar.forEach((dekont, i) => {
        console.log(
          `  ${i + 1}. ${dekont.staj.student.name} ${
            dekont.staj.student.surname
          } - Dekont ID: ${dekont.id}`
        );
      });
    }

    // Summary
    console.log("\n📋 BUSINESS RULE ANALYSIS SUMMARY:");
    console.log("=".repeat(50));
    console.log(
      `❓ Question: Should Oktober 2025 termination + November 2025 dekont be allowed?`
    );
    console.log(`✅ POST validation: Correctly blocks it`);
    console.log(
      `❓ GET filtering: Mixed results due to current date vs requested month logic`
    );
    console.log(
      `🔍 Consistency issue: GET and POST use different filtering approaches`
    );

    // Check month start logic detail
    const octoberTermination = new Date("2025-10-31");
    const novemberStart = new Date(2025, 10, 1); // November 1st, 2025

    console.log("\n🔍 DETAILED LOGIC CHECK:");
    console.log(
      `October termination date: ${octoberTermination.toISOString()}`
    );
    console.log(`November month start: ${novemberStart.toISOString()}`);
    console.log(
      `terminationDate >= monthStart: ${octoberTermination >= novemberStart} ❌`
    );
    console.log(
      "➡️ Current filtering logic would CORRECTLY exclude terminated students from November results"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testTerminationDekontBusinessRule();
