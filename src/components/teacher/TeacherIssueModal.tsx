"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  X,
  Clock,
  CheckCircle,
  Building,
  User,
  History,
  AlertCircle,
  FileText,
} from "lucide-react";

interface TeacherIssueModalProps {
  teacherId: string;
  isletmeler?: any[];
}

export default function TeacherIssueModal({
  teacherId,
  isletmeler = [],
}: TeacherIssueModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Form states
  const [category, setCategory] = useState("ISLETME_DEGISIKLIGI");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History states
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Collect all students from isletmeler for easy dropdown
  const allStudents = React.useMemo(() => {
    const list: any[] = [];
    isletmeler.forEach((company) => {
      (company.ogrenciler || []).forEach((st: any) => {
        list.push({
          id: st.id,
          name: `${st.ad} ${st.soyad} (${st.no || ""})`,
          companyName: company.ad,
        });
      });
    });
    return list;
  }, [isletmeler]);

  // Load history when modal opens or history tab clicked
  const loadHistory = async () => {
    if (!teacherId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/teachers/issues?teacherId=${teacherId}`);
      if (res.ok) {
        const json = await res.json();
        setHistoryItems(json.data || []);
      }
    } catch (e) {
      console.error("Geçmiş bildirimler alınamadı:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Audio recording handlers
  const startRecording = async () => {
    setAudioError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAudioError("Tarayıcınız ses kaydını desteklemiyor.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(finalBlob);
        setAudioUrl(URL.createObjectURL(finalBlob));
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mikrofon izni hatası:", err);
      setAudioError(
        "Mikrofona erişilemedi. Lütfen tarayıcı ayarlarından mikrofon izni verin."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !audioBlob) {
      setErrorMessage("Lütfen yazılı bir açıklama girin veya ses kaydı yapın.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("teacherId", teacherId);
      formData.append("category", category);
      formData.append("message", message);
      if (selectedCompany) formData.append("companyInfo", selectedCompany);
      if (selectedStudent) formData.append("studentInfo", selectedStudent);

      if (audioBlob) {
        const audioFile = new File([audioBlob], "recording.webm", {
          type: audioBlob.type || "audio/webm",
        });
        formData.append("audio", audioFile);
        formData.append("audioDuration", recordingDuration.toString());
      }

      const res = await fetch("/api/teachers/issues", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bildirim iletilemedi.");
      }

      setSubmitSuccess(true);
      resetRecording();
      setMessage("");
      setSelectedCompany("");
      setSelectedStudent("");
      loadHistory();

      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab("history");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Bildirim gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "ISLETME_DEGISIKLIGI":
        return { label: "İşletme Değişikliği", color: "bg-blue-100 text-blue-800" };
      case "OGRENCI_DURUMU":
        return { label: "Öğrenci Ayrıldı / Bıraktı", color: "bg-orange-100 text-orange-800" };
      case "YENI_ISLETME":
        return { label: "Yeni İşletme / Öğrenci", color: "bg-green-100 text-green-800" };
      case "BILGI_HATASI":
        return { label: "Bilgi Hatası", color: "bg-red-100 text-red-800" };
      default:
        return { label: "Genel / Diğer", color: "bg-gray-100 text-gray-800" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { label: "Çözüldü", color: "bg-green-100 text-green-800" };
      case "IN_PROGRESS":
        return { label: "İnceleniyor", color: "bg-yellow-100 text-yellow-800" };
      default:
        return { label: "Bekliyor", color: "bg-amber-100 text-amber-800" };
    }
  };

  return (
    <>
      {/* 🚀 Mobile-friendly Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 text-white font-semibold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white"
          title="İdareye Hata / Değişiklik Bildir"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-bold tracking-wide">
            Hata / Değişiklik Bildir
          </span>
        </button>
      </div>

      {/* 📱 Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Hata & Değişiklik Bildir</h3>
                  <p className="text-xs text-red-100">
                    İdareye sesli veya yazılı talep iletin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2">
              <button
                onClick={() => setActiveTab("new")}
                className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "new"
                    ? "border-red-600 text-red-700 bg-white rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                Yeni Bildirim
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "history"
                    ? "border-red-600 text-red-700 bg-white rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <History className="h-4 w-4" />
                Geçmiş Bildirimlerim ({historyItems.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {activeTab === "new" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-2 text-sm font-medium animate-fadeIn">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      Talebiniz başarıyla kaydedildi ve idareye iletildi!
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* Kategori */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Bildirim Türü
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-sm font-medium bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="ISLETME_DEGISIKLIGI">
                        🏢 İşletme Değişikliği (Öğrenci Firma Değiştirdi)
                      </option>
                      <option value="OGRENCI_DURUMU">
                        🎓 Öğrenci Ayrıldı / Bıraktı / Devamsız
                      </option>
                      <option value="YENI_ISLETME">
                        ➕ Yeni İşletme / Öğrenci Ekleme
                      </option>
                      <option value="BILGI_HATASI">
                        ⚠️ Yanlış / Hatalı Bilgi Düzeltme
                      </option>
                      <option value="DIGER">📝 Diğer Konu / Talep</option>
                    </select>
                  </div>

                  {/* İlgili İşletme (Opsiyonel) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        İlgili İşletme (Opsiyonel)
                      </label>
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="">Seçiniz (varsa)...</option>
                        {isletmeler.map((comp) => (
                          <option key={comp.id} value={comp.ad}>
                            {comp.ad}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* İlgili Öğrenci (Opsiyonel) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        İlgili Öğrenci (Opsiyonel)
                      </label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="">Seçiniz (varsa)...</option>
                        {allStudents.map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 🎙️ SESLİ MESAJ (VOICE RECORDER) BÖLÜMÜ */}
                  <div className="bg-gradient-to-br from-amber-50 to-red-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Mic className="h-4 w-4 text-red-600" />
                        Sesli Mesaj Bırakın
                      </span>
                      <span className="text-[11px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                        Yazmak yerine konuşun
                      </span>
                    </div>

                    {audioError && (
                      <p className="text-xs text-red-600 mb-2">{audioError}</p>
                    )}

                    {/* Kayıt Butonları */}
                    <div className="flex items-center justify-center gap-3 py-2">
                      {!isRecording && !audioUrl && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold shadow-md active:scale-95 transition-all text-sm"
                        >
                          <Mic className="h-4 w-4" />
                          Ses Kaydını Başlat
                        </button>
                      )}

                      {isRecording && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                            <span className="h-2.5 w-2.5 bg-red-600 rounded-full animate-ping"></span>
                            Kaydediliyor ({formatSeconds(recordingDuration)})
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-full font-semibold text-xs shadow-md active:scale-95 transition-all"
                          >
                            <Square className="h-3.5 w-3.5 fill-white" />
                            Durdur
                          </button>
                        </div>
                      )}

                      {/* Ses kaydedildi - oynatıcı */}
                      {audioUrl && !isRecording && (
                        <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm">
                          <audio
                            ref={audioPlayerRef}
                            src={audioUrl}
                            onEnded={() => setIsPlayingAudio(false)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={togglePlayAudio}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold"
                          >
                            {isPlayingAudio ? (
                              <>
                                <Pause className="h-3.5 w-3.5" /> Duraklat
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 fill-white" /> Dinle
                              </>
                            )}
                          </button>
                          <span className="text-xs font-mono text-gray-600">
                            {formatSeconds(recordingDuration)}
                          </span>
                          <button
                            type="button"
                            onClick={resetRecording}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                            title="Kaydı Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Yazılı Not Alanı */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Açıklama / Mesaj
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Durumu kısaca açıklayın (örn: X öğrencimiz stajı bıraktı veya Y firmasıyla anlaşma sağlandı)..."
                      className="w-full text-sm bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    ></textarea>
                  </div>

                  {/* Gönder Butonu */}
                  <button
                    type="submit"
                    disabled={submitting || isRecording}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "İletiliyor..." : "İdareye Gönder"}
                  </button>
                </form>
              ) : (
                /* Geçmiş Bildirimler */
                <div className="space-y-3">
                  {loadingHistory ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Geçmiş bildirimler yükleniyor...
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Henüz ilettiğiniz bir bildirim bulunmuyor.
                    </div>
                  ) : (
                    historyItems.map((item) => {
                      const catBadge = getCategoryBadge(item.category);
                      const statusBadge = getStatusBadge(item.status);
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catBadge.color}`}
                            >
                              {catBadge.label}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          {(item.companyInfo || item.studentInfo) && (
                            <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                              {item.companyInfo && (
                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                                  🏢 {item.companyInfo}
                                </span>
                              )}
                              {item.studentInfo && (
                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                                  🎓 {item.studentInfo}
                                </span>
                              )}
                            </div>
                          )}

                          {item.message && (
                            <p className="text-gray-800 text-xs sm:text-sm">
                              {item.message}
                            </p>
                          )}

                          {item.audioUrl && (
                            <div className="pt-1">
                              <audio
                                controls
                                src={item.audioUrl}
                                className="w-full h-8"
                              />
                            </div>
                          )}

                          {item.adminNote && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900 mt-2">
                              <strong>İdare Notu:</strong> {item.adminNote}
                            </div>
                          )}

                          <div className="text-[11px] text-gray-400 pt-1 flex items-center justify-between">
                            <span>
                              {new Date(item.createdAt).toLocaleDateString(
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
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
