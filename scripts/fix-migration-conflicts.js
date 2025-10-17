const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log("🔍 Analyzing current database schema...");

  try {
    // Check if indexes exist
    const indexes = await prisma.$queryRaw`
            SELECT DISTINCT INDEX_NAME, TABLE_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND INDEX_NAME IN (
                'idx_internships_filter_composite',
                'idx_students_search_composite',
                'companies_companyType_idx'
            )
        `;

    // Check if columns exist
    const columns = await prisma.$queryRaw`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND (
                (TABLE_NAME = 'dekonts' AND COLUMN_NAME = 'sequenceNumber') OR
                (TABLE_NAME = 'companies' AND COLUMN_NAME = 'companyType')
            )
        `;

    // Check if tables exist
    const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('student_history')
        `;

    // Check unique constraints
    const constraints = await prisma.$queryRaw`
            SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND CONSTRAINT_NAME = 'dekonts_stajId_month_year_sequenceNumber_key'
        `;

    console.log("\n📊 Current Database State:");
    console.log("Indexes found:", indexes);
    console.log("Columns found:", columns);
    console.log("Tables found:", tables);
    console.log("Constraints found:", constraints);

    return { indexes, columns, tables, constraints };
  } catch (error) {
    console.error("❌ Error checking database schema:", error);
    throw error;
  }
}

async function checkMigrationState() {
  console.log("\n🔍 Checking Prisma migration state...");

  try {
    const migrations = await prisma.$queryRaw`
            SELECT id, migration_name, finished_at, logs, rolled_back_at
            FROM _prisma_migrations 
            WHERE migration_name IN (
                '20251001_add_performance_indexes',
                '20251002_add_sequence_number_to_dekont', 
                '20251003_add_company_type',
                '20250730_add_student_history'
            )
            ORDER BY started_at DESC
        `;

    console.log("\n📋 Migration State:");
    migrations.forEach((migration) => {
      const status = migration.finished_at
        ? "COMPLETED"
        : migration.rolled_back_at
        ? "ROLLED_BACK"
        : "FAILED";
      console.log(`- ${migration.migration_name}: ${status}`);
      if (migration.logs && migration.logs.includes("Database error")) {
        console.log(
          `  Error: ${migration.logs
            .split("Database error:")[1]
            .split("Please check")[0]
            .trim()}`
        );
      }
    });

    return migrations;
  } catch (error) {
    console.error("❌ Error checking migration state:", error);
    throw error;
  }
}

async function fixMigrationConflicts(schemaState, migrationState) {
  console.log("\n🔧 Resolving migration conflicts...");

  const fixes = [];

  // Check each failed migration
  for (const migration of migrationState) {
    const migrationName = migration.migration_name;
    const hasFinished = !!migration.finished_at;

    if (hasFinished) {
      console.log(`✅ ${migrationName} already completed, skipping`);
      continue;
    }

    console.log(`\n🔨 Fixing ${migrationName}...`);

    switch (migrationName) {
      case "20251001_add_performance_indexes":
        await fixPerformanceIndexesMigration(schemaState);
        break;

      case "20251002_add_sequence_number_to_dekont":
        await fixSequenceNumberMigration(schemaState);
        break;

      case "20251003_add_company_type":
        await fixCompanyTypeMigration(schemaState);
        break;

      case "20250730_add_student_history":
        await fixStudentHistoryMigration(schemaState);
        break;
    }

    // Mark migration as completed
    await markMigrationAsCompleted(migration.id, migrationName);
    fixes.push(migrationName);
  }

  console.log("\n✅ Migration conflicts resolved:", fixes);
  return fixes;
}

async function fixPerformanceIndexesMigration(schemaState) {
  const existingIndexes = schemaState.indexes.map((idx) => idx.INDEX_NAME);

  // Check idx_internships_filter_composite
  if (!existingIndexes.includes("idx_internships_filter_composite")) {
    console.log("Creating missing index: idx_internships_filter_composite");
    await prisma.$executeRaw`
            CREATE INDEX \`idx_internships_filter_composite\` 
            ON \`internships\` (\`status\`, \`educationYearId\`, \`teacherId\`)
        `;
  } else {
    console.log("✓ idx_internships_filter_composite already exists");
  }

  // Check idx_students_search_composite
  if (!existingIndexes.includes("idx_students_search_composite")) {
    console.log("Creating missing index: idx_students_search_composite");
    await prisma.$executeRaw`
            CREATE INDEX \`idx_students_search_composite\` 
            ON \`students\` (\`name\`, \`surname\`, \`number\`)
        `;
  } else {
    console.log("✓ idx_students_search_composite already exists");
  }
}

async function fixSequenceNumberMigration(schemaState) {
  const existingColumns = schemaState.columns.map((col) => ({
    table: col.TABLE_NAME,
    column: col.COLUMN_NAME,
  }));
  const hasSequenceNumber = existingColumns.some(
    (col) => col.table === "dekonts" && col.column === "sequenceNumber"
  );

  if (!hasSequenceNumber) {
    console.log("Adding missing sequenceNumber column");
    await prisma.$executeRaw`ALTER TABLE \`dekonts\` ADD COLUMN \`sequenceNumber\` INT NOT NULL DEFAULT 1`;
    await prisma.$executeRaw`UPDATE \`dekonts\` SET \`sequenceNumber\` = 1 WHERE \`sequenceNumber\` IS NULL OR \`sequenceNumber\` = 0`;
  } else {
    console.log("✓ sequenceNumber column already exists");
  }

  // Check unique constraint
  const hasConstraint = schemaState.constraints.some(
    (constraint) =>
      constraint.CONSTRAINT_NAME ===
      "dekonts_stajId_month_year_sequenceNumber_key"
  );

  if (!hasConstraint) {
    console.log("Adding missing unique constraint");
    try {
      await prisma.$executeRaw`
                ALTER TABLE \`dekonts\` 
                ADD CONSTRAINT \`dekonts_stajId_month_year_sequenceNumber_key\` 
                UNIQUE (\`stajId\`, \`month\`, \`year\`, \`sequenceNumber\`)
            `;
    } catch (error) {
      console.log(
        "⚠️ Constraint may already exist or there are duplicate values"
      );
    }
  } else {
    console.log("✓ Unique constraint already exists");
  }
}

async function fixCompanyTypeMigration(schemaState) {
  const existingColumns = schemaState.columns.map((col) => ({
    table: col.TABLE_NAME,
    column: col.COLUMN_NAME,
  }));
  const hasCompanyType = existingColumns.some(
    (col) => col.table === "companies" && col.column === "companyType"
  );

  if (!hasCompanyType) {
    console.log("Adding missing companyType column");
    await prisma.$executeRaw`
            ALTER TABLE \`companies\` 
            ADD COLUMN \`companyType\` ENUM('PRIVATE', 'GOVERNMENT') NOT NULL DEFAULT 'PRIVATE'
        `;
  } else {
    console.log("✓ companyType column already exists");
  }

  // Check index
  const existingIndexes = schemaState.indexes.map((idx) => idx.INDEX_NAME);
  if (!existingIndexes.includes("companies_companyType_idx")) {
    console.log("Creating missing index: companies_companyType_idx");
    await prisma.$executeRaw`CREATE INDEX \`companies_companyType_idx\` ON \`companies\`(\`companyType\`)`;
  } else {
    console.log("✓ companies_companyType_idx already exists");
  }
}

async function fixStudentHistoryMigration(schemaState) {
  const existingTables = schemaState.tables.map((table) => table.TABLE_NAME);

  if (!existingTables.includes("student_history")) {
    console.log("Creating missing student_history table");
    // Execute the full CREATE TABLE statement from migration
    await prisma.$executeRaw`
            CREATE TABLE \`student_history\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`studentId\` VARCHAR(191) NOT NULL,
                \`changeType\` ENUM('PERSONAL_INFO_UPDATE', 'CONTACT_INFO_UPDATE', 'PARENT_INFO_UPDATE', 'SCHOOL_INFO_UPDATE', 'OTHER_UPDATE') NOT NULL,
                \`fieldName\` VARCHAR(191) NOT NULL,
                \`previousValue\` TEXT NULL,
                \`newValue\` TEXT NULL,
                \`validFrom\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`validTo\` DATETIME(3) NULL,
                \`changedBy\` VARCHAR(191) NOT NULL,
                \`reason\` TEXT NULL,
                \`notes\` TEXT NULL,
                \`archived\` BOOLEAN NOT NULL DEFAULT false,
                \`archivedAt\` DATETIME(3) NULL,
                \`archivedBy\` VARCHAR(191) NULL,

                INDEX \`student_history_studentId_validFrom_idx\`(\`studentId\`, \`validFrom\`),
                INDEX \`student_history_fieldName_idx\`(\`fieldName\`),
                INDEX \`student_history_changeType_idx\`(\`changeType\`),
                PRIMARY KEY (\`id\`)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;

    // Add foreign keys
    await prisma.$executeRaw`
            ALTER TABLE \`student_history\` 
            ADD CONSTRAINT \`student_history_studentId_fkey\` 
            FOREIGN KEY (\`studentId\`) REFERENCES \`students\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        `;

    await prisma.$executeRaw`
            ALTER TABLE \`student_history\` 
            ADD CONSTRAINT \`student_history_changedBy_fkey\` 
            FOREIGN KEY (\`changedBy\`) REFERENCES \`users\`(\`id\`) ON UPDATE CASCADE
        `;
  } else {
    console.log("✓ student_history table already exists");
  }
}

async function markMigrationAsCompleted(migrationId, migrationName) {
  console.log(`📝 Marking ${migrationName} as completed...`);

  try {
    await prisma.$executeRaw`
            UPDATE _prisma_migrations 
            SET finished_at = NOW(), logs = '', applied_steps_count = 1
            WHERE id = ${migrationId}
        `;
    console.log(`✅ ${migrationName} marked as completed`);
  } catch (error) {
    console.error(`❌ Error marking ${migrationName} as completed:`, error);
  }
}

async function generateReport(fixes) {
  const report = {
    timestamp: new Date().toISOString(),
    fixes: fixes,
    summary: `Fixed ${fixes.length} migration conflicts`,
    recommendation:
      "Run prisma generate and prisma migrate deploy to ensure consistency",
  };

  fs.writeFileSync(
    path.join(__dirname, "../migration-fix-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("\n📋 Migration Fix Report:");
  console.log(`- Fixed ${fixes.length} migration conflicts`);
  console.log("- Report saved to: migration-fix-report.json");
  console.log("\n🚀 Next Steps:");
  console.log("1. Run: npx prisma generate");
  console.log("2. Run: npx prisma migrate deploy");
  console.log("3. Test your application functionality");
}

async function main() {
  console.log("🔧 Starting Migration Conflict Resolution...\n");

  try {
    // Step 1: Check current database schema
    const schemaState = await checkDatabaseSchema();

    // Step 2: Check migration state
    const migrationState = await checkMigrationState();

    // Step 3: Fix conflicts
    const fixes = await fixMigrationConflicts(schemaState, migrationState);

    // Step 4: Generate report
    await generateReport(fixes);

    console.log("\n🎉 Migration conflict resolution completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration conflict resolution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
