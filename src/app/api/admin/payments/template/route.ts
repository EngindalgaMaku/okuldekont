import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // Create sample template data
    const templateData = [
      {
        "Öğrenci Adı": "Örnek: Ahmet Yılmaz",
        "TC Kimlik No": "12345678901",
        Sınıf: "12-A",
        "Öğrenci No": "1234",
        Alan: "Bilişim Teknolojileri",
        "İşletme Adı": "Örnek Teknoloji A.Ş.",
        "Koordinatör Öğretmen": "Mehmet Öğretmen",
        "Ödeme Türü": "DEVLET_KATKISI",
        Tutar: "2500",
        Ay: "9",
        Yıl: "2025",
        Açıklama: "Eylül ayı devlet katkısı ödemesi",
      },
      {
        "Öğrenci Adı": "Örnek: Ayşe Demir",
        "TC Kimlik No": "98765432109",
        Sınıf: "11-B",
        "Öğrenci No": "5678",
        Alan: "Muhasebe ve Finans",
        "İşletme Adı": "ABC Muhasebe Ltd.",
        "Koordinatör Öğretmen": "Fatma Öğretmen",
        "Ödeme Türü": "MAAS",
        Tutar: "3000",
        Ay: "9",
        Yıl: "2025",
        Açıklama: "Eylül ayı maaş ödemesi",
      },
    ];

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Öğrenci Adı
      { wch: 15 }, // TC Kimlik No
      { wch: 10 }, // Sınıf
      { wch: 12 }, // Öğrenci No
      { wch: 20 }, // Alan
      { wch: 25 }, // İşletme Adı
      { wch: 20 }, // Koordinatör Öğretmen
      { wch: 15 }, // Ödeme Türü
      { wch: 10 }, // Tutar
      { wch: 5 }, // Ay
      { wch: 6 }, // Yıl
      { wch: 30 }, // Açıklama
    ];
    ws["!cols"] = colWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Ödeme Listesi");

    // Create instructions sheet
    const instructionsData = [
      {
        Alan: "Açıklama",
        Değer:
          "Bu şablon dosyası, aylık ödeme listelerini sisteme aktarmak için kullanılır.",
      },
      {
        Alan: "Öğrenci Adı",
        Değer: "Öğrencinin tam adı ve soyadı",
      },
      {
        Alan: "TC Kimlik No",
        Değer: "11 haneli TC kimlik numarası",
      },
      {
        Alan: "Sınıf",
        Değer: "Öğrencinin sınıfı (örn: 12-A, 11-B)",
      },
      {
        Alan: "Öğrenci No",
        Değer: "Öğrenci numarası",
      },
      {
        Alan: "Alan",
        Değer: "Öğrencinin meslek alanı",
      },
      {
        Alan: "İşletme Adı",
        Değer: "Staj yapılan işletmenin tam adı",
      },
      {
        Alan: "Koordinatör Öğretmen",
        Değer: "Sorumlu koordinatör öğretmenin adı",
      },
      {
        Alan: "Ödeme Türü",
        Değer: "DEVLET_KATKISI veya MAAS",
      },
      {
        Alan: "Tutar",
        Değer: "Ödeme tutarı (sadece sayı)",
      },
      {
        Alan: "Ay",
        Değer: "Ödeme ayı (1-12 arası sayı)",
      },
      {
        Alan: "Yıl",
        Değer: "Ödeme yılı",
      },
      {
        Alan: "Açıklama",
        Değer: "İsteğe bağlı açıklama",
      },
    ];

    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    instructionsWs["!cols"] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Talimatlar");

    // Generate the Excel file buffer
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "buffer",
      compression: true,
    });

    // Return the file as a response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="odeme_listesi_template.xlsx"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Şablon oluşturulurken hata oluştu",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
