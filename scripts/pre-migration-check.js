#!/usr/bin/env node

/**
 * Pre-Migration Safety Check
 *
 * A lightweight script to run before applying Prisma migrations
 * to prevent common migration conflicts.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function quickMigrationCheck() {
  console.log("🚀 Quick Pre-Migration Safety Check...\n");

  try {
    // Check 1: Migration state
    console.log("1️⃣ Checking migration state...");
    const failedMigrations = await prisma.$queryRaw`
            SELECT migration_name, logs
            FROM _prisma_migrations 
            WHERE finished_at IS NULL AND rolled_back_at IS NULL AND logs IS NOT NULL
            ORDER BY started_at DESC
            LIMIT 5
        `;

    if (failedMigrations.length > 0) {
      console.log(`❌ Found ${failedMigrations.length} failed migrations:`);
      failedMigrations.forEach((m) => console.log(`   - ${m.migration_name}`));
      console.log("\n🔧 Run: node scripts/fix-migration-conflicts.js");
      return false;
    }
    console.log("✅ Migration state is clean");

    // Check 2: Database connectivity
    console.log("\n2️⃣ Testing database connectivity...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");

    // Check 3: Basic schema validation
    console.log("\n3️⃣ Basic schema validation...");
    const tableCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
        `;
    console.log(`✅ Schema accessible (${tableCount[0].count} tables)`);

    console.log("\n🎉 Pre-migration checks passed! Safe to run migrations.");
    console.log("\n📋 Next steps:");
    console.log("1. npx prisma migrate deploy");
    console.log("2. npx prisma generate");
    console.log("3. Test your application");

    return true;
  } catch (error) {
    console.log(`❌ Pre-migration check failed: ${error.message}`);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check database connection");
    console.log("2. Verify environment variables");
    console.log("3. Run: node scripts/fix-migration-conflicts.js");
    return false;
  }
}

async function main() {
  const success = await quickMigrationCheck();
  await prisma.$disconnect();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { quickMigrationCheck };
