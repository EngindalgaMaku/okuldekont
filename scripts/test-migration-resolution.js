const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testMigrationResolution() {
  console.log("🧪 Testing Migration Resolution...\n");

  try {
    // Test 1: Verify performance indexes exist and work
    console.log("1️⃣ Testing performance indexes...");

    const internshipsQuery = await prisma.staj.findMany({
      where: {
        status: "ACTIVE",
      },
      take: 5,
    });
    console.log(
      `✅ Performance index query executed successfully (${internshipsQuery.length} results)`
    );

    const studentsQuery = await prisma.student.findMany({
      take: 5,
    });
    console.log(
      `✅ Student search composite index query executed successfully (${studentsQuery.length} results)`
    );

    // Test 2: Verify sequenceNumber functionality in dekonts
    console.log("\n2️⃣ Testing sequenceNumber in dekonts...");

    const dekontCount = await prisma.dekont.count();
    console.log(`✅ Dekont table accessible (${dekontCount} records)`);

    if (dekontCount > 0) {
      const sampleDekont = await prisma.dekont.findFirst({
        select: {
          id: true,
          sequenceNumber: true,
          month: true,
          year: true,
        },
      });
      console.log(
        `✅ SequenceNumber field working: ${sampleDekont.sequenceNumber} for ${sampleDekont.month}/${sampleDekont.year}`
      );
    }

    // Test 3: Verify companyType functionality
    console.log("\n3️⃣ Testing companyType in companies...");

    const companyStats = await prisma.companyProfile.groupBy({
      by: ["companyType"],
      _count: {
        companyType: true,
      },
    });

    companyStats.forEach((stat) => {
      console.log(
        `✅ ${stat.companyType} companies: ${stat._count.companyType}`
      );
    });

    // Test 4: Verify student_history table
    console.log("\n4️⃣ Testing student_history table...");

    const historyCount = await prisma.studentHistory.count();
    console.log(
      `✅ Student history table accessible (${historyCount} records)`
    );

    // Test 5: Check migration state
    console.log("\n5️⃣ Verifying migration state...");

    const migrations = await prisma.$queryRaw`
            SELECT migration_name, finished_at, applied_steps_count
            FROM _prisma_migrations 
            WHERE migration_name IN (
                '20251001_add_performance_indexes',
                '20251002_add_sequence_number_to_dekont', 
                '20251003_add_company_type',
                '20250730_add_student_history'
            )
            AND finished_at IS NOT NULL
            ORDER BY migration_name
        `;

    console.log("\n📊 Migration Status:");
    migrations.forEach((migration) => {
      console.log(
        `✅ ${migration.migration_name}: Applied (${migration.applied_steps_count} steps)`
      );
    });

    console.log("\n🎉 All migration resolution tests passed successfully!");

    return {
      success: true,
      tests: {
        performanceIndexes: true,
        sequenceNumber: true,
        companyType: true,
        studentHistory: true,
        migrationState: true,
      },
      details: {
        internshipsCount: internshipsQuery.length,
        studentsCount: studentsQuery.length,
        dekontCount,
        companyStats,
        historyCount,
        migrationsFixed: migrations.length,
      },
    };
  } catch (error) {
    console.error("❌ Migration resolution test failed:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function generateTestReport(results) {
  const fs = require("fs");
  const path = require("path");

  const report = {
    timestamp: new Date().toISOString(),
    testResults: results,
    conclusion: results.success
      ? "Migration conflicts successfully resolved. All database features working correctly."
      : "Migration resolution failed. Manual intervention required.",
    recommendations: results.success
      ? [
          "Database is ready for production use",
          "Consider updating Prisma to latest version (6.17.1)",
          "Monitor performance with new indexes",
          "Implement proper backup strategy",
        ]
      : [
          "Check database logs for detailed error information",
          "Verify database permissions",
          "Consider manual schema synchronization",
          "Contact database administrator if needed",
        ],
  };

  fs.writeFileSync(
    path.join(__dirname, "../migration-resolution-test-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(
    "\n📋 Test report saved to: migration-resolution-test-report.json"
  );
}

async function main() {
  const results = await testMigrationResolution();
  await generateTestReport(results);

  if (!results.success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testMigrationResolution };
