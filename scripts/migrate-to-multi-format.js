#!/usr/bin/env node

/**
 * Migration Script: Multi-Format Excel Import System
 *
 * Bu script mevcut import sistemini yeni çoklu format destekli sistemle değiştirir
 */

const fs = require("fs");
const path = require("path");

function migrateToMultiFormat() {
  console.log("🔄 Migrating to Multi-Format Excel Import System...\n");

  try {
    // 1. Eski import API'sini yedekle
    console.log("1️⃣ Backing up old import API...");
    const oldImportPath = path.join(
      process.cwd(),
      "src/app/api/admin/payments/import/route.ts"
    );
    const backupPath = path.join(
      process.cwd(),
      "src/app/api/admin/payments/import/route.ts.backup"
    );

    if (fs.existsSync(oldImportPath)) {
      fs.copyFileSync(oldImportPath, backupPath);
      console.log("✅ Old API backed up to route.ts.backup");
    }

    // 2. Yeni API'yi ana import path'e kopyala
    console.log("\n2️⃣ Deploying new multi-format API...");
    const newImportPath = path.join(
      process.cwd(),
      "src/app/api/admin/payments/import-v2/route.ts"
    );

    if (fs.existsSync(newImportPath)) {
      const newContent = fs.readFileSync(newImportPath, "utf8");
      fs.writeFileSync(oldImportPath, newContent);
      console.log("✅ New multi-format API deployed");

      // v2 klasörünü temizle
      fs.unlinkSync(newImportPath);
      fs.rmdirSync(path.dirname(newImportPath));
      console.log("✅ Cleaned up temporary v2 directory");
    } else {
      console.log("❌ New API file not found, skipping deployment");
      return false;
    }

    // 3. Package.json'a test script'ini ekle
    console.log("\n3️⃣ Adding test scripts to package.json...");
    const packageJsonPath = path.join(process.cwd(), "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Yeni test script'lerini ekle
      const newScripts = {
        "test:multi-format-import": "node scripts/test-multi-format-import.js",
        "migrate:multi-format": "node scripts/migrate-to-multi-format.js",
        "migration:info": "node scripts/migration-tools-info.js",
      };

      packageJson.scripts = { ...packageJson.scripts, ...newScripts };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("✅ Test scripts added to package.json");
    }

    // 4. Migration özet raporu oluştur
    console.log("\n4️⃣ Creating migration summary...");
    const migrationSummary = {
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      description: "Multi-Format Excel Import System",
      changes: [
        "Added MESEM format support",
        "Implemented automatic format detection",
        "Created format-specific adapters",
        "Updated UI with format selection",
        "Enhanced error handling and reporting",
      ],
      files: {
        created: [
          "src/lib/excel-format-detector.ts",
          "src/lib/excel-format-adapters.ts",
          "scripts/test-multi-format-import.js",
          "scripts/migrate-to-multi-format.js",
        ],
        modified: [
          "src/app/api/admin/payments/import/route.ts",
          "src/components/admin/ExcelImportModal.tsx",
          "package.json",
        ],
        backup: ["src/app/api/admin/payments/import/route.ts.backup"],
      },
      features: {
        autoFormatDetection: true,
        mesemSupport: true,
        eOkulSupport: true,
        improvedErrorHandling: true,
        enhancedUI: true,
      },
      testing: {
        unitTests: false,
        integrationTests: true,
        testScript: "npm run test:multi-format-import",
      },
    };

    fs.writeFileSync(
      path.join(process.cwd(), "multi-format-migration-report.json"),
      JSON.stringify(migrationSummary, null, 2)
    );

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📋 Summary:");
    console.log("✅ Multi-format import API deployed");
    console.log("✅ MESEM format support added");
    console.log("✅ Automatic format detection enabled");
    console.log("✅ Enhanced UI with format selection");
    console.log("✅ Test scripts added");
    console.log("✅ Migration report generated");

    console.log("\n🚀 Next Steps:");
    console.log("1. Test the new system: npm run test:multi-format-import");
    console.log("2. Restart your development server");
    console.log("3. Try uploading MESEM Excel files");
    console.log(
      "4. Check migration report: multi-format-migration-report.json"
    );

    console.log("\n📚 New Features Available:");
    console.log("• Otomatik format algılama (Auto-detect)");
    console.log("• MESEM Excel formatı desteği");
    console.log("• Gelişmiş hata raporlama");
    console.log("• Format seçimi UI");
    console.log("• Devamsızlık bilgileri (MESEM)");
    console.log("• Koordinatör öğretmen bilgileri");

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return false;
  }
}

if (require.main === module) {
  const success = migrateToMultiFormat();
  process.exit(success ? 0 : 1);
}

module.exports = { migrateToMultiFormat };
