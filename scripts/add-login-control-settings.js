const mysql = require("mysql2/promise");

async function addLoginControlSettings() {
  try {
    // Read DATABASE_URL from .env file
    const fs = require("fs");
    const path = require("path");

    let envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) {
      envPath = path.join(__dirname, "..", ".env");
      if (!fs.existsSync(envPath)) {
        throw new Error(".env or .env.local file not found");
      }
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const databaseUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);

    if (!databaseUrlMatch) {
      throw new Error("DATABASE_URL not found in .env file");
    }

    const databaseUrl = databaseUrlMatch[1];

    // Parse the connection string
    const url = new URL(databaseUrl);

    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1), // Remove leading slash
    });

    console.log("🔌 Veritabanına bağlandı");

    // Check if settings already exist
    const [existingSettings] = await connection.execute(
      `SELECT id FROM system_settings WHERE \`key\` IN ('enable_company_login', 'enable_teacher_login')`
    );

    if (existingSettings.length > 0) {
      console.log("⚠️ Giriş kontrol ayarları zaten mevcut, güncelleniyor...");

      // Update existing settings
      await connection.execute(
        `UPDATE system_settings SET \`value\` = 'true' WHERE \`key\` = 'enable_company_login'`
      );
      await connection.execute(
        `UPDATE system_settings SET \`value\` = 'true' WHERE \`key\` = 'enable_teacher_login'`
      );

      console.log("✅ Mevcut ayarlar güncellendi");
    } else {
      console.log("📝 Yeni giriş kontrol ayarları ekleniyor...");

      // Generate UUIDs for new settings
      const uuid1 = require("crypto").randomUUID();
      const uuid2 = require("crypto").randomUUID();

      await connection.execute(
        `
        INSERT INTO system_settings (id, \`key\`, \`value\`) VALUES 
        (?, 'enable_company_login', 'true'),
        (?, 'enable_teacher_login', 'true')
      `,
        [uuid1, uuid2]
      );

      console.log("✅ Yeni ayarlar başarıyla eklendi");
    }

    // Verify the settings
    const [newSettings] = await connection.execute(
      `SELECT \`key\`, \`value\` FROM system_settings WHERE \`key\` IN ('enable_company_login', 'enable_teacher_login')`
    );

    console.log("\n📊 Mevcut giriş kontrol ayarları:");
    newSettings.forEach((setting) => {
      console.log(`   ${setting.key}: ${setting.value}`);
    });

    await connection.end();
    console.log("\n🎉 İşlem tamamlandı!");
  } catch (error) {
    console.error("❌ Hata:", error.message);
    process.exit(1);
  }
}

addLoginControlSettings();
