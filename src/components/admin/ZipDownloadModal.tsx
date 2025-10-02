"use client";

import React, { useState } from "react";
import { X, Download, Archive, Loader2 } from "lucide-react";

interface Dekont {
  id: string;
  isletme_ad: string;
  koordinator_ogretmen: string;
  ogrenci_ad: string;
  ogrenci_sinif: string;
  ogrenci_no: string;
  ogrenci_alan?: string;
  miktar: number | null;
  odeme_tarihi: string;
  onay_durumu: "bekliyor" | "onaylandi" | "reddedildi";
  ay: number;
  yil: number;
  dosya_url: string | null;
  aciklama: string | null;
  red_nedeni: string | null;
  yukleyen_kisi: string;
  created_at: string;
}

interface ZipDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  dekontlar: Dekont[];
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

export default function ZipDownloadModal({
  isOpen,
  onClose,
  dekontlar,
}: ZipDownloadModalProps) {
  // Aktif ay bir önceki ay olmalı
  const getPreviousMonth = () => {
    const currentDate = new Date();
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1
    );
    return {
      month: previousMonth.getMonth() + 1,
      year: previousMonth.getFullYear(),
    };
  };

  const { month: defaultMonth, year: defaultYear } = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  // Get available years from dekontlar
  const availableYears = Array.from(new Set(dekontlar.map((d) => d.yil))).sort(
    (a, b) => b - a
  );

  // Filter dekontlar by selected month and year
  const filteredDekontlar = dekontlar.filter(
    (d) => d.ay === selectedMonth && d.yil === selectedYear && d.dosya_url
  );

  // Group by teacher (coordinator)
  const dekontlarByTeacher = filteredDekontlar.reduce((acc, dekont) => {
    const teacher = dekont.koordinator_ogretmen;
    if (!acc[teacher]) {
      acc[teacher] = [];
    }
    acc[teacher].push(dekont);
    return acc;
  }, {} as Record<string, Dekont[]>);

  const teacherCount = Object.keys(dekontlarByTeacher).length;
  const totalDekontCount = filteredDekontlar.length;

  const handleDownload = async () => {
    if (totalDekontCount === 0) return;

    setIsDownloading(true);
    try {
      const response = await fetch("/api/admin/dekontlar/zip-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!response.ok) {
        throw new Error("ZIP oluşturulamadı");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dekontlar_${
        MONTHS[selectedMonth - 1]
      }_${selectedYear}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error("ZIP indirme hatası:", error);
      alert("ZIP dosyası oluşturulurken hata oluştu");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Archive className="h-5 w-5 mr-2 text-green-600" />
            Dekont ZIP İndir
          </h2>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Month and Year Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ay Seçin
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yıl Seçin
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {MONTHS[selectedMonth - 1]} {selectedYear} - İstatistikler
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Öğretmen Sayısı:</span>
              <span className="font-medium">{teacherCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam Dekont:</span>
              <span className="font-medium">{totalDekontCount}</span>
            </div>
          </div>
        </div>

        {/* Teacher List Preview */}
        {teacherCount > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Öğretmenler ({teacherCount}):
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Object.entries(dekontlarByTeacher).map(([teacher, dekonts]) => (
                <div
                  key={teacher}
                  className="text-xs text-gray-600 flex justify-between"
                >
                  <span className="truncate">{teacher}</span>
                  <span className="ml-2 font-medium">
                    {dekonts.length} dekont
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading || totalDekontCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>ZIP İndir ({totalDekontCount} dosya)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
