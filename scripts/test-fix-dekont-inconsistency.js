const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function testFixDekontsInconsistency() {
  try {
    await prisma.$connect();

    console.log("🔧 UI INCONSISTENCY FIX VERIFICATION");
    console.log("═".repeat(70));

    // Test case: Elif Poyraz in Özlem Görünmez company
    const elifStajId = "cmfzckrex00uxnn0l56da78bg";

    // Get Elif's staj record
    const stajRecord = await prisma.staj.findUnique({
      where: { id: elifStajId },
      include: {
        student: {
          select: { name: true, surname: true, number: true },
        },
        company: {
          select: { name: true },
        },
      },
    });

    if (!stajRecord) {
      console.log("❌ Test staj record not found");
      return;
    }

    console.log("📋 TEST CASE:");
    console.log("─".repeat(50));
    console.log(
      `   Student: ${stajRecord.student?.name} ${stajRecord.student?.surname}`
    );
    console.log(`   Company: ${stajRecord.company?.name}`);
    console.log(`   Status: ${stajRecord.status}`);
    console.log(
      `   Termination Date: ${
        stajRecord.terminationDate?.toISOString().split("T")[0] || "N/A"
      }`
    );
    console.log(
      `   End Date: ${stajRecord.endDate?.toISOString().split("T")[0] || "N/A"}`
    );

    // Test for multiple months to see filtering behavior
    const testMonths = [
      { month: 9, year: 2025, name: "Eylül 2025" },
      { month: 10, year: 2025, name: "Ekim 2025" },
      { month: 11, year: 2025, name: "Kasım 2025" },
    ];

    console.log("\n🧪 TESTING DEKONT STATUS API (AFTER FIX):");
    console.log("─".repeat(50));

    for (const testMonth of testMonths) {
      console.log(`\n📅 Testing ${testMonth.name}:`);

      // Simulate dekont-status API query with new TERMINATED filtering
      const dekontlar = await prisma.dekont.findMany({
        where: {
          month: testMonth.month,
          year: testMonth.year,
          archived: false,
          // NEW: Added TERMINATED filtering (same as dekontlar/route.ts)
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
                                testMonth.year,
                                testMonth.month - 1,
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
                                testMonth.year,
                                testMonth.month - 1,
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
        },
        include: {
          staj: {
            include: {
              student: {
                select: { name: true, surname: true, number: true },
              },
            },
          },
        },
      });

      // Find Elif's dekontlar for this month
      const elifDekontlar = dekontlar.filter((d) => d.staj.id === elifStajId);

      console.log(`   Dekont Status API Result:`);
      console.log(`   - Total dekontlar found: ${dekontlar.length}`);
      console.log(`   - Elif's dekontlar: ${elifDekontlar.length}`);

      if (elifDekontlar.length > 0) {
        const totalAmount = elifDekontlar.reduce(
          (sum, d) => sum + Number(d.amount || 0),
          0
        );
        console.log(`   - Elif's total amount: ${totalAmount.toFixed(2)}₺`);
        console.log(`   - "Dekont var" indicator: YES`);
      } else {
        console.log(`   - Elif's total amount: 0₺`);
        console.log(`   - "Dekont var" indicator: NO`);
      }

      // Also test dekontlar API for comparison
      const dekontlarApiResult = await prisma.staj.findMany({
        where: {
          archived: false,
          educationYear: { active: true },
          // TERMINATED filtering (existing in dekontlar/route.ts)
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
                              testMonth.year,
                              testMonth.month - 1,
                              1
                            ),
                          },
                        },
                      ],
                    },
                    {
                      AND: [
                        { terminationDate: null },
                        {
                          endDate: {
                            gte: new Date(
                              testMonth.year,
                              testMonth.month - 1,
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
        include: {
          dekontlar: {
            where: {
              month: testMonth.month,
              year: testMonth.year,
              archived: false,
            },
          },
        },
      });

      const elifInDekontlarApi = dekontlarApiResult.find(
        (s) => s.id === elifStajId
      );
      const elifDekontlarFromApi = elifInDekontlarApi?.dekontlar || [];
      const totalFromApi = elifDekontlarFromApi.reduce(
        (sum, d) => sum + Number(d.amount || 0),
        0
      );

      console.log(`   Dekontlar API Result:`);
      console.log(
        `   - Elif appears in results: ${elifInDekontlarApi ? "YES" : "NO"}`
      );
      console.log(
        `   - Elif's dekontlar count: ${elifDekontlarFromApi.length}`
      );
      console.log(`   - Elif's total amount: ${totalFromApi.toFixed(2)}₺`);

      // Check consistency
      const isConsistent =
        elifDekontlar.length > 0 === elifDekontlarFromApi.length > 0;
      const amountConsistent =
        Math.abs(
          elifDekontlar.reduce((sum, d) => sum + Number(d.amount || 0), 0) -
            totalFromApi
        ) < 0.01;

      console.log(`   🔍 CONSISTENCY CHECK:`);
      console.log(
        `   - "Dekont var" vs "Dekont count": ${
          isConsistent ? "✅ CONSISTENT" : "❌ INCONSISTENT"
        }`
      );
      console.log(
        `   - Amount calculation: ${
          amountConsistent ? "✅ CONSISTENT" : "❌ INCONSISTENT"
        }`
      );

      if (isConsistent && amountConsistent) {
        console.log(`   🎉 FIX SUCCESSFUL for ${testMonth.name}`);
      } else {
        console.log(`   ⚠️  Still inconsistent for ${testMonth.name}`);
      }
    }

    console.log("\n📋 SUMMARY:");
    console.log("─".repeat(50));
    console.log(
      "The fix adds TERMINATED filtering to dekont-status API to match dekontlar API"
    );
    console.log(
      'This ensures both "Dekont var" indicator and dekont amounts use the same filtering logic'
    );
    console.log(
      "TERMINATED students are only included if they worked during the specified month"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFixDekontsInconsistency();
