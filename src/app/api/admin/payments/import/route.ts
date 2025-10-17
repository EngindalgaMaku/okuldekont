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

// Improved name matching function
function namesMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeTurkishText(name1);
  const normalized2 = normalizeTurkishText(name2);

  // Direct match
  if (normalized1 === normalized2) return true;

  // Split and check individual words
  const words1 = normalized1.split(" ");
  const words2 = normalized2.split(" ");

  // Check if all words from shorter name exist in longer name
  const shorter = words1.length <= words2.length ? words1 : words2;
  const longer = words1.length > words2.length ? words1 : words2;

  return shorter.every((word) =>
    longer.some(
      (longerWord) => longerWord.includes(word) || word.includes(longerWord)
    )
  );
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
    const forceFormat = formData.get("format") as string | null;

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
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const rawData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 }
    );

    console.log("📋 Total rows in Excel:", rawData.length);

    // Format detection
    let formatDetection;
    if (
      forceFormat &&
      Object.values(ExcelFormatType).includes(forceFormat as ExcelFormatType)
    ) {
      console.log(`🎯 Using forced format: ${forceFormat}`);
      formatDetection = {
        type: forceFormat as ExcelFormatType,
        confidence: 1,
        reason: "Manuel format seçimi",
        headerRow: -1,
        detectedColumns: {},
      };
    } else {
      formatDetection = ExcelFormatDetector.detectFormat(workbook);
      console.log("🔍 Format Detection Result:", formatDetection);
    }

    if (formatDetection.type === ExcelFormatType.UNKNOWN) {
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

    // Her adapter sonucunu işle
    for (const studentData of adapterResult.data) {
      try {
        console.log(
          `📄 Processing: ${studentData.studentName} ${studentData.studentSurname} - ${studentData.amount}₺`
        );

        // Öğrenciyi bul
        let student = null;

        // TC No ile ara (eğer varsa)
        if (studentData.studentTcNo && studentData.studentTcNo.length >= 3) {
          student = await prisma.student.findFirst({
            where: { tcNo: { contains: studentData.studentTcNo.slice(0, 3) } },
          });
        }

        // Öğrenci no ile ara (MESEM formatında)
        if (!student && studentData.studentNo) {
          student = await prisma.student.findFirst({
            where: { number: studentData.studentNo },
          });
        }

        // Ad-soyad ile ara
        if (!student) {
          console.log(
            `🔍 Searching by name: "${studentData.studentName}" "${studentData.studentSurname}"`
          );

          const allStudents = await prisma.student.findMany({
            select: {
              id: true,
              name: true,
              surname: true,
              tcNo: true,
              number: true,
            },
          });

          // Turkish-aware name matching
          for (const candidateStudent of allStudents) {
            const candidateFullName = `${candidateStudent.name} ${candidateStudent.surname}`;
            const studentFullName = `${studentData.studentName} ${studentData.studentSurname}`;

            if (
              namesMatch(studentData.studentName, candidateStudent.name) &&
              namesMatch(studentData.studentSurname, candidateStudent.surname)
            ) {
              student = candidateStudent;
              console.log(`✅ Name match found: "${candidateFullName}"`);
              break;
            }

            if (namesMatch(studentFullName, candidateFullName)) {
              student = candidateStudent;
              console.log(`✅ Full name match found: "${candidateFullName}"`);
              break;
            }
          }
        }

        if (!student) {
          const fullName = `${studentData.studentName} ${studentData.studentSurname}`;
          console.log(`❌ Student not found: ${fullName}`);
          errors.push(
            `Satır ${studentData.rowNumber}: Öğrenci bulunamadı (${fullName})`
          );
          continue;
        }

        console.log(
          `👤 Student found: ${student.name} ${student.surname} (${student.id})`
        );

        // Company bul
        let companyId = null;
        if (studentData.companyName) {
          const company = await prisma.companyProfile.findFirst({
            where: {
              name: { contains: studentData.companyName.split(" ")[0] },
            },
          });
          companyId = company?.id;
        }

        // Default company kullan
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

        // Duplicate kontrol
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

        // Ödeme kaydı oluştur
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
                  }/${studentData.devamsizlikDvsiz || 0}`
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
