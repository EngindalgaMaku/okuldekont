"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Building2,
  FileText,
  Download,
  Loader,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ClassInfo {
  id: string;
  name: string;
  alanName: string;
  fullName: string;
}

interface Student {
  id: string;
  name: string;
  surname: string;
  number: string;
  fullName: string;
  className: string;
  company: {
    id: string;
    name: string;
    teacher: {
      name: string;
      surname: string;
    } | null;
  } | null;
  hasDekont: boolean;
  dekontStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  dekontAmount: number | null;
  dekontCreatedAt: string | null;
  dekontApprovedAt: string | null;
  dekontCount: number;
}

interface Summary {
  totalStudents: number;
  studentsWithDekont: number;
  studentsWithoutDekont: number;
  studentsWithCompany: number;
  studentsWithoutCompany: number;
  pendingDekonts: number;
  approvedDekonts: number;
  rejectedDekonts: number;
  totalDekontCount: number;
}

interface ClassReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS = {
  PENDING: "Beklemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

// Helper functions
const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  return `${amount.toLocaleString("tr-TR")} ₺`;
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return (
      date.toLocaleDateString("tr-TR") +
      " " +
      date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch (error) {
    return "-";
  }
};

const getCurrentMonthYear = () => {
  const now = new Date();
  // Previous month logic for dekont expectations
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  return {
    month: (previousMonth.getMonth() + 1).toString(),
    year: previousMonth.getFullYear().toString(),
  };
};

export default function ClassReportsModal({
  isOpen,
  onClose,
}: ClassReportsModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [classData, setClassData] = useState<{
    classInfo: ClassInfo;
    students: Student[];
    summary: Summary;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Available years (current year and previous years)
  const availableYears = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  // Load classes when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClasses();
      // Set current month/year as default
      const current = getCurrentMonthYear();
      setSelectedMonth(current.month);
      setSelectedYear(current.year);
    }
  }, [isOpen]);

  // Load students when class, month, or year changes
  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass, selectedMonth, selectedYear]);

  const loadClasses = async () => {
    try {
      const response = await fetch(
        "/api/admin/reports/class-reports?action=classes"
      );
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: "students",
        classId: selectedClass,
      });

      if (selectedMonth !== "all") {
        params.append("month", selectedMonth);
      }
      if (selectedYear !== "all") {
        params.append("year", selectedYear);
      }

      const response = await fetch(
        `/api/admin/reports/class-reports?${params}`
      );
      if (response.ok) {
        const data = await response.json();
        setClassData(data);
      }
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!classData || !classData.students.length) return;

    setExporting(true);
    try {
      const exportData = classData.students.map((student) => ({
        "Öğrenci No": student.number || "-",
        "Öğrenci Adı": student.fullName,
        Sınıf: student.className,
        İşletme: student.company?.name || "Atanmamış",
        "Koordinatör Öğretmen": student.company?.teacher
          ? `${student.company.teacher.name} ${student.company.teacher.surname}`
          : "-",
        "Dekont Durumu": student.hasDekont ? "Yüklenmiş" : "Yüklenmemiş",
        "Onay Durumu": student.dekontStatus
          ? STATUS_LABELS[student.dekontStatus]
          : "-",
        "Dekont Sayısı": student.dekontCount,
        Tutar: formatCurrency(student.dekontAmount),
        "Yüklenme Tarihi": formatDateTime(student.dekontCreatedAt),
        "Onaylanma Tarihi": formatDateTime(student.dekontApprovedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Öğrenci No
        { wch: 25 }, // Öğrenci Adı
        { wch: 15 }, // Sınıf
        { wch: 30 }, // İşletme
        { wch: 25 }, // Koordinatör Öğretmen
        { wch: 15 }, // Dekont Durumu
        { wch: 15 }, // Onay Durumu
        { wch: 12 }, // Dekont Sayısı
        { wch: 15 }, // Tutar
        { wch: 18 }, // Yüklenme Tarihi
        { wch: 18 }, // Onaylanma Tarihi
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sınıf Raporu");

      const monthText =
        selectedMonth !== "all"
          ? `_${MONTHS[parseInt(selectedMonth) - 1]}`
          : "";
      const yearText = selectedYear !== "all" ? `_${selectedYear}` : "";
      const className = classData.classInfo.name.replace(/\s+/g, "_");

      XLSX.writeFile(
        workbook,
        `sinif_raporu_${className}${monthText}${yearText}.xlsx`
      );
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedClass("");
    setSelectedMonth("all");
    setSelectedYear("all");
    setClassData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Sınıf Bazında Dekont Raporu
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6 space-y-6 h-full overflow-y-auto">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sınıf Seç
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sınıf Seçiniz</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ay
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tüm Aylar</option>
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
                >
                  <option value="all">Tüm Yıllar</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={!classData?.students.length || exporting}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Excel İndir
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Yükleniyor...</span>
              </div>
            )}

            {/* No Class Selected */}
            {!selectedClass && !loading && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Sınıf Seçiniz
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Öğrenci listesini görüntülemek için bir sınıf seçin.
                </p>
              </div>
            )}

            {/* Class Data */}
            {classData && !loading && (
              <>
                {/* Class Info and Summary Statistics */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {classData.classInfo.fullName}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {selectedMonth !== "all" && selectedYear !== "all" && (
                        <span>
                          {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}{" "}
                          Dönemi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {classData.summary.totalStudents}
                      </div>
                      <div className="text-xs text-gray-500">
                        Toplam Öğrenci
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {classData.summary.studentsWithDekont}
                      </div>
                      <div className="text-xs text-gray-500">
                        Dekont Yükleyen
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {classData.summary.studentsWithoutDekont}
                      </div>
                      <div className="text-xs text-gray-500">
                        Dekont Yüklemeyen
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {classData.summary.studentsWithCompany}
                      </div>
                      <div className="text-xs text-gray-500">
                        İşletmesi Olan
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {classData.summary.totalDekontCount}
                      </div>
                      <div className="text-xs text-gray-500">Toplam Dekont</div>
                    </div>
                  </div>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Öğrenci
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşletme / Koordinatör
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dekont Durumu
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tutar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Yüklenme Tarihi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classData.students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {student.fullName}
                                  {student.number && (
                                    <span className="text-gray-500 ml-2">
                                      ({student.number})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {student.className}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.company ? (
                                <div>
                                  <div className="text-sm text-gray-900">
                                    {student.company.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {student.company.teacher && (
                                      <>
                                        👤 {student.company.teacher.name}{" "}
                                        {student.company.teacher.surname}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  İşletme Atanmamış
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    student.hasDekont
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {student.hasDekont
                                    ? "Yüklenmiş"
                                    : "Yüklenmemiş"}
                                </span>
                                {student.dekontStatus && (
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                                      STATUS_COLORS[student.dekontStatus]
                                    }`}
                                  >
                                    {STATUS_LABELS[student.dekontStatus]}
                                  </span>
                                )}
                                {student.dekontCount > 1 && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {student.dekontCount} Dekont
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(student.dekontAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(student.dekontCreatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Empty State */}
                  {classData.students.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Öğrenci Bulunamadı
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Bu sınıfta kayıtlı öğrenci bulunmuyor.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
