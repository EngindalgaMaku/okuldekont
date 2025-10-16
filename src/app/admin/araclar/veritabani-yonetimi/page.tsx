"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Database,
  Download,
  RefreshCw,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader,
  ArrowLeft,
  FileText,
  Calendar,
  HardDrive,
  Server,
} from "lucide-react";
import Link from "next/link";
import DatabaseBackupModal from "@/components/admin/DatabaseBackupModal";

interface BackupFile {
  filename: string;
  size: number;
  sizeFormatted: string;
  created: string;
  createdFormatted: string;
  downloadPath: string;
}

export default function VeritabaniYonetimiPage() {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [creatingTables, setCreatingTables] = useState(false);
  const [recentBackups, setRecentBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Tabloları oluştur
  const handleCreateTables = useCallback(async () => {
    if (creatingTables) return;

    setCreatingTables(true);
    try {
      const response = await fetch("/api/admin/database/create-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Veritabanı tabloları başarıyla oluşturuldu!");
      } else {
        if (result.error === "DISK_SPACE_ERROR") {
          toast.error(
            "Sunucuda disk alanı yetersiz. Lütfen sistem yöneticisi ile iletişime geçin."
          );
        } else if (result.created === false) {
          toast.error(result.message || "Tablolar zaten mevcut");
        } else {
          toast.error(result.message || "Tablolar oluşturulurken hata oluştu");
        }
      }
    } catch (error) {
      console.error("Table creation error:", error);
      toast.error("Tablolar oluşturulurken hata oluştu");
    } finally {
      setCreatingTables(false);
    }
  }, [creatingTables]);

  // Son yedekleri getir
  const fetchRecentBackups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/database/backup");
      const result = await response.json();

      if (response.ok && result.success) {
        setRecentBackups(result.backups.slice(0, 3)); // Son 3 yedeği göster
      }
    } catch (error) {
      console.error("Fetch backups error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sayfa yüklendiğinde son yedekleri getir
  useEffect(() => {
    fetchRecentBackups();
  }, [fetchRecentBackups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/araclar"
              className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="p-2 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl">
              <Database className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Veritabanı Yönetimi
              </h1>
              <p className="text-gray-600 text-sm">
                MySQL veritabanı araçları ve yönetim paneli
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Veritabanı Yedeği
              </h3>
              <p className="text-sm text-gray-600">
                MySQL veritabanının yedeğini alın
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setShowBackupModal(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Database className="w-4 h-4 mr-2" />
              Yedekleme Yöneticisi
            </button>

            {/* Recent Backups Preview */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Yedekler yükleniyor...
                </span>
              </div>
            ) : recentBackups.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Son Yedekler:
                </p>
                {recentBackups.map((backup) => (
                  <div
                    key={backup.filename}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center">
                      <FileText className="w-3 h-3 text-gray-400 mr-2" />
                      <span className="text-gray-700 truncate">
                        {backup.filename.substring(0, 30)}...
                      </span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>
                        {new Date(backup.created).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                Henüz yedek dosyası yok
              </p>
            )}
          </div>
        </div>

        {/* Table Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tablo Yönetimi
              </h3>
              <p className="text-sm text-gray-600">
                Sistem tablolarını oluştur ve yönet
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateTables}
              disabled={creatingTables}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creatingTables ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Tabloları Oluştur
                </>
              )}
            </button>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-800">
                  <p className="font-medium mb-1">
                    Bu işlem şunları oluşturur:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-green-700">
                    <li>monthly_payments tablosu</li>
                    <li>payment_import_logs tablosu</li>
                    <li>Gerekli indexler ve ilişkiler</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sistem Bilgileri
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Veritabanı Tipi:</span>
              <span className="font-medium text-gray-900">MySQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Yedek Formatı:</span>
              <span className="font-medium text-gray-900">SQL Dump</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Otomatik Temizlik:</span>
              <span className="font-medium text-gray-900">7 Gün</span>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Öneriler</h3>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>• Düzenli yedek alın (günlük önerilir)</p>
            <p>• Yedek dosyalarını güvenli yerlerde saklayın</p>
            <p>• Büyük işlemlerden önce yedek alın</p>
            <p>• Disk alanını düzenli kontrol edin</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Hızlı Erişim
            </h3>
          </div>

          <div className="space-y-2">
            <Link
              href="/admin/dekontlar"
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              📊 Dekont Yönetimi
            </Link>
            <Link
              href="/admin/isletmeler"
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              🏢 İşletme Yönetimi
            </Link>
            <Link
              href="/admin/ayarlar"
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              ⚙️ Sistem Ayarları
            </Link>
          </div>
        </div>
      </div>

      {/* Database Backup Modal */}
      <DatabaseBackupModal
        isOpen={showBackupModal}
        onClose={() => {
          setShowBackupModal(false);
          fetchRecentBackups(); // Modal kapandığında yedekleri yenile
        }}
      />
    </div>
  );
}
