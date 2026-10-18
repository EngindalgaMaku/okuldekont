"use client";

import { useState } from "react";
import {
  Database,
  Download,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import DatabaseBackupModal from "@/components/admin/DatabaseBackupModal";

export default function VeritabaniYonetimiPage() {
  const [showBackupModal, setShowBackupModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl">
            <Database className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Veritabanı Yönetimi
            </h1>
            <p className="text-sm text-gray-600">
              MySQL veritabanı yedekleme araçları
            </p>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Veritabanı Yedeği
              </h2>
              <p className="text-sm text-gray-600">
                MySQL veritabanının tam yedeğini alın
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Info */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-2">
                      Yedek Özellikleri
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Tüm tablolar ve veriler</li>
                      <li>• Stored procedures ve triggers</li>
                      <li>• Tam yapısal bilgiler</li>
                      <li>• Otomatik sıkıştırma</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-900 mb-2">
                      Önemli Notlar
                    </h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Yedekler 7 gün saklanır</li>
                      <li>• Büyük veritabanları için zaman alabilir</li>
                      <li>• Sistem performansını etkileyebilir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Veritabanı Yedeği Al
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tüm veritabanının yedeğini alın ve güvenli bir şekilde
                  saklayın
                </p>
                <button
                  onClick={() => setShowBackupModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Yedek Al
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Son Yedek
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Yedek geçmişini görüntülemek için "Yedek Al" butonuna tıklayın
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Backup Modal */}
      <DatabaseBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </div>
  );
}
