const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

async function investigateElifTerminationData() {
  try {
    await prisma.$connect();
    console.log("🔍 ELİF POYRAZ TERMINATION DATA INTEGRITY ARAŞTIRMASI");
    console.log("═".repeat(70));

    // Get Elif's staj record
    const elifStajId = "cmfzckrex00uxnn0l56da78bg";
    const elifRecord = await prisma.staj.findUnique({
      where: { id: elifStajId },
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
            name: true,
            companyType: true,
          },
        },
        teacher: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    console.log("📋 ELİF POYRAZ DETAILED RECORD:");
    console.log("─".repeat(50));
    console.log(
      `   Student: ${elifRecord.student?.name} ${elifRecord.student?.surname} (${elifRecord.student?.number})`
    );
    console.log(`   Status: ${elifRecord.status}`);
    console.log(
      `   Start Date: ${elifRecord.startDate?.toISOString().split("T")[0]}`
    );
    console.log(
      `   End Date: ${elifRecord.endDate?.toISOString().split("T")[0]}`
    );
    console.log(
      `   Termination Date: ${
        elifRecord.terminationDate?.toISOString().split("T")[0] || "NULL ❌"
      }`
    );
    console.log(
      `   Created At: ${elifRecord.createdAt?.toISOString().split("T")[0]}`
    );
    console.log(
      `   Updated At: ${elifRecord.updatedAt?.toISOString().split("T")[0]}`
    );

    // Check all TERMINATED students to see if this is a pattern
    console.log("\n🔍 ALL TERMINATED STUDENTS DATA INTEGRITY CHECK:");
    console.log("─".repeat(50));
    const allTerminatedStudents = await prisma.staj.findMany({
      where: {
        status: "TERMINATED",
        archived: false,
        educationYear: {
          active: true,
        },
      },
      include: {
        student: { select: { name: true, surname: true } },
        company: { select: { name: true, companyType: true } },
      },
      orderBy: { lastModifiedAt: "desc" },
    });

    console.log(`Total TERMINATED students: ${allTerminatedStudents.length}`);

    let studentsWithoutTerminationDate = 0;
    let studentsWithTerminationDate = 0;

    allTerminatedStudents.forEach((student, i) => {
      const hasTerminationDate = student.terminationDate !== null;
      if (hasTerminationDate) {
        studentsWithTerminationDate++;
      } else {
        studentsWithoutTerminationDate++;
      }

      const isElif = student.id === elifStajId;
      console.log(
        `   ${i + 1}. ${student.student.name} ${student.student.surname} ${
          isElif ? "← ELİF" : ""
        }`
      );
      console.log(
        `      End Date: ${student.endDate?.toISOString().split("T")[0]}`
      );
      console.log(
        `      Termination Date: ${
          hasTerminationDate
            ? student.terminationDate?.toISOString().split("T")[0]
            : "NULL ❌"
        }`
      );
      console.log(
        `      Company: ${student.company?.name} (${student.company?.companyType})`
      );
    });

    console.log(`\n📊 TERMINATION DATA SUMMARY:`);
    console.log(`   With termination date: ${studentsWithTerminationDate}`);
    console.log(
      `   Without termination date: ${studentsWithoutTerminationDate} ❌`
    );

    // Proposed solution analysis
    console.log("\n💡 PROPOSED SOLUTIONS:");
    console.log("─".repeat(50));

    console.log(
      "\n1. 🔧 DATA FIX: Set terminationDate = endDate for TERMINATED students without terminationDate"
    );
    console.log(
      "   Logic: If a student is TERMINATED and has no terminationDate, use endDate as terminationDate"
    );

    console.log(
      "\n2. 🔄 BUSINESS LOGIC FIX: Modify filters to handle null terminationDate properly"
    );
    console.log(
      "   For TERMINATED students with null terminationDate, use endDate for payment calculations"
    );

    // Test the data fix approach
    console.log("\n🧪 TESTING DATA FIX APPROACH (November 2025):");
    console.log("─".repeat(50));

    const testMonth = 11; // November
    const testYear = 2025;
    const monthStart = new Date(testYear, testMonth - 1, 1);

    console.log(`Test month start: ${monthStart.toISOString().split("T")[0]}`);

    // Test: If we used endDate as terminationDate for Elif
    if (elifRecord) {
      const effectiveTerminationDate =
        elifRecord.terminationDate || elifRecord.endDate;
      const shouldBeIncluded =
        effectiveTerminationDate && effectiveTerminationDate >= monthStart;

      console.log(
        `Elif's effective termination date: ${
          effectiveTerminationDate?.toISOString().split("T")[0]
        }`
      );
      console.log(
        `Should be included in Nov 2025 payments: ${
          shouldBeIncluded ? "YES ✅" : "NO ❌"
        }`
      );

      if (shouldBeIncluded) {
        console.log("✅ DATA FIX would resolve Elif's case!");
      }
    }

    // Test the improved filter with data fix logic
    console.log("\n🧪 TESTING IMPROVED FILTER WITH DATA FIX LOGIC:");
    console.log("─".repeat(50));

    const improvedFilter = {
      archived: false,
      educationYear: {
        active: true,
      },
      company: {
        companyType: "PRIVATE",
      },
      OR: [
        // Non-terminated students
        { status: { not: "TERMINATED" } },
        // Terminated students - use terminationDate if available, otherwise use endDate
        {
          AND: [
            { status: "TERMINATED" },
            {
              OR: [
                // Has terminationDate and it's >= month start
                {
                  AND: [
                    { terminationDate: { not: null } },
                    { terminationDate: { gte: monthStart } },
                  ],
                },
                // No terminationDate but endDate >= month start (fallback logic)
                {
                  AND: [
                    { terminationDate: null },
                    { endDate: { gte: monthStart } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const improvedResult = await prisma.staj.findMany({
      where: improvedFilter,
      include: {
        student: { select: { name: true, surname: true } },
      },
    });

    const elifInImprovedFilter = improvedResult.find(
      (s) => s.id === elifStajId
    );
    console.log(
      `✅ Elif in improved filter: ${elifInImprovedFilter ? "YES" : "NO"}`
    );
    console.log(`📋 Total stajlar found: ${improvedResult.length}`);

    if (elifInImprovedFilter) {
      console.log("🎉 SUCCESS: Improved filter includes Elif!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

investigateElifTerminationData();
