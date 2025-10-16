const XLSX = require("xlsx");
const fs = require("fs");

function analyzeExcelStructure(filename) {
  try {
    console.log("📊 Excel dosyası analiz ediliyor:", filename);

    if (!fs.existsSync(filename)) {
      console.log("❌ Dosya bulunamadı");
      return;
    }

    const buffer = fs.readFileSync(filename);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    console.log("\n📋 Sheets:");
    workbook.SheetNames.forEach((name) => console.log(`  - ${name}`));

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    console.log("\n🔍 Sheet range:", sheet["!ref"]);

    // Raw sheet data analizi
    console.log("\n📝 Raw sheet contents (first 20 cells):");
    let cellCount = 0;
    for (const cell in sheet) {
      if (cell.startsWith("!")) continue;
      if (cellCount++ > 20) break;

      const cellValue = sheet[cell];
      console.log(
        `  ${cell}: ${JSON.stringify(cellValue.v)} (type: ${cellValue.t})`
      );
    }

    // JSON dönüşümü ile analiz
    console.log("\n📊 JSON dönüşümü (ilk 10 satır):");
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    jsonData.slice(0, 10).forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, row);
    });

    // Boş satırları skip ederek header arama
    console.log("\n🔍 Header arama:");
    let headerRowFound = false;
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 1) {
        const nonEmptyValues = row.filter(
          (cell) => cell !== undefined && cell !== null && cell !== ""
        );
        if (nonEmptyValues.length > 3) {
          console.log(`  Possible header row ${i + 1}:`, nonEmptyValues);
          headerRowFound = true;
        }
      }
    }

    if (!headerRowFound) {
      console.log("  ❌ Header satırı bulunamadı");

      // Alternative: Find first row with multiple non-empty cells
      console.log("\n🔍 Alternatif header arama:");
      for (let i = 0; i < Math.min(50, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && Array.isArray(row) && row.length > 5) {
          const definedValues = row.filter(
            (cell) =>
              cell !== undefined &&
              cell !== null &&
              cell !== "" &&
              typeof cell !== "object"
          );
          if (definedValues.length >= 3) {
            console.log(
              `  Possible data row ${i + 1}:`,
              definedValues.slice(0, 8)
            );
          }
        }
      }
    }

    // Range analizi
    console.log("\n📏 Range analysis:");
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    console.log(
      `  Start: ${XLSX.utils.encode_cell(range.s)} (Row ${range.s.r + 1}, Col ${
        range.s.c + 1
      })`
    );
    console.log(
      `  End: ${XLSX.utils.encode_cell(range.e)} (Row ${range.e.r + 1}, Col ${
        range.e.c + 1
      })`
    );
    console.log(
      `  Total rows: ${range.e.r + 1}, Total columns: ${range.e.c + 1}`
    );
  } catch (error) {
    console.error("❌ Excel analiz hatası:", error.message);
  }
}

// Gerçek Excel dosyasını analiz et
const files = fs
  .readdirSync(".")
  .filter(
    (f) => f.toLowerCase().includes("eylül") && f.toLowerCase().endsWith(".xls")
  );
if (files.length > 0) {
  analyzeExcelStructure(files[0]);
} else {
  console.log("❌ Eylül Excel dosyası bulunamadı");
  console.log("Mevcut .xls/.xlsx dosyaları:");
  const xlsFiles = fs
    .readdirSync(".")
    .filter((f) => f.toLowerCase().match(/\.(xls|xlsx)$/));
  xlsFiles.forEach((f) => console.log(`  - ${f}`));

  // Test dosyası ile analiz
  if (fs.existsSync("test-payments.xlsx")) {
    console.log("\n📝 Test dosyası analizi:");
    analyzeExcelStructure("test-payments.xlsx");
  }
}
