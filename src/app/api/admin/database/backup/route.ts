import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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

    // mysqldump komutu oluştur
    const mysqldumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUser} -p${dbPassword} --single-transaction --routines --triggers ${dbName}`;

    console.log(`🔄 Veritabanı yedeği alınıyor: ${filename}`);

    try {
      // mysqldump komutunu çalıştır ve dosyaya yaz
      const { stdout, stderr } = await execAsync(
        `${mysqldumpCommand} > "${backupPath}"`
      );

      if (stderr && !stderr.includes("Warning")) {
        console.error("mysqldump stderr:", stderr);
        return NextResponse.json(
          {
            success: false,
            message: "Veritabanı yedeği alınırken hata oluştu",
            error: "MYSQLDUMP_ERROR",
            details: stderr,
          },
          { status: 500 }
        );
      }

      // Dosya oluşturuldu mu kontrol et
      const fileStats = await fs.stat(backupPath);
      if (fileStats.size < 1024) {
        // 1KB'den küçükse muhtemelen hata var
        const fileContent = await fs.readFile(backupPath, "utf-8");
        if (
          fileContent.includes("ERROR") ||
          fileContent.includes("Access denied")
        ) {
          await fs.unlink(backupPath); // Hatalı dosyayı sil
          return NextResponse.json(
            {
              success: false,
              message:
                "Veritabanına erişim reddedildi. Kullanıcı yetkileri kontrol edin.",
              error: "ACCESS_DENIED",
            },
            { status: 403 }
          );
        }
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
        message: "Veritabanı yedeği başarıyla alındı",
        backup: backupInfo,
        downloadPath: `/api/admin/database/backup/download/${filename}`,
      });
    } catch (execError: any) {
      console.error("mysqldump execution error:", execError);

      if (
        execError.message.includes("command not found") ||
        execError.message.includes("not recognized")
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "mysqldump komutu bulunamadı. MySQL client tools yüklü değil.",
            error: "MYSQLDUMP_NOT_FOUND",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Veritabanı yedeği alınırken hata oluştu",
          error: "EXECUTION_ERROR",
          details: execError.message,
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
