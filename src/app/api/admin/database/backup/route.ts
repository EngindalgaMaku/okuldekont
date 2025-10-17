import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    let dbHost, dbPort, dbName, dbUser, dbPassword;

    // First try to parse DATABASE_URL if available (common in Coolify/Docker)
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        dbHost = url.hostname;
        dbPort = url.port || "3306";
        dbName = url.pathname.slice(1); // Remove leading slash
        dbUser = url.username;
        dbPassword = url.password;

        console.log("✅ Parsed DATABASE_URL successfully");
      } catch (parseError) {
        console.log("❌ Failed to parse DATABASE_URL:", parseError);
      }
    }

    // Fallback to individual environment variables if DATABASE_URL parsing failed
    if (!dbHost || !dbUser || !dbPassword) {
      dbHost =
        dbHost ||
        process.env.DATABASE_HOST ||
        process.env.DB_HOST ||
        process.env.MYSQL_HOST ||
        "localhost";

      dbPort =
        dbPort ||
        process.env.DATABASE_PORT ||
        process.env.DB_PORT ||
        process.env.MYSQL_PORT ||
        "3306";

      dbName =
        dbName ||
        process.env.DATABASE_NAME ||
        process.env.DB_NAME ||
        process.env.MYSQL_DATABASE ||
        "okuldekont";

      dbUser =
        dbUser ||
        process.env.DATABASE_USERNAME ||
        process.env.DATABASE_USER ||
        process.env.DB_USER ||
        process.env.DB_USERNAME ||
        process.env.MYSQL_USER;

      dbPassword =
        dbPassword ||
        process.env.DATABASE_PASSWORD ||
        process.env.DB_PASSWORD ||
        process.env.MYSQL_PASSWORD;
    }

    // Debug environment variables
    console.log("🔍 Database connection details:");
    console.log("DB Host:", dbHost);
    console.log("DB Port:", dbPort);
    console.log("DB Name:", dbName);
    console.log("DB User:", dbUser ? "✅ Found" : "❌ Missing");
    console.log("DB Password:", dbPassword ? "✅ Found" : "❌ Missing");
    console.log("DATABASE_URL available:", databaseUrl ? "✅ Yes" : "❌ No");

    if (!dbName || !dbUser || !dbPassword) {
      const availableEnvVars = Object.keys(process.env)
        .filter(
          (key) =>
            key.toLowerCase().includes("database") ||
            key.toLowerCase().includes("mysql") ||
            key.toLowerCase().includes("db")
        )
        .sort();

      return NextResponse.json(
        {
          success: false,
          message:
            "Veritabanı bağlantı bilgileri eksik. DATABASE_URL veya individual environment variables kontrol edin.",
          error: "MISSING_DB_CONFIG",
          debug: {
            missing: {
              dbName: !dbName,
              dbUser: !dbUser,
              dbPassword: !dbPassword,
            },
            availableDbEnvVars: availableEnvVars,
            databaseUrlAvailable: !!databaseUrl,
            checkedVars: {
              databaseUrl: "DATABASE_URL",
              host: ["DATABASE_HOST", "DB_HOST", "MYSQL_HOST"],
              port: ["DATABASE_PORT", "DB_PORT", "MYSQL_PORT"],
              name: ["DATABASE_NAME", "DB_NAME", "MYSQL_DATABASE"],
              user: [
                "DATABASE_USERNAME",
                "DATABASE_USER",
                "DB_USER",
                "DB_USERNAME",
                "MYSQL_USER",
              ],
              password: ["DATABASE_PASSWORD", "DB_PASSWORD", "MYSQL_PASSWORD"],
            },
          },
        },
        { status: 500 }
      );
    }

    // Backup dosya adı ve yolu
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupId = uuidv4().split("-")[0];
    const filename = `${dbName}_backup_${timestamp}_${backupId}.sql`;
    const backupPath = path.join(process.cwd(), "backups", filename);

    // Backups klasörü yoksa oluştur
    const backupsDir = path.join(process.cwd(), "backups");
    try {
      await fs.access(backupsDir);
    } catch {
      await fs.mkdir(backupsDir, { recursive: true });
    }

    console.log(`🔄 Veritabanı yedeği alınıyor: ${filename}`);

    try {
      // First try mysqldump if available
      const mysqldumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUser} -p${dbPassword} --single-transaction --routines --triggers ${dbName}`;

      let backupContent = "";
      let useAlternativeMethod = false;

      try {
        const { stdout, stderr } = await execAsync(
          `${mysqldumpCommand} > "${backupPath}"`
        );

        if (stderr && !stderr.includes("Warning")) {
          console.error("mysqldump stderr:", stderr);
          useAlternativeMethod = true;
        }
      } catch (execError: any) {
        console.log("🔄 mysqldump not available, using Prisma-based backup...");
        useAlternativeMethod = true;
      }

      // If mysqldump failed, use Prisma-based backup
      if (useAlternativeMethod) {
        console.log("📦 Creating Prisma-based backup...");

        // Generate SQL backup using Prisma
        backupContent = `-- Database Backup: ${dbName}
-- Generated on: ${new Date().toISOString()}
-- Method: Prisma-based backup (mysqldump not available)
-- Host: ${dbHost}

SET FOREIGN_KEY_CHECKS=0;

`;

        // Get all table names (safely escape database name)
        const escapedDbName = dbName.replace(/[`'"\\]/g, "");
        const tables = (await prisma.$queryRawUnsafe(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = '${escapedDbName}'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `)) as Array<{ table_name: string }>;

        console.log(`📋 Found ${tables.length} tables to backup`);

        // Backup each table
        for (const table of tables) {
          const tableName = table.table_name;
          // Safely escape table name to prevent SQL injection
          const escapedTableName = tableName.replace(/[`'"\\]/g, "");
          console.log(`📦 Backing up table: ${tableName}`);

          try {
            // Get table structure
            const createTable = (await prisma.$queryRawUnsafe(`
              SHOW CREATE TABLE \`${escapedTableName}\`
            `)) as Array<{ "Create Table": string }>;

            if (createTable.length > 0) {
              backupContent += `\n-- Table structure for table \`${tableName}\`\n`;
              backupContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
              backupContent += createTable[0]["Create Table"] + ";\n\n";
            }

            // Get table data
            const data = (await prisma.$queryRawUnsafe(`
              SELECT * FROM \`${escapedTableName}\`
            `)) as Array<Record<string, any>>;

            if (data.length > 0) {
              backupContent += `-- Dumping data for table \`${tableName}\`\n`;
              backupContent += `LOCK TABLES \`${tableName}\` WRITE;\n`;

              // Get column names
              const columns = Object.keys(data[0]);
              const columnList = columns.map((col) => `\`${col}\``).join(", ");

              // Insert data in batches
              const batchSize = 100;
              for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const values = batch
                  .map((row) => {
                    const rowValues = columns.map((col) => {
                      const val = row[col];
                      if (val === null) return "NULL";
                      if (typeof val === "string")
                        return `'${val.replace(/'/g, "''")}'`;
                      if (val instanceof Date)
                        return `'${val
                          .toISOString()
                          .slice(0, 19)
                          .replace("T", " ")}'`;
                      return String(val);
                    });
                    return `(${rowValues.join(", ")})`;
                  })
                  .join(",\n");

                backupContent += `INSERT INTO \`${tableName}\` (${columnList}) VALUES\n${values};\n`;
              }

              backupContent += `UNLOCK TABLES;\n\n`;
            }
          } catch (tableError) {
            console.error(`Error backing up table ${tableName}:`, tableError);
            backupContent += `-- Error backing up table ${tableName}: ${tableError}\n\n`;
          }
        }

        backupContent += `\nSET FOREIGN_KEY_CHECKS=1;\n`;
        backupContent += `-- End of backup\n`;

        // Write the backup content to file
        await fs.writeFile(backupPath, backupContent, "utf-8");
        console.log("✅ Prisma-based backup completed");
      }

      // Check if backup file was created successfully
      const fileStats = await fs.stat(backupPath);
      if (fileStats.size < 100) {
        await fs.unlink(backupPath); // Delete empty file
        return NextResponse.json(
          {
            success: false,
            message: "Veritabanı yedeği oluşturulamadı - dosya çok küçük",
            error: "BACKUP_FAILED",
          },
          { status: 500 }
        );
      }

      console.log(
        `✅ Veritabanı yedeği başarıyla alındı: ${filename} (${Math.round(
          fileStats.size / 1024
        )} KB)`
      );

      // Backup bilgilerini hesapla
      const backupInfo = {
        filename,
        size: fileStats.size,
        sizeFormatted: `${Math.round(fileStats.size / 1024)} KB`,
        timestamp: new Date().toISOString(),
        database: dbName,
        backupId,
        method: useAlternativeMethod ? "Prisma-based" : "mysqldump",
      };

      // Eski backup dosyalarını temizle (7 günden eski olanları)
      try {
        const files = await fs.readdir(backupsDir);
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

        for (const file of files) {
          if (file.endsWith(".sql")) {
            const filePath = path.join(backupsDir, file);
            const stats = await fs.stat(filePath);
            if (stats.mtime.getTime() < sevenDaysAgo) {
              await fs.unlink(filePath);
              console.log(`🗑️ Eski backup dosyası silindi: ${file}`);
            }
          }
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }

      return NextResponse.json({
        success: true,
        message: `Veritabanı yedeği başarıyla alındı${
          useAlternativeMethod ? " (Prisma-based method)" : ""
        }`,
        backup: backupInfo,
        downloadPath: `/api/admin/database/backup/download/${filename}`,
      });
    } catch (error: any) {
      console.error("Backup error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Veritabanı yedeği alınırken hata oluştu",
          error: "BACKUP_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Veritabanı yedeği alınırken beklenmeyen hata oluştu",
        error: "UNEXPECTED_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Mevcut backup dosyalarını listele
export async function GET(request: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), "backups");

    try {
      const files = await fs.readdir(backupsDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith(".sql")) {
          const filePath = path.join(backupsDir, file);
          const stats = await fs.stat(filePath);

          backups.push({
            filename: file,
            size: stats.size,
            sizeFormatted: `${Math.round(stats.size / 1024)} KB`,
            created: stats.mtime.toISOString(),
            createdFormatted: stats.mtime.toLocaleString("tr-TR"),
            downloadPath: `/api/admin/database/backup/download/${file}`,
          });
        }
      }

      // Tarihe göre sırala (en yeni önce)
      backups.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      return NextResponse.json({
        success: true,
        backups,
      });
    } catch (error) {
      // Backups klasörü yoksa
      return NextResponse.json({
        success: true,
        backups: [],
      });
    }
  } catch (error: any) {
    console.error("List backups error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Backup dosyaları listelenirken hata oluştu",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
