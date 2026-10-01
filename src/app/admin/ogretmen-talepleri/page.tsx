"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Phone,
  User,
  Building,
  Volume2,
  MessageSquare,
  ChevronDown,
  Check,
  Calendar,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface TeacherIssue {
  id: string;
  teacherId: string;
  category: string;
  title: string | null;
  message: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  studentInfo: string | null;
  companyInfo: string | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";
  adminNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  teacher: {
    id: string;
    name: string;
    surname: string;
    phone: string | null;
    email: string | null;
    alan?: {
      name: string;
    } | null;
  };
}

export default function OgretmenTalepleriPage() {
  const [reports, setReports] = useState<TeacherIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [counts, setCounts] = useState({ pending: 0, total: 0 });

  // Note modal state
  const [selectedReport, setSelectedReport] = useState<TeacherIssue | null>(
    null
  );
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`/api/admin/teacher-issues?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReports(json.data || []);
        if (json.counts) {
          setCounts(json.counts);
        }
      }
    } catch (e) {
      console.error("Talepler alınamadı:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const updateStatus = async (
    id: string,
    newStatus: string,
    adminNote?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/teacher-issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(adminNote !== undefined ? { adminNote } : {}),
        }),
      });

      if (res.ok) {
        fetchReports();
        if (selectedReport && selectedReport.id === id) {
          setSelectedReport(null);
        }
      }
    } catch (e) {
      console.error("Durum güncellenemedi:", e);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Bu bildirimi tamamen silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/teacher-issues/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReports();
      } else {
        alert("Bildirim silinemedi.");
      }
    } catch (e) {
      console.error("Silme hatası:", e);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedReport) return;
    setSavingNote(true);
    try {
      await updateStatus(selectedReport.id, selectedReport.status, noteText);
      setSelectedReport(null);
    } finally {
      setSavingNote(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "ISLETME_DEGISIKLIGI":
        return {
          label: "İşletme Değişikliği",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "OGRENCI_DURUMU":
        return {
          label: "Öğrenci Ayrıldı / Bıraktı",
          color: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "YENI_ISLETME":
        return {
          label: "Yeni İşletme / Öğrenci",
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      case "BILGI_HATASI":
        return {
          label: "Bilgi Hatası",
          color: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return {
          label: "Genel / Diğer",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return {
          label: "Çözüldü",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "IN_PROGRESS":
        return {
          label: "İnceleniyor",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      default:
        return {
          label: "Bekliyor",
          color: "bg-amber-100 text-amber-800 border-amber-200",
        };
    }
  };

  const resolveAudioSrc = (audioUrl?: string | null, audioBase64?: string | null) => {
    if (audioUrl) {
      if (audioUrl.startsWith("/uploads/voice-notes/")) {
        const filename = audioUrl.split("/").pop();
        return `/api/voice-notes/${filename}`;
      }
      return audioUrl;
    }
    if (audioBase64) {
      return audioBase64;
    }
    return "";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Öğretmen Bildirimleri & Değişiklik Talepleri
              </h1>
              <p className="text-sm text-gray-500">
                Koordinatör öğretmenlerin ilettiği işletme, öğrenci ve staj hata
                bildirimleri
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-xl text-center shadow-sm">
            <span className="block text-2xl font-extrabold">
              {counts.pending}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Bekleyen Talep
            </span>
          </div>
          <button
            onClick={fetchReports}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-colors"
            title="Yenile"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
          {[
            { id: "PENDING", label: "Bekleyenler" },
            { id: "IN_PROGRESS", label: "İncelenenler" },
            { id: "RESOLVED", label: "Çözülenler" },
            { id: "all", label: "Tüm Talepler" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {tab.id === "PENDING" && counts.pending > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-white text-red-600 rounded-full font-bold">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Öğretmen adı, işletme, öğrenci veya mesajda ara..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ara
            </button>
          </form>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-64 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            <option value="ISLETME_DEGISIKLIGI">İşletme Değişikliği</option>
            <option value="OGRENCI_DURUMU">Öğrenci Ayrıldı / Bıraktı</option>
            <option value="YENI_ISLETME">Yeni İşletme / Öğrenci</option>
            <option value="BILGI_HATASI">Bilgi Hatası</option>
            <option value="DIGER">Diğer</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              Bildirimler yükleniyor...
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">
              Bu filtrede bildirim bulunamadı
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Öğretmenler tarafından iletilen yeni bir talep yok.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const catBadge = getCategoryBadge(report.category);
            const statusBadge = getStatusBadge(report.status);

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 hover:border-gray-300 transition-all space-y-4"
              >
                {/* Top Row: Teacher Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {report.teacher.name.charAt(0)}
                      {report.teacher.surname.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">
                          {report.teacher.name} {report.teacher.surname}
                        </span>
                        {report.teacher.alan && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {report.teacher.alan.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(report.createdAt).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        {report.teacher.phone && (
                          <a
                            href={`tel:${report.teacher.phone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {report.teacher.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${catBadge.color}`}
                    >
                      {catBadge.label}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadge.color}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Related Company & Student Tags */}
                {(report.companyInfo || report.studentInfo) && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {report.companyInfo && (
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-900 px-3 py-1 rounded-lg border border-blue-200 font-medium">
                        <Building className="h-3.5 w-3.5 text-blue-600" />
                        İşletme: <strong>{report.companyInfo}</strong>
                      </span>
                    )}
                    {report.studentInfo && (
                      <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-900 px-3 py-1 rounded-lg border border-indigo-200 font-medium">
                        <User className="h-3.5 w-3.5 text-indigo-600" />
                        Öğrenci: <strong>{report.studentInfo}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Written Message */}
                {report.message && (
                  <div className="text-sm text-gray-800 bg-gray-50 p-3.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                    {report.message}
                  </div>
                )}

                {/* 🎙️ Voice Note Player */}
                {(report.audioUrl || report.audioBase64) && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-600 text-white rounded-lg shadow-sm">
                        <Volume2 className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-900 block">
                          Öğretmenin Sesli Mesajı
                        </span>
                        {report.audioDuration && (
                          <span className="text-[11px] text-amber-700">
                            Süre: {report.audioDuration} saniye
                          </span>
                        )}
                      </div>
                    </div>
                    <audio
                      controls
                      preload="metadata"
                      src={resolveAudioSrc(report.audioUrl, report.audioBase64)}
                      className="w-full sm:w-80 h-9"
                      onError={(e) => {
                        if (report.audioBase64 && e.currentTarget.src !== report.audioBase64) {
                          e.currentTarget.src = report.audioBase64;
                          e.currentTarget.load();
                        }
                      }}
                    />
                  </div>
                )}

                {/* Admin Note if exists */}
                {report.adminNote && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                    <strong className="text-emerald-900">İdare Yanıtı/Notu:</strong>{" "}
                    {report.adminNote}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {report.resolvedAt && (
                      <span>
                        Çözüldü:{" "}
                        {new Date(report.resolvedAt).toLocaleDateString(
                          "tr-TR"
                        )}{" "}
                        ({report.resolvedBy || "İdare"})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setNoteText(report.adminNote || "");
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {report.adminNote ? "Notu Düzenle" : "Yanıt / Not Ekle"}
                    </button>

                    {report.status !== "IN_PROGRESS" && (
                      <button
                        onClick={() => updateStatus(report.id, "IN_PROGRESS")}
                        className="px-3 py-1.5 text-xs font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg transition-colors"
                      >
                        İnceleniyor Yap
                      </button>
                    )}

                    {report.status !== "RESOLVED" ? (
                      <button
                        onClick={() => updateStatus(report.id, "RESOLVED")}
                        className="px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Çözüldü Olarak İşaretle
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(report.id, "PENDING")}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                      >
                        Yeniden Aç
                      </button>
                    )}

                    <button
                      onClick={() => deleteReport(report.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1"
                      title="Bildirimi Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Note Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Öğretmene İletilecek Yanıt / Not
            </h3>
            <p className="text-xs text-gray-500">
              Bu notu öğretmen kendi panelindeki "Geçmiş Bildirimlerim" kısmında
              görebilecektir.
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Örn: İşletme ve öğrenci değişikliği sisteme işlenmiştir, teşekkürler."
              className="w-full text-sm bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
            ></textarea>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="px-4 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {savingNote ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
