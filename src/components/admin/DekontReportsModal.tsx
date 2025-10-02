"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  Download,
  Loader,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface DekontReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeacherReportData {
  teacherName: string;
  totalStudents: number;
  studentsWithDekont: number;
  pendingDekonts: number;
  approvedDekonts: number;
  rejectedDekonts: number;
  missingDekonts: number;
  uploadRate: number;
}

interface MonthlyReport {
  month: number;
  year: number;
  teacherReports: TeacherReportData[];
  totalStats: {
    totalStudents: number;
    totalWithDekont: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalMissing: number;
    overallUploadRate: number;
  };
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

// Helper function to calculate previous month defaults
const calculatePreviousMonthDefaults = () => {
  const currentDate = new Date();
  const previousMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1
  );
  const defaultMonth = (previousMonth.getMonth() + 1).toString();
  const defaultYear = previousMonth.getFullYear().toString();
  return { defaultMonth, defaultYear };
};

export default function DekontReportsModal({
  isOpen,
  onClose,
}: DekontReportsModalProps) {
  const { defaultMonth, defaultYear } = calculatePreviousMonthDefaults();

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string>("");

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  const fetchReport = async () => {
    if (!selectedMonth || !selectedYear) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/dekontlar/reports?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error("Rapor alınamadı");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!reportData) return;

    try {
      const response = await fetch(
        `/api/admin/dekontlar/reports/download?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error("Rapor indirilemedi");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dekont-raporu-${
        MONTHS[parseInt(selectedMonth) - 1]
      }-${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İndirme hatası");
    }
  };

  useEffect(() => {
    if (isOpen && selectedMonth && selectedYear) {
      fetchReport();
    }
  }, [isOpen, selectedMonth, selectedYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Dekont Yükleme Raporu
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Filter Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Ay Seçin</option>
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Yıl Seçin</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              onClick={fetchReport}
              disabled={loading || !selectedMonth || !selectedYear}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Rapor Oluştur
            </button>

            {reportData && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Excel İndir
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Rapor hazırlanıyor...</p>
              </div>
            </div>
          )}

          {/* Report Content */}
          {reportData && !loading && (
            <div className="space-y-6">
              {/* Overall Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        Toplam Öğrenci
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {reportData.totalStats.totalStudents}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        Dekont Yüklenen
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {reportData.totalStats.totalWithDekont}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">
                        Beklemede
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {reportData.totalStats.totalPending}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">
                        Yükleme Oranı
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {reportData.totalStats.overallUploadRate.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Teacher Reports Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">
                    Öğretmen Bazlı Rapor - {MONTHS[parseInt(selectedMonth) - 1]}{" "}
                    {selectedYear}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Öğretmen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Toplam Öğrenci
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dekont Yüklenen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Onaylanan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beklemede
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reddedilen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eksik
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yükleme Oranı
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.teacherReports.map((teacher, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.teacherName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {teacher.totalStudents}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {teacher.studentsWithDekont}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600">
                            {teacher.approvedDekonts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                            {teacher.pendingDekonts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {teacher.rejectedDekonts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {teacher.missingDekonts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-16">
                                <div className="text-sm font-medium text-gray-900">
                                  {teacher.uploadRate.toFixed(1)}%
                                </div>
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      teacher.uploadRate >= 80
                                        ? "bg-green-600"
                                        : teacher.uploadRate >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        teacher.uploadRate,
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Özet</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Toplam Öğrenci: </span>
                    <span className="font-medium">
                      {reportData.totalStats.totalStudents}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Dekont Yüklenen: </span>
                    <span className="font-medium text-green-600">
                      {reportData.totalStats.totalWithDekont}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Eksik: </span>
                    <span className="font-medium text-red-600">
                      {reportData.totalStats.totalMissing}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Genel Oran: </span>
                    <span className="font-medium text-purple-600">
                      {reportData.totalStats.overallUploadRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!reportData && !loading && selectedMonth && selectedYear && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Rapor bulunamadı
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Seçilen dönem için veri bulunamadı.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
