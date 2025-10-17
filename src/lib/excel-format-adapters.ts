// Excel Format Adapters - Farklı formatlar için veri işleme adapterleri
import { ExcelFormatType } from "./excel-format-detector";
import { v4 as uuidv4 } from "uuid";

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

    // Handle various formats
    const cleanValue = String(value)
      .replace(/[^0-9.,]/g, "") // Keep only numbers, dots and commas
      .replace(/,/g, "."); // Convert commas to dots

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
        const amount = this.parseAmount(row[columnIndexes.amount]);
        const companyName = row[columnIndexes.companyName]
          ? String(row[columnIndexes.companyName]).trim()
          : "";

        if (!fullName || !amount) {
          errors.push(`Satır ${rowNumber}: Eksik veri (İsim veya tutar)`);
          continue;
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

    const dataRows = rawData.slice(headerRow + 1);
    const results: StudentPaymentData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = headerRow + i + 2;

      if (!row || !Array.isArray(row)) continue;

      try {
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

        if (!fullName || !amount) {
          errors.push(
            `Satır ${rowNumber}: Eksik veri (İsim: "${fullName}", Tutar: ${amount})`
          );
          continue;
        }

        // Ad-soyadı ayır
        const nameParts = fullName.split(" ");
        const studentName = nameParts[0];
        const studentSurname = nameParts.slice(1).join(" ");

        // Bölüm bilgisini al
        const fieldName = row[columnIndexes.department]
          ? String(row[columnIndexes.department]).trim()
          : "";

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

  headerRow.forEach((header, index) => {
    if (header) {
      const headerStr = String(header).toLowerCase().replace(/\n/g, " ").trim();

      // Sınıf
      if (headerStr.includes("sınıf")) {
        columnIndexes.class = index;
      }

      // Öğrenci No
      if (headerStr === "no" || headerStr.includes("öğrenci no")) {
        columnIndexes.studentNo = index;
      }

      // Bölüm
      if (headerStr.includes("bölüm") || headerStr.includes("alan")) {
        columnIndexes.department = index;
      }

      // Adı Soyadı
      if (headerStr.includes("adı soyadı") || headerStr.includes("ad soyad")) {
        columnIndexes.studentName = index;
      }

      // Koordinatör Öğretmen
      if (headerStr.includes("koordinatör") && headerStr.includes("öğretmen")) {
        columnIndexes.coordinatorTeacher = index;
      }

      // İşletme Adı
      if (
        headerStr.includes("işletmenin adı") ||
        headerStr.includes("işletme adı")
      ) {
        columnIndexes.companyName = index;
      }

      // Devamsızlık - Dvlı
      if (
        headerStr.includes("dvlı") ||
        (headerStr.includes("devam") && headerStr.includes("var"))
      ) {
        columnIndexes.devamsizlikDvli = index;
      }

      // Devamsızlık - Dvsız
      if (
        headerStr.includes("dvsız") ||
        (headerStr.includes("devam") && headerStr.includes("yok"))
      ) {
        columnIndexes.devamsizlikDvsiz = index;
      }

      // Öğrenci Maaş Tutarı
      if (headerStr.includes("öğrencinin") && headerStr.includes("maaş")) {
        columnIndexes.studentSalary = index;
      }

      // İşletme Devlet Katkısı
      if (
        headerStr.includes("işletmenin") &&
        headerStr.includes("devlet") &&
        headerStr.includes("katkısı")
      ) {
        columnIndexes.companyContribution = index;
      }
    }
  });

  return columnIndexes;
}
