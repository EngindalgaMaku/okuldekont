"use client";

import { useState, useCallback } from "react";
import {
  Download,
  Archive,
  FolderOpen,
  Loader,
  AlertTriangle,
  CheckCircle,
  Calendar,
  HardDrive,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface BackupInfo {
  totalFiles: number;
  totalSize: number;
  lastModified: string;
  folderPath: string;
}

interface BackupResult {
  success: boolean;
  message: string;
  zipPath?: string;
  fileName?: string;
  fileSize?: number;
  totalFiles?: number;
}

export default function DekontDosyaYedekPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [lastBackupResult, setLastBackupResult] = useState<BackupResult | null>(
    null
  );

  // Get backup info
  const getBackupInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/files/backup/info");
      if (response.ok) {
        const info = await response.json();
        setBackupInfo(info);
      } else {
        const error = await response.json();
        toast.error(error.message || "Klasör bilgisi alınamadı");
      }
    } catch (error) {
      console.error("Backup info error:", error);
      toast.error("Klasör bilgisi alınırken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create backup
  const createBackup = useCallback(async () => {
    if (isCreatingBackup) return;

    setIsCreatingBackup(true);
    try {
      const response = await fetch("/api/admin/files/backup/create", {
        method: "POST",
      });

      const result: BackupResult = await response.json();

      if (response.ok && result.success) {
        setLastBackupResult(result);
        toast.success("Yedek başarıyla oluşturuldu!");

        // Start download automatically
        if (result.fileName) {
          const downloadUrl = `/api/admin/files/backup/download/${encodeURIComponent(
            result.fileName
          )}`;
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = result.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        setLastBackupResult(result);
        toast.error(result.message || "Yedek oluşturulamadı");
      }
    } catch (error) {
      console.error("Backup creation error:", error);
      const errorResult: BackupResult = {
        success: false,
        message: "Yedek oluşturulurken hata oluştu",
      };
      setLastBackupResult(errorResult);
      toast.error("Yedek oluşturulurken hata oluştu");
    } finally {
      setIsCreatingBackup(false);
    }
  }, [isCreatingBackup]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("tr-TR");
    } catch {
      return dateString;
    }
  };

  // Get current date for filename preview
  const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
            <Archive className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dekont Dosya Yedek
            </h1>
            <p className="text-gray-600">
              Tüm dekont dosyalarını ZIP olarak yedekleyin ve indirin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={getBackupInfo}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4 mr-2" />
            )}
            Klasör Bilgisi Al
          </button>

          <button
            onClick={createBackup}
            disabled={isCreatingBackup || !backupInfo}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isCreatingBackup ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isCreatingBackup
              ? "Yedek Oluşturuluyor..."
              : "Yedek Oluştur ve İndir"}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          Kullanım Talimatları:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Önce "Klasör Bilgisi Al" butonuna tıklayarak dosya bilgilerini
            görüntüleyin
          </li>
          <li>
            • "Yedek Oluştur ve İndir" butonuna tıklayarak tüm dekont
            dosyalarını ZIP olarak indirin
          </li>
          <li>
            • ZIP dosyası bugünün tarihiyle isimlendirilecek: dekont-yedek-
            {getCurrentDateString()}.zip
          </li>
          <li>
            • Büyük dosya boyutları için işlem uzun sürebilir, lütfen bekleyin
          </li>
        </ul>
      </div>

      {/* Backup Info */}
      {backupInfo && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HardDrive className="h-5 w-5 mr-2 text-gray-600" />
            Klasör Bilgileri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Toplam Dosya
                </span>
                <FolderOpen className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {backupInfo.totalFiles.toLocaleString("tr-TR")}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Toplam Boyut
                </span>
                <HardDrive className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatFileSize(backupInfo.totalSize)}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Son Değişiklik
                </span>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(backupInfo.lastModified)}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Klasör Yolu
                </span>
                <FolderOpen className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-xs text-gray-700 break-all">
                {backupInfo.folderPath}
              </span>
            </div>
          </div>

          {/* Expected Filename Preview */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center text-sm text-purple-800">
              <Archive className="h-4 w-4 mr-2" />
              <span>Oluşturulacak dosya adı: </span>
              <code className="ml-1 font-mono bg-purple-100 px-1 rounded">
                dekont-yedek-{getCurrentDateString()}.zip
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Backup Result */}
      {lastBackupResult && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Son Yedekleme Sonucu
          </h3>
          <div
            className={`p-4 rounded-lg ${
              lastBackupResult.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-start">
              {lastBackupResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <h4
                  className={`font-medium ${
                    lastBackupResult.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {lastBackupResult.success
                    ? "Yedekleme Başarılı"
                    : "Yedekleme Başarısız"}
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    lastBackupResult.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {lastBackupResult.message}
                </p>

                {lastBackupResult.success && lastBackupResult.fileName && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Dosya Adı:</span>
                        <br />
                        <code className="text-green-700 bg-green-100 px-1 rounded">
                          {lastBackupResult.fileName}
                        </code>
                      </div>
                      {lastBackupResult.fileSize && (
                        <div>
                          <span className="font-medium">Boyut:</span>
                          <br />
                          <span className="text-green-700">
                            {formatFileSize(lastBackupResult.fileSize)}
                          </span>
                        </div>
                      )}
                      {lastBackupResult.totalFiles && (
                        <div>
                          <span className="font-medium">Dosya Sayısı:</span>
                          <br />
                          <span className="text-green-700">
                            {lastBackupResult.totalFiles.toLocaleString(
                              "tr-TR"
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Manual download button */}
                    <div className="pt-2">
                      <a
                        href={`/api/admin/files/backup/download/${encodeURIComponent(
                          lastBackupResult.fileName
                        )}`}
                        download={lastBackupResult.fileName}
                        className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-sm font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Tekrar İndir
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning for large files */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Önemli Notlar</h4>
            <div className="text-sm text-yellow-800 mt-1 space-y-1">
              <p>
                • Büyük dosya boyutları için yedekleme işlemi uzun sürebilir
              </p>
              <p>• İşlem sırasında sayfayı kapatmayın veya yenilemeyin</p>
              <p>
                • ZIP dosyası geçici olarak sunucuda oluşturulur ve otomatik
                olarak silinir
              </p>
              <p>
                • Yedekleme işlemi sırasında sistem performansı etkilenebilir
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
