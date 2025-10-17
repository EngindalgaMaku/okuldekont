const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

const prisma = new PrismaClient();

async function testMultiFormatImport() {
  console.log("🧪 Testing Multi-Format Excel Import System...\n");

  const testResults = [];

  try {
    // Test 1: MESEM Excel dosyasını otomatik format algılama ile test et
    console.log("1️⃣ Testing MESEM format with auto-detection...");

    const mesemFilePath = path.join(
      process.cwd(),
      "01. Eylül 2025 - Mesem - TÜM.xlsx"
    );

    if (!fs.existsSync(mesemFilePath)) {
      console.log("❌ MESEM test file not found, skipping test");
      testResults.push({
        test: "MESEM Auto-Detection",
        status: "SKIPPED",
        reason: "Test file not found",
      });
    } else {
      try {
        const result = await testImportFile(mesemFilePath, 9, 2025, "AUTO");
        testResults.push({
          test: "MESEM Auto-Detection",
          status: result.success ? "PASS" : "FAIL",
          details: result,
        });
        console.log(result.success ? "✅ PASSED" : "❌ FAILED");
        if (!result.success) {
          console.log("Error:", result.message);
        }
      } catch (error) {
        testResults.push({
          test: "MESEM Auto-Detection",
          status: "ERROR",
          error: error.message,
        });
        console.log("❌ ERROR:", error.message);
      }
    }

    // Test 2: MESEM formatını manuel seçim ile test et
    console.log("\n2️⃣ Testing MESEM format with manual selection...");

    if (!fs.existsSync(mesemFilePath)) {
      console.log("❌ MESEM test file not found, skipping test");
      testResults.push({
        test: "MESEM Manual Selection",
        status: "SKIPPED",
        reason: "Test file not found",
      });
    } else {
      try {
        const result = await testImportFile(mesemFilePath, 9, 2025, "MESEM");
        testResults.push({
          test: "MESEM Manual Selection",
          status: result.success ? "PASS" : "FAIL",
          details: result,
        });
        console.log(result.success ? "✅ PASSED" : "❌ FAILED");
        if (!result.success) {
          console.log("Error:", result.message);
        }
      } catch (error) {
        testResults.push({
          test: "MESEM Manual Selection",
          status: "ERROR",
          error: error.message,
        });
        console.log("❌ ERROR:", error.message);
      }
    }

    // Test 3: Format algılama sistemi test et
    console.log("\n3️⃣ Testing format detection system...");

    try {
      const detectionResult = await testFormatDetection();
      testResults.push({
        test: "Format Detection",
        status: detectionResult.success ? "PASS" : "FAIL",
        details: detectionResult,
      });
      console.log(detectionResult.success ? "✅ PASSED" : "❌ FAILED");
    } catch (error) {
      testResults.push({
        test: "Format Detection",
        status: "ERROR",
        error: error.message,
      });
      console.log("❌ ERROR:", error.message);
    }

    // Test 4: Adapter sistem test et
    console.log("\n4️⃣ Testing adapter system...");

    try {
      const adapterResult = await testAdapterSystem();
      testResults.push({
        test: "Adapter System",
        status: adapterResult.success ? "PASS" : "FAIL",
        details: adapterResult,
      });
      console.log(adapterResult.success ? "✅ PASSED" : "❌ FAILED");
    } catch (error) {
      testResults.push({
        test: "Adapter System",
        status: "ERROR",
        error: error.message,
      });
      console.log("❌ ERROR:", error.message);
    }

    // Sonuçları raporla
    console.log("\n📋 Test Results Summary:");
    console.log("=".repeat(50));

    let passed = 0;
    let failed = 0;
    let errors = 0;
    let skipped = 0;

    testResults.forEach((result) => {
      const statusIcon =
        {
          PASS: "✅",
          FAIL: "❌",
          ERROR: "💥",
          SKIPPED: "⏭️",
        }[result.status] || "❓";

      console.log(`${statusIcon} ${result.test}: ${result.status}`);

      if (result.details && result.details.formatType) {
        console.log(
          `   Format: ${result.details.formatType} (${Math.round(
            (result.details.confidence || 0) * 100
          )}%)`
        );
      }

      if (result.details && result.details.totalRecords) {
        console.log(
          `   Records: ${result.details.successCount}/${result.details.totalRecords}`
        );
      }

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      switch (result.status) {
        case "PASS":
          passed++;
          break;
        case "FAIL":
          failed++;
          break;
        case "ERROR":
          errors++;
          break;
        case "SKIPPED":
          skipped++;
          break;
      }
    });

    console.log("\n📊 Final Summary:");
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(
      `📈 Success Rate: ${Math.round(
        (passed / (passed + failed + errors)) * 100
      )}%`
    );

    // Test raporunu kaydet
    const testReport = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, errors, skipped },
      successRate: Math.round((passed / (passed + failed + errors)) * 100),
      testResults,
    };

    fs.writeFileSync(
      path.join(process.cwd(), "multi-format-import-test-report.json"),
      JSON.stringify(testReport, null, 2)
    );

    console.log(
      "\n📝 Test report saved to: multi-format-import-test-report.json"
    );
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testImportFile(filePath, month, year, format) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("month", month.toString());
  formData.append("year", year.toString());
  if (format !== "AUTO") {
    formData.append("format", format);
  }

  const response = await fetch(
    "http://localhost:3000/api/admin/payments/import-v2",
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();
  return result;
}

async function testFormatDetection() {
  try {
    const { ExcelFormatDetector } = require("../src/lib/excel-format-detector");
    const XLSX = require("xlsx");

    // Test MESEM file detection
    const mesemFilePath = path.join(
      process.cwd(),
      "01. Eylül 2025 - Mesem - TÜM.xlsx"
    );

    if (fs.existsSync(mesemFilePath)) {
      const buffer = fs.readFileSync(mesemFilePath);
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const detection = ExcelFormatDetector.detectFormat(workbook);

      console.log(
        `   Detected format: ${detection.type} (confidence: ${Math.round(
          detection.confidence * 100
        )}%)`
      );
      console.log(`   Reason: ${detection.reason}`);

      return {
        success: detection.type !== "UNKNOWN",
        type: detection.type,
        confidence: detection.confidence,
        reason: detection.reason,
      };
    } else {
      return {
        success: false,
        error: "Test file not found",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testAdapterSystem() {
  try {
    const { ExcelAdapterFactory } = require("../src/lib/excel-format-adapters");

    // Test MESEM adapter creation
    const mesemAdapter = ExcelAdapterFactory.createAdapter("MESEM");
    const eOkulAdapter = ExcelAdapterFactory.createAdapter("EOKUL");

    console.log("   ✅ MESEM adapter created successfully");
    console.log("   ✅ E-Okul adapter created successfully");

    return {
      success: true,
      adapters: ["MESEM", "EOKUL"],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

if (require.main === module) {
  testMultiFormatImport();
}

module.exports = { testMultiFormatImport };
