import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import {
  ExcelFormatDetector,
  ExcelFormatType,
} from "@/lib/excel-format-detector";
import {
  ExcelAdapterFactory,
  enhanceMESEMColumnDetection,
} from "@/lib/excel-format-adapters";

// Enhanced Turkish character normalization function
function normalizeTurkishText(text: string): string {
  if (!text) return "";

  return text
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Multi-Format Excel Import API v2 called");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const monthOverride = formData.get("month")
      ? parseInt(formData.get("month") as string)
      : null;
    const yearOverride = formData.get("year")
      ? parseInt(formData.get("year") as string)
      : null;
    const forceFormat = formData.get("format") as ExcelFormatType | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Dosya yüklenmedi" },
        { status: 400 }
      );
    }

    if (!monthOverride || !yearOverride) {
      return NextResponse.json(
        { success: false, message: "Dönem bilgisi (ay ve yıl) seçilmelidir" },
        { status: 400 }
      );
    }

    const importBatch = uuidv4();
    console.log("📄 Processing file:", file.name, "Size:", file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellNF: true,
      raw: false,
    });
    const rawData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 }
    );

    console.log("📋 Total rows in Excel:", rawData.length);

    // Debug: Log first 20 rows to understand file structure for debugging
    console.log(
      "🔍 Excel file first 20 rows (for debugging):",
      JSON.stringify(rawData.slice(0, 20), null, 2)
    );

    // Format detection
    const formatDetection = ExcelFormatDetector.detectFormat(
      workbook,
      forceFormat ?? undefined
    );

    console.log("🔍 Format Detection Result:", formatDetection);
    console.log(
      "🕵️  [DEBUG] Format detection details: ",
      `Type: ${formatDetection.type}, Confidence: ${formatDetection.confidence}, Reason: ${formatDetection.reason}`
    );

    if (formatDetection.type === ExcelFormatType.UNKNOWN) {
      console.error(
        "❌ Format detection failed. Reason:",
        formatDetection.reason
      );
      return NextResponse.json(
        {
          error: "Excel formatı algılanamadı",
          details: formatDetection.reason,
          supportedFormats: [
            ExcelFormatDetector.getFormatDescription(ExcelFormatType.EOKUL),
            ExcelFormatDetector.getFormatDescription(ExcelFormatType.MESEM),
          ],
        },
        { status: 400 }
      );
    }

    // Get format-specific column detection
    let columnIndexes = formatDetection.detectedColumns;
    let headerRow = formatDetection.headerRow;

    // Enhanced MESEM column detection if needed
    if (
      formatDetection.type === ExcelFormatType.MESEM &&
      Object.keys(columnIndexes).length < 4
    ) {
      console.log("🔍 Running enhanced MESEM column detection...");
      if (headerRow >= 0 && rawData[headerRow]) {
        columnIndexes = enhanceMESEMColumnDetection(
          rawData[headerRow] as any[]
        );
      }
    }

    console.log("🗺️ Final column indexes:", columnIndexes);

    // Debug: Log header row content
    if (headerRow >= 0 && rawData[headerRow]) {
      const headerRowData = rawData[headerRow] as any[];
      console.log("📊 Header row content:", headerRowData);
      console.log(
        "📊 Header row as string:",
        headerRowData.map((col: any) => String(col || "").trim())
      );
    }

    // Create appropriate adapter
    const adapter = ExcelAdapterFactory.createAdapter(formatDetection.type);
    const adapterResult = adapter.processData(
      rawData as any[][],
      headerRow,
      columnIndexes
    );

    console.log("📊 Adapter Result:", {
      success: adapterResult.success,
      totalRows: adapterResult.totalRows,
      validRows: adapterResult.validRows,
      errorCount: adapterResult.errors.length,
    });

    if (adapterResult.validRows === 0) {
      return NextResponse.json(
        {
          error: "Geçerli öğrenci verisi bulunamadı",
          details: adapterResult.errors.slice(0, 5),
          formatInfo: ExcelFormatDetector.getFormatDescription(
            formatDetection.type
          ),
        },
        { status: 400 }
      );
    }

    // Aktif eğitim yılını al
    const activeEducationYear = await prisma.egitimYili.findFirst({
      where: { active: true },
    });

    if (!activeEducationYear) {
      return NextResponse.json(
        { error: "Aktif eğitim yılı bulunamadı" },
        { status: 400 }
      );
    }

    const errors: string[] = [...adapterResult.errors];
    let successCount = 0;

    // PERFORMANCE OPTIMIZATION: Fetch all students ONCE and create lookup maps
    console.log(
      "📚 Fetching all students from database for optimized matching..."
    );
    const allStudents = await prisma.student.findMany({
      select: { id: true, name: true, surname: true, tcNo: true, number: true },
    });

    console.log(`📊 Found ${allStudents.length} students in database`);

    // Log sample of database students for debugging
    console.log("🔍 Sample students from database:");
    allStudents.slice(0, 3).forEach((s) => {
      console.log(
        `  - ${s.name} ${s.surname} | TC: "${s.tcNo || "N/A"}" | No: "${
          s.number || "N/A"
        }"`
      );
    });

    // Create optimized lookup maps - prioritizing name and number matching
    const studentMapByTcNo = new Map();
    const studentMapByNumber = new Map();
    const studentMapByNormalizedName = new Map();

    for (const s of allStudents) {
      // Map by exact TC No (fallback only)
      if (s.tcNo && s.tcNo.trim()) {
        const cleanTc = s.tcNo.replace(/\s+/g, "").trim();
        studentMapByTcNo.set(cleanTc, s);
      }

      // Map by student number (primary for MESEM)
      if (s.number && s.number.trim()) {
        studentMapByNumber.set(s.number.trim(), s);
      }

      // Map by normalized name (primary for all formats)
      const normalizedFullName = normalizeTurkishText(`${s.name} ${s.surname}`);
      if (!studentMapByNormalizedName.has(normalizedFullName)) {
        studentMapByNormalizedName.set(normalizedFullName, s);
      }
    }

    console.log(
      `🗺️ Created lookup maps: Numbers: ${studentMapByNumber.size}, Names: ${studentMapByNormalizedName.size}, TC (fallback): ${studentMapByTcNo.size}`
    );

    // Process each student from the Excel file
    for (const studentData of adapterResult.data) {
      try {
        console.log(
          `📄 Processing: ${studentData.studentName} ${studentData.studentSurname} - ${studentData.amount}₺`
        );

        let student = null;

        // Debug: Log the data we're trying to match
        console.log(
          `🔍 Excel data: TC:"${studentData.studentTcNo || "N/A"}" | No:"${
            studentData.studentNo || "N/A"
          }" | Name:"${studentData.studentName} ${studentData.studentSurname}"`
        );

        // 1. PRIMARY: Student number match (especially for MESEM format)
        if (studentData.studentNo && studentData.studentNo.trim()) {
          const studentNo = studentData.studentNo.trim();
          if (studentMapByNumber.has(studentNo)) {
            student = studentMapByNumber.get(studentNo);
            console.log(`✅ Student number match: ${studentNo}`);
          }
        }

        // 2. SECONDARY: Name-based matching (exact first, then partial)
        if (!student) {
          const normalizedName = normalizeTurkishText(
            `${studentData.studentName} ${studentData.studentSurname}`
          );

          // Try exact normalized name match
          if (studentMapByNormalizedName.has(normalizedName)) {
            student = studentMapByNormalizedName.get(normalizedName);
            console.log(`✅ Exact name match: "${normalizedName}"`);
          }
          // Try partial name matching
          else {
            const nameEntries = Array.from(
              studentMapByNormalizedName.entries()
            );
            for (const [dbName, dbStudent] of nameEntries) {
              if (
                dbName.includes(normalizedName) ||
                normalizedName.includes(dbName)
              ) {
                student = dbStudent;
                console.log(
                  `✅ Partial name match: DB:"${dbName}" vs Excel:"${normalizedName}"`
                );
                break;
              }
            }
          }
        }

        // 3. FALLBACK: TC Number matching (only if name/number matching fails)
        if (
          !student &&
          studentData.studentTcNo &&
          studentData.studentTcNo.trim()
        ) {
          const excelTc = studentData.studentTcNo.replace(/\s+/g, "").trim();

          // Try exact TC match only
          if (studentMapByTcNo.has(excelTc)) {
            student = studentMapByTcNo.get(excelTc);
            console.log(`✅ TC fallback match: ${excelTc}`);
          }
        }

        if (!student) {
          const fullName = `${studentData.studentName} ${studentData.studentSurname}`;
          console.log(`❌ Student not found: ${fullName}`);
          console.log(
            `   TC: "${studentData.studentTcNo || "N/A"}", No: "${
              studentData.studentNo || "N/A"
            }"`
          );
          errors.push(
            `Satır ${studentData.rowNumber}: Öğrenci bulunamadı (${fullName})`
          );
          continue;
        }

        console.log(
          `👤 Student found: ${student.name} ${student.surname} (ID: ${student.id})`
        );

        // Find company
        let companyId = null;
        if (studentData.companyName) {
          const company = await prisma.companyProfile.findFirst({
            where: {
              name: { contains: studentData.companyName.split(" ")[0] },
            },
          });
          companyId = company?.id;
        }

        // Use default company if not found
        if (!companyId) {
          const defaultCompany = await prisma.companyProfile.findFirst({
            select: { id: true },
          });
          companyId = defaultCompany?.id;
        }

        if (!companyId) {
          errors.push(`Satır ${studentData.rowNumber}: İşletme bulunamadı`);
          continue;
        }

        // Check for duplicates
        const existingPayment = await prisma.monthlyPayment.findFirst({
          where: {
            studentId: student.id,
            month: monthOverride,
            year: yearOverride,
            paymentType: "GOVERNMENT_CONTRIBUTION",
          },
        });

        if (existingPayment) {
          const fullName = `${studentData.studentName} ${studentData.studentSurname}`;
          errors.push(
            `Satır ${studentData.rowNumber}: ${fullName} için ${monthOverride}/${yearOverride} dönemi zaten kayıtlı`
          );
          continue;
        }

        // Create payment record
        await prisma.monthlyPayment.create({
          data: {
            id: uuidv4(),
            studentId: student.id,
            companyId,
            educationYearId: activeEducationYear.id,
            month: monthOverride,
            year: yearOverride,
            amount: studentData.amount,
            paymentType: "GOVERNMENT_CONTRIBUTION",
            status: "IMPORTED",
            importSource: file.name,
            importBatch,
            importedBy: "admin",
            studentName: studentData.studentName,
            studentSurname: studentData.studentSurname,
            studentNumber: studentData.studentNo,
            studentTcNo: studentData.studentTcNo,
            className: studentData.className,
            fieldName: studentData.fieldName,
            companyName: studentData.companyName,
            teacherName: studentData.coordinatorTeacher,
            verificationStatus: "PENDING",
            archived: false,
            notes:
              formatDetection.type === ExcelFormatType.MESEM
                ? `MESEM Format - Devamsızlık: ${
                    studentData.devamsizlikDvli || 0
                  }/${studentData.devamsizlikDvsiz || 0}${
                    studentData.isIncompleteAmount ? " - Tutar Eksik/Sıfır" : ""
                  }`
                : studentData.isIncompleteAmount
                ? "Tutar Eksik/Sıfır - Manuel Düzenleme Gerekli"
                : undefined,
          },
        });

        successCount++;
        console.log(`💾 Row ${studentData.rowNumber} saved successfully`);
      } catch (error) {
        console.error(`❌ Row error:`, error);
        errors.push(
          `Satır ${studentData.rowNumber}: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    const MONTHS = [
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık",
    ];

    console.log(
      `🎯 Import completed: ${successCount}/${adapterResult.validRows} students processed successfully`
    );

    return NextResponse.json({
      success: true,
      message: `${
        MONTHS[monthOverride - 1]
      } ${yearOverride} dönemi için ${successCount} ödeme kaydı başarıyla içe aktarıldı (${
        formatDetection.type
      } formatı)`,
      details: {
        importId: importBatch,
        formatType: formatDetection.type,
        confidence: formatDetection.confidence,
        totalRecords: adapterResult.totalRows,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10).map((error, index) => ({
          row: index + 2,
          field: "general",
          message: error,
        })),
      },
    });
  } catch (error) {
    console.error("Payment import error:", error);
    return NextResponse.json(
      {
        error: "Excel dosyası işlenirken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
