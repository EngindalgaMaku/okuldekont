"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  X,
  Database,
  Download,
  Loader,
  Calendar,
  FileText,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface BackupFile {
  filename: string;
  size: number;
  sizeFormatted: string;
  created: string;
  createdFormatted: string;
  downloadPath: string;
}

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DatabaseBackupModal({
  isOpen,
  onClose,
}: DatabaseBackupModalProps) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Backup dosyalarını getir
  const fetchBackups = useCallback(async () => {
    if (!isOpen) return;

    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/database/backup");
      const result = await response.json();

      if (response.ok && result.success) {
        setBackups(result.backups || []);
      } else {
        console.error("Failed to fetch backups:", result.message);
        toast.error("Backup dosyaları getirilemedi");
      }
    } catch (error) {
      console.error("Fetch backups error:", error);
      toast.error("Backup dosyaları getirilemedi");
    } finally {
      setRefreshing(false);
    }
  }, [isOpen]);

  // Modal açıldığında backup dosyalarını getir
  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen, fetchBackups]);

  // Yeni backup oluştur
  const createBackup = async () => {
    if (creating) return;

    setCreating(true);
    try {
      const response = await fetch("/api/admin/database/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Veritabanı yedeği başarıyla oluşturuldu!");
        await fetchBackups(); // Listeyi yenile
      } else {
        if (result.error === "DISK_SPACE_ERROR") {
          toast.error("Sunucuda disk alanı yetersiz!");
        } else if (result.error === "MISSING_DB_CONFIG") {
          toast.error("Veritabanı bağlantı bilgileri eksik");
        } else if (result.error === "ACCESS_DENIED") {
          toast.error("Veritabanına erişim reddedildi");
        } else if (result.error === "MYSQLDUMP_NOT_FOUND") {
          toast.error("MySQL araçları yüklü değil");
        } else {
          toast.error(result.message || "Yedek oluşturulamadı");
        }
      }
    } catch (error) {
      console.error("Create backup error:", error);
      toast.error("Yedek oluşturulurken hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  // Backup dosyasını indir
  const downloadBackup = async (backup: BackupFile) => {
    try {
      const response = await fetch(backup.downloadPath);

      if (!response.ok) {
        toast.error("Dosya indirilemedi");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Backup dosyası indirildi");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Dosya indirme hatası");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Veritabanı Yedekleme
              </h2>
              <p className="text-sm text-gray-500">
                MySQL veritabanı yedeği alın ve yönetin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={createBackup}
              disabled={creating}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Yedek Oluşturuluyor...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Yeni Yedek Oluştur
                </>
              )}
            </button>

            <button
              onClick={fetchBackups}
              disabled={refreshing}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {refreshing ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Yenileniyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Listeyi Yenile
                </>
              )}
            </button>
          </div>

          {/* Info Alert */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Önemli Notlar:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Yedekler otomatik olarak 7 gün sonra silinir</li>
                  <li>
                    Yedek alma işlemi veritabanı boyutuna göre zaman alabilir
                  </li>
                  <li>Yedek dosyaları güvenli bir yerde saklayın</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Files List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Mevcut Yedek Dosyaları ({backups.length})
            </h3>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Henüz yedek dosyası yok
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                İlk veritabanı yedeğinizi oluşturmak için yukarıdaki butonu
                kullanın.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {backup.filename}
                        </p>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {backup.createdFormatted}
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          {backup.sizeFormatted}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => downloadBackup(backup)}
                      className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                      title="İndir"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>Son güncelleme: {new Date().toLocaleString("tr-TR")}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
