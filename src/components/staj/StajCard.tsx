"use client";

import { memo, useState, useRef, useEffect } from "react";
import {
  Building2,
  UserCheck,
  Calendar,
  GraduationCap,
  CheckCircle,
  X,
  User,
  Clock,
  MapPin,
  Award,
  MoreVertical,
  Settings,
  Edit,
  Save,
  Ban,
} from "lucide-react";

interface StajCardProps {
  staj: {
    id: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "TERMINATED";
    startDate: string;
    endDate: string | null;
    terminationDate: string | null;
    terminationReason?: string | null;
    terminationNotes?: string | null;
    student?: {
      id: string;
      name: string;
      surname: string;
      number: string;
      className: string;
      alan?: {
        name: string;
      } | null;
    } | null;
    company?: {
      id: string;
      name: string;
      contact: string;
    } | null;
    teacher?: {
      id: string;
      name: string;
      surname: string;
    } | null;
  };
  isExpired: boolean;
  isVisible: boolean;
  onTamamla: (stajId: string) => void;
  onFesih: (staj: any) => void;
  onKoordinatorDegistir: (staj: any) => void;
  onDateUpdate?: (
    stajId: string,
    startDate: string,
    endDate: string
  ) => Promise<void>;
  onTerminationDateEdit?: (staj: any) => void;
}

const StajCard = memo(function StajCard({
  staj,
  isExpired,
  isVisible,
  onTamamla,
  onFesih,
  onKoordinatorDegistir,
  onDateUpdate,
  onTerminationDateEdit,
}: StajCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Date editing state
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(staj.startDate || "");
  const [tempEndDate, setTempEndDate] = useState(staj.endDate || "");
  const [dateUpdateLoading, setDateUpdateLoading] = useState(false);
  const [dateError, setDateError] = useState<string>("");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isVisible) {
    return (
      <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse rounded-2xl shadow-sm" />
    );
  }

  // Status configuration
  const statusConfig = {
    ACTIVE: {
      gradient: isExpired
        ? "from-orange-500 to-red-500"
        : "from-gray-600 to-gray-700",
      bg: isExpired ? "bg-orange-50" : "bg-white",
      border: isExpired ? "border-orange-200" : "border-gray-200",
      badge: isExpired ? "bg-orange-500" : "bg-gray-600",
      text: isExpired ? "Süresi Geçmiş" : "Aktif Staj",
      icon: isExpired ? "⚠️" : "🚀",
    },
    COMPLETED: {
      gradient: "from-blue-500 to-purple-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      badge: "bg-blue-500",
      text: "Tamamlandı",
      icon: "✅",
    },
    TERMINATED: {
      gradient: "from-red-500 to-pink-600",
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-500",
      text: "Feshedildi",
      icon: "❌",
    },
    CANCELLED: {
      gradient: "from-gray-500 to-slate-600",
      bg: "bg-gray-50",
      border: "border-gray-200",
      badge: "bg-gray-500",
      text: "İptal Edildi",
      icon: "⏹️",
    },
  };

  const status = statusConfig[staj.status];
  const studentName = staj.student
    ? `${staj.student.name} ${staj.student.surname}`
    : "Bilinmiyor";
  const studentInitials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${status.bg} ${status.border} border-2`}
    >
      {/* Gradient Header */}
      <div className={`h-2 bg-gradient-to-r ${status.gradient}`}></div>

      <div className="p-6">
        {/* Header with Avatar and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Student Avatar */}
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-r ${status.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
            >
              {studentInitials}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {studentName}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <GraduationCap className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {staj.student?.className} • No: {staj.student?.number}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center space-x-2">
            <div
              className={`px-3 py-1 rounded-full text-white text-xs font-medium ${status.badge} shadow-sm flex items-center space-x-1`}
            >
              <span>{status.icon}</span>
              <span>{status.text}</span>
            </div>

            {/* Actions Dropdown */}
            {(staj.status === "ACTIVE" || staj.status === "TERMINATED") && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 group"
                  title="İşlemler"
                >
                  <MoreVertical className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    {staj.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={() => {
                            onTamamla(staj.id);
                            setDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 hover:text-gray-700 transition-colors text-sm font-medium"
                        >
                          <CheckCircle className="h-4 w-4 text-gray-600" />
                          <span>Stajı Tamamla</span>
                        </button>

                        <button
                          onClick={() => {
                            onKoordinatorDegistir(staj);
                            setDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm font-medium"
                        >
                          <UserCheck className="h-4 w-4 text-blue-600" />
                          <span>Koordinatör Değiştir</span>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={() => {
                            onFesih(staj);
                            setDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium"
                        >
                          <X className="h-4 w-4 text-red-600" />
                          <span>Stajı Fesih Et</span>
                        </button>
                      </>
                    )}

                    {staj.status === "TERMINATED" && onTerminationDateEdit && (
                      <button
                        onClick={() => {
                          onTerminationDateEdit(staj);
                          setDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-orange-50 hover:text-orange-700 transition-colors text-sm font-medium"
                      >
                        <Edit className="h-4 w-4 text-orange-600" />
                        <span>Fesih Tarihini Düzenle</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-4">
          {/* Department/Field */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Alan</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1">
              {staj.student?.alan?.name || "Alan belirtilmemiş"}
            </p>
          </div>

          {/* Company */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">İşletme</span>
            </div>
            <p className="text-gray-900 font-semibold mt-1 flex items-center">
              <MapPin className="h-3 w-3 text-gray-500 mr-1" />
              {staj.company?.name || "İşletme bilgisi yok"}
            </p>
          </div>

          {/* Coordinator */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Koordinatör
              </span>
            </div>
            <p className="text-gray-900 font-semibold mt-1">
              {staj.teacher ? (
                `${staj.teacher.name} ${staj.teacher.surname}`
              ) : (
                <span className="text-orange-600">Atanmamış</span>
              )}
            </p>
          </div>

          {/* Duration */}
          <div className="bg-white/70 rounded-xl p-3 border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Staj Süresi
                </span>
                {/* Visual indicator that dates can be edited */}
                {staj.status !== "CANCELLED" &&
                  onDateUpdate &&
                  !isEditingDates && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-200 font-medium">
                      düzenlenebilir
                    </span>
                  )}
              </div>
              {/* Edit button - only show for ACTIVE internships if onDateUpdate is provided */}
              {staj.status === "ACTIVE" && onDateUpdate && !isEditingDates && (
                <button
                  onClick={() => {
                    setIsEditingDates(true);
                    setTempStartDate(staj.startDate || "");
                    setTempEndDate(staj.endDate || "");
                    setDateError("");
                  }}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-purple-100 hover:bg-purple-200 border border-purple-300 hover:border-purple-400 text-purple-700 hover:text-purple-900 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                  title="Staj tarihlerini düzenle"
                >
                  <Edit className="h-4 w-4" />
                  <span>Düzenle</span>
                </button>
              )}
            </div>

            {isEditingDates ? (
              /* Date editing form */
              <div className="mt-2 space-y-3">
                {dateError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {dateError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Başlangıç
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => {
                        setTempStartDate(e.target.value);
                        setDateError("");
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      disabled={dateUpdateLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Bitiş
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => {
                        setTempEndDate(e.target.value);
                        setDateError("");
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      disabled={dateUpdateLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setIsEditingDates(false);
                      setTempStartDate(staj.startDate || "");
                      setTempEndDate(staj.endDate || "");
                      setDateError("");
                    }}
                    disabled={dateUpdateLoading}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    title="İptal"
                  >
                    <Ban className="h-3 w-3" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!tempStartDate || !tempEndDate) {
                        setDateError("Başlangıç ve bitiş tarihleri gereklidir");
                        return;
                      }

                      if (new Date(tempStartDate) >= new Date(tempEndDate)) {
                        setDateError(
                          "Başlangıç tarihi bitiş tarihinden önce olmalıdır"
                        );
                        return;
                      }

                      setDateUpdateLoading(true);
                      try {
                        await onDateUpdate!(
                          staj.id,
                          tempStartDate,
                          tempEndDate
                        );
                        setIsEditingDates(false);
                        setDateError("");
                      } catch (error) {
                        setDateError(
                          error instanceof Error
                            ? error.message
                            : "Tarih güncellenirken hata oluştu"
                        );
                      } finally {
                        setDateUpdateLoading(false);
                      }
                    }}
                    disabled={
                      dateUpdateLoading || !tempStartDate || !tempEndDate
                    }
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    title="Kaydet"
                  >
                    {dateUpdateLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Date display */
              <p className="text-gray-900 font-semibold mt-1">
                {staj.startDate
                  ? new Date(staj.startDate).toLocaleDateString("tr-TR")
                  : "Başlangıç yok"}
                <span className="text-gray-500 mx-2">→</span>
                {staj.status === "TERMINATED" && staj.terminationDate
                  ? `${new Date(staj.terminationDate).toLocaleDateString(
                      "tr-TR"
                    )} (Fesih)`
                  : staj.endDate
                  ? new Date(staj.endDate).toLocaleDateString("tr-TR")
                  : "Devam ediyor"}
              </p>
            )}
            
            {/* Fesih Detayları */}
            {staj.status === "TERMINATED" && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-900">
                    Fesih Bilgileri
                  </span>
                </div>
                {staj.terminationDate && (
                  <div className="text-xs text-red-800 mb-1">
                    <span className="font-medium">Fesih Tarihi:</span>{" "}
                    {new Date(staj.terminationDate).toLocaleDateString("tr-TR")}
                  </div>
                )}
                {staj.terminationReason && (
                  <div className="text-xs text-red-800 mb-1">
                    <span className="font-medium">Neden:</span>{" "}
                    {staj.terminationReason}
                  </div>
                )}
                {staj.terminationNotes && (
                  <div className="text-xs text-red-700">
                    <span className="font-medium">Not:</span>{" "}
                    {staj.terminationNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default StajCard;
