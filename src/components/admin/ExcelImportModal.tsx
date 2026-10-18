"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  X,
  Download,
  Zap,
  Settings,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    importId: string;
    formatType?: string;
    confidence?: number;
    totalRecords: number;
    successCount: number;
    errorCount: number;
    errors: Array<{
      row: number;
      field: string;
      message: string;
    }>;
  };
}

type FormatType = "AUTO" | "EOKUL" | "MESEM";

interface FormatOption {
  value: FormatType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
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

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "AUTO",
    label: "Otomatik Algıla",
    description: "Sistem dosya formatını otomatik olarak algılar (Önerilen)",
    icon: Zap,
  },
  {
    value: "EOKUL",
    label: "E-Okul Formatı",
    description:
      "Standart E-Okul ödeme listesi formatı (TC Kimlik, Ad Soyad, Tutar)",
    icon: FileSpreadsheet,
  },
  {
    value: "MESEM",
    label: "MESEM Formatı",
    description:
      "MESEM öğrencileri için özel format (Sınıf, No, Koordinatör Öğretmen)",
    icon: Settings,
  },
];

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ExcelImportModalProps) {
  // Calculate previous month defaults
  const currentDate = new Date();
  const previousMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1
  );
  const defaultMonth = (previousMonth.getMonth() + 1).toString(); // 1-based month
  const defaultYear = previousMonth.getFullYear().toString();

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("AUTO");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate available years
  const currentYear = currentDate.getFullYear();
  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setImportResult(null);
    setIsDragOver(false);
    setSelectedMonth(defaultMonth);
    setSelectedYear(defaultYear);
    setSelectedFormat("AUTO");
    onClose();
  }, [onClose, defaultMonth, defaultYear]);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Lütfen geçerli bir Excel dosyası seçin (.xlsx, .xls, .csv)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya boyutu 10MB'dan küçük olmalıdır");
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Lütfen bir dosya seçin");
      return;
    }

    if (!selectedMonth || !selectedYear) {
      toast.error("Lütfen dönem bilgisi seçin (ay ve yıl)");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("month", selectedMonth);
      formData.append("year", selectedYear);

      // Add format selection (if not AUTO)
      if (selectedFormat !== "AUTO") {
        formData.append("format", selectedFormat);
      }

      const response = await fetch("/api/admin/payments/import-v2", {
        method: "POST",
        body: formData,
      });

      const result: ImportResult = await response.json();

      if (response.ok && result.success) {
        setImportResult(result);
        toast.success(result.message);
        onImportComplete?.();
      } else {
        setImportResult(result);
        toast.error(result.message || "İçe aktarma işlemi başarısız");
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorResult: ImportResult = {
        success: false,
        message: "İçe aktarma sırasında bir hata oluştu",
      };
      setImportResult(errorResult);
      toast.error("İçe aktarma sırasında bir hata oluştu");
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedFile,
    selectedMonth,
    selectedYear,
    selectedFormat,
    onImportComplete,
  ]);

  const downloadTemplate = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payments/template");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "odeme_listesi_template.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Şablon dosyası indirildi");
      } else {
        toast.error("Şablon dosyası indirilemedi");
      }
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Şablon dosyası indirilemedi");
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileSpreadsheet className="h-6 w-6 mr-3 text-green-600" />
            Excel Ödeme Listesi İçe Aktar
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">
              Kullanım Talimatları:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Dönem bilgisi seçin (hangi ay ve yıla ait ödeme listesi)
              </li>
              <li>
                • Excel dosya formatını seçin (otomatik algılama önerilen)
              </li>
              <li>• E-Okul veya MESEM ödeme listesi Excel dosyasını seçin</li>
              <li>• Desteklenen formatlar: .xlsx, .xls, .csv</li>
              <li>• Maksimum dosya boyutu: 10MB</li>
              <li>
                • Sistem öğrenci ve işletme eşleştirmelerini otomatik yapar
              </li>
            </ul>
          </div>

          {/* Period Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Dönem Bilgisi</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ay
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Ay Seçin</option>
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yıl
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Yıl Seçin</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(!selectedMonth || !selectedYear) && (
              <p className="text-sm text-orange-600 mt-2">
                ⚠️ Dönem bilgisi seçilmelidir
              </p>
            )}
          </div>

          {/* Format Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">
              Excel Dosya Formatı
            </h3>
            <div className="space-y-3">
              {FORMAT_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFormat === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={selectedFormat === option.value}
                      onChange={(e) =>
                        setSelectedFormat(e.target.value as FormatType)
                      }
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <IconComponent
                          className={`h-4 w-4 mr-2 ${
                            selectedFormat === option.value
                              ? "text-blue-600"
                              : "text-gray-500"
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            selectedFormat === option.value
                              ? "text-blue-900"
                              : "text-gray-900"
                          }`}
                        >
                          {option.label}
                        </span>
                        {option.value === "AUTO" && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Önerilen
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          selectedFormat === option.value
                            ? "text-blue-700"
                            : "text-gray-600"
                        }`}
                      >
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Şablon Dosyasını İndir
            </button>
          </div>

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : selectedFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Dosyayı kaldır
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Dosyanızı buraya sürükleyin
                  </p>
                  <p className="text-sm text-gray-500">veya</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Dosya Seç
                </button>
              </div>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-6">
              <div
                className={`p-4 rounded-lg ${
                  importResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-start">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        importResult.success ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {importResult.success
                        ? "İçe Aktarma Başarılı"
                        : "İçe Aktarma Başarısız"}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        importResult.success ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {importResult.message}
                    </p>

                    {/* Details */}
                    {importResult.details && (
                      <div className="mt-3 space-y-2">
                        {/* Format Info */}
                        {importResult.details.formatType && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                              Algılanan Format:
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                importResult.details.formatType === "MESEM"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {importResult.details.formatType}
                              {importResult.details.confidence &&
                                ` (${Math.round(
                                  importResult.details.confidence * 100
                                )}%)`}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Toplam:</span>{" "}
                            {importResult.details.totalRecords}
                          </div>
                          <div>
                            <span className="font-medium text-green-700">
                              Başarılı:
                            </span>{" "}
                            {importResult.details.successCount}
                          </div>
                          <div>
                            <span className="font-medium text-red-700">
                              Hata:
                            </span>{" "}
                            {importResult.details.errorCount}
                          </div>
                        </div>

                        {/* Error Details */}
                        {importResult.details.errors &&
                          importResult.details.errors.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-red-900 mb-2">
                                Hatalar:
                              </h4>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {importResult.details.errors
                                  .slice(0, 10)
                                  .map((error, index) => (
                                    <div
                                      key={index}
                                      className="text-sm text-red-800 bg-red-100 p-2 rounded"
                                    >
                                      <span className="font-medium">
                                        Satır {error.row}:
                                      </span>{" "}
                                      {error.message}
                                    </div>
                                  ))}
                                {importResult.details.errors.length > 10 && (
                                  <div className="text-sm text-red-700 italic">
                                    ... ve{" "}
                                    {importResult.details.errors.length - 10}{" "}
                                    hata daha
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {importResult ? "Kapat" : "İptal"}
          </button>
          {!importResult && (
            <button
              onClick={handleImport}
              disabled={
                !selectedFile || !selectedMonth || !selectedYear || isUploading
              }
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {isUploading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  İçe Aktarılıyor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  İçe Aktar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
