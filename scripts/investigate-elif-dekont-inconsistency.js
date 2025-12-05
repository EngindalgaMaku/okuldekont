const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function investigateElifDekontInconsistency() {
  try {
    await prisma.$connect();
    console.log("🔍 ELIF POYRAZ DEKONT INCONSISTENCY INVESTIGATION");
    console.log("═".repeat(70));

    const elifStajId = "cmfzckrex00uxnn0l56da78bg";
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Get Elif's staj record
    const elifStaj = await prisma.staj.findUnique({
      where: { id: elifStajId },
      include: {
        student: {
          select: { id: true, name: true, surname: true, number: true },
        },
        company: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, surname: true } },
        educationYear: { select: { year: true, active: true } },
      },
    });

    if (!elifStaj) {
      console.log("❌ Elif staj record not found");
      return;
    }

    console.log("📋 ELIF STAJ INFO:");
    console.log(
      `   Student: ${elifStaj.student.name} ${elifStaj.student.surname}`
    );
    console.log(`   Company: ${elifStaj.company.name}`);
    console.log(`   Status: ${elifStaj.status}`);
    console.log(`   Start: ${elifStaj.startDate?.toISOString().split("T")[0]}`);
    console.log(`   End: ${elifStaj.endDate?.toISOString().split("T")[0]}`);
    console.log(
      `   Termination: ${
        elifStaj.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
    console.log(
      `   Education Year: ${elifStaj.educationYear?.year} (Active: ${elifStaj.educationYear?.active})`
    );

    // Get ALL Elif's dekontlar (no filtering)
    const allElifDekontlar = await prisma.dekont.findMany({
      where: {
        stajId: elifStajId,
        archived: false,
      },
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `\n📊 ALL ELIF'S DEKONTLAR (${allElifDekontlar.length} found):`
    );
    let totalAmount = 0;
    allElifDekontlar.forEach((dekont, i) => {
      const amount = dekont.amount ? Number(dekont.amount) : 0;
      totalAmount += amount;
      console.log(
        `   ${i + 1}. ${dekont.month}/${dekont.year} - ${amount}₺ (${
          dekont.status
        })`
      );
    });
    console.log(`   💰 TOTAL AMOUNT: ${totalAmount}₺`);

    // Test 1: dekontlar/route.ts logic simulation
    console.log("\n🔍 TEST 1: DEKONTLAR ROUTE LOGIC SIMULATION");
    console.log("─".repeat(50));

    const dekontlarRouteWhereClause = {
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

    const elifDekontlarFromRoute = dekontlarRouteResult.filter(
      (d) => d.staj?.student?.id === elifStaj.studentId
    );

    console.log(
      `   Dekontlar Route Logic: ${elifDekontlarFromRoute.length} dekontlar found for Elif`
    );
    let routeAmount = 0;
    elifDekontlarFromRoute.forEach((dekont, i) => {
      const amount = dekont.amount ? Number(dekont.amount) : 0;
      routeAmount += amount;
      console.log(
        `      ${i + 1}. ${dekont.month}/${dekont.year} - ${amount}₺ (${
          dekont.status
        })`
      );
    });
    console.log(`   💰 ROUTE TOTAL: ${routeAmount}₺`);

    // Test 2: dekont-status/route.ts logic simulation
    console.log("\n🔍 TEST 2: DEKONT-STATUS ROUTE LOGIC SIMULATION");
    console.log("─".repeat(50));

    // Step 2a: How dekont-status fetches dekontlar (NO TERMINATED FILTERING!)
    const dekontStatusDekontlar = await prisma.dekont.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
        archived: false,
        // ❌ This is the BUG - no TERMINATED filtering!
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

    const elifDekontlarFromStatus = dekontStatusDekontlar.filter(
      (d) => d.staj?.student?.id === elifStaj.studentId
    );

    console.log(
      `   Dekont-Status Route Logic: ${elifDekontlarFromStatus.length} dekontlar found for Elif`
    );
    elifDekontlarFromStatus.forEach((dekont, i) => {
      const amount = dekont.amount ? Number(dekont.amount) : 0;
      console.log(
        `      ${i + 1}. ${dekont.month}/${dekont.year} - ${amount}₺ (${
          dekont.status
        })`
      );
    });

    // Step 2b: Check if Elif would pass TERMINATED filtering for current month
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    console.log(
      `\n   📅 Current Month Filter Check (>= ${
        monthStart.toISOString().split("T")[0]
      }):`
    );

    const elifPassesTerminatedFilter =
      elifStaj.status !== "TERMINATED" ||
      (elifStaj.status === "TERMINATED" &&
        ((elifStaj.terminationDate && elifStaj.terminationDate >= monthStart) ||
          (!elifStaj.terminationDate &&
            elifStaj.endDate &&
            elifStaj.endDate >= monthStart)));

    console.log(`   Elif Status: ${elifStaj.status}`);
    console.log(
      `   Termination Date: ${
        elifStaj.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
    console.log(
      `   End Date: ${elifStaj.endDate?.toISOString().split("T")[0]}`
    );
    console.log(
      `   ✅ Passes TERMINATED Filter: ${elifPassesTerminatedFilter}`
    );

    // Test 3: Frontend Display Logic Inconsistency
    console.log("\n🔍 TEST 3: UI INCONSISTENCY ANALYSIS");
    console.log("─".repeat(50));

    console.log(`   Total Dekontlar Found: ${allElifDekontlar.length}`);
    console.log(`   Total Amount: ${totalAmount}₺`);
    console.log(
      `   Has Dekont (Status Route): ${
        elifDekontlarFromStatus.length > 0 ? "YES" : "NO"
      }`
    );
    console.log(`   Amount Displayed (Main Route): ${routeAmount}₺`);

    if (elifDekontlarFromStatus.length > 0 && routeAmount === 0) {
      console.log("\n🚨 INCONSISTENCY CONFIRMED:");
      console.log(
        '   - "Dekont var" shows YES (dekont-status route finds dekontlar)'
      );
      console.log(
        '   - "Dekont Tutarı" shows 0 or "-" (dekontlar route filters them out)'
      );
      console.log(
        "   - Root cause: dekont-status route lacks TERMINATED filtering"
      );
    } else {
      console.log("\n✅ No inconsistency detected in this test case");
    }

    // Test different months for Elif's dekontlar
    console.log("\n🔍 TEST 4: MONTH-BY-MONTH ANALYSIS");
    console.log("─".repeat(50));

    const elifMonths = [
      ...new Set(allElifDekontlar.map((d) => `${d.month}-${d.year}`)),
    ];

    for (const monthYear of elifMonths) {
      const [month, year] = monthYear.split("-").map(Number);

      // Test TERMINATED filtering for this specific month
      const testMonthStart = new Date(year, month - 1, 1);
      const passesFilterForMonth =
        elifStaj.status !== "TERMINATED" ||
        (elifStaj.status === "TERMINATED" &&
          ((elifStaj.terminationDate &&
            elifStaj.terminationDate >= testMonthStart) ||
            (!elifStaj.terminationDate &&
              elifStaj.endDate &&
              elifStaj.endDate >= testMonthStart)));

      const monthDekontlar = allElifDekontlar.filter(
        (d) => d.month === month && d.year === year
      );
      const monthTotal = monthDekontlar.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      console.log(
        `   ${month}/${year}: ${
          monthDekontlar.length
        } dekontlar, ${monthTotal}₺ - Filter: ${
          passesFilterForMonth ? "✅ PASS" : "❌ FAIL"
        }`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investigateElifDekontInconsistency();
