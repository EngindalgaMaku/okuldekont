"use client";

import React, { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Database,
  Users,
  Building,
  GraduationCap,
  Download,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ImportRow {
  sinif: string;
  stajGunu: string;
  bolum: string;
  ogrenciNo: string;
  ogrenciAdi: string;
  koordinatorOgretmen: string;
  isletmeAdi: string;
  isletmeAdres: string;
  isletmeTelefon: string;
  status?: "new" | "existing" | "error" | "updated";
  errors?: string[];
  suggestions?: string[];
}

interface ImportStats {
  totalRows: number;
  newStudents: number;
  newTeachers: number;
  newCompanies: number;
  newInternships: number;
  errors: number;
  warnings: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: ImportRow[];
  stats: ImportStats;
}

export default function KoordinatorImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>("");

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setImportData([]);
        setValidationResult(null);
        setShowPreview(false);
      }
    },
    []
  );

  const parseExcelFile = useCallback(
    async (file: File): Promise<ImportRow[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Excel verilerini parse et
            const parsedData: ImportRow[] = [];
            let startRow = -1;

            // Başlık satırını bul
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (
                row &&
                row.some(
                  (cell) =>
                    typeof cell === "string" &&
                    (cell.includes("Sınıf") ||
                      cell.includes("No") ||
                      cell.includes("Adı Soyadı"))
                )
              ) {
                startRow = i + 1;
                break;
              }
            }

            if (startRow === -1) {
              throw new Error("Veri başlık satırı bulunamadı");
            }

            // Veri satırlarını işle
            for (let i = startRow; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (!row || row.length < 6) continue;

              // Boş satırları atla
              if (!row[0] || !row[4] || !row[5]) continue;

              // Son satırları kontrol et (müdür imzası vb.)
              if (
                typeof row[0] === "string" &&
                (row[0].includes("koordinatörlük") ||
                  row[0].includes("ERKAN CANAN") ||
                  row[0].includes("Müdürü"))
              ) {
                break;
              }

              const importRow: ImportRow = {
                sinif: String(row[0] || "").trim(),
                stajGunu: String(row[1] || "").trim(),
                bolum: String(row[2] || "").trim(),
                ogrenciNo: String(row[3] || "").trim(),
                ogrenciAdi: String(row[4] || "").trim(),
                koordinatorOgretmen: String(row[5] || "").trim(),
                isletmeAdi: String(row[6] || "").trim(),
                isletmeAdres: String(row[7] || "").trim(),
                isletmeTelefon: String(row[8] || "").trim(),
              };

              // Devamsız öğrencileri atla
              if (
                importRow.koordinatorOgretmen
                  .toLowerCase()
                  .includes("devamsız") ||
                importRow.isletmeAdi.toLowerCase().includes("devamsız")
              ) {
                continue;
              }

              // Boş koordinatör öğretmen satırlarını atla
              if (
                !importRow.koordinatorOgretmen ||
                importRow.koordinatorOgretmen.trim() === ""
              ) {
                continue;
              }

              parsedData.push(importRow);
            }

            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Dosya okuma hatası"));
        reader.readAsBinaryString(file);
      });
    },
    []
  );

  const validateData = useCallback(
    async (data: ImportRow[]): Promise<ValidationResult> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const stats: ImportStats = {
        totalRows: data.length,
        newStudents: 0,
        newTeachers: 0,
        newCompanies: 0,
        newInternships: 0,
        errors: 0,
        warnings: 0,
      };

      // Her satırı validate et
      const validatedData = data.map((row, index) => {
        const rowErrors: string[] = [];
        const rowWarnings: string[] = [];

        // Zorunlu alanları kontrol et
        if (!row.ogrenciAdi) rowErrors.push("Öğrenci adı boş");
        if (!row.ogrenciNo) rowErrors.push("Öğrenci numarası boş");
        if (!row.koordinatorOgretmen)
          rowErrors.push("Koordinatör öğretmen boş");
        if (!row.sinif) rowErrors.push("Sınıf bilgisi boş");
        if (!row.bolum) rowErrors.push("Bölüm bilgisi boş");

        // İşletme bilgilerini kontrol et
        if (!row.isletmeAdi) {
          rowWarnings.push("İşletme adı boş");
        }
        if (!row.isletmeTelefon) {
          rowWarnings.push("İşletme telefonu boş");
        }

        // Telefon formatını kontrol et
        if (
          row.isletmeTelefon &&
          !/^[0-9\s\-\+\(\)]+$/.test(row.isletmeTelefon)
        ) {
          rowWarnings.push("Geçersiz telefon formatı");
        }

        if (rowErrors.length > 0) stats.errors++;
        if (rowWarnings.length > 0) stats.warnings++;

        return {
          ...row,
          errors: rowErrors,
          suggestions: rowWarnings,
          status: rowErrors.length > 0 ? ("error" as const) : ("new" as const),
        };
      });

      // Genel istatistikleri hesapla
      const uniqueStudents = new Set(
        validatedData.map((row) => `${row.ogrenciNo}-${row.ogrenciAdi}`)
      );
      const uniqueTeachers = new Set(
        validatedData.map((row) => row.koordinatorOgretmen).filter((t) => t)
      );
      const uniqueCompanies = new Set(
        validatedData.map((row) => row.isletmeAdi).filter((c) => c)
      );

      stats.newStudents = uniqueStudents.size;
      stats.newTeachers = uniqueTeachers.size;
      stats.newCompanies = uniqueCompanies.size;
      stats.newInternships = validatedData.filter(
        (row) => row.status !== "error"
      ).length;

      return {
        isValid: stats.errors === 0,
        errors,
        warnings,
        data: validatedData,
        stats,
      };
    },
    []
  );

  const handleProcessFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const parsed = await parseExcelFile(file);
      setImportData(parsed);

      const validation = await validateData(parsed);
      setValidationResult(validation);
      setShowPreview(true);
    } catch (error) {
      console.error("Dosya işleme hatası:", error);
      alert("Dosya işlenirken hata oluştu: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [file, parseExcelFile, validateData]);

  const handleImportData = useCallback(async () => {
    if (!validationResult?.isValid || !validationResult.data) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // API'ye veri gönder
      const response = await fetch(
        "/api/admin/import/koordinator-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: validationResult.data.filter((row) => row.status !== "error"),
            stats: validationResult.stats,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Import işlemi başarısız");
      }

      const result = await response.json();
      setImportStatus(`Import tamamlandı! ${result.imported} kayıt işlendi.`);
      setImportProgress(100);

      // 3 saniye sonra sayfayı temizle
      setTimeout(() => {
        setFile(null);
        setImportData([]);
        setValidationResult(null);
        setShowPreview(false);
        setImportStatus("");
        setImportProgress(0);
      }, 3000);
    } catch (error) {
      console.error("Import hatası:", error);
      alert("Import sırasında hata oluştu: " + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  }, [validationResult]);

  const downloadTemplate = useCallback(() => {
    // Excel şablonu oluştur
    const templateData = [
      ["HÜSNİYE ÖZDİLEK TİCARET MESLEKİ ve TEKNİK ANADOLU LİSESİ"],
      ["2025-2026 EĞİTİM ÖĞRETİM YILI"],
      ["KOORDİNATÖR ÖĞRETMEN GÖREVLENDİRMESİ"],
      [""],
      [
        "Sınıf",
        "Staj Günü",
        "Bölüm",
        "No",
        "Adı Soyadı",
        "Koordinatör Öğretmen",
        "İşletmenin Adı",
        "İşletmenin Adresi",
        "Telefonu",
      ],
      [
        "12-A BLŞ",
        "ÇPC",
        "BİLİŞİM TEKNOLOJİ",
        "20",
        "Örnek Öğrenci",
        "Örnek Öğretmen",
        "Örnek İşletme",
        "Örnek Adres",
        "0242XXXXXXX",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Koordinatör Görevlendirme");
    XLSX.writeFile(wb, "koordinator-gorevlendirme-template.xlsx");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Koordinatör Öğretmen Görevlendirme İçe Aktarım
              </h1>
              <p className="text-gray-600">
                Excel dosyasından koordinatör öğretmen görevlendirmelerini
                sisteme aktarın
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Şablon İndir
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Excel dosyasını seçin veya sürükleyin
                </p>
                <p className="text-sm text-gray-500">
                  .xlsx veya .xls formatında olmalıdır
                </p>
              </label>
            </div>

            {file && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900">{file.name}</p>
                      <p className="text-sm text-blue-700">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleProcessFile}
                    disabled={isProcessing}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 mr-2" />
                    )}
                    {isProcessing ? "İşleniyor..." : "Dosyayı İşle"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {validationResult.stats.newStudents}
                      </p>
                      <p className="text-sm text-blue-700">Öğrenci</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <GraduationCap className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {validationResult.stats.newTeachers}
                      </p>
                      <p className="text-sm text-green-700">Öğretmen</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center">
                    <Building className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-purple-900">
                        {validationResult.stats.newCompanies}
                      </p>
                      <p className="text-sm text-purple-700">İşletme</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-orange-900">
                        {validationResult.stats.newInternships}
                      </p>
                      <p className="text-sm text-orange-700">Staj</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {validationResult.stats.errors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-800 font-medium">
                      {validationResult.stats.errors} satırda hata bulundu. Bu
                      hatalar düzeltilmeden import yapılamaz.
                    </p>
                  </div>
                </div>
              )}

              {validationResult.stats.warnings > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-800 font-medium">
                      {validationResult.stats.warnings} satırda uyarı var.
                      Kontrol etmeniz önerilir.
                    </p>
                  </div>
                </div>
              )}

              {validationResult.isValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-800 font-medium">
                      Tüm veriler doğrulandı. Import işlemine başlayabilirsiniz.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Data */}
          {showPreview && validationResult && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Veri Önizleme
                </h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex items-center px-3 py-1 text-gray-600 hover:text-gray-800"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Gizle
                  </button>
                  {validationResult.isValid && (
                    <button
                      onClick={handleImportData}
                      disabled={isImporting}
                      className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isImporting ? (
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-5 w-5 mr-2" />
                      )}
                      {isImporting ? "İçe Aktarılıyor..." : "İçe Aktar"}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <div className="grid grid-cols-1 gap-2">
                  {validationResult.data.slice(0, 10).map((row, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        row.status === "error"
                          ? "bg-red-50 border-red-200"
                          : row.suggestions && row.suggestions.length > 0
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            Öğrenci:
                          </span>{" "}
                          {row.ogrenciAdi} ({row.ogrenciNo})
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Öğretmen:
                          </span>{" "}
                          {row.koordinatorOgretmen}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            İşletme:
                          </span>{" "}
                          {row.isletmeAdi}
                        </div>
                      </div>
                      {row.errors && row.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          <span className="font-medium">Hatalar:</span>{" "}
                          {row.errors.join(", ")}
                        </div>
                      )}
                      {row.suggestions && row.suggestions.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-600">
                          <span className="font-medium">Uyarılar:</span>{" "}
                          {row.suggestions.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                  {validationResult.data.length > 10 && (
                    <div className="text-center text-gray-500 text-sm">
                      ... ve {validationResult.data.length - 10} satır daha
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <RefreshCw className="h-6 w-6 text-blue-600 mr-3 animate-spin" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    İçe Aktarım Devam Ediyor
                  </h3>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700">
                  %{importProgress.toFixed(0)} tamamlandı
                </p>
              </div>
            </div>
          )}

          {/* Import Status */}
          {importStatus && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">{importStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
