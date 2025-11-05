import { ExcelFormatType } from "./excel-format-detector";

export interface StudentPaymentData {
  studentName: string;
  studentSurname: string;
  studentNo?: string;
  studentTcNo?: string;
  className?: string;
  fieldName?: string;
  companyName: string;
  coordinatorTeacher?: string;
  amount: number;
  devamsizlikDvli?: number;
  devamsizlikDvsiz?: number;
  companyContribution?: number;
  rowNumber: number;
  isIncompleteAmount?: boolean; // Tutar eksik olan kayıtlar için işaret
}

export interface AdapterResult {
  success: boolean;
  data: StudentPaymentData[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export abstract class BaseExcelAdapter {
  protected normalizeTurkishText(text: string): string {
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

  protected parseAmount(value: any): number | null {
    if (!value || value === null || value === undefined) return null;

    // Handle [object Object] cases
    if (String(value).includes("[object Object]")) {
      console.log(`⚠️ Skipping [object Object] value:`, value);
      return null;
    }

    // Handle various formats
    const cleanValue = String(value)
      .replace(/[^0-9.,]/g, "") // Keep only numbers, dots and commas
      .replace(/,/g, "."); // Convert commas to dots

    if (!cleanValue) return null;

    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
  }

  abstract processData(
    rawData: any[][],
    headerRow: number,
    columnIndexes: Record<string, number>
  ): AdapterResult;
}

/**
 * E-Okul formatı için adapter
 */
export class EOkulAdapter extends BaseExcelAdapter {
  processData(
    rawData: any[][],
    headerRow: number,
    columnIndexes: Record<string, number>
  ): AdapterResult {
    console.log("📄 E-Okul Adapter processing data...");

    const dataRows = rawData.slice(headerRow + 1);
    const results: StudentPaymentData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = headerRow + i + 2;

      if (!row || !Array.isArray(row)) continue;

      try {
        const tcNo = row[columnIndexes.tcNo]
          ? String(row[columnIndexes.tcNo]).trim().replace(/\*/g, "")
          : "";
        const fullName = row[columnIndexes.studentName]
          ? String(row[columnIndexes.studentName]).trim()
          : "";
        let amount = this.parseAmount(row[columnIndexes.amount]);
        const companyName = row[columnIndexes.companyName]
          ? String(row[columnIndexes.companyName]).trim()
          : "";

        if (!fullName) {
          errors.push(`Satır ${rowNumber}: İsim bilgisi eksik`);
          continue;
        }

        // If still no amount, set to 0 and mark as incomplete
        let isIncompleteAmount = false;
        if (!amount) {
          amount = 0;
          isIncompleteAmount = true;
          console.log(
            `⚠️ No amount found for ${fullName}, setting to 0 and marking as incomplete`
          );
        }

        // Ad-soyadı ayır
        const nameParts = fullName.split(" ");
        const studentName = nameParts[0];
        const studentSurname = nameParts.slice(1).join(" ");

        results.push({
          studentName,
          studentSurname,
          studentTcNo: tcNo,
          companyName,
          amount,
          rowNumber,
          isIncompleteAmount,
        });
      } catch (error) {
        errors.push(
          `Satır ${rowNumber}: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors,
      totalRows: dataRows.length,
      validRows: results.length,
    };
  }
}

/**
 * MESEM formatı için adapter
 */
export class MESEMAdapter extends BaseExcelAdapter {
  processData(
    rawData: any[][],
    headerRow: number,
    columnIndexes: Record<string, number>
  ): AdapterResult {
    console.log("📄 MESEM Adapter processing data...");
    console.log("📄 MESEM Column indexes:", columnIndexes);
    console.log("📄 MESEM Header row:", headerRow);

    const dataRows = rawData.slice(headerRow + 1);
    console.log("📄 MESEM Data rows count:", dataRows.length);
    console.log("📄 MESEM First few data rows:", dataRows.slice(0, 3));

    const results: StudentPaymentData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = headerRow + i + 2;

      if (!row || !Array.isArray(row)) continue;

      try {
        // Debug: Log current row being processed
        console.log(`🔍 Processing row ${rowNumber}:`, row);

        // MESEM formatından veri çek
        const className = row[columnIndexes.class]
          ? String(row[columnIndexes.class]).trim()
          : "";
        const studentNo = row[columnIndexes.studentNo]
          ? String(row[columnIndexes.studentNo]).trim()
          : "";
        const fullName = row[columnIndexes.studentName]
          ? String(row[columnIndexes.studentName]).trim()
          : "";
        const coordinatorTeacher = row[columnIndexes.coordinatorTeacher]
          ? String(row[columnIndexes.coordinatorTeacher]).trim()
          : "";
        const companyName = row[columnIndexes.companyName]
          ? String(row[columnIndexes.companyName]).trim()
          : "";

        // Debug: Log extracted values
        console.log(`🔍 Row ${rowNumber} extracted values:`, {
          className,
          studentNo,
          fullName,
          coordinatorTeacher,
          companyName,
        });

        // Devamsızlık bilgileri (MESEM özel)
        const devamsizlikDvli = row[columnIndexes.devamsizlikDvli]
          ? parseInt(String(row[columnIndexes.devamsizlikDvli]))
          : 0;
        const devamsizlikDvsiz = row[columnIndexes.devamsizlikDvsiz]
          ? parseInt(String(row[columnIndexes.devamsizlikDvsiz]))
          : 0;

        // Tutar bilgileri - MESEM'de iki tür tutar var
        let amount = 0;
        let companyContribution = 0;

        if (columnIndexes.studentSalary !== undefined) {
          const studentSalary = this.parseAmount(
            row[columnIndexes.studentSalary]
          );
          if (studentSalary) amount = studentSalary;
        }

        if (columnIndexes.companyContribution !== undefined) {
          const contribution = this.parseAmount(
            row[columnIndexes.companyContribution]
          );
          if (contribution) companyContribution = contribution;
        }

        // Eğer öğrenci maaşı yoksa devlet katkısını kullan
        if (!amount && companyContribution) {
          amount = companyContribution;
        }

        // Validation - skip empty rows
        if (!fullName || fullName === "") {
          console.log(`⏭️ Skipping empty row ${rowNumber}`);
          continue;
        }

        // Handle missing amount - try both salary and contribution columns
        if (!amount && companyContribution) {
          amount = companyContribution;
          console.log(
            `💰 Using company contribution as amount: ${amount} for ${fullName}`
          );
        }

        // If still no amount, set to 0 and mark as incomplete
        let isIncompleteAmount = false;
        if (!amount) {
          amount = 0;
          isIncompleteAmount = true;
          console.log(
            `⚠️ No amount found for ${fullName}, setting to 0 and marking as incomplete`
          );
        }

        // Ad-soyadı ayır (daha sağlam bir yöntem)
        const nameParts = fullName.trim().split(/\s+/);
        const studentSurname = nameParts.pop() || "";
        const studentName = nameParts.join(" ") || "";

        if (!studentName || !studentSurname) {
          errors.push(
            `Satır ${rowNumber}: Geçersiz isim formatı: "${fullName}"`
          );
          continue;
        }

        // Bölüm bilgisini al
        const fieldName = row[columnIndexes.department]
          ? String(row[columnIndexes.department]).trim()
          : "";

        console.log(
          `✅ Valid student data: ${studentName} ${studentSurname} - ${amount}₺`
        );

        results.push({
          studentName,
          studentSurname,
          studentNo,
          className,
          fieldName,
          companyName,
          coordinatorTeacher,
          amount,
          devamsizlikDvli,
          devamsizlikDvsiz,
          companyContribution,
          rowNumber,
          isIncompleteAmount,
        });
      } catch (error) {
        errors.push(
          `Satır ${rowNumber}: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    return {
      success: errors.length < results.length, // Bazı hatalar olsa da çoğu başarılıysa success
      data: results,
      errors,
      totalRows: dataRows.length,
      validRows: results.length,
    };
  }
}

/**
 * Format adapter factory
 */
export class ExcelAdapterFactory {
  static createAdapter(formatType: ExcelFormatType): BaseExcelAdapter {
    switch (formatType) {
      case ExcelFormatType.EOKUL:
        return new EOkulAdapter();
      case ExcelFormatType.MESEM:
        return new MESEMAdapter();
      default:
        throw new Error(`Desteklenmeyen format tipi: ${formatType}`);
    }
  }
}

/**
 * MESEM formatı için gelişmiş sütun algılama
 * MESEM Excel dosyasında sütun isimleri bazen farklı olabilir
 */
export function enhanceMESEMColumnDetection(
  headerRow: any[]
): Record<string, number> {
  const columnIndexes: Record<string, number> = {};

  console.log("🔍 Enhancing MESEM column detection with headers:", headerRow);

  headerRow.forEach((header, index) => {
    if (header) {
      const headerStr = String(header).toLowerCase().replace(/\n/g, " ").trim();
      console.log(`Column ${index}: "${headerStr}"`);

      // Sınıf
      if (headerStr === "sınıf" || headerStr.includes("sınıf")) {
        columnIndexes.class = index;
        console.log(`✅ Found class column at index ${index}`);
      }

      // Öğrenci No
      if (headerStr === "no" || headerStr.includes("öğrenci no")) {
        columnIndexes.studentNo = index;
        console.log(`✅ Found student number column at index ${index}`);
      }

      // Bölüm/Alan
      if (headerStr.includes("bölüm") || headerStr.includes("alan")) {
        columnIndexes.department = index;
        console.log(`✅ Found department column at index ${index}`);
      }

      // Adı Soyadı
      if (headerStr.includes("adı soyadı") || headerStr.includes("ad soyad")) {
        columnIndexes.studentName = index;
        console.log(`✅ Found student name column at index ${index}`);
      }

      // Koordinatör Öğretmen
      if (headerStr.includes("koordinatör") && headerStr.includes("öğretmen")) {
        columnIndexes.coordinatorTeacher = index;
        console.log(`✅ Found coordinator teacher column at index ${index}`);
      }

      // İşletme Adı
      if (
        headerStr.includes("işletmenin adı") ||
        headerStr.includes("işletme adı")
      ) {
        columnIndexes.companyName = index;
        console.log(`✅ Found company name column at index ${index}`);
      }

      // Devamsızlık - Dvlı (exact match)
      if (headerStr === "dvlı" || headerStr.includes("dvlı")) {
        columnIndexes.devamsizlikDvli = index;
        console.log(`✅ Found attendance (dvli) column at index ${index}`);
      }

      // Devamsızlık - Dvsız (exact match)
      if (headerStr === "dvsız" || headerStr.includes("dvsız")) {
        columnIndexes.devamsizlikDvsiz = index;
        console.log(`✅ Found attendance (dvsiz) column at index ${index}`);
      }

      // Öğrenci Maaş Tutarı - handle multiline headers
      if (
        (headerStr.includes("öğrencinin") && headerStr.includes("maaş")) ||
        headerStr.includes("öğrencinin maaş tutarı")
      ) {
        columnIndexes.studentSalary = index;
        console.log(`✅ Found student salary column at index ${index}`);
      }

      // İşletme Devlet Katkısı - handle multiline headers
      if (
        (headerStr.includes("işletmenin") &&
          headerStr.includes("devlet") &&
          headerStr.includes("katkısı")) ||
        headerStr.includes("işletmenin devlet katkısı")
      ) {
        columnIndexes.companyContribution = index;
        console.log(`✅ Found company contribution column at index ${index}`);
      }
    }
  });

  console.log("🗺️ Final MESEM column mapping:", columnIndexes);
  return columnIndexes;
}
