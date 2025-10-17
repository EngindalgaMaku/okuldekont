import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

interface ParsedPayment {
  studentName?: string;
  studentTcNo?: string;
  companyName?: string;
  amount?: number;
}

// Enhanced Turkish character normalization function
function normalizeTurkishText(text: string): string {
  if (!text) return "";

  return (
    text
      // First normalize Turkish characters before toLowerCase
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
      // Then convert to lowercase
      .toLowerCase()
      // Final normalization to ASCII
      .replace(/i̇/g, "i") // Handle dotted i
      .replace(/i/g, "i")
      .replace(/ı/g, "i")
      .replace(/g/g, "g")
      .replace(/u/g, "u")
      .replace(/s/g, "s")
      .replace(/o/g, "o")
      .replace(/c/g, "c")
      // Clean up spaces
      .trim()
      .replace(/\s+/g, " ")
  ); // Multiple spaces to single space
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
    console.log("🚀 New Excel Import API called");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const monthOverride = formData.get("month")
      ? parseInt(formData.get("month") as string)
      : null;
    const yearOverride = formData.get("year")
      ? parseInt(formData.get("year") as string)
      : null;

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
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Raw array ile parse et (header: 1 ile)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("📋 Total rows in Excel:", rawData.length);

    // Header satırını bul
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i] as any[];
      if (row && Array.isArray(row)) {
        const rowStr = row.join(" ").toLowerCase().replace(/\n/g, " ");
        console.log(`🔍 Row ${i + 1} checking:`, rowStr);
        if (rowStr.includes("tc kimlik") && rowStr.includes("adı soyadı")) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      console.log("❌ Header satırı bulunamadı");
      return NextResponse.json(
        { error: "Excel formatı tanınamadı. Header satırı bulunamadı." },
        { status: 400 }
      );
    }

    const headerRow = rawData[headerRowIndex] as any[];
    const dataStartIndex = headerRowIndex + 1;

    console.log(
      `📋 Header found at row ${headerRowIndex + 1}, data starts at row ${
        dataStartIndex + 1
      }`
    );
    console.log("📋 Headers:", headerRow);

    // Sütun indekslerini bul
    const columnIndexes = {
      tcNo: -1,
      studentName: -1,
      amount: -1,
      companyName: -1,
    };

    headerRow.forEach((header, index) => {
      if (header) {
        const headerStr = String(header).toLowerCase().replace(/\n/g, " ");
        console.log(`  Column ${index}: "${headerStr}"`);

        if (headerStr.includes("tc kimlik")) {
          columnIndexes.tcNo = index;
        } else if (headerStr.includes("adı soyadı")) {
          columnIndexes.studentName = index;
        } else if (headerStr.includes("maaş tutarı")) {
          columnIndexes.amount = index;
        } else if (headerStr.includes("adı") && headerStr.includes("unvanı")) {
          columnIndexes.companyName = index;
        }
      }
    });

    console.log("🗺️ Column indexes:", columnIndexes);

    if (
      columnIndexes.tcNo === -1 ||
      columnIndexes.studentName === -1 ||
      columnIndexes.amount === -1
    ) {
      return NextResponse.json(
        {
          error:
            "Gerekli sütunlar bulunamadı (TC Kimlik, Adı Soyadı, Maaş Tutarı)",
        },
        { status: 400 }
      );
    }

    // Data satırlarını al ve parse et
    const dataRows = rawData.slice(dataStartIndex);
    const validRows = dataRows.filter(
      (row) =>
        row &&
        Array.isArray(row) &&
        row.length >
          Math.max(
            columnIndexes.tcNo,
            columnIndexes.studentName,
            columnIndexes.amount
          ) &&
        row[columnIndexes.tcNo] &&
        row[columnIndexes.studentName] &&
        row[columnIndexes.amount]
    );

    console.log("📋 Valid data rows found:", validRows.length);

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "Geçerli öğrenci verisi bulunamadı" },
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

    const errors: string[] = [];
    let successCount = 0;

    // Her veri satırını işle
    for (let i = 0; i < validRows.length; i++) {
      try {
        const row = validRows[i] as any[];
        const rowNumber = dataStartIndex + i + 2; // Excel row number

        const tcNo = String(row[columnIndexes.tcNo]).trim().replace(/\*/g, "");
        const fullName = String(row[columnIndexes.studentName]).trim();
        const amount = parseFloat(String(row[columnIndexes.amount]));
        const companyName = row[columnIndexes.companyName]
          ? String(row[columnIndexes.companyName]).trim()
          : "";

        console.log(`📄 Row ${rowNumber}: ${fullName} (${tcNo}) - ${amount}₺`);

        // Ad-soyadı ayır
        const nameParts = fullName.split(" ");
        const studentName = nameParts[0];
        const studentSurname = nameParts.slice(1).join(" ");

        // Öğrenciyi bul
        let student = null;

        // TC No ile ara (eğer tam TC varsa)
        if (tcNo.length >= 11) {
          student = await prisma.student.findFirst({
            where: { tcNo: { contains: tcNo.slice(0, 3) } }, // İlk 3 rakam ile ara
          });
        }

        // Bulunamazsa ad-soyad ile ara (improved Turkish-aware matching)
        if (!student) {
          console.log(
            `🔍 Searching for student: "${studentName}" "${studentSurname}"`
          );

          // Get all students and use Turkish-aware name matching
          const allStudents = await prisma.student.findMany({
            select: {
              id: true,
              name: true,
              surname: true,
              tcNo: true,
            },
          });

          // Find best match using Turkish-aware name matching
          for (const candidateStudent of allStudents) {
            const candidateFullName = `${candidateStudent.name} ${candidateStudent.surname}`;

            // Try exact name parts matching first
            if (
              namesMatch(studentName, candidateStudent.name) &&
              namesMatch(studentSurname, candidateStudent.surname)
            ) {
              student = candidateStudent;
              console.log(
                `✅ Name parts match found: "${candidateFullName}" matches "${fullName}"`
              );
              break;
            }

            // Try full name matching
            if (namesMatch(fullName, candidateFullName)) {
              student = candidateStudent;
              console.log(
                `✅ Full name match found: "${candidateFullName}" matches "${fullName}"`
              );
              break;
            }
          }
        }

        if (!student) {
          console.log(`❌ Student not found: ${fullName} (${tcNo})`);
          errors.push(`Satır ${rowNumber}: Öğrenci bulunamadı (${fullName})`);
          continue;
        }

        console.log(
          `👤 Student found: ${student.name} ${student.surname} (${student.id})`
        );

        // Company bul
        let companyId = null;
        if (companyName) {
          const company = await prisma.companyProfile.findFirst({
            where: { name: { contains: companyName.split(" ")[0] } },
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
          errors.push(`Satır ${rowNumber}: İşletme bulunamadı`);
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
          errors.push(
            `Satır ${rowNumber}: ${fullName} için ${monthOverride}/${yearOverride} dönemi zaten kayıtlı`
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
            amount,
            paymentType: "GOVERNMENT_CONTRIBUTION",
            status: "IMPORTED",
            importSource: file.name,
            importBatch,
            importedBy: "admin",
            studentName: fullName.split(" ")[0],
            studentSurname: fullName.split(" ").slice(1).join(" "),
            studentTcNo: tcNo,
            companyName,
            verificationStatus: "PENDING",
            archived: false,
          },
        });

        successCount++;
        console.log(`💾 Row ${rowNumber} saved successfully`);
      } catch (error) {
        console.error(`❌ Row error:`, error);
        errors.push(
          `Satır ${dataStartIndex + i + 2}: ${
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
      } ${yearOverride} dönemi için ${successCount} ödeme kaydı başarıyla içe aktarıldı`,
      details: {
        importId: importBatch,
        totalRecords: validRows.length,
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
