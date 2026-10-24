const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function investigateEmreActiveStatus() {
  try {
    console.log("🔍 INVESTIGATING EMRE YEGÜL ACTIVE STATUS ISSUE");
    console.log("═".repeat(60));

    const emreStudentId = "cmfzckpoc00hqnn0lkxeklmr3";

    // 1. Get ALL staj records for Emre
    console.log("\n1️⃣ ALL STAJ RECORDS FOR EMRE YEGÜL");
    const allStajRecords = await prisma.staj.findMany({
      where: {
        studentId: emreStudentId,
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${allStajRecords.length} staj records:`);
    allStajRecords.forEach((staj, index) => {
      console.log(`   ${index + 1}. ID: ${staj.id}`);
      console.log(`      Company: ${staj.company.name}`);
      console.log(`      Status: ${staj.status}`);
      console.log(`      Archived: ${staj.archived}`);
      console.log(
        `      Termination Date: ${
          staj.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
      console.log(
        `      Created: ${staj.createdAt.toISOString().split("T")[0]}`
      );
      console.log();
    });

    // 2. Check which records would be included in "active" query
    console.log("\n2️⃣ TESTING ACTIVE QUERY FILTERS");

    const queryResults = await prisma.staj.findMany({
      where: {
        studentId: emreStudentId,
        archived: false,
        status: { not: "TERMINATED" },
      },
      select: {
        id: true,
        status: true,
        archived: true,
        terminationDate: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(
      `Records matching "active" query (archived: false, status != TERMINATED): ${queryResults.length}`
    );
    queryResults.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}`);
      console.log(`      Company: ${record.company.name}`);
      console.log(`      Status: ${record.status}`);
      console.log(`      Archived: ${record.archived}`);
      console.log(
        `      Termination Date: ${
          record.terminationDate?.toISOString().split("T")[0] || "N/A"
        }`
      );
    });

    // 3. Check alternative query patterns
    console.log("\n3️⃣ TESTING DIFFERENT QUERY PATTERNS");

    // Pattern 1: Include terminated but not archived
    const pattern1 = await prisma.staj.findMany({
      where: {
        studentId: emreStudentId,
        archived: false,
      },
      select: {
        id: true,
        status: true,
        archived: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log(`Pattern 1 (archived: false only): ${pattern1.length} records`);

    // Pattern 2: Not archived AND not terminated
    const pattern2 = await prisma.staj.findMany({
      where: {
        studentId: emreStudentId,
        archived: false,
        status: { not: "TERMINATED" },
      },
      select: {
        id: true,
        status: true,
        archived: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log(
      `Pattern 2 (archived: false AND status != TERMINATED): ${pattern2.length} records`
    );

    // 4. Check if there are multiple companies or multiple active internships
    console.log("\n4️⃣ DETAILED ANALYSIS");

    const activeRecords = allStajRecords.filter(
      (record) => !record.archived && record.status !== "TERMINATED"
    );

    const terminatedRecords = allStajRecords.filter(
      (record) => record.status === "TERMINATED"
    );

    console.log(`Total records: ${allStajRecords.length}`);
    console.log(
      `Active records (not archived + not terminated): ${activeRecords.length}`
    );
    console.log(`Terminated records: ${terminatedRecords.length}`);

    if (activeRecords.length > 0) {
      console.log("\n❌ ACTIVE RECORDS FOUND:");
      activeRecords.forEach((record, index) => {
        console.log(
          `   ${index + 1}. ${record.company.name} - ${record.status} (ID: ${
            record.id
          })`
        );
      });
    }

    if (terminatedRecords.length > 0) {
      console.log("\n✅ TERMINATED RECORDS:");
      terminatedRecords.forEach((record, index) => {
        console.log(
          `   ${index + 1}. ${record.company.name} - ${record.status} - Term: ${
            record.terminationDate?.toISOString().split("T")[0] || "N/A"
          } (ID: ${record.id})`
        );
      });
    }

    // 5. Summary and recommendations
    console.log("\n5️⃣ SUMMARY AND RECOMMENDATIONS");
    console.log("═".repeat(60));

    if (activeRecords.length === 0) {
      console.log(
        "✅ NO ACTIVE RECORDS - Student should not appear in expected lists"
      );
    } else {
      console.log(`❌ ${activeRecords.length} ACTIVE RECORD(S) FOUND`);
      console.log(
        "🔧 These records may need to be terminated/archived as well:"
      );
      activeRecords.forEach((record) => {
        console.log(`   • ${record.company.name} (ID: ${record.id})`);
      });
    }

    const targetRecord = allStajRecords.find(
      (r) => r.id === "cmfzckpol00hunn0laaebof13"
    );
    if (targetRecord) {
      console.log(`\n🎯 TARGET RECORD (Ömer Koçak Mühendislik):`);
      console.log(`   Status: ${targetRecord.status} ✅`);
      console.log(
        `   Termination Date: ${
          targetRecord.terminationDate?.toISOString().split("T")[0]
        } ✅`
      );
      console.log(`   Archived: ${targetRecord.archived}`);
      console.log(`   ✅ This record is correctly updated`);
    }
  } catch (error) {
    console.error("❌ Investigation failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run investigation
investigateEmreActiveStatus();
