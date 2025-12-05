const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function testElifDekontStatusMonths() {
  try {
    await prisma.$connect();
    console.log(
      "🔍 TESTING DEKONT-STATUS ROUTE FOR ELIF'S ACTUAL DEKONT MONTHS"
    );
    console.log("═".repeat(70));

    const elifStajId = "cmfzckrex00uxnn0l56da78bg";

    // Get Elif's staj record
    const elifStaj = await prisma.staj.findUnique({
      where: { id: elifStajId },
      include: {
        student: { select: { id: true, name: true, surname: true } },
        company: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, surname: true } },
      },
    });

    if (!elifStaj) {
      console.log("❌ Elif staj record not found");
      return;
    }

    // Test each month where Elif has dekontlar
    const testMonths = [
      { month: 11, year: 2025, name: "November 2025" },
      { month: 10, year: 2025, name: "October 2025" },
      { month: 9, year: 2025, name: "September 2025" },
    ];

    for (const testPeriod of testMonths) {
      console.log(`\n🔍 TESTING ${testPeriod.name.toUpperCase()}`);
      console.log("─".repeat(50));

      // Test 1: dekont-status route logic (NO TERMINATED filtering on dekontlar)
      const dekontStatusDekontlar = await prisma.dekont.findMany({
        where: {
          month: testPeriod.month,
          year: testPeriod.year,
          archived: false,
          // ❌ BUG: No TERMINATED filtering here!
        },
        include: {
          staj: {
            include: {
              student: { select: { id: true, name: true, surname: true } },
              company: { select: { id: true, name: true } },
            },
          },
        },
      });

      const elifDekontlarStatusRoute = dekontStatusDekontlar.filter(
        (d) => d.staj?.student?.id === elifStaj.studentId
      );

      console.log(
        `   Status Route: ${elifDekontlarStatusRoute.length} dekontlar found`
      );
      let statusRouteTotal = 0;
      elifDekontlarStatusRoute.forEach((dekont, i) => {
        const amount = dekont.amount ? Number(dekont.amount) : 0;
        statusRouteTotal += amount;
        console.log(`      ${i + 1}. ${amount}₺ (${dekont.status})`);
      });

      // Test 2: dekontlar route logic (WITH TERMINATED filtering)
      const dekontlarRouteWhereClause = {
        archived: false,
        month: testPeriod.month,
        year: testPeriod.year,
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
                            gte: new Date(
                              testPeriod.year,
                              testPeriod.month - 1,
                              1
                            ),
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
                            gte: new Date(
                              testPeriod.year,
                              testPeriod.month - 1,
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
        },
      };

      const dekontlarRouteResult = await prisma.dekont.findMany({
        where: dekontlarRouteWhereClause,
        include: {
          staj: {
            include: {
              student: { select: { id: true, name: true, surname: true } },
              company: { select: { name: true } },
            },
          },
        },
      });

      const elifDekontlarMainRoute = dekontlarRouteResult.filter(
        (d) => d.staj?.student?.id === elifStaj.studentId
      );

      console.log(
        `   Main Route: ${elifDekontlarMainRoute.length} dekontlar found`
      );
      let mainRouteTotal = 0;
      elifDekontlarMainRoute.forEach((dekont, i) => {
        const amount = dekont.amount ? Number(dekont.amount) : 0;
        mainRouteTotal += amount;
        console.log(`      ${i + 1}. ${amount}₺ (${dekont.status})`);
      });

      // Check TERMINATED filter for this specific month
      const monthStart = new Date(testPeriod.year, testPeriod.month - 1, 1);
      const elifPassesFilter =
        elifStaj.status !== "TERMINATED" ||
        (elifStaj.status === "TERMINATED" &&
          ((elifStaj.terminationDate &&
            elifStaj.terminationDate >= monthStart) ||
            (!elifStaj.terminationDate &&
              elifStaj.endDate &&
              elifStaj.endDate >= monthStart)));

      console.log(
        `   Filter Check (>= ${monthStart.toISOString().split("T")[0]}): ${
          elifPassesFilter ? "✅ PASS" : "❌ FAIL"
        }`
      );
      console.log(
        `   End Date: ${elifStaj.endDate?.toISOString().split("T")[0]}`
      );
      console.log(
        `   Termination: ${
          elifStaj.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );

      // Check for inconsistency
      if (
        elifDekontlarStatusRoute.length > 0 &&
        elifDekontlarMainRoute.length === 0
      ) {
        console.log(`   🚨 INCONSISTENCY DETECTED!`);
        console.log(
          `      Status Route finds ${elifDekontlarStatusRoute.length} dekontlar (${statusRouteTotal}₺)`
        );
        console.log(
          `      Main Route finds ${elifDekontlarMainRoute.length} dekontlar (${mainRouteTotal}₺)`
        );
        console.log(
          `      UI would show: "Dekont var" = YES, "Dekont Tutarı" = "-" or 0`
        );
      } else if (statusRouteTotal !== mainRouteTotal) {
        console.log(`   ⚠️ AMOUNT MISMATCH!`);
        console.log(`      Status Route: ${statusRouteTotal}₺`);
        console.log(`      Main Route: ${mainRouteTotal}₺`);
      } else {
        console.log(`   ✅ Consistent: Both routes return same results`);
      }
    }

    console.log(`\n📊 SUMMARY FOR ELIF POYRAZ:`);
    console.log(`   Status: ${elifStaj.status}`);
    console.log(`   Company: ${elifStaj.company.name}`);
    console.log(
      `   End Date: ${elifStaj.endDate?.toISOString().split("T")[0]}`
    );
    console.log(
      `   Termination: ${
        elifStaj.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testElifDekontStatusMonths();
