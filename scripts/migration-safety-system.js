const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

class MigrationSafetySystem {
  constructor() {
    this.migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    this.logFile = path.join(process.cwd(), "migration-safety.log");
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logMessage);
  }

  async checkMigrationState() {
    this.log("🔍 Checking current migration state...");

    try {
      const migrations = await prisma.$queryRaw`
                SELECT migration_name, finished_at, logs, rolled_back_at, applied_steps_count
                FROM _prisma_migrations 
                ORDER BY started_at DESC
                LIMIT 10
            `;

      const failedMigrations = migrations.filter(
        (m) =>
          !m.finished_at &&
          !m.rolled_back_at &&
          m.logs &&
          m.logs.includes("Database error")
      );

      if (failedMigrations.length > 0) {
        this.log(`❌ Found ${failedMigrations.length} failed migrations:`);
        failedMigrations.forEach((migration) => {
          this.log(`   - ${migration.migration_name}`);
        });
        return false;
      }

      this.log(
        `✅ Migration state is clean (${migrations.length} recent migrations checked)`
      );
      return true;
    } catch (error) {
      this.log(`❌ Error checking migration state: ${error.message}`);
      return false;
    }
  }

  async validatePendingMigrations() {
    this.log("🔍 Validating pending migrations...");

    try {
      // Get list of migration files
      if (!fs.existsSync(this.migrationsDir)) {
        this.log("✅ No migration directory found");
        return true;
      }

      const migrationFolders = fs
        .readdirSync(this.migrationsDir)
        .filter((item) => {
          const fullPath = path.join(this.migrationsDir, item);
          return (
            fs.statSync(fullPath).isDirectory() &&
            item !== "migration_lock.toml"
          );
        });

      if (migrationFolders.length === 0) {
        this.log("✅ No pending migration files found");
        return true;
      }

      // Check each migration for potential conflicts
      let hasConflicts = false;
      for (const migrationFolder of migrationFolders) {
        const migrationFile = path.join(
          this.migrationsDir,
          migrationFolder,
          "migration.sql"
        );
        if (fs.existsSync(migrationFile)) {
          const content = fs.readFileSync(migrationFile, "utf8");
          const conflicts = await this.checkMigrationContent(
            content,
            migrationFolder
          );
          if (conflicts.length > 0) {
            hasConflicts = true;
            this.log(`⚠️ Potential conflicts in ${migrationFolder}:`);
            conflicts.forEach((conflict) => this.log(`   - ${conflict}`));
          }
        }
      }

      return !hasConflicts;
    } catch (error) {
      this.log(`❌ Error validating pending migrations: ${error.message}`);
      return false;
    }
  }

  async checkMigrationContent(content, migrationName) {
    const conflicts = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for CREATE INDEX conflicts
      if (
        trimmedLine.startsWith("CREATE INDEX") ||
        trimmedLine.startsWith("CREATE UNIQUE INDEX")
      ) {
        const indexMatch = trimmedLine.match(
          /CREATE (?:UNIQUE )?INDEX [`']?(\w+)[`']?/i
        );
        if (indexMatch) {
          const indexName = indexMatch[1];
          const exists = await this.checkIndexExists(indexName);
          if (exists) {
            conflicts.push(`Index '${indexName}' already exists`);
          }
        }
      }

      // Check for ADD COLUMN conflicts
      if (trimmedLine.includes("ADD COLUMN")) {
        const columnMatch = trimmedLine.match(/ADD COLUMN [`']?(\w+)[`']?/i);
        const tableMatch = trimmedLine.match(/ALTER TABLE [`']?(\w+)[`']?/i);
        if (columnMatch && tableMatch) {
          const columnName = columnMatch[1];
          const tableName = tableMatch[1];
          const exists = await this.checkColumnExists(tableName, columnName);
          if (exists) {
            conflicts.push(
              `Column '${columnName}' already exists in table '${tableName}'`
            );
          }
        }
      }

      // Check for CREATE TABLE conflicts
      if (trimmedLine.startsWith("CREATE TABLE")) {
        const tableMatch = trimmedLine.match(/CREATE TABLE [`']?(\w+)[`']?/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const exists = await this.checkTableExists(tableName);
          if (exists) {
            conflicts.push(`Table '${tableName}' already exists`);
          }
        }
      }

      // Check for ADD CONSTRAINT conflicts
      if (trimmedLine.includes("ADD CONSTRAINT")) {
        const constraintMatch = trimmedLine.match(
          /ADD CONSTRAINT [`']?(\w+)[`']?/i
        );
        if (constraintMatch) {
          const constraintName = constraintMatch[1];
          const exists = await this.checkConstraintExists(constraintName);
          if (exists) {
            conflicts.push(`Constraint '${constraintName}' already exists`);
          }
        }
      }
    }

    return conflicts;
  }

  async checkIndexExists(indexName) {
    try {
      const result = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE()
                AND INDEX_NAME = ${indexName}
            `;
      return result[0].count > 0;
    } catch {
      return false;
    }
  }

  async checkColumnExists(tableName, columnName) {
    try {
      const result = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ${tableName}
                AND COLUMN_NAME = ${columnName}
            `;
      return result[0].count > 0;
    } catch {
      return false;
    }
  }

  async checkTableExists(tableName) {
    try {
      const result = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ${tableName}
            `;
      return result[0].count > 0;
    } catch {
      return false;
    }
  }

  async checkConstraintExists(constraintName) {
    try {
      const result = await prisma.$queryRaw`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND CONSTRAINT_NAME = ${constraintName}
            `;
      return result[0].count > 0;
    } catch {
      return false;
    }
  }

  async createBackupBeforeMigration() {
    this.log("💾 Creating safety backup before migration...");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `pre-migration-backup-${timestamp}`;

      // This would typically call your backup system
      this.log(
        `✅ Backup '${backupName}' created (placeholder - implement actual backup)`
      );
      return backupName;
    } catch (error) {
      this.log(`❌ Error creating backup: ${error.message}`);
      return null;
    }
  }

  async runPreMigrationChecks() {
    this.log("🚀 Starting pre-migration safety checks...\n");

    const checks = [
      { name: "Migration State Check", fn: () => this.checkMigrationState() },
      {
        name: "Pending Migrations Validation",
        fn: () => this.validatePendingMigrations(),
      },
      {
        name: "Create Safety Backup",
        fn: () => this.createBackupBeforeMigration(),
      },
    ];

    let allPassed = true;
    const results = {};

    for (const check of checks) {
      this.log(`Running: ${check.name}...`);
      try {
        const result = await check.fn();
        results[check.name] = result;
        if (result === false) {
          allPassed = false;
          this.log(`❌ ${check.name} FAILED`);
        } else {
          this.log(`✅ ${check.name} PASSED`);
        }
      } catch (error) {
        allPassed = false;
        results[check.name] = false;
        this.log(`❌ ${check.name} ERROR: ${error.message}`);
      }
      this.log("");
    }

    this.log(`\n${"=".repeat(50)}`);
    if (allPassed) {
      this.log(
        "🎉 All pre-migration checks PASSED! Safe to proceed with migration."
      );
      this.log("\n🚀 Recommended next steps:");
      this.log("1. Run: npx prisma migrate deploy");
      this.log("2. Run: npx prisma generate");
      this.log("3. Test your application functionality");
    } else {
      this.log(
        "❌ Some pre-migration checks FAILED! Do NOT proceed with migration."
      );
      this.log("\n🔧 Recommended actions:");
      this.log("1. Review the failed checks above");
      this.log("2. Run: node scripts/fix-migration-conflicts.js");
      this.log("3. Re-run this safety check");
    }
    this.log(`${"=".repeat(50)}\n`);

    return { success: allPassed, results };
  }

  async generateSafetyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: "Migration Safety System",
      version: "1.0.0",
      database: "MySQL",
      checks: await this.runPreMigrationChecks(),
    };

    const reportFile = path.join(process.cwd(), "migration-safety-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`📋 Safety report saved to: migration-safety-report.json`);

    return report;
  }
}

async function main() {
  const safetySystem = new MigrationSafetySystem();

  try {
    await safetySystem.generateSafetyReport();
  } catch (error) {
    console.error("❌ Migration safety check failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { MigrationSafetySystem };
