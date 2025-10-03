"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  User,
  Building2,
  Check,
  AlertTriangle,
  Download,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DekontReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeacherReport {
  ogretmen_id: string;
  ogretmen_ad: string;
  isletmeler: CompanyReport[];
}

interface StudentInfo {
  id: string;
  ad_soyad: string;
  sinif: string;
  no: string;
  alan: string;
  has_dekont: boolean;
}

interface CompanyReport {
  isletme_id: string;
  isletme_ad: string;
  has_dekont: boolean;
  dekont_sayisi: number;
  toplam_ogrenci: number;
  ogrenciler: StudentInfo[];
}

const MONTHS = [
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
];

// Geçen ayın değerlerini hesapla
const getPreviousMonthDefaults = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  return {
    month: previousMonth.getMonth() + 1,
    year: previousMonth.getFullYear(),
  };
};

export default function DekontReportsModal({
  isOpen,
  onClose,
}: DekontReportsModalProps) {
  const { month: defaultMonth, year: defaultYear } = getPreviousMonthDefaults();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [loading, setLoading] = useState(false);
  const [teacherReports, setTeacherReports] = useState<TeacherReport[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "completion">("name");
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(
    null
  );

  // Yıl seçenekleri (son 3 yıl)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Rapor verilerini fetch et
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/reports/dekont-status?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error("Rapor verileri alınamadı");
      }

      const data = await response.json();
      setTeacherReports(data.teachers || []);
    } catch (error) {
      console.error("Rapor fetch hatası:", error);
      setTeacherReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Modal açıldığında ve ay/yıl değiştiğinde veri çek
  useEffect(() => {
    if (isOpen) {
      fetchReports();
      setExpandedTeacherId(null); // Modal açıldığında tüm accordion'ları kapat
    }
  }, [isOpen, selectedMonth, selectedYear]);

  // Sıralama ve filtreleme
  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...teacherReports];

    // Sadece eksik olanları göster filtresi
    if (showOnlyIncomplete) {
      filtered = filtered.filter((teacher) =>
        teacher.isletmeler.some((company) => !company.has_dekont)
      );
    }

    // Sıralama
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.ogretmen_ad.localeCompare(b.ogretmen_ad, "tr");
      } else {
        // completion
        const aCompletion =
          a.isletmeler.filter((c) => c.has_dekont).length / a.isletmeler.length;
        const bCompletion =
          b.isletmeler.filter((c) => c.has_dekont).length / b.isletmeler.length;
        return bCompletion - aCompletion; // Yüksekten düşüğe
      }
    });

    return filtered;
  }, [teacherReports, sortBy, showOnlyIncomplete]);

  // Genel istatistikler - Öğrenci bazlı
  const statistics = useMemo(() => {
    let totalStudents = 0;
    let studentsWithDekont = 0;
    let totalDekontlar = 0;
    const totalTeachers = teacherReports.length;

    teacherReports.forEach((teacher) => {
      teacher.isletmeler.forEach((company) => {
        if (company.ogrenciler) {
          totalStudents += company.ogrenciler.length;
          const studentsWithDekontInCompany = company.ogrenciler.filter(
            (student) => student.has_dekont
          ).length;
          studentsWithDekont += studentsWithDekontInCompany;
          totalDekontlar += company.dekont_sayisi;
        }
      });
    });

    const completionRate =
      totalStudents > 0 ? (studentsWithDekont / totalStudents) * 100 : 0;

    return {
      totalTeachers,
      totalStudents,
      studentsWithDekont,
      studentsWithoutDekont: totalStudents - studentsWithDekont,
      totalDekontlar,
      completionRate,
    };
  }, [teacherReports]);

  // CSV Export fonksiyonu
  const exportToCSV = () => {
    const headers = [
      "Öğretmen",
      "İşletme",
      "Öğrenci",
      "Sınıf",
      "No",
      "Alan",
      "Dekont Durumu",
    ];
    const rows: string[][] = [];

    filteredAndSortedReports.forEach((teacher) => {
      teacher.isletmeler.forEach((company) => {
        if (company.ogrenciler && company.ogrenciler.length > 0) {
          company.ogrenciler.forEach((student) => {
            rows.push([
              teacher.ogretmen_ad,
              company.isletme_ad,
              student.ad_soyad,
              student.sinif || "",
              student.no || "",
              student.alan,
              student.has_dekont ? "Gönderildi" : "Gönderilmedi",
            ]);
          });
        } else {
          rows.push([
            teacher.ogretmen_ad,
            company.isletme_ad,
            "Öğrenci yok",
            "-",
            "-",
            "-",
            company.has_dekont ? "Gönderildi" : "Gönderilmedi",
          ]);
        }
      });
    });

    const csvContent = [headers, ...rows]
      .map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `dekont_raporu_detay_${selectedYear}_${selectedMonth
        .toString()
        .padStart(2, "0")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Accordion toggle handler
  const toggleTeacher = (teacherId: string) => {
    setExpandedTeacherId(expandedTeacherId === teacherId ? null : teacherId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Aylık Dekont Raporu
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Öğretmen bazlı işletme dekont gönderme durumları
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Ay Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ay
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Yıl Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yıl
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Sıralama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sırala
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "name" | "completion")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Öğretmen Adına Göre</option>
                <option value="completion">Tamamlanma Oranına Göre</option>
              </select>
            </div>

            {/* Filtreler */}
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyIncomplete}
                  onChange={(e) => setShowOnlyIncomplete(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Sadece eksik olanlar
                </span>
              </label>
            </div>

            {/* Export Butonu */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                disabled={loading || filteredAndSortedReports.length === 0}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV İndir
              </button>
            </div>
          </div>
        </div>

        {/* İstatistikler */}
        {!loading && teacherReports.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">
                      Dekont Bekleyen Öğrenci
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {statistics.totalStudents}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">
                      Dekont Gönderen Öğrenci
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {statistics.studentsWithDekont}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">
                      Toplam Gönderilen Dekont
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {statistics.totalDekontlar}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">
                      Tamamlanma Oranı
                    </p>
                    <p className="text-2xl font-bold text-orange-900">
                      {statistics.completionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Rapor yükleniyor...</span>
            </div>
          ) : filteredAndSortedReports.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Rapor bulunamadı
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Seçili dönem için veri bulunamadı.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedReports.map((teacher) => {
                const completedCompanies = teacher.isletmeler.filter(
                  (c) => c.has_dekont
                ).length;
                const totalCompanies = teacher.isletmeler.length;
                const completionRate =
                  totalCompanies > 0
                    ? (completedCompanies / totalCompanies) * 100
                    : 0;
                const isExpanded = expandedTeacherId === teacher.ogretmen_id;

                return (
                  <div
                    key={teacher.ogretmen_id}
                    className="border-b border-gray-200"
                  >
                    {/* Öğretmen Başlığı - Tıklanabilir Accordion */}
                    <button
                      onClick={() => toggleTeacher(teacher.ogretmen_id)}
                      className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4 text-left">
                          <h4 className="text-lg font-medium text-gray-900">
                            {teacher.ogretmen_ad}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {totalCompanies} işletme sorumlusu
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              completionRate === 100
                                ? "bg-green-100 text-green-800"
                                : completionRate >= 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {completionRate.toFixed(1)}% tamamlandı
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {completedCompanies}/{totalCompanies} işletme
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* İşletme Listesi - Genişletilebilir İçerik */}
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        <div className="ml-14 space-y-4">
                          {teacher.isletmeler.map((company) => (
                            <div
                              key={company.isletme_id}
                              className={`rounded-lg border p-4 ${
                                company.has_dekont
                                  ? "bg-green-50 border-green-200"
                                  : "bg-red-50 border-red-200"
                              }`}
                            >
                              {/* İşletme Başlığı */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <Building2
                                    className={`h-5 w-5 mr-3 ${
                                      company.has_dekont
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  />
                                  <div>
                                    <h5 className="font-semibold text-gray-900">
                                      {company.isletme_ad}
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      {company.toplam_ogrenci} öğrenci staj
                                      yapıyor
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {company.has_dekont ? (
                                    <div className="flex items-center text-green-700">
                                      <Check className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">
                                        {company.dekont_sayisi} dekont
                                        gönderildi
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-red-700">
                                      <AlertTriangle className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">
                                        Dekont gönderilmedi
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Öğrenci Listesi */}
                              <div className="space-y-2">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">
                                  Öğrenciler:
                                </h6>
                                {company.ogrenciler &&
                                company.ogrenciler.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {company.ogrenciler.map((ogrenci) => (
                                      <div
                                        key={ogrenci.id}
                                        className={`flex items-center justify-between p-3 rounded border ${
                                          ogrenci.has_dekont
                                            ? "bg-green-100 border-green-300 text-green-800"
                                            : "bg-gray-100 border-gray-300 text-gray-700"
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center">
                                            <span className="font-medium truncate">
                                              {ogrenci.ad_soyad}
                                            </span>
                                            <span className="text-xs ml-2 flex-shrink-0">
                                              {ogrenci.sinif} - {ogrenci.no}
                                            </span>
                                          </div>
                                          <div className="text-xs opacity-75 mt-1">
                                            {ogrenci.alan}
                                          </div>
                                        </div>
                                        <div className="flex items-center ml-3 flex-shrink-0">
                                          {ogrenci.has_dekont ? (
                                            <div className="flex items-center text-green-600">
                                              <Check className="h-4 w-4 mr-1" />
                                              <span className="text-xs font-medium">
                                                Dekont var
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center text-red-600">
                                              <X className="h-4 w-4 mr-1" />
                                              <span className="text-xs font-medium">
                                                Dekont yok
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic p-3 bg-gray-100 rounded">
                                    Bu işletmede staj yapan öğrenci bulunamadı
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear} dönemi raporu
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
