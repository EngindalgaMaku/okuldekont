const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkCreatedByField() {
  try {
    console.log(
      '🔍 Checking for "created_by" field and "akademik-kullanici" value...'
    );

    // Check if there are any tables with created_by field
    const tables = [
      "dekont",
      "user",
      "teacherProfile",
      "companyProfile",
      "adminProfile",
      "staj",
      "student",
      "gorevBelgesi",
      "belge",
      "attendance",
    ];

    for (const tableName of tables) {
      try {
        console.log(`\n📋 Checking table: ${tableName}`);

        // Try to query the table and see if it has created_by field
        const query = `DESCRIBE ${tableName}`;
        const columns = await prisma.$queryRawUnsafe(query);

        const hasCreatedBy = columns.some((col) => col.Field === "created_by");

        if (hasCreatedBy) {
          console.log(`✅ Table ${tableName} has created_by field`);

          // Check for akademik-kullanici in this field
          const checkQuery = `SELECT * FROM ${tableName} WHERE created_by = 'akademik-kullanici' LIMIT 5`;
          try {
            const results = await prisma.$queryRawUnsafe(checkQuery);
            if (Array.isArray(results) && results.length > 0) {
              console.log(
                `🚨 FOUND "akademik-kullanici" in ${tableName}:`,
                results
              );
            } else {
              console.log(`✅ No "akademik-kullanici" found in ${tableName}`);
            }
          } catch (queryError) {
            console.log(
              `⚠️ Could not query created_by in ${tableName}:`,
              queryError.message
            );
          }

          // Also check for user ID "6"
          const checkIdQuery = `SELECT * FROM ${tableName} WHERE created_by = '6' LIMIT 5`;
          try {
            const idResults = await prisma.$queryRawUnsafe(checkIdQuery);
            if (Array.isArray(idResults) && idResults.length > 0) {
              console.log(
                `🔍 FOUND created_by="6" in ${tableName}:`,
                idResults
              );
            }
          } catch (queryError) {
            console.log(
              `⚠️ Could not query created_by="6" in ${tableName}:`,
              queryError.message
            );
          }
        } else {
          console.log(`❌ Table ${tableName} does not have created_by field`);
        }
      } catch (error) {
        console.log(`❌ Error checking table ${tableName}:`, error.message);
      }
    }

    // Check for any session-related tables
    console.log("\n🔍 Checking for session tables...");
    try {
      const showTablesQuery = `SHOW TABLES LIKE '%session%'`;
      const sessionTables = await prisma.$queryRawUnsafe(showTablesQuery);

      if (Array.isArray(sessionTables) && sessionTables.length > 0) {
        console.log("📋 Found session-related tables:", sessionTables);

        for (const table of sessionTables) {
          const tableName = Object.values(table)[0];
          try {
            const sampleQuery = `SELECT * FROM ${tableName} LIMIT 5`;
            const samples = await prisma.$queryRawUnsafe(sampleQuery);
            console.log(`📄 Sample data from ${tableName}:`, samples);
          } catch (error) {
            console.log(`⚠️ Could not sample ${tableName}:`, error.message);
          }
        }
      } else {
        console.log("❌ No session tables found");
      }
    } catch (error) {
      console.log("❌ Error checking session tables:", error.message);
    }

    // Check for any audit or log tables
    console.log("\n🔍 Checking for audit/log tables...");
    try {
      const auditTablesQuery = `SHOW TABLES LIKE '%audit%'`;
      const auditTables = await prisma.$queryRawUnsafe(auditTablesQuery);

      if (Array.isArray(auditTables) && auditTables.length > 0) {
        console.log("📋 Found audit tables:", auditTables);
      } else {
        console.log("❌ No audit tables found");
      }

      const logTablesQuery = `SHOW TABLES LIKE '%log%'`;
      const logTables = await prisma.$queryRawUnsafe(logTablesQuery);

      if (Array.isArray(logTables) && logTables.length > 0) {
        console.log("📋 Found log tables:", logTables);
      } else {
        console.log("❌ No log tables found");
      }
    } catch (error) {
      console.log("❌ Error checking audit/log tables:", error.message);
    }

    console.log("\n📋 Investigation completed.");
    console.log(
      '💡 The log "INFO:src.api.main:[SESSION LIST]" suggests this might be:'
    );
    console.log("   - From a different application running on the same server");
    console.log("   - From a previous/old system");
    console.log("   - From a monitoring or logging system");
    console.log("   - From test data or migration scripts");
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCreatedByField();
