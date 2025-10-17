// Excel Format Detector - Otomatik format algılama sistemi
import * as XLSX from "xlsx";

export enum ExcelFormatType {
  EOKUL = "EOKUL",
  MESEM = "MESEM",
  UNKNOWN = "UNKNOWN",
}

export interface FormatDetectionResult {
  type: ExcelFormatType;
  confidence: number;
  reason: string;
  headerRow: number;
  detectedColumns: Record<string, number>;
}

export class ExcelFormatDetector {
  /**
   * Excel dosyasının formatını otomatik olarak algılar
   */
  static detectFormat(workbook: XLSX.WorkBook): FormatDetectionResult {
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Header satırını bul
    const headerAnalysis = this.findHeaderRow(rawData);

    if (headerAnalysis.headerRow === -1) {
      return {
        type: ExcelFormatType.UNKNOWN,
        confidence: 0,
        reason: "Header satırı bulunamadı",
        headerRow: -1,
        detectedColumns: {},
      };
    }

    const headerRow = rawData[headerAnalysis.headerRow] as any[];

    // Format-specific pattern matching
    const eOkulScore = this.scoreEOkulFormat(headerRow);
    const mesemScore = this.scoreMESEMFormat(headerRow);

    console.log("🔍 Format Detection Scores:", { eOkulScore, mesemScore });

    if (mesemScore.score > eOkulScore.score && mesemScore.score >= 0.7) {
      return {
        type: ExcelFormatType.MESEM,
        confidence: mesemScore.score,
        reason: `MESEM formatı algılandı: ${mesemScore.matchedFields.join(
          ", "
        )}`,
        headerRow: headerAnalysis.headerRow,
        detectedColumns: mesemScore.columnIndexes,
      };
    } else if (eOkulScore.score >= 0.7) {
      return {
        type: ExcelFormatType.EOKUL,
        confidence: eOkulScore.score,
        reason: `E-Okul formatı algılandı: ${eOkulScore.matchedFields.join(
          ", "
        )}`,
        headerRow: headerAnalysis.headerRow,
        detectedColumns: eOkulScore.columnIndexes,
      };
    } else {
      return {
        type: ExcelFormatType.UNKNOWN,
        confidence: Math.max(eOkulScore.score, mesemScore.score),
        reason: `Bilinmeyen format (E-Okul: ${eOkulScore.score.toFixed(
          2
        )}, MESEM: ${mesemScore.score.toFixed(2)})`,
        headerRow: headerAnalysis.headerRow,
        detectedColumns: {},
      };
    }
  }

  /**
   * Header satırını bulur
   */
  private static findHeaderRow(rawData: any[]): { headerRow: number } {
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i] as any[];
      if (row && Array.isArray(row)) {
        // Convert row to normalized strings for better matching
        const normalizedRow = row.map((cell) =>
          cell ? String(cell).toLowerCase().replace(/\n/g, " ").trim() : ""
        );
        const rowStr = normalizedRow.join(" ");

        // E-Okul pattern
        if (rowStr.includes("tc kimlik") && rowStr.includes("adı soyadı")) {
          return { headerRow: i };
        }

        // MESEM pattern - more specific matching
        const hasClass = normalizedRow.some((cell) => cell === "sınıf");
        const hasName = normalizedRow.some((cell) =>
          cell.includes("adı soyadı")
        );
        const hasTeacher = normalizedRow.some((cell) =>
          cell.includes("koordinatör öğretmen")
        );
        const hasSalary = normalizedRow.some(
          (cell) => cell.includes("öğrencinin") && cell.includes("maaş")
        );

        if (hasClass && hasName && hasTeacher) {
          console.log(`🎯 Found MESEM header at row ${i}:`, normalizedRow);
          return { headerRow: i };
        }

        // Alternative MESEM pattern
        if (
          hasSalary &&
          normalizedRow.some((cell) => cell.includes("işletmenin adı"))
        ) {
          console.log(
            `🎯 Found MESEM header (alt) at row ${i}:`,
            normalizedRow
          );
          return { headerRow: i };
        }

        // Debug: Log potential header rows for analysis
        if (
          normalizedRow.some(
            (cell) => cell.includes("sınıf") || cell.includes("öğrenci")
          )
        ) {
          console.log(
            `🔍 Potential header row ${i}:`,
            normalizedRow.slice(0, 6)
          );
        }
      }
    }

    return { headerRow: -1 };
  }

  /**
   * E-Okul format uyumluluğunu skorlar
   */
  private static scoreEOkulFormat(headerRow: any[]): {
    score: number;
    matchedFields: string[];
    columnIndexes: Record<string, number>;
  } {
    const requiredFields = [
      { key: "tcNo", patterns: ["tc kimlik"], weight: 0.4 },
      { key: "studentName", patterns: ["adı soyadı"], weight: 0.3 },
      { key: "amount", patterns: ["maaş tutarı"], weight: 0.2 },
      { key: "companyName", patterns: ["adı", "unvanı"], weight: 0.1 },
    ];

    return this.scoreFormat(headerRow, requiredFields);
  }

  /**
   * MESEM format uyumluluğunu skorlar
   */
  private static scoreMESEMFormat(headerRow: any[]): {
    score: number;
    matchedFields: string[];
    columnIndexes: Record<string, number>;
  } {
    const requiredFields = [
      { key: "class", patterns: ["sınıf"], weight: 0.15 },
      { key: "studentNo", patterns: ["no"], weight: 0.15 },
      { key: "studentName", patterns: ["adı soyadı"], weight: 0.25 },
      {
        key: "coordinatorTeacher",
        patterns: ["koordinatör öğretmen"],
        weight: 0.15,
      },
      { key: "companyName", patterns: ["işletmenin adı"], weight: 0.15 },
      {
        key: "studentSalary",
        patterns: ["öğrencinin maaş tutarı"],
        weight: 0.1,
      },
      {
        key: "companyContribution",
        patterns: ["işletmenin devlet katkısı"],
        weight: 0.05,
      },
    ];

    return this.scoreFormat(headerRow, requiredFields);
  }

  /**
   * Generic format scoring
   */
  private static scoreFormat(
    headerRow: any[],
    requiredFields: Array<{ key: string; patterns: string[]; weight: number }>
  ): {
    score: number;
    matchedFields: string[];
    columnIndexes: Record<string, number>;
  } {
    let totalScore = 0;
    const matchedFields: string[] = [];
    const columnIndexes: Record<string, number> = {};

    headerRow.forEach((header, index) => {
      if (header) {
        const headerStr = String(header)
          .toLowerCase()
          .replace(/\n/g, " ")
          .trim();

        for (const field of requiredFields) {
          const isMatch = field.patterns.some((pattern) =>
            headerStr.includes(pattern.toLowerCase())
          );

          if (isMatch && !columnIndexes[field.key]) {
            totalScore += field.weight;
            matchedFields.push(field.key);
            columnIndexes[field.key] = index;
          }
        }
      }
    });

    return { score: totalScore, matchedFields, columnIndexes };
  }

  /**
   * Format bilgilerini detaylı açıklama ile döner
   */
  static getFormatDescription(type: ExcelFormatType): {
    name: string;
    description: string;
    requiredColumns: string[];
    example: string;
  } {
    switch (type) {
      case ExcelFormatType.EOKUL:
        return {
          name: "E-Okul Formatı",
          description:
            "Resmi E-Okul sisteminden alınan standart ödeme listesi formatı",
          requiredColumns: ["TC Kimlik No", "Adı Soyadı", "Maaş Tutarı"],
          example: "Geleneksel ödeme listesi Excel dosyaları",
        };

      case ExcelFormatType.MESEM:
        return {
          name: "MESEM Formatı",
          description:
            "MESEM (Mesleki Eğitim ve Sertifika Merkezi) öğrencileri için özel format",
          requiredColumns: [
            "Sınıf",
            "No",
            "Adı Soyadı",
            "Koordinatör Öğretmen",
            "İşletmenin Adı",
            "Öğrencinin Maaş Tutarı",
          ],
          example: "01. Eylül 2025 - Mesem - TÜM.xlsx tarzı dosyalar",
        };

      case ExcelFormatType.UNKNOWN:
      default:
        return {
          name: "Bilinmeyen Format",
          description: "Format algılanamadı, manuel format seçimi gerekli",
          requiredColumns: [],
          example: "Desteklenen formatlardan biri değil",
        };
    }
  }
}
