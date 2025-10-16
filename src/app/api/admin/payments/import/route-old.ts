import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

interface ExcelRow {
  [key: string]: any;
}

interface ParsedPayment {
  studentName?: string;
  studentSurname?: string;
  studentNumber?: string;
  studentTcNo?: string;
  className?: string;
  fieldName?: string;
  companyName?: string;
  teacherName?: string;
  amount?: number;
  month?: number;
  year?: number;
  paymentDate?: Date;
  paymentType: "GOVERNMENT_CONTRIBUTION" | "SALARY_PAYMENT";
}

// Excel sütun eşlemeleri (farklı formatlar için)
const COLUMN_MAPPINGS = {
  // Öğrenci bilgileri
  studentName: ["ad", "adi", "name", "öğrenci adı", "student_name"],
  studentSurname: [
    "soyad",
    "soyadi",
    "surname",
    "öğrenci soyadı",
    "student_surname",
  ],
  studentNumber: ["no", "numara", "number", "öğrenci no", "student_number"],
  studentTcNo: ["tc", "tcno", "tc_no", "kimlik", "tc kimlik"],
  className: ["sinif", "sınıf", "class", "class_name"],
  fieldName: ["alan", "field", "meslek alanı", "alan adı"],
  companyName: ["isletme", "işletme", "company", "firma", "şirket"],
  teacherName: ["ogretmen", "öğretmen", "teacher", "koordinatör"],
  amount: ["tutar", "miktar", "amount", "ödeme", "maaş", "katkı"],
  month: ["ay", "month"],
  year: ["yil", "yıl", "year"],
  paymentDate: ["tarih", "date", "ödeme tarihi", "payment_date"],
};

function normalizeColumnName(columnName: string): string {
  return columnName
    .toLowerCase()
    .replace(/[çğıöşü]/g, (char) => {
      const map: { [key: string]: string } = {
        ç: "c",
        ğ: "g",
        ı: "i",
        ö: "o",
        ş: "s",
        ü: "u",
      };
      return map[char] || char;
    })
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

function mapColumnToField(columnName: string): string | null {
  const normalized = normalizeColumnName(columnName);

  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (
      variations.some(
        (variation) =>
          normalizeColumnName(variation) === normalized ||
          normalized.includes(normalizeColumnName(variation))
      )
    ) {
      return field;
    }
  }

  return null;
}

function parseExcelRow(
  row: ExcelRow,
  headerMapping: { [key: string]: string }
): ParsedPayment | null {
  const parsed: ParsedPayment = {
    paymentType: "GOVERNMENT_CONTRIBUTION",
  };

  let hasRequiredData = false;

  for (const [excelColumn, fieldName] of Object.entries(headerMapping)) {
    const value = row[excelColumn];

    if (!value) continue;

    switch (fieldName) {
      case "studentName":
        parsed.studentName = String(value).trim();
        hasRequiredData = true;
        break;
      case "studentSurname":
        parsed.studentSurname = String(value).trim();
        hasRequiredData = true;
        break;
      case "studentNumber":
        parsed.studentNumber = String(value).trim();
        break;
      case "studentTcNo":
        parsed.studentTcNo = String(value).trim();
        break;
      case "className":
        parsed.className = String(value).trim();
        break;
      case "fieldName":
        parsed.fieldName = String(value).trim();
        break;
      case "companyName":
        parsed.companyName = String(value).trim();
        break;
      case "teacherName":
        parsed.teacherName = String(value).trim();
        break;
      case "amount":
        const amount = parseFloat(
          String(value)
            .replace(/[^\d.,]/g, "")
            .replace(",", ".")
        );
        if (!isNaN(amount)) {
          parsed.amount = amount;
        }
        break;
      case "month":
        const month = parseInt(String(value));
        if (month >= 1 && month <= 12) {
          parsed.month = month;
        }
        break;
      case "year":
        const year = parseInt(String(value));
        if (year >= 2020 && year <= 2030) {
          parsed.year = year;
        }
        break;
      case "paymentDate":
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            parsed.paymentDate = date;
            if (!parsed.month) parsed.month = date.getMonth() + 1;
            if (!parsed.year) parsed.year = date.getFullYear();
          }
        } catch (e) {
          // Tarih parse edilemedi
        }
        break;
    }
  }

  // Varsayılan değerler
  if (!parsed.month && parsed.paymentDate) {
    parsed.month = parsed.paymentDate.getMonth() + 1;
  }
  if (!parsed.year && parsed.paymentDate) {
    parsed.year = parsed.paymentDate.getFullYear();
  }

  // Minimum gerekli alanlar var mı?
  return hasRequiredData ? parsed : null;
}

async function findOrMatchStudent(
  payment: ParsedPayment
): Promise<string | null> {
  // TC No ile ara
  if (payment.studentTcNo) {
    const student = await prisma.student.findFirst({
      where: { tcNo: payment.studentTcNo },
    });
    if (student) return student.id;
  }

  // Öğrenci numarası ile ara
  if (payment.studentNumber) {
    const student = await prisma.student.findFirst({
      where: { number: payment.studentNumber },
    });
    if (student) return student.id;
  }

  // Ad soyad ile ara
  if (payment.studentName && payment.studentSurname) {
    const student = await prisma.student.findFirst({
      where: {
        name: { contains: payment.studentName },
        surname: { contains: payment.studentSurname },
      },
    });
    if (student) return student.id;
  }

  return null;
}

async function findOrMatchCompany(
  payment: ParsedPayment
): Promise<string | null> {
  if (!payment.companyName) return null;

  const company = await prisma.companyProfile.findFirst({
    where: {
      name: { contains: payment.companyName },
    },
  });

  return company?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Import API called");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const paymentType =
      (formData.get("paymentType") as string) || "GOVERNMENT_CONTRIBUTION";
    const monthOverride = formData.get("month")
      ? parseInt(formData.get("month") as string)
      : null;
    const yearOverride = formData.get("year")
      ? parseInt(formData.get("year") as string)
      : null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "Dosya yüklenmedi",
        },
        { status: 400 }
      );
    }

    // Dönem kontrolü
    if (!monthOverride || !yearOverride) {
      return NextResponse.json(
        {
          success: false,
          message: "Dönem bilgisi (ay ve yıl) seçilmelidir",
        },
        { status: 400 }
      );
    }

    if (monthOverride < 1 || monthOverride > 12) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz ay değeri (1-12 arası olmalıdır)",
        },
        { status: 400 }
      );
    }

    if (yearOverride < 2020 || yearOverride > 2030) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz yıl değeri (2020-2030 arası olmalıdır)",
        },
        { status: 400 }
      );
    }

    // Dosya tipini kontrol et
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xls|xlsx)$/i)
    ) {
      return NextResponse.json(
        { error: "Sadece Excel dosyaları (.xls, .xlsx) desteklenmektedir" },
        { status: 400 }
      );
    }

    const importBatch = uuidv4();
    console.log("📄 Processing file:", file.name, "Size:", file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    console.log("📊 Sheet name:", sheetName);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log("📋 Total rows in Excel:", jsonData.length);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: "Excel dosyası boş" }, { status: 400 });
    }

    // Header mapping oluştur
    const headers = Object.keys(jsonData[0] as object);
    console.log("📋 Excel headers:", headers);

    const headerMapping: { [key: string]: string } = {};

    headers.forEach((header) => {
      const mappedField = mapColumnToField(header);
      if (mappedField) {
        headerMapping[header] = mappedField;
      }
    });

    console.log("🗺️ Header mapping:", headerMapping);

    // Import log oluştur (eğer tablo varsa)
    let importLog: any = null;
    try {
      importLog = await prisma.paymentImportLog.create({
        data: {
          fileName: file.name,
          importBatch,
          totalRows: jsonData.length,
          successfulRows: 0,
          failedRows: 0,
          importedBy: "admin", // TODO: Gerçek kullanıcı ID'si
          status: "PROCESSING",
        },
      });
    } catch (error) {
      console.log("PaymentImportLog table not found, skipping log creation");
      // Continue without logging if table doesn't exist
    }

    const errors: string[] = [];
    const successfulPayments: any[] = [];
    let successCount = 0;

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

    // Her satırı işle
    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i] as ExcelRow;
        const parsedPayment = parseExcelRow(row, headerMapping);

        if (!parsedPayment) {
          console.log(`❌ Row ${i + 2} parse failed:`, row);
          errors.push(`Satır ${i + 2}: Gerekli alanlar eksik`);
          continue;
        }

        console.log(
          `✅ Row ${i + 2} parsed:`,
          parsedPayment.studentName,
          parsedPayment.studentSurname
        );

        // Override değerleri uygula
        if (monthOverride) parsedPayment.month = monthOverride;
        if (yearOverride) parsedPayment.year = yearOverride;
        parsedPayment.paymentType = paymentType as any;

        // Öğrenci bul
        const studentId = await findOrMatchStudent(parsedPayment);
        if (!studentId) {
          console.log(
            `❌ Student not found for row ${i + 2}:`,
            parsedPayment.studentName,
            parsedPayment.studentSurname
          );
          errors.push(
            `Satır ${i + 2}: Öğrenci bulunamadı (${parsedPayment.studentName} ${
              parsedPayment.studentSurname
            })`
          );
          continue;
        }

        console.log(`👤 Student found for row ${i + 2}:`, studentId);

        // İşletme bul
        const companyId = await findOrMatchCompany(parsedPayment);

        // Öğrencinin aktif stajını bul
        const activeInternship = await prisma.staj.findFirst({
          where: {
            studentId,
            status: "ACTIVE",
            educationYearId: activeEducationYear.id,
          },
        });

        const paymentData = {
          studentId,
          companyId: companyId || activeInternship?.companyId,
          teacherId: activeInternship?.teacherId,
          stajId: activeInternship?.id,
          educationYearId: activeEducationYear.id,
          month: parsedPayment.month || new Date().getMonth() + 1,
          year: parsedPayment.year || new Date().getFullYear(),
          amount: parsedPayment.amount || 0,
          paymentDate: parsedPayment.paymentDate,
          paymentType: parsedPayment.paymentType,
          importSource: file.name,
          importBatch,
          importedBy: "admin", // TODO: Gerçek kullanıcı ID'si
          studentName: parsedPayment.studentName,
          studentSurname: parsedPayment.studentSurname,
          studentNumber: parsedPayment.studentNumber,
          studentTcNo: parsedPayment.studentTcNo,
          className: parsedPayment.className,
          fieldName: parsedPayment.fieldName,
          companyName: parsedPayment.companyName,
          teacherName: parsedPayment.teacherName,
        };

        // Duplicate kontrolü (Prisma ile)
        try {
          const existingPayment = await prisma.monthlyPayment.findFirst({
            where: {
              studentId: paymentData.studentId,
              month: paymentData.month,
              year: paymentData.year,
              paymentType: paymentData.paymentType as any,
            },
          });

          if (existingPayment) {
            errors.push(
              `Satır ${i + 2}: Bu öğrenci için ${paymentData.month}/${
                paymentData.year
              } dönemi zaten kayıtlı`
            );
            continue;
          }

          // Eğer companyId boşsa, ilk company'yi kullan
          let finalCompanyId = paymentData.companyId;
          if (!finalCompanyId) {
            const defaultCompany = await prisma.companyProfile.findFirst({
              select: { id: true },
            });
            finalCompanyId = defaultCompany?.id || null;
          }

          if (!finalCompanyId) {
            errors.push(`Satır ${i + 2}: İşletme ID'si bulunamadı`);
            continue;
          }

          // Prisma ORM ile insert
          await prisma.monthlyPayment.create({
            data: {
              id: uuidv4(),
              studentId: paymentData.studentId,
              companyId: finalCompanyId,
              teacherId: paymentData.teacherId,
              stajId: paymentData.stajId,
              educationYearId: paymentData.educationYearId,
              month: paymentData.month,
              year: paymentData.year,
              amount: paymentData.amount,
              paymentDate: paymentData.paymentDate,
              paymentType: paymentData.paymentType as any,
              status: "IMPORTED", // Enum değeri düzelttik
              importSource: paymentData.importSource,
              importBatch: paymentData.importBatch,
              importedBy: paymentData.importedBy,
              studentName: paymentData.studentName,
              studentSurname: paymentData.studentSurname,
              studentNumber: paymentData.studentNumber,
              studentTcNo: paymentData.studentTcNo,
              className: paymentData.className,
              fieldName: paymentData.fieldName,
              companyName: paymentData.companyName,
              teacherName: paymentData.teacherName,
              verificationStatus: "PENDING", // Enum değeri düzelttik
              archived: false, // Boolean değer düzelttik
            },
          });
        } catch (tableError) {
          console.error("Monthly payment insert error:", tableError);
          errors.push(
            `Satır ${i + 2}: ${
              tableError instanceof Error
                ? tableError.message
                : "Ödeme kaydı oluşturulamadı"
            }`
          );
          continue;
        }

        successfulPayments.push(paymentData);
        successCount++;
        console.log(`💾 Row ${i + 2} saved successfully`);
      } catch (error) {
        console.error(`❌ Row ${i + 2} error:`, error);
        errors.push(
          `Satır ${i + 2}: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    // Import log güncelle (eğer log oluşturulmuşsa)
    if (importLog) {
      try {
        await prisma.paymentImportLog.update({
          where: { id: importLog.id },
          data: {
            successfulRows: successCount,
            failedRows: errors.length,
            status: errors.length === 0 ? "COMPLETED" : "PARTIAL_SUCCESS",
            errors: errors.length > 0 ? JSON.stringify(errors) : null,
            summary: `${successCount} kayıt başarıyla import edildi, ${errors.length} kayıt hata aldı.`,
          },
        });
      } catch (error) {
        console.log("PaymentImportLog update failed, skipping log update");
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
        totalRecords: jsonData.length,
        successCount: successCount,
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
