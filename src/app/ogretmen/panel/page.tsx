"use client";

import toast from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  FileText,
  LogOut,
  Loader,
  User,
  Receipt,
  GraduationCap,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Plus,
  Upload,
  Trash2,
  Calendar,
  Loader2,
  AlertTriangle,
  Search,
  Filter,
  Bell,
  Key,
  ChevronDown,
  Eye,
  Phone,
  Check,
  X,
  MoreVertical,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import DekontUploadForm from "@/components/ui/DekontUpload";
import PinChangeModal from "@/components/ui/PinChangeModal";
import { DekontFormData } from "@/types/dekont";

// Import types and utilities
import {
  getCurrentMonth,
  getCurrentYear,
  getCurrentDay,
  isGecikme,
  isKritikSure,
  aylar,
  formatBelgeTur,
  getDurum,
  getBelgeDurum,
  handleFileDownload,
  handleFileView,
  handleDekontPreview,
} from "@/utils/teacher-panel-utils";

import {
  isGovernmentInstitution,
  isDekontRequired,
  type CompanyType,
} from "@/lib/company-utils";

import {
  Ogrenci,
  Isletme,
  Dekont,
  Belge,
  Notification,
  Teacher,
  SuccessModal,
} from "@/types/teacher-panel";
import TeacherIssueModal from "@/components/teacher/TeacherIssueModal";

type MonthStatus = "approved" | "pending" | "rejected" | "none";

const CHIP_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP_TONES[tone]}`}>
      {children}
    </span>
  );
}

const MONTH_STATUS_STYLE: Record<MonthStatus, { cls: string; label: string }> = {
  approved: { cls: "bg-emerald-500 text-white", label: "Onaylandı" },
  pending: { cls: "bg-amber-400 text-white", label: "Onay bekliyor" },
  rejected: { cls: "bg-red-500 text-white", label: "Reddedildi" },
  none: { cls: "border-2 border-dashed border-slate-300 text-slate-400", label: "Eksik" },
};

function MonthDot({ label, status }: { label: string; status: MonthStatus }) {
  const style = MONTH_STATUS_STYLE[status];
  return (
    <div className="flex w-8 flex-col items-center gap-1" title={`${label}: ${style.label}`}>
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${style.cls}`}>
        {status === "approved" ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : status === "pending" ? (
          <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : status === "rejected" ? (
          <X className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          "–"
        )}
      </span>
    </div>
  );
}

const formatTL = (amount: number) =>
  amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

const TeacherPanel = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [dekontlar, setDekontlar] = useState<Dekont[]>([]);
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([]);
  const [historicalDekontlar, setHistoricalDekontlar] = useState<Dekont[]>([]);
  const [companyTypes, setCompanyTypes] = useState<{
    [companyId: string]: CompanyType;
  }>({});
  // Pasif (stajı biten) işletme/öğrencilere ait olduğu için gizlenen dekont sayısı
  const [hiddenPassiveDekontCount, setHiddenPassiveDekontCount] = useState(0);
  const [showInactiveCompanies, setShowInactiveCompanies] = useState(false);
  const [dekontSearchTerm, setDekontSearchTerm] = useState("");
  const [isletmeFilter, setIsletmeFilter] = useState<string>("all");
  const [onayDurumuFilter, setOnayDurumuFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "isletmeler" | "dekontlar" | "bildirimler"
  >("isletmeler");
  const [isDekontUploadModalOpen, setDekontUploadModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Ogrenci | null>(null);
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBelgeUploadModalOpen, setBelgeUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [filteredBelgeler, setFilteredBelgeler] = useState<Belge[]>([]);
  const [belgeSearchTerm, setBelgeSearchTerm] = useState("");
  const [belgeTurFilter, setBelgeTurFilter] = useState<string>("all");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [successModal, setSuccessModal] = useState<SuccessModal>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [belgeSilModalOpen, setBelgeSilModalOpen] = useState(false);
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null);
  const [schoolName, setSchoolName] = useState("Okul Adı");
  const [ogrenciSecimModalOpen, setOgrenciSecimModalOpen] = useState(false);
  const [isletmeSecimModalOpen, setIsletmeSecimModalOpen] = useState(false);
  // Öğrenciye özel işletme seçimi için state
  const [ogrenciIcinIsletmeSecimOpen, setOgrenciIcinIsletmeSecimOpen] =
    useState(false);
  const [ogrenciIcinIsletmeSecimi, setOgrenciIcinIsletmeSecimi] =
    useState<Ogrenci | null>(null);

  // Bildirim states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const NOTIFICATIONS_PER_PAGE = 5;

  // PIN change modal state
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [teacherPin, setTeacherPin] = useState("");
  const [isManualPinChange, setIsManualPinChange] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(0);

  // Collapsible işletme öğrenci listesi için state
  const [expandedIsletmeler, setExpandedIsletmeler] = useState<{
    [key: string]: boolean;
  }>({});

  // İşletmeler sekmesinde arama (5'ten fazla işletme olduğunda gösterilir)
  const [isletmeSearchTerm, setIsletmeSearchTerm] = useState("");

  const isletmeMatchesSearch = (isletme: Isletme) => {
    const term = normalizeTrText(isletmeSearchTerm);
    if (!term) return true;
    return (
      normalizeTrText(isletme.ad).includes(term) ||
      isletme.ogrenciler.some((o) => normalizeTrText(`${o.ad} ${o.soyad}`).includes(term))
    );
  };

  // Akordeonda üstteki kart kapanınca sayfa kayar; açılan başlığı ekranın üstüne getir
  const scrollIntoViewSoon = (elementId: string) => {
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // Başlıktaki ⋮ menüsü
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Dekont listesinde açık olan işletme (aynı anda tek işletme açık)
  const [expandedDekontCompany, setExpandedDekontCompany] = useState<string | null>(null);

  // İşletme listesinde ayrıntısı açık olan öğrenci
  const [expandedOgrenci, setExpandedOgrenci] = useState<string | null>(null);

  // Collapsible dekont grupları için state
  const [expandedStudents, setExpandedStudents] = useState<{
    [key: string]: boolean;
  }>({});

  // Gecikme uyarı öğrenci listesi collapse state
  const [isGecikmeListExpanded, setIsGecikmeListExpanded] = useState(false);

  // Footer görünürlük state
  const [showFooter, setShowFooter] = useState(true);

  // Ek dekont uyarı modal state
  const [ekDekontModalOpen, setEkDekontModalOpen] = useState(false);
  const [ekDekontData, setEkDekontData] = useState<{
    ogrenci: Ogrenci;
    isletme: Isletme;
    ay: number;
    yil: number;
    mevcutDekontSayisi: number;
  } | null>(null);
  const [dekontSonGun, setDekontSonGun] = useState(7);

  // Ek dekont form data - 409 durumunda orijinal form verisini saklamak için
  const [pendingDekontData, setPendingDekontData] =
    useState<DekontFormData | null>(null);

  // Türkçe karakter ve boşluk duyarsız metin karşılaştırma yardımcısı
  const normalizeTrText = (text?: string): string => {
    if (!text) return "";
    return text
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Önceki ay için dekont eksik olan öğrencileri tespit et (kamu kurumları hariç)
  const getEksikDekontOgrenciler = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth(); // 0-11 arası (Ekim = 9)
    const previousMonthIndex =
      currentMonthIndex === 0 ? 11 : currentMonthIndex - 1; // Önceki ay index'i
    const previousMonth = previousMonthIndex + 1; // 1-12 arası (Eylül = 9)
    const previousYear =
      currentMonthIndex === 0
        ? currentDate.getFullYear() - 1
        : currentDate.getFullYear();

    // 🐛 DEBUG: Gecikme uyarı sistemi debug bilgileri

    const tumOgrenciler: Array<{
      id: string;
      ad: string;
      soyad: string;
      sinif: string;
      no: string;
      isletme_ad: string;
      baslangic_tarihi: string;
      staj_id?: string;
      isletme_id?: string;
      aktif?: boolean;
      fesih_tarihi?: string | null;
    }> = [];

    isletmeler.forEach((isletme) => {
      isletme.ogrenciler.forEach((ogrenci) => {
        tumOgrenciler.push({
          ...ogrenci,
          isletme_ad: isletme.ad,
          isletme_id: isletme.id,
        });
      });
    });

    const filtrelenmisOgrenciler = tumOgrenciler.filter((ogrenci, index) => {
      // 🐛 DEBUG: Her öğrenci için detaylı filtreleme bilgisi

      // Kamu kurumu kontrolü - kamu kurumları için dekont gerekli değil
      const companyType = companyTypes[ogrenci.isletme_id || ""];
      const isGovInstitution =
        companyType && isGovernmentInstitution(companyType);


      if (isGovInstitution) {
        return false; // Kamu kurumlarını filtrele
      }

      // Stajı önceki aydan önce biten (pasif) öğrenciden o ay için dekont beklenmez
      if (ogrenci.aktif === false) {
        if (!ogrenci.fesih_tarihi) return false;
        const fesih = parseDateFlexible(String(ogrenci.fesih_tarihi));
        if (fesih < new Date(previousYear, previousMonth - 1, 1)) return false;
      }

      // Öğrencinin başlangıç tarihini kontrol et
      const startDate = new Date(ogrenci.baslangic_tarihi);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;


      // Eğer öğrenci önceki aydan sonra işe başlamışsa, dekont aranmaz
      // ÖNEMLİ: Önceki ay içinde başlayan öğrenci için o ay dekontu gereklidir!
      if (
        previousYear < startYear ||
        (previousYear === startYear && previousMonth < startMonth)
      ) {
        return false;
      }

      // Önceki ay için dekont kontrolü
      const ogrenciDekontlari = dekontlar.filter((d) => {
        const isStudentMatch =
          (d.ogrenci_id && ogrenci.id && String(d.ogrenci_id) === String(ogrenci.id)) ||
          (d.staj_id && ogrenci.staj_id && String(d.staj_id) === String(ogrenci.staj_id)) ||
          (normalizeTrText(d.ogrenci_ad) === normalizeTrText(`${ogrenci.ad} ${ogrenci.soyad}`));

        return (
          isStudentMatch &&
          Number(d.ay) === Number(previousMonth) &&
          Number(d.yil) === Number(previousYear)
        );
      });


      const eksik = ogrenciDekontlari.length === 0;
      if (eksik) {
      } else {
      }

      return eksik;
    });

    // 🐛 DEBUG: Filtreleme sonuçları

    return filtrelenmisOgrenciler;
  };

  // Esnek tarih parse helper'i (YYYY-MM-DD veya DD.MM.YYYY)
  const parseDateFlexible = (value: string): Date => {
    if (!value) return new Date("1970-01-01T00:00:00Z");
    // ISO benzeri format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      // Safari uyumu için zaman ekleyelim
      return new Date(`${value}T00:00:00`);
    }
    // TR formatı (DD.MM.YYYY)
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split(".");
      const d = Number(dd),
        m = Number(mm),
        y = Number(yyyy);
      return new Date(y, m - 1, d);
    }
    const ts = Date.parse(value);
    return isNaN(ts) ? new Date("1970-01-01T00:00:00Z") : new Date(ts);
  };
  // Öğrencinin başlangıç tarihinden sonraki aya kadar olan ayları getir
  const getMonthsFromStartToPrevious = (
    startDate: string
  ): { month: number; year: number; label: string }[] => {
    const start = parseDateFlexible(startDate);
    const currentDate = new Date();
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );

    const months: { month: number; year: number; label: string }[] = [];
    // Staj başlangıç ayının bir sonraki ayından başla
    const current = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    while (current <= previousMonth) {
      months.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        label: aylar[current.getMonth()].substring(0, 3), // İlk 3 harf (Oca, Şub, vb.)
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months.slice(-6); // Son 6 ayı göster (alan tasarrufu için)
  };

  // Belirli ay için dekont durumunu kontrol et
  const getDekontStatus = (
    ogrenciAd: string,
    month: number,
    year: number,
    ogrenciId?: string
  ): "approved" | "pending" | "rejected" | "none" => {
    const targetNorm = normalizeTrText(ogrenciAd);
    const monthDekonts = dekontlar.filter((d) => {
      const isStudentMatch =
        (ogrenciId && d.ogrenci_id && String(d.ogrenci_id) === String(ogrenciId)) ||
        (d.ogrenci_ad && normalizeTrText(d.ogrenci_ad) === targetNorm);
      return (
        isStudentMatch &&
        Number(d.ay) === Number(month) &&
        Number(d.yil) === Number(year)
      );
    });

    // Aynı ay için birden fazla dekont olabilir (ek dekont, reddedilip yeniden yükleme)
    if (monthDekonts.length === 0) return "none";
    if (monthDekonts.some((d) => d.onay_durumu === "onaylandi")) return "approved";
    if (monthDekonts.some((d) => d.onay_durumu === "bekliyor")) return "pending";
    return "rejected";
  };

  // Öğrenci için bekleyen dekont sayısını getir
  const getPendingDekontCount = (ogrenciAd: string, ogrenciId?: string): number => {
    const targetNorm = normalizeTrText(ogrenciAd);
    return dekontlar.filter((d) => {
      const isStudentMatch =
        (ogrenciId && d.ogrenci_id && String(d.ogrenci_id) === String(ogrenciId)) ||
        (d.ogrenci_ad && normalizeTrText(d.ogrenci_ad) === targetNorm);
      return isStudentMatch && d.onay_durumu === "bekliyor";
    }).length;
  };

  // İşletme için toplam dekont istatistikleri
  const getCompanyDekontStats = (isletmeAd: string) => {
    const companyDekonts = dekontlar.filter((d) => d.isletme_ad === isletmeAd);
    const pending = companyDekonts.filter(
      (d) => d.onay_durumu === "bekliyor"
    ).length;
    const rejected = companyDekonts.filter(
      (d) => d.onay_durumu === "reddedildi"
    ).length;
    const approved = companyDekonts.filter(
      (d) => d.onay_durumu === "onaylandi"
    ).length;

    return { pending, rejected, approved, total: companyDekonts.length };
  };

  const eksikDekontOgrenciler = getEksikDekontOgrenciler();

  // Reddedilen ama aynı ay için yerine yenisi (bekleyen/onaylı) yüklenmemiş dekontlar
  const getUnresolvedRejectedCount = (ogrenciAd: string, ogrenciId?: string): number => {
    const targetNorm = normalizeTrText(ogrenciAd);
    const studentDekonts = dekontlar.filter(
      (d) =>
        (ogrenciId && d.ogrenci_id && String(d.ogrenci_id) === String(ogrenciId)) ||
        (d.ogrenci_ad && normalizeTrText(d.ogrenci_ad) === targetNorm)
    );
    const resolvedMonths = new Set(
      studentDekonts.filter((d) => d.onay_durumu !== "reddedildi").map((d) => `${d.yil}-${d.ay}`)
    );
    const unresolved = new Set(
      studentDekonts
        .filter((d) => d.onay_durumu === "reddedildi" && !resolvedMonths.has(`${d.yil}-${d.ay}`))
        .map((d) => `${d.yil}-${d.ay}`)
    );
    return unresolved.size;
  };

  // Önceki ayın dekont durumu; staj o aydan sonra başladıysa null
  const getPrevMonthStatus = (ogrenci: Ogrenci): MonthStatus | null => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = parseDateFlexible(ogrenci.baslangic_tarihi);
    if (prev < new Date(start.getFullYear(), start.getMonth(), 1)) return null;
    return getDekontStatus(`${ogrenci.ad} ${ogrenci.soyad}`, prev.getMonth() + 1, prev.getFullYear(), ogrenci.id);
  };

  const getCompanyIssueSummary = (isletme: Isletme) => {
    let pending = 0;
    let rejected = 0;
    isletme.ogrenciler.forEach((o) => {
      const fullName = `${o.ad} ${o.soyad}`;
      pending += getPendingDekontCount(fullName, o.id);
      rejected += getUnresolvedRejectedCount(fullName, o.id);
    });
    const missing = eksikDekontOgrenciler.filter((o) => o.isletme_id === isletme.id).length;
    return { missing, pending, rejected };
  };

  // 🐛 DEBUG: Eksik dekont öğrencileri ana durumu

  const initializeData = useCallback(
    async (teacherId: string) => {
      setLoading(true);
      try {
        const [
          teacherResponse,
          settingsResponse,
          internshipsResponse,
          dekontlarResponse,
          belgelerResponse,
          notificationsResponse,
          companyTypesResponse,
        ] = await Promise.all([
          fetch(`/api/admin/teachers/${teacherId}`),
          fetch("/api/admin/system-settings"),
          fetch(
            `/api/admin/teachers/${teacherId}/internships?includeInactive=${showInactiveCompanies}`
          ),
          fetch(`/api/admin/teachers/${teacherId}/dekontlar`),
          fetch(`/api/admin/teachers/${teacherId}/belgeler`),
          fetch(`/api/admin/teachers/${teacherId}/notifications`),
          fetch("/api/admin/companies/types"),
        ]);

        if (!teacherResponse.ok) throw new Error("Öğretmen bulunamadı");
        const ogretmenData = await teacherResponse.json();
        setTeacher(ogretmenData);
        setTeacherPin(ogretmenData.pin || "");

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          const sonGun = settingsData.find(
            (s: any) => s.key === "dekont_son_gun"
          );
          if (sonGun) setDekontSonGun(parseInt(sonGun.value, 10));
        }

        if (internshipsResponse.ok)
          setIsletmeler(await internshipsResponse.json());
        if (dekontlarResponse.ok) {
          const dekontData = await dekontlarResponse.json();
          setDekontlar(dekontData);
          setFilteredDekontlar(dekontData);
        }

        // Company types verilerini al
        if (companyTypesResponse.ok) {
          const companyTypesData = await companyTypesResponse.json();
          setCompanyTypes(companyTypesData);
        } else {
          console.error(
            "🔍 DEBUG: Company types API failed:",
            companyTypesResponse.status
          );
        }

        // Eski koordinatörlük dekontlarını getir
        try {
          const historicalResponse = await fetch(
            `/api/admin/teachers/${teacherId}/historical-dekontlar`
          );
          if (historicalResponse.ok) {
            const historicalData = await historicalResponse.json();
            setHistoricalDekontlar(historicalData);
          }
        } catch (error) {
          console.error(
            "Eski koordinatörlük dekontları getirme hatası:",
            error
          );
        }
        if (belgelerResponse.ok) {
          const belgeData = await belgelerResponse.json();
          setBelgeler(belgeData);
          setFilteredBelgeler(belgeData);
        }
        if (notificationsResponse.ok) {
          const notificationData = await notificationsResponse.json();
          setNotifications(notificationData || []);
          const unreadNotifications =
            notificationData?.filter((n: any) => !n.is_read) || [];
          setUnreadCount(unreadNotifications.length);
        }

        // PIN değiştirme kontrolü - mustChangePin alanını kontrol et
        if (ogretmenData.mustChangePin) {
          setIsManualPinChange(false); // Otomatik açılma
          setPinChangeModalOpen(true);
        }
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        await signOut({ redirect: false });
        router.push("/");
      } finally {
        setLoading(false);
      }
    },
    [router, showInactiveCompanies]
  );

  // Function to refresh internships data when toggle changes
  const refreshInternshipsData = useCallback(async () => {
    if (!teacher?.id) return;

    try {
      const response = await fetch(
        `/api/admin/teachers/${teacher.id}/internships?includeInactive=${showInactiveCompanies}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsletmeler(data);
      }
    } catch (error) {
      console.error("Staj verileri yenileme hatası:", error);
    }
  }, [teacher?.id, showInactiveCompanies]);

  // Refresh data when showInactiveCompanies changes
  useEffect(() => {
    if (teacher?.id) {
      refreshInternshipsData();
    }
  }, [showInactiveCompanies, refreshInternshipsData]);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }
    if (status === "unauthenticated" || !session?.user?.teacherId) {
      router.push("/");
      return;
    }

    initializeData(session.user.teacherId);
    fetchSchoolName();
  }, [status, session, router, initializeData]);

  // Footer'ı 3 saniye sonra gizle
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowFooter(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchOgretmenById = async (ogretmenId: string) => {
    try {
      const response = await fetch(`/api/admin/teachers/${ogretmenId}`);
      if (!response.ok) {
        throw new Error("Öğretmen bulunamadı");
      }

      const ogretmenData = await response.json();

      setTeacher(ogretmenData);
      setTeacherPin(ogretmenData.pin || "");

      // Always fetch data regardless of PIN
      fetchOgretmenData(ogretmenData.id);
      fetchNotifications(ogretmenData.id);

      if (ogretmenData.mustChangePin) {
        setIsManualPinChange(false);
        setPinChangeModalOpen(true);
      }
    } catch (error) {
      console.error("Öğretmen verisi getirme hatası:", error);
      sessionStorage.removeItem("ogretmen_id");
      router.push("/");
    }
  };

  // Bildirimleri getir
  const fetchNotifications = async (teacherId: string) => {
    try {
      const response = await fetch(
        `/api/admin/teachers/${teacherId}/notifications`
      );
      if (!response.ok) {
        throw new Error("Bildirimler getirilemedi");
      }

      const data = await response.json();
      setNotifications(data || []);
      const unreadNotifications = data?.filter((n: any) => !n.is_read) || [];
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error("Bildirimler getirme hatası:", error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    if (!teacher) return;

    try {
      const response = await fetch(
        `/api/admin/teachers/${teacher.id}/notifications`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationId,
            markAsRead: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Bildirim güncellenemedi");
      }

      // State'i güncelle
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Bildirim güncelleme hatası:", error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!teacher) return;

    try {
      const response = await fetch(
        `/api/admin/teachers/${teacher.id}/notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markAllAsRead: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Bildirimler güncellenemedi");
      }

      // State'i güncelle
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) =>
          !n.is_read ? { ...n, is_read: true, read_at: now } : n
        )
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Tüm bildirimler güncelleme hatası:", error);
    }
  };

  const fetchSchoolName = async () => {
    try {
      const response = await fetch("/api/system-settings/school-name");
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setSchoolName(data.value);
        }
      }
    } catch (error) {
      console.error("Okul adı alınırken hata:", error);
    }
  };

  // Sync activeTab with ?tab= in URL and set default
  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = ["isletmeler", "dekontlar", "bildirimler"] as const;
    if (!tab || !validTabs.includes(tab as any)) {
      // Ensure URL reflects default tab without adding to history
      router.replace("/ogretmen/panel?tab=isletmeler", { scroll: false });
      setActiveTab("isletmeler");
      return;
    }
    if (tab !== activeTab) {
      setActiveTab(tab as (typeof validTabs)[number]);
    }
  }, [searchParams, router, activeTab]);

  // Belge filtreleme
  useEffect(() => {
    let filtered = belgeler;

    if (belgeSearchTerm) {
      filtered = filtered.filter(
        (belge) =>
          belge.dosya_adi
            ?.toLowerCase()
            .includes(belgeSearchTerm.toLowerCase()) ||
          belge.belge_turu
            ?.toLowerCase()
            .includes(belgeSearchTerm.toLowerCase()) ||
          belge.isletme_ad
            ?.toLowerCase()
            .includes(belgeSearchTerm.toLowerCase())
      );
    }

    if (belgeTurFilter !== "all") {
      filtered = filtered.filter(
        (belge) => belge.belge_turu === belgeTurFilter
      );
    }

    setFilteredBelgeler(filtered);
  }, [belgeler, belgeSearchTerm, belgeTurFilter]);

  // Dekont filtreleme ve sıralama
  useEffect(() => {
    // "Pasifler" ayarı iki sekmede ortak: kapalıyken yalnızca aktif stajların dekontları,
    // açıkken stajı biten işletmeler ve eski koordinatörlük dekontları da gösterilir
    let filtered: Dekont[];
    if (showInactiveCompanies) {
      filtered = [...dekontlar, ...historicalDekontlar];
      setHiddenPassiveDekontCount(0);
    } else {
      const activeStudentIds = new Set(
        isletmeler.flatMap((i) => i.ogrenciler.filter((o) => o.aktif !== false).map((o) => String(o.id)))
      );
      const activeCompanyNames = new Set(isletmeler.map((i) => normalizeTrText(i.ad)));
      // Bekleyen/reddedilen dekontlar işlem gerektirdiği için pasif olsa da her zaman görünür
      filtered = dekontlar.filter(
        (d) =>
          d.onay_durumu !== "onaylandi" ||
          (d.ogrenci_id
            ? activeStudentIds.has(String(d.ogrenci_id))
            : activeCompanyNames.has(normalizeTrText(d.isletme_ad)))
      );
      setHiddenPassiveDekontCount(dekontlar.length - filtered.length + historicalDekontlar.length);
    }

    if (dekontSearchTerm) {
      filtered = filtered.filter(
        (dekont) =>
          dekont.ogrenci_ad
            ?.toLowerCase()
            .includes(dekontSearchTerm.toLowerCase()) ||
          dekont.isletme_ad
            ?.toLowerCase()
            .includes(dekontSearchTerm.toLowerCase()) ||
          dekont.yukleyen_kisi
            ?.toLowerCase()
            .includes(dekontSearchTerm.toLowerCase())
      );
    }

    if (isletmeFilter !== "all") {
      filtered = filtered.filter(
        (dekont) => dekont.isletme_ad === isletmeFilter
      );
    }

    if (onayDurumuFilter !== "all") {
      filtered = filtered.filter(
        (dekont) => dekont.onay_durumu === onayDurumuFilter
      );
    }

    // Kronolojik sıralama - en yeni ay en üstte
    filtered = filtered.sort((a, b) => {
      // Önce yıla göre sırala (büyükten küçüğe)
      if (a.yil !== b.yil) {
        return b.yil - a.yil;
      }
      // Yıl aynıysa aya göre sırala (büyükten küçüğe)
      if (a.ay !== b.ay) {
        return b.ay - a.ay;
      }
      // Ay ve yıl aynıysa oluşturulma tarihine göre sırala (en yeni en üstte)
      if (a.created_at && b.created_at) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return 0;
    });

    setFilteredDekontlar(filtered);
  }, [
    dekontlar,
    historicalDekontlar,
    showInactiveCompanies,
    isletmeler,
    dekontSearchTerm,
    isletmeFilter,
    onayDurumuFilter,
  ]);

  const fetchOgretmenData = async (teacherId: string) => {
    setLoading(true);
    try {
      // Paralel API çağrıları
      const [internshipsResponse, dekontlarResponse, belgelerResponse] =
        await Promise.allSettled([
          fetch(
            `/api/admin/teachers/${teacherId}/internships?includeInactive=${showInactiveCompanies}`
          ),
          fetch(`/api/admin/teachers/${teacherId}/dekontlar`),
          fetch(`/api/admin/teachers/${teacherId}/belgeler`),
        ]);

      // Internships data işle
      if (
        internshipsResponse.status === "fulfilled" &&
        internshipsResponse.value.ok
      ) {
        const groupedIsletmeler = await internshipsResponse.value.json();
        setIsletmeler(groupedIsletmeler);
      } else {
        console.error("Staj verileri getirilemedi");
      }

      // Dekontlar data işle
      if (
        dekontlarResponse.status === "fulfilled" &&
        dekontlarResponse.value.ok
      ) {
        const dekontData = await dekontlarResponse.value.json();
        setDekontlar(dekontData);
        setFilteredDekontlar(dekontData);
      }

      // Belgeler data işle
      if (
        belgelerResponse.status === "fulfilled" &&
        belgelerResponse.value.ok
      ) {
        const belgeData = await belgelerResponse.value.json();
        setBelgeler(belgeData);
        setFilteredBelgeler(belgeData);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const findStajId = async (
    ogrenciId: string,
    isletmeId: string
  ): Promise<number | null> => {
    try {
      const response = await fetch(
        `/api/admin/internships/find?ogrenci_id=${ogrenciId}&isletme_id=${isletmeId}`
      );
      if (!response.ok) {
        throw new Error("Staj ID bulunamadı");
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Staj ID bulunamadı:", error);
      setErrorModal({
        isOpen: true,
        title: "Staj Kaydı Bulunamadı",
        message:
          "Bu öğrenci ve işletmeye ait staj kaydı bulunamadı. Dekont yüklenemiyor.",
      });
      return null;
    }
  };

  const handlePinChangeSuccess = () => {
    setPinChangeModalOpen(false);
    setSuccessModal({
      isOpen: true,
      title: "PIN Başarıyla Değiştirildi",
      message:
        "PIN kodunuz güvenli bir şekilde güncellenmiştir. Yeni PIN kodunuzu unutmayın!",
    });
    if (teacher) {
      fetchOgretmenData(teacher.id);
      fetchNotifications(teacher.id);
    }

    // 3 saniyelik geri sayım başlat
    setSuccessCountdown(3);
    const countdownInterval = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setSuccessModal({ isOpen: false, title: "", message: "" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // İşletme öğrenci listesi toggle fonksiyonu - accordion behavior
  const toggleIsletmeExpanded = (isletmeId: string) => {
    if (!expandedIsletmeler[isletmeId]) scrollIntoViewSoon(`isletme-${isletmeId}`);
    setExpandedIsletmeler((prev) => {
      const isCurrentlyExpanded = prev[isletmeId];

      // If clicking on an already expanded company, just close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [isletmeId]: false,
        };
      }

      // Otherwise, close all others and open the clicked one
      const newState: { [key: string]: boolean } = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = false;
      });
      newState[isletmeId] = true;

      return newState;
    });
  };

  // Dekont grupları toggle fonksiyonu - accordion behavior
  const toggleStudentExpanded = (studentKey: string) => {
    setExpandedStudents((prev) => {
      const isCurrentlyExpanded = prev[studentKey];

      // If clicking on an already expanded student, just close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [studentKey]: false,
        };
      }

      // Otherwise, close all others and open the clicked one
      const newState: { [key: string]: boolean } = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = false;
      });
      newState[studentKey] = true;

      return newState;
    });
  };

  // Dekontları işletme ve öğrenciye göre gruplandır
  const groupDekontsByStudent = () => {
    const groups: {
      [key: string]: {
        students: {
          [key: string]: { student: any; dekontlar: any[]; count: number };
        };
        totalCount: number;
      };
    } = {};

    // 🐛 DEBUG: Log dekont grouping process

    filteredDekontlar.forEach((dekont, index) => {
      const companyKey = dekont.isletme_ad;
      const studentKey = dekont.ogrenci_ad;

      // 🐛 DEBUG: Log each dekont being processed
      if (index < 5) {
        // Only log first 5 to avoid spam
      }

      if (!groups[companyKey]) {
        groups[companyKey] = {
          students: {},
          totalCount: 0,
        };
      }

      if (!groups[companyKey].students[studentKey]) {
        // İşletme listesinden öğrenci detaylarını bul
        const isletme = isletmeler.find(
          (i) =>
            (dekont.isletme_id && String(i.id) === String(dekont.isletme_id)) ||
            normalizeTrText(i.ad) === normalizeTrText(dekont.isletme_ad)
        );
        const ogrenci = isletme?.ogrenciler.find(
          (o) =>
            (dekont.ogrenci_id && String(o.id) === String(dekont.ogrenci_id)) ||
            normalizeTrText(`${o.ad} ${o.soyad}`) === normalizeTrText(dekont.ogrenci_ad)
        );

        groups[companyKey].students[studentKey] = {
          student: {
            name: dekont.ogrenci_ad,
            company: dekont.isletme_ad,
            sinif: ogrenci?.sinif || "",
            no: ogrenci?.no || "",
          },
          dekontlar: [],
          count: 0,
        };
      }

      groups[companyKey].students[studentKey].dekontlar.push(dekont);
      groups[companyKey].students[studentKey].count++;
      groups[companyKey].totalCount++;
    });

    // 🐛 DEBUG: Log final grouping results
    Object.keys(groups).forEach((companyKey) => {
      Object.keys(groups[companyKey].students).forEach((studentKey) => {
        const studentGroup = groups[companyKey].students[studentKey];
      });
    });

    return groups;
  };

  // Belgeleri işletmeye göre gruplandır
  const groupBelgelerByCompany = () => {
    const groups: { [key: string]: { belgeler: any[]; count: number } } = {};

    filteredBelgeler.forEach((belge) => {
      const companyKey = belge.isletme_ad;

      if (!groups[companyKey]) {
        groups[companyKey] = {
          belgeler: [],
          count: 0,
        };
      }

      groups[companyKey].belgeler.push(belge);
      groups[companyKey].count++;
    });

    return groups;
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const handleDekontSil = async (dekont: Dekont) => {
    if (dekont.onay_durumu === "onaylandi") {
      setErrorModal({
        isOpen: true,
        title: "Silme İşlemi Yapılamaz",
        message: "Onaylanmış dekontlar silinemez.",
      });
      return;
    }

    // Modal'ı aç
    setSelectedDekont(dekont);
    setDeleteConfirmOpen(true);
  };

  const confirmDekontSil = async () => {
    if (!selectedDekont) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/dekontlar/${selectedDekont.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Dekont silinirken hata oluştu");
      }

      // State'i güncelle
      setDekontlar((prevDekontlar) =>
        prevDekontlar.filter((d) => d.id !== selectedDekont.id)
      );
      setFilteredDekontlar((prevFiltered) =>
        prevFiltered.filter((d) => d.id !== selectedDekont.id)
      );

      // Modal'ı kapat
      setDeleteConfirmOpen(false);
      setSelectedDekont(null);

      // Başarılı silme modal'ını göster
      setSuccessModal({
        isOpen: true,
        title: "Başarılı!",
        message: `${selectedDekont.ogrenci_ad} adlı öğrencinin dekontu başarıyla silindi.`,
      });

      // 3 saniyelik geri sayım başlat
      setSuccessCountdown(3);
      const countdownInterval = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setSuccessModal({ isOpen: false, title: "", message: "" });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Silme Hatası",
        message: `Dekont silinirken bir sorun oluştu: ${error.message}`,
      });
      setDeleteConfirmOpen(false);
      setSelectedDekont(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDekontUpload = async (ogrenci: Ogrenci, isletme: Isletme) => {
    router.push(
      `/ogretmen/dekont-yukle?isletmeId=${encodeURIComponent(
        isletme.id
      )}&ogrenciId=${encodeURIComponent(ogrenci.id)}`
    );
  };

  const handleEkDekontOnay = async () => {
    if (!ekDekontData || !pendingDekontData || !teacher) {
      console.error("Ek dekont onayı için gerekli veriler eksik");
      return;
    }

    try {
      setIsSubmitting(true);
      setEkDekontModalOpen(false);

      // Orijinal form data'sını kullanarak tekrar API'ye gönder
      const submitData = new FormData();
      submitData.append("staj_id", pendingDekontData.staj_id || "");

      if (
        pendingDekontData.miktar !== undefined &&
        pendingDekontData.miktar !== null &&
        pendingDekontData.miktar > 0
      ) {
        submitData.append("miktar", pendingDekontData.miktar.toString());
      }

      submitData.append("ay", pendingDekontData.ay.toString());
      submitData.append("yil", pendingDekontData.yil.toString());
      submitData.append("aciklama", pendingDekontData.aciklama || "");
      submitData.append("ogretmen_id", teacher.id);
      submitData.append("force_additional", "true"); // Ek dekont olarak eklemek için flag

      if (pendingDekontData.dosya) {
        submitData.append("dosya", pendingDekontData.dosya);
      }

      const response = await fetch("/api/admin/dekontlar", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ek dekont yüklenemedi");
      }

      const result = await response.json();
      const yeniDekont = result.data || result;

      // Dekont listesini API'den yenile
      if (teacher && teacher.id) {
        try {
          const refreshResponse = await fetch(
            `/api/admin/teachers/${teacher.id}/dekontlar`
          );
          if (refreshResponse.ok) {
            const freshDekontData = await refreshResponse.json();
            setDekontlar(freshDekontData);
            setFilteredDekontlar(freshDekontData);
          }
        } catch (refreshError) {
          console.error("API refresh hatası:", refreshError);
        }
      }

      // Pending data'yı temizle
      setPendingDekontData(null);
      setEkDekontData(null);

      // Başarı modal'ını göster
      setSuccessModal({
        isOpen: true,
        title: "Ek Dekont Başarıyla Yüklendi!",
        message: "Ek dekont başarıyla sisteme eklendi.",
      });

      // 2 saniye sonra dekont listesine geç
      setTimeout(() => {
        setSuccessModal({ isOpen: false, title: "", message: "" });
        setActiveTab("dekontlar");
      }, 2000);
    } catch (error: any) {
      console.error("Ek dekont yükleme hatası:", error);
      setErrorModal({
        isOpen: true,
        title: "Ek Dekont Yükleme Hatası",
        message: `Ek dekont yüklenirken hata oluştu: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDekontSubmit = async (formData: DekontFormData) => {
    if (!teacher || !selectedStudent || !selectedIsletme) {
      setErrorModal({
        isOpen: true,
        title: "Hata",
        message: "Gerekli bilgiler eksik. Lütfen tekrar deneyin.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();

      // FormData'yı hazırla
      submitData.append("staj_id", formData.staj_id || "");
      // Miktar değerini doğru şekilde gönder - boş/0 ise gönderme
      if (
        formData.miktar !== undefined &&
        formData.miktar !== null &&
        formData.miktar > 0
      ) {
        submitData.append("miktar", formData.miktar.toString());
      }
      submitData.append("ay", formData.ay.toString());
      submitData.append("yil", formData.yil.toString());
      submitData.append("aciklama", formData.aciklama || "");
      submitData.append("ogretmen_id", teacher.id);

      if (formData.dosya) {
        submitData.append("dosya", formData.dosya);
      }

      const response = await fetch("/api/admin/dekontlar", {
        method: "POST",
        body: submitData,
      });

      // ✅ Ek dekont uyarısı (409 status code) - Sayfa yenilenmesi engelleniyor!
      if (response.status === 409) {
        const warningData = await response.json();

        // 📝 Orijinal form verisini sakla - ek dekont onayında kullanmak için
        setPendingDekontData(formData);

        setEkDekontData({
          ogrenci: selectedStudent,
          isletme: selectedIsletme,
          ay: parseInt(formData.ay.toString()),
          yil: parseInt(formData.yil.toString()),
          mevcutDekontSayisi: warningData.mevcutDekontSayisi || 1,
        });

        // 🚫 Modal'ı kapat ve ek dekont modal'ını aç - SAYFA YENİLENMEZ!
        setDekontUploadModalOpen(false);
        setEkDekontModalOpen(true);
        return; // İşlemi burada sonlandır - sayfa yenilenmez
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Dekont yüklenemedi");
      }

      const result = await response.json();
      const yeniDekont = result.data || result;

      // 🐛 DEBUG: Log the API response

      // 🐛 DEBUG: Log current dekont state before update

      // 🚨 ISSUE: Instead of manual state update, refresh from API
      // Refresh dekont data from API to get correct sequenceNumber and grouping
      if (teacher && teacher.id) {
        try {
          const refreshResponse = await fetch(
            `/api/admin/teachers/${teacher.id}/dekontlar`
          );
          if (refreshResponse.ok) {
            const freshDekontData = await refreshResponse.json();

            setDekontlar(freshDekontData);
            setFilteredDekontlar(freshDekontData);
          } else {
            // Fallback to manual update if API refresh fails
            const formattedDekont: Dekont = {
              ...yeniDekont,
              isletme_ad: selectedIsletme.ad,
              ogrenci_ad: `${selectedStudent.ad} ${selectedStudent.soyad}`,
              yukleyen_kisi: `${teacher.name} ${teacher.surname} (Öğretmen)`,
            };
            setDekontlar((prev) => [formattedDekont, ...prev]);
            setFilteredDekontlar((prev) => [formattedDekont, ...prev]);
          }
        } catch (refreshError) {
          console.error(
            "🔍 DEBUG: API refresh failed, using manual update:",
            refreshError
          );
          // Fallback to manual update
          const formattedDekont: Dekont = {
            ...yeniDekont,
            isletme_ad: selectedIsletme.ad,
            ogrenci_ad: `${selectedStudent.ad} ${selectedStudent.soyad}`,
            yukleyen_kisi: `${teacher.name} ${teacher.surname} (Öğretmen)`,
          };
          setDekontlar((prev) => [formattedDekont, ...prev]);
          setFilteredDekontlar((prev) => [formattedDekont, ...prev]);
        }
      }
      setDekontUploadModalOpen(false);

      // Başarı modal'ını göster
      setShowSuccessModal(true);

      // 3 saniye sonra dekont listesine yönlendir
      setTimeout(() => {
        setShowSuccessModal(false);
        setActiveTab("dekontlar");
      }, 3000);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Dekont Yükleme Hatası",
        message: `Bir hata oluştu: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBelgeYukle = (isletme: Isletme) => {
    setSelectedIsletme(isletme);
    setBelgeUploadModalOpen(true);
  };

  const handleBelgeSubmit = async (formData: {
    isletmeId: string;
    dosya_adi: string;
    dosya: File;
    belge_turu: string;
  }) => {
    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append("isletme_id", formData.isletmeId);
      submitData.append("belge_turu", formData.belge_turu);
      submitData.append("dosya", formData.dosya);

      if (teacher) {
        submitData.append("ogretmen_id", teacher.id);
      }

      const response = await fetch("/api/admin/belgeler", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Belge yüklenemedi");
      }

      const result = await response.json();


      // API response'unun doğru formatta olduğundan emin ol
      const newBelge: Belge = {
        id: result.id,
        isletme_ad: result.isletme_ad,
        dosya_adi: result.dosya_adi,
        dosya_url: result.dosya_url,
        belge_turu: result.belge_turu,
        yukleme_tarihi: result.yukleme_tarihi,
        yukleyen_kisi: result.yukleyen_kisi,
        status: result.status || "PENDING",
        onaylanma_tarihi: result.onaylanma_tarihi,
        red_nedeni: result.red_nedeni,
      };

      // Yeni belgeyi state'e ekle
      setBelgeler((prev) => [newBelge, ...prev]);
      setFilteredBelgeler((prev) => [newBelge, ...prev]);

      setBelgeUploadModalOpen(false);
      setSelectedFile(null);

      setSuccessModal({
        isOpen: true,
        title: "Başarılı",
        message: "Belge başarıyla yüklendi!",
      });
    } catch (error: any) {
      console.error("Belge yükleme hatası:", error);
      setErrorModal({
        isOpen: true,
        title: "Belge Yükleme Hatası",
        message: `Belge yüklenirken bir hata oluştu: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Belge silme fonksiyonu
  const handleBelgeSil = async (belge: Belge) => {
    // Onaylanmış belgelerin silinmesini engelle
    if (belge.status === "APPROVED") {
      setErrorModal({
        isOpen: true,
        title: "Silme İşlemi Yapılamaz",
        message: "Onaylanmış belgeler silinemez.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/admin/belgeler/${belge.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Belge silinirken hata oluştu");
      }

      // State'i güncelle
      setBelgeler((prev) => prev.filter((b) => b.id !== belge.id));
      setFilteredBelgeler((prev) => prev.filter((b) => b.id !== belge.id));

      setBelgeSilModalOpen(false);

      setSuccessModal({
        isOpen: true,
        title: "Başarılı",
        message: "Belge başarıyla silindi!",
      });
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Silme Hatası",
        message: `Belge silinirken bir sorun oluştu: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Loader className="animate-spin h-12 w-12 text-indigo-600" />
        </div>
        {/* Footer - Loading sırasında sürekli göster */}
        <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                  {schoolName.charAt(0)}
                </div>
                <span className="text-sm">
                  &copy; {new Date().getFullYear()} {schoolName}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }


  // Get unique companies for filter
  const uniqueCompanies = Array.from(
    new Set(dekontlar.map((d) => d.isletme_ad))
  ).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-indigo-600 to-indigo-800 pb-20 sm:pb-32">
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto pt-3 sm:pt-6 px-3 sm:px-6 lg:px-8">
          {/* Uygulama çubuğu: logo + uygulama adı + giriş yapan öğretmen; sağda zil ve menü */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md sm:h-12 sm:w-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo_kucuk.png" alt="K-Panel" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-tight tracking-tight text-white sm:text-2xl">K-Panel</h1>
              <p className="truncate text-xs text-indigo-100 sm:text-sm">
                {teacher ? `${teacher.name} ${teacher.surname}` : "Öğretmen"}
                {schoolName && schoolName !== "Okul Adı" ? ` · ${schoolName}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotificationModalOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25"
              aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : "Bildirimler"}
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-indigo-700">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25"
                aria-label="Menü"
                aria-haspopup="menu"
                aria-expanded={headerMenuOpen}
              >
                <MoreVertical className="h-6 w-6" />
              </button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} aria-hidden="true" />
                  <div
                    role="menu"
                    className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        window.dispatchEvent(new CustomEvent("open-teacher-issue-modal"));
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Hata / değişiklik bildir
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setIsManualPinChange(true);
                        setPinChangeModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                    >
                      <Key className="h-5 w-5 text-slate-400" />
                      PIN değiştir
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 active:bg-red-100"
                    >
                      <LogOut className="h-5 w-5" />
                      Çıkış yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 hidden md:block">
            {/* Desktop Tab Menu */}
            <nav
              className="-mb-px hidden md:flex space-x-0.5 sm:space-x-4"
              aria-label="Tabs"
            >
              {[
                {
                  id: "isletmeler",
                  icon: Building2,
                  label: "İşletmeler",
                  count: isletmeler.length,
                },
                {
                  id: "dekontlar",
                  icon: Receipt,
                  label: "Dekont Listesi",
                  count: dekontlar.length,
                },
                {
                  id: "bildirimler",
                  icon: Bell,
                  label: "Bildirimler",
                  count: notifications.length,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      router.push(`/ogretmen/panel?tab=${tab.id}`, {
                        scroll: false,
                      })
                    }
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden py-1.5 sm:py-3 px-1 sm:px-6 rounded-t-xl text-xs sm:text-sm font-medium text-center hover:bg-white hover:bg-opacity-10 transition-all duration-200
                      ${
                        isActive
                          ? "bg-white text-indigo-700"
                          : "text-indigo-100 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[3rem] sm:min-h-[3.5rem]">
                      <div className="relative">
                        <Icon
                          className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${
                            isActive
                              ? "text-indigo-700"
                              : "text-indigo-300 group-hover:text-white"
                          } mb-0.5 sm:mb-0 sm:mr-2 flex-shrink-0`}
                        />
                        {tab.id === "bildirimler" && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-sm font-medium truncate max-w-full">
                          {tab.label}
                        </span>
                        <span className="text-[9px] sm:text-xs font-semibold leading-none">
                          ({tab.count > 99 ? "99+" : tab.count})
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-700" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative -mt-12 sm:-mt-32 pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Okunmamış Mesaj Bildirimi */}
          {unreadCount > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <Bell className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-900">
                  {unreadCount} okunmamış mesaj
                </p>
                <p className="truncate text-sm text-emerald-700">
                  {notifications.find((n) => !n.is_read)?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
              >
                Oku
              </button>
            </div>
          )}

          {/* Dekont Takip Uyarı Sistemi */}
          {eksikDekontOgrenciler.length > 0 &&
            (() => {
              const gecikme = isGecikme(dekontSonGun);
              const kritik = !gecikme && isKritikSure(dekontSonGun);
              const tone = gecikme
                ? { box: "border-red-200 bg-red-50", icon: "text-red-600", title: "text-red-900", text: "text-red-700", btn: "bg-red-600 hover:bg-red-700" }
                : kritik
                ? { box: "border-amber-200 bg-amber-50", icon: "text-amber-600", title: "text-amber-900", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" }
                : { box: "border-sky-200 bg-sky-50", icon: "text-sky-600", title: "text-sky-900", text: "text-sky-700", btn: "bg-sky-600 hover:bg-sky-700" };
              const Icon = gecikme ? XCircle : kritik ? Clock : Calendar;
              const oncekiAy = aylar[(new Date().getMonth() + 11) % 12];
              return (
                <div className={`mb-3 overflow-hidden rounded-2xl border shadow-sm ${tone.box}`}>
                  <button
                    type="button"
                    onClick={() => setIsGecikmeListExpanded(!isGecikmeListExpanded)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                    aria-expanded={isGecikmeListExpanded}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${tone.icon}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${tone.title}`}>
                        {oncekiAy} dekontu eksik: {eksikDekontOgrenciler.length} öğrenci
                      </p>
                      <p className={`text-sm ${tone.text}`}>
                        {gecikme
                          ? "Yükleme süresi geçti; işletmeler devlet katkı payı alamayabilir."
                          : `Son yükleme günü: her ayın ${dekontSonGun}. günü`}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${tone.icon} ${
                        isGecikmeListExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isGecikmeListExpanded && (
                    <ul className="divide-y divide-black/5 border-t border-black/5 bg-white/60">
                      {eksikDekontOgrenciler.map((ogrenci) => {
                        const isletme = isletmeler.find((i) => i.ad === ogrenci.isletme_ad);
                        const fullOgrenci = isletme?.ogrenciler.find(
                          (o) => o.ad === ogrenci.ad && o.soyad === ogrenci.soyad
                        );
                        return (
                          <li
                            key={`${ogrenci.ad}-${ogrenci.soyad}-${ogrenci.isletme_ad}`}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-900">
                                {ogrenci.ad} {ogrenci.soyad}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {ogrenci.sinif}-{ogrenci.no} · {ogrenci.isletme_ad}
                              </p>
                            </div>
                            {fullOgrenci && isletme && (
                              <button
                                type="button"
                                onClick={() => handleOpenDekontUpload(fullOgrenci, isletme)}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white ${tone.btn}`}
                              >
                                <Upload className="h-4 w-4" />
                                Yükle
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })()}

          <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5">
            {/* Tab content will be rendered here */}
            {activeTab === "isletmeler" && (
              <div className="p-3 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    İşletmelerim
                    <span className="ml-1.5 align-middle text-sm font-medium text-slate-400">{isletmeler.length}</span>
                  </h2>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    Pasifler
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showInactiveCompanies}
                      aria-label="Pasif işletmeleri göster"
                      onClick={() => setShowInactiveCompanies(!showInactiveCompanies)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        showInactiveCompanies ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          showInactiveCompanies ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {showInactiveCompanies && (
                  <p className="mb-3 px-1 text-xs text-slate-500">
                    Feshedilmiş veya tamamlanmış stajlar da listeleniyor.
                  </p>
                )}

                {isletmeler.length > 5 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="İşletme veya öğrenci ara"
                      value={isletmeSearchTerm}
                      onChange={(e) => setIsletmeSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      inputMode="search"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {isletmeler
                    .filter(isletmeMatchesSearch)
                    .map((isletme) => {
                    const companyType = companyTypes[isletme.id];
                    const isGovInstitution = companyType ? isGovernmentInstitution(companyType) : false;
                    const summary = getCompanyIssueSummary(isletme);
                    const hasIssue = summary.missing > 0 || summary.pending > 0 || summary.rejected > 0;
                    const isExpanded = !!expandedIsletmeler[isletme.id];

                    return (
                      <div
                        key={isletme.id}
                        id={`isletme-${isletme.id}`}
                        className={`scroll-mt-14 overflow-hidden rounded-2xl border bg-white shadow-sm ${
                          isletme.is_fully_terminated ? "border-red-200 opacity-80" : "border-indigo-100"
                        }`}
                      >
                        {/* İşletme başlığı */}
                        <button
                          type="button"
                          onClick={() => toggleIsletmeExpanded(isletme.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                            isGovInstitution
                              ? "bg-sky-50 hover:bg-sky-100/70"
                              : "bg-indigo-50/70 hover:bg-indigo-50"
                          }`}
                          aria-expanded={isExpanded}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                              isGovInstitution ? "bg-sky-600" : "bg-indigo-600"
                            }`}
                          >
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[1.0625rem] font-bold leading-snug tracking-tight ${
                                isGovInstitution ? "text-sky-950" : "text-indigo-950"
                              }`}
                            >
                              {isletme.ad}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-slate-500">
                                {isletme.ogrenciler.length} öğrenci
                              </span>
                              {isGovInstitution && <Chip tone="sky">Kamu · dekont gerekmez</Chip>}
                              {isletme.is_fully_terminated && <Chip tone="red">Feshedilmiş</Chip>}
                              {!isGovInstitution && summary.missing > 0 && <Chip tone="red">{summary.missing} eksik</Chip>}
                              {!isGovInstitution && summary.pending > 0 && <Chip tone="amber">{summary.pending} bekliyor</Chip>}
                              {!isGovInstitution && summary.rejected > 0 && <Chip tone="red">{summary.rejected} reddedildi</Chip>}
                              {!isGovInstitution && !hasIssue && !isletme.is_fully_terminated && isletme.ogrenciler.length > 0 && (
                                <Chip tone="green">Güncel</Chip>
                              )}
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div>
                            {/* Yetkili */}
                            <div className="flex items-center gap-3 border-y border-slate-100 bg-white px-4 py-2.5">
                              <User className="h-4 w-4 shrink-0 text-slate-400" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Yetkili</p>
                                <p className="truncate text-sm text-slate-700">
                                  {isletme.yukleyen_kisi || "Belirtilmemiş"}
                                </p>
                              </div>
                              {isletme.telefon && (
                                <a
                                  href={`tel:${isletme.telefon}`}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 active:bg-emerald-200"
                                  title={`${isletme.telefon} numarasını ara`}
                                >
                                  <Phone className="h-4 w-4" />
                                  Ara
                                </a>
                              )}
                            </div>

                            {showInactiveCompanies && (isletme.latest_termination_date || isletme.termination_reason) && (
                              <p className="border-b border-slate-100 px-4 py-2 text-xs text-red-600">
                                {isletme.latest_termination_date &&
                                  `Son fesih: ${new Date(isletme.latest_termination_date).toLocaleDateString("tr-TR")}`}
                                {isletme.latest_termination_date && isletme.termination_reason && " · "}
                                {isletme.termination_reason && `Neden: ${isletme.termination_reason}`}
                              </p>
                            )}

                            {isletme.ogrenciler.length === 0 ? (
                              <p className="px-4 py-6 text-center text-sm text-slate-500">
                                Bu işletmeye henüz öğrenci atanmamış.
                              </p>
                            ) : (
                              <ul className="divide-y divide-slate-100">
                                {isletme.ogrenciler.map((ogrenci) => {
                                  const ogrenciFullName = `${ogrenci.ad} ${ogrenci.soyad}`;
                                  const rowKey = `${isletme.id}-${ogrenci.id}`;
                                  const isOpen = expandedOgrenci === rowKey;
                                  const prevStatus = isGovInstitution ? null : getPrevMonthStatus(ogrenci);
                                  const statusView =
                                    ogrenci.aktif === false
                                      ? { tone: "slate" as const, text: "Pasif", ring: "ring-slate-200 bg-slate-100 text-slate-500" }
                                      : prevStatus === "approved"
                                      ? { tone: "green" as const, text: "Güncel", ring: "ring-emerald-200 bg-emerald-50 text-emerald-700" }
                                      : prevStatus === "pending"
                                      ? { tone: "amber" as const, text: "Onay bekliyor", ring: "ring-amber-200 bg-amber-50 text-amber-700" }
                                      : prevStatus === "rejected"
                                      ? { tone: "red" as const, text: "Reddedildi", ring: "ring-red-200 bg-red-50 text-red-700" }
                                      : prevStatus === "none"
                                      ? { tone: "red" as const, text: "Eksik", ring: "ring-red-200 bg-red-50 text-red-700" }
                                      : null;
                                  const durumLabel =
                                    ogrenci.durum === "TERMINATED"
                                      ? "Feshedildi"
                                      : ogrenci.durum === "COMPLETED"
                                      ? "Tamamlandı"
                                      : ogrenci.durum === "CANCELLED"
                                      ? "İptal edildi"
                                      : "Pasif";

                                  return (
                                    <li key={ogrenci.id}>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedOgrenci(isOpen ? null : rowKey)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100"
                                        aria-expanded={isOpen}
                                      >
                                        <div
                                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${
                                            statusView ? statusView.ring : "bg-slate-100 text-slate-600 ring-slate-200"
                                          }`}
                                        >
                                          {ogrenciFullName
                                            .split(/\s+/)
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
                                            .join("")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-[0.95rem] font-medium text-slate-800">
                                            {ogrenciFullName}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {ogrenci.sinif} · No {ogrenci.no}
                                          </p>
                                        </div>
                                        {statusView && <Chip tone={statusView.tone}>{statusView.text}</Chip>}
                                        <ChevronDown
                                          className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${
                                            isOpen ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>

                                      {isOpen && (
                                        <div className="space-y-3 bg-slate-50 px-4 pb-4 pt-3">
                                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div>
                                              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Alan</dt>
                                              <dd className="text-slate-700">{ogrenci.alan || "—"}</dd>
                                            </div>
                                            <div>
                                              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Başlangıç</dt>
                                              <dd className="text-slate-700">
                                                {new Date(ogrenci.baslangic_tarihi).toLocaleDateString("tr-TR")}
                                              </dd>
                                            </div>
                                          </dl>

                                          {ogrenci.aktif === false && (
                                            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                              {durumLabel}
                                              {ogrenci.fesih_tarihi &&
                                                ` · ${new Date(ogrenci.fesih_tarihi).toLocaleDateString("tr-TR")}`}
                                              {ogrenci.fesih_nedeni && ` · ${ogrenci.fesih_nedeni}`}
                                            </p>
                                          )}

                                          {!isGovInstitution && (() => {
                                            const months = getMonthsFromStartToPrevious(ogrenci.baslangic_tarihi);
                                            return months.length > 0 ? (
                                              <div>
                                                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                  Son aylar
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                  {months.map((monthData) => (
                                                    <MonthDot
                                                      key={`${monthData.year}-${monthData.month}`}
                                                      label={monthData.label}
                                                      status={getDekontStatus(
                                                        ogrenciFullName,
                                                        monthData.month,
                                                        monthData.year,
                                                        ogrenci.id
                                                      )}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            ) : null;
                                          })()}

                                          {!isGovInstitution && (
                                            <Link
                                              href={`/ogretmen/dekont-yukle?isletmeId=${isletme.id}&ogrenciId=${ogrenci.id}`}
                                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
                                            >
                                              <Upload className="h-4 w-4" />
                                              Dekont Yükle
                                            </Link>
                                          )}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isletmeler.length > 0 && isletmeler.filter(isletmeMatchesSearch).length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    &ldquo;{isletmeSearchTerm}&rdquo; ile eşleşen işletme veya öğrenci yok.
                  </p>
                )}

                {isletmeler.length === 0 && (
                  <div className="py-12 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">Size atanmış işletme bulunmuyor.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "dekontlar" && (
              <div className="p-3 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Dekontlar
                    <span className="ml-1.5 align-middle text-sm font-medium text-slate-400">
                      {filteredDekontlar.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOgrenciSecimModalOpen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
                  >
                    <Plus className="h-4 w-4" />
                    Yeni
                  </button>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Öğrenci veya işletme ara"
                      value={dekontSearchTerm}
                      onChange={(e) => setDekontSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      inputMode="search"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={isletmeFilter}
                      onChange={(e) => setIsletmeFilter(e.target.value)}
                      className="w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      aria-label="İşletme filtresi"
                    >
                      <option value="all">Tüm işletmeler</option>
                      {uniqueCompanies.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                    <select
                      value={onayDurumuFilter}
                      onChange={(e) => setOnayDurumuFilter(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      aria-label="Durum filtresi"
                    >
                      <option value="all">Tüm durumlar</option>
                      <option value="bekliyor">Bekliyor</option>
                      <option value="onaylandi">Onaylandı</option>
                      <option value="reddedildi">Reddedildi</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="min-w-0 text-xs text-slate-500">
                      {showInactiveCompanies
                        ? "Stajı biten işletmeler ve eski koordinatörlük dekontları dahil."
                        : hiddenPassiveDekontCount > 0
                        ? `Pasif işletme veya öğrencilere ait ${hiddenPassiveDekontCount} onaylı dekont gizli.`
                        : "Yalnızca aktif stajlar gösteriliyor."}
                    </p>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
                      Pasifler
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showInactiveCompanies}
                        aria-label="Pasif işletmeleri göster"
                        onClick={() => setShowInactiveCompanies(!showInactiveCompanies)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          showInactiveCompanies ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            showInactiveCompanies ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                {filteredDekontlar.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-900">Dekont bulunamadı</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {dekontSearchTerm || isletmeFilter !== "all" || onayDurumuFilter !== "all"
                        ? "Arama kriterlerinize uygun dekont yok."
                        : "Henüz dekont yüklenmemiş."}
                    </p>
                  </div>
                ) : (
                  (() => {
                    const groupedDekontlar = groupDekontsByStudent();
                    return (
                      <div className="space-y-4">
                        {Object.keys(groupedDekontlar).map((companyKey) => {
                          const companyGroup = groupedDekontlar[companyKey];
                          const studentKeys = Object.keys(companyGroup.students);
                          const companyStats = getCompanyDekontStats(companyKey);
                          const companyRejected = studentKeys.reduce((total, key) => {
                            const group = companyGroup.students[key];
                            return total + getUnresolvedRejectedCount(group.student.name, group.dekontlar[0]?.ogrenci_id);
                          }, 0);
                          // Arama veya işletme filtresi varken sonuçlar kendiliğinden açık gelsin
                          const isCompanyOpen =
                            expandedDekontCompany === companyKey ||
                            dekontSearchTerm.trim() !== "" ||
                            isletmeFilter !== "all";

                          return (
                            <section
                              key={companyKey}
                              id={`dekont-isletme-${encodeURIComponent(companyKey)}`}
                              className="scroll-mt-14 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm"
                            >
                              {/* İşletme başlığı */}
                              <button
                                type="button"
                                onClick={() => {
                                  const opening = expandedDekontCompany !== companyKey;
                                  setExpandedDekontCompany(opening ? companyKey : null);
                                  if (opening) scrollIntoViewSoon(`dekont-isletme-${encodeURIComponent(companyKey)}`);
                                }}
                                className="flex w-full items-center gap-3 bg-indigo-50/70 px-4 py-3.5 text-left transition-colors hover:bg-indigo-50"
                                aria-expanded={isCompanyOpen}
                              >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[1.0625rem] font-bold leading-snug tracking-tight text-indigo-950">
                                    {companyKey}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-500">
                                      {studentKeys.length} öğrenci · {companyGroup.totalCount} dekont
                                    </span>
                                    {companyStats.pending > 0 && <Chip tone="amber">{companyStats.pending} bekliyor</Chip>}
                                    {companyRejected > 0 && <Chip tone="red">{companyRejected} reddedildi</Chip>}
                                  </div>
                                </div>
                                <ChevronDown
                                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                                    isCompanyOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {isCompanyOpen && (
                              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                                {studentKeys.map((studentKey) => {
                                  const studentGroup = companyGroup.students[studentKey];
                                  const isExpanded = !!expandedStudents[studentKey];
                                  const studentId = studentGroup.dekontlar[0]?.ogrenci_id;
                                  const pendingCount = getPendingDekontCount(studentGroup.student.name, studentId);
                                  const rejectedCount = getUnresolvedRejectedCount(studentGroup.student.name, studentId);

                                  return (
                                    <li key={studentKey}>
                                      <button
                                        type="button"
                                        onClick={() => toggleStudentExpanded(studentKey)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100"
                                        aria-expanded={isExpanded}
                                      >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                          {String(studentGroup.student.name)
                                            .split(/\s+/)
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .map((part: string) => part[0]?.toLocaleUpperCase("tr-TR"))
                                            .join("")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-[0.95rem] font-medium text-slate-800">
                                            {studentGroup.student.name}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {[
                                              studentGroup.student.sinif,
                                              studentGroup.student.no && `No ${studentGroup.student.no}`,
                                              `${studentGroup.count} dekont`,
                                            ]
                                              .filter(Boolean)
                                              .join(" · ")}
                                          </p>
                                        </div>
                                        {rejectedCount > 0 ? (
                                          <Chip tone="red">Reddedildi</Chip>
                                        ) : pendingCount > 0 ? (
                                          <Chip tone="amber">Bekliyor</Chip>
                                        ) : null}
                                        <ChevronDown
                                          className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${
                                            isExpanded ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>

                                      {isExpanded && (
                                        <ul className="space-y-2 bg-slate-50 px-3 pb-3 pt-1">
                                          {studentGroup.dekontlar.map((dekont: any, dekontIndex: number) => {
                                            const durum = getDurum(dekont.onay_durumu);
                                            const ekNo =
                                              dekont.sequence_number && dekont.sequence_number > 1
                                                ? dekont.sequence_number - 1
                                                : 0;
                                            const silinebilir =
                                              dekont.onay_durumu !== "onaylandi" && !dekont.koordinatorluk_donemi;
                                            const actionClass =
                                              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors";

                                            return (
                                              <li
                                                key={`dekont-${dekont.id}-${dekont.ay}-${dekont.yil}-${dekontIndex}`}
                                                className={`overflow-hidden rounded-xl border bg-white ${
                                                  dekont.koordinatorluk_donemi ? "border-amber-200" : "border-slate-200"
                                                }`}
                                              >
                                                <div className="px-3.5 pb-3 pt-3">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <p className="font-semibold text-slate-900">
                                                      {aylar[dekont.ay - 1]} {dekont.yil}
                                                      {ekNo > 0 && (
                                                        <span className="ml-1.5 text-xs font-medium text-slate-400">ek {ekNo}</span>
                                                      )}
                                                    </p>
                                                    <span
                                                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${durum.bg} ${durum.color}`}
                                                    >
                                                      {durum.text}
                                                    </span>
                                                  </div>
                                                  <p className="mt-1 text-sm text-slate-600">
                                                    {Number(dekont.miktar) > 0 && (
                                                      <span className="font-semibold text-slate-800">
                                                        {formatTL(Number(dekont.miktar))}
                                                      </span>
                                                    )}
                                                    {Number(dekont.miktar) > 0 && dekont.created_at && (
                                                      <span className="mx-1.5 text-slate-300">·</span>
                                                    )}
                                                    {dekont.created_at && new Date(dekont.created_at).toLocaleDateString("tr-TR")}
                                                  </p>
                                                  {dekont.yukleyen_kisi && (
                                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                                      Yükleyen: {dekont.yukleyen_kisi}
                                                    </p>
                                                  )}
                                                  {dekont.koordinatorluk_donemi && (
                                                    <div className="mt-2">
                                                      <Chip tone="amber">Eski koordinatörlük</Chip>
                                                    </div>
                                                  )}
                                                  {dekont.onay_durumu === "reddedildi" && dekont.red_nedeni && (
                                                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2.5">
                                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                                      <p className="text-xs leading-relaxed text-red-700">{dekont.red_nedeni}</p>
                                                    </div>
                                                  )}
                                                </div>

                                                {(dekont.dosya_url || silinebilir) && (
                                                  <div className="flex divide-x divide-slate-100 border-t border-slate-100">
                                                    {dekont.dosya_url && (
                                                      <>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleDekontPreview(dekont.dosya_url!)}
                                                          className={`${actionClass} text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100`}
                                                        >
                                                          <Eye className="h-4 w-4" />
                                                          Önizle
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleFileDownload(
                                                              dekont.dosya_url!,
                                                              `dekont-${dekont.ogrenci_ad}-${aylar[dekont.ay - 1]}-${dekont.yil}`
                                                            )
                                                          }
                                                          className={`${actionClass} text-slate-600 hover:bg-slate-50 active:bg-slate-100`}
                                                        >
                                                          <Download className="h-4 w-4" />
                                                          İndir
                                                        </button>
                                                      </>
                                                    )}
                                                    {silinebilir && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectedDekont(dekont);
                                                          setDeleteConfirmOpen(true);
                                                        }}
                                                        className={`${actionClass} text-red-600 hover:bg-red-50 active:bg-red-100`}
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                        Sil
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {activeTab === "bildirimler" && (
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Bildirimler ({notifications.length})
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-full">
                      {unreadCount} Okunmamış
                    </span>
                  )}
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                          !notification.is_read
                            ? "border-l-4 border-l-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              !notification.is_read
                                ? "bg-blue-100"
                                : "bg-gray-100"
                            }`}
                          >
                            <Bell
                              className={`h-5 w-5 ${
                                !notification.is_read
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className={`text-base font-medium ${
                                  !notification.is_read
                                    ? "text-gray-900"
                                    : "text-gray-600"
                                }`}
                              >
                                {notification.title}
                              </h3>
                              {!notification.is_read && (
                                <span className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                                  Yeni
                                </span>
                              )}
                            </div>
                            <p
                              className={`mt-1 text-sm ${
                                !notification.is_read
                                  ? "text-gray-700"
                                  : "text-gray-500"
                              }`}
                            >
                              {notification.content}
                            </p>
                            <p className="mt-2 text-xs text-gray-400">
                              {new Date(
                                notification.created_at
                              ).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="mt-3 w-full px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Okundu Olarak İşaretle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      Bildirim Bulunamadı
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Henüz hiç bildiriminiz yok.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer - 3 saniye sonra gizlenir */}
      {showFooter && (
        <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4 fixed bottom-0 left-0 transition-opacity duration-500 ease-out">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                  {schoolName.charAt(0)}
                </div>
                <span className="text-sm">
                  &copy; {new Date().getFullYear()} {schoolName}
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Modals */}
      {isDekontUploadModalOpen && selectedStudent && selectedIsletme && (
        <Modal
          isOpen={isDekontUploadModalOpen}
          onClose={() => setDekontUploadModalOpen(false)}
          title={`Dekont Yükle: ${selectedStudent.ad} ${selectedStudent.soyad}`}
        >
          <DekontUploadForm
            stajId={selectedStudent.staj_id?.toString() || ""}
            onSubmit={handleDekontSubmit}
            onCancel={() => setDekontUploadModalOpen(false)}
            isLoading={isSubmitting}
            isletmeler={isletmeler.map((i) => ({ id: i.id, ad: i.ad }))}
            selectedIsletmeId={selectedIsletme.id}
            startDate={selectedStudent.baslangic_tarihi}
            existingDekontlar={dekontlar.filter(
              (d) =>
                d.ogrenci_ad ===
                  `${selectedStudent.ad} ${selectedStudent.soyad}` &&
                d.isletme_ad === selectedIsletme.ad
            )}
          />
        </Modal>
      )}

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: "", message: "" })}
        title={errorModal.title}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-400 rounded text-red-900 text-sm">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{errorModal.message}</span>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() =>
                setErrorModal({ isOpen: false, title: "", message: "" })
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal.isOpen}
        onClose={() =>
          setSuccessModal({ isOpen: false, title: "", message: "" })
        }
        title={successModal.title}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border-l-4 border-green-400 rounded text-green-900 text-sm">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>{successModal.message}</span>
          </div>
          {successCountdown > 0 && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Modal {successCountdown} saniye sonra otomatik kapanacak...
              </p>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              onClick={() =>
                setSuccessModal({ isOpen: false, title: "", message: "" })
              }
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Dekontu Sil"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {selectedDekont &&
              `'${selectedDekont.ogrenci_ad}' adlı öğrencinin dekontunu kalıcı olarak silmek istediğinizden emin misiniz?`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={confirmDekontSil}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* Student Selection Modal */}
      <Modal
        isOpen={ogrenciSecimModalOpen}
        onClose={() => setOgrenciSecimModalOpen(false)}
        title="Öğrenci Seç"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Dekont eklemek istediğiniz öğrenciyi seçin:
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {(() => {

              if (isletmeler.length === 0) {
                return (
                  <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">
                      ⚠️ Hiç işletme bulunamadı!
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      İşletmeler yüklenmiyor olabilir.
                    </p>
                  </div>
                );
              }

              const allStudents: Array<{ ogrenci: Ogrenci; isletme: Isletme }> =
                [];
              isletmeler.forEach((isletme, isletmeIndex) => {

                if (isletme.ogrenciler && isletme.ogrenciler.length > 0) {
                  isletme.ogrenciler.forEach((ogrenci, ogrenciIndex) => {
                    allStudents.push({ ogrenci, isletme });
                  });
                }
              });


              if (allStudents.length === 0) {
                return (
                  <div className="text-center py-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">
                      ❌ Hiç öğrenci bulunamadı!
                    </p>
                    <p className="text-red-600 text-sm mt-1">
                      Tüm işletmelerde öğrenci listesi boş.
                    </p>
                  </div>
                );
              }

              return allStudents.map(({ ogrenci, isletme }, index) => (
                <button
                  key={`student-${index}-${ogrenci.id}-${isletme.id}`}
                  onClick={() => {
                    handleOpenDekontUpload(ogrenci, isletme);
                    setOgrenciSecimModalOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    ogrenci.aktif === false
                      ? "bg-red-50 hover:bg-red-100 border border-red-200"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          ogrenci.aktif === false
                            ? "text-red-900"
                            : "text-gray-900"
                        }`}
                      >
                        {ogrenci.ad} {ogrenci.soyad}
                      </div>
                      <div
                        className={`text-sm flex items-center gap-2 ${
                          ogrenci.aktif === false
                            ? "text-red-700"
                            : "text-gray-600"
                        }`}
                      >
                        <span>
                          {isletme.ad} - {ogrenci.sinif}
                        </span>
                        {ogrenci.aktif === false && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full border border-red-300">
                            {ogrenci.durum === "TERMINATED"
                              ? "🚫 Feshedilmiş"
                              : ogrenci.durum === "COMPLETED"
                              ? "✅ Tamamlandı"
                              : ogrenci.durum === "CANCELLED"
                              ? "❌ İptal Edildi"
                              : "⏸️ Pasif"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ));
            })()}
          </div>
        </div>
      </Modal>

      {/* Company Selection Modal for Document Upload */}
      <Modal
        isOpen={isletmeSecimModalOpen}
        onClose={() => setIsletmeSecimModalOpen(false)}
        title="İşletme Seç"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Belge eklemek istediğiniz işletmeyi seçin:
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isletmeler.map((isletme) => (
              <button
                key={isletme.id}
                onClick={() => {
                  handleBelgeYukle(isletme);
                  setIsletmeSecimModalOpen(false);
                }}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-900">{isletme.ad}</div>
                <div className="text-sm text-gray-600">
                  Yetkili: {isletme.yukleyen_kisi} | {isletme.ogrenciler.length}{" "}
                  öğrenci
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Document Upload Modal */}
      <Modal
        isOpen={isBelgeUploadModalOpen}
        onClose={() => setBelgeUploadModalOpen(false)}
        title={`Belge Yükle: ${selectedIsletme?.ad || ""}`}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Türü
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              id="belge-turu-select"
              defaultValue="Sözleşme"
            >
              <option value="Sözleşme">Sözleşme</option>
              <option value="Fesih Belgesi">Fesih Belgesi</option>
              <option value="Usta Öğreticilik Belgesi">
                Usta Öğretici Belgesi
              </option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Dosyası
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="belge-dosya"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="belge-dosya" className="cursor-pointer">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {selectedFile
                    ? selectedFile.name
                    : "Belge dosyası seçmek için tıklayın veya sürükleyip bırakın"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setBelgeUploadModalOpen(false);
                setSelectedFile(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                const belgeTuruSelect = document.getElementById(
                  "belge-turu-select"
                ) as HTMLSelectElement;

                if (!selectedFile || !selectedIsletme) {
                  toast.error("Lütfen dosya seçiniz!");
                  return;
                }

                handleBelgeSubmit({
                  isletmeId: selectedIsletme.id,
                  dosya_adi: selectedFile.name,
                  dosya: selectedFile,
                  belge_turu: belgeTuruSelect.value,
                });
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Belge Yükle
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Başarılı"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-gray-900">
            Dekont başarıyla yüklendi!
          </p>
          <p className="text-sm text-gray-600">
            3 saniye sonra dekont listesine yönlendirileceksiniz...
          </p>
        </div>
      </Modal>

      {/* Ek Dekont Modal */}
      <Modal
        isOpen={ekDekontModalOpen}
        onClose={() => setEkDekontModalOpen(false)}
        title="Ek Dekont Yükleme"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-800">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">
                Dikkat: Bu ay için zaten dekont var!
              </p>
              <p className="text-sm mt-1">
                {ekDekontData &&
                  `${ekDekontData.ogrenci.ad} ${
                    ekDekontData.ogrenci.soyad
                  } öğrencisinin ${aylar[ekDekontData.ay - 1]} ${
                    ekDekontData.yil
                  } ayı için zaten ${
                    ekDekontData.mevcutDekontSayisi
                  } adet dekont bulunmaktadır.`}
              </p>
              <p className="text-sm mt-2 font-medium">
                Yükleyeceğiniz dekont{" "}
                <span className="text-orange-600">ek dekont</span> olarak
                eklenecektir.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setEkDekontModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleEkDekontOnay}
              className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Ek Dekont Olarak Yükle
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Silme Modal */}
      <Modal
        isOpen={belgeSilModalOpen}
        onClose={() => setBelgeSilModalOpen(false)}
        title="Belgeyi Sil"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {selectedBelge &&
              `'${selectedBelge.dosya_adi}' adlı belgeyi kalıcı olarak silmek istediğinizden emin misiniz?`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setBelgeSilModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (selectedBelge) {
                  handleBelgeSil(selectedBelge);
                }
              }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* PIN Change Modal */}
      <PinChangeModal
        isOpen={pinChangeModalOpen}
        onClose={() => setPinChangeModalOpen(false)}
        onSuccess={handlePinChangeSuccess}
        userId={teacher?.id || ""}
        userName={teacher ? `${teacher.name} ${teacher.surname}` : ""}
        isRequired={!isManualPinChange}
        userType="teacher"
      />

      {/* Notification Modal */}
      <Modal
        isOpen={notificationModalOpen}
        onClose={() => {
          setNotificationModalOpen(false);
          setShowAllMessages(false);
          setNotificationPage(1);
        }}
        title="Mesajlar"
      >
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowAllMessages(false);
                  setNotificationPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !showAllMessages
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Okunmamış ({notifications.filter((n) => !n.is_read).length})
              </button>
              <button
                onClick={() => {
                  setShowAllMessages(true);
                  setNotificationPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showAllMessages
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tümünü Göster ({notifications.length})
              </button>
            </div>

            {!showAllMessages &&
              notifications.filter((n) => !n.is_read).length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
          </div>

          {(() => {
            // Filter messages based on selection
            const filteredMessages = showAllMessages
              ? notifications
              : notifications.filter((n) => !n.is_read);

            // Calculate pagination
            const totalPages = Math.ceil(
              filteredMessages.length / NOTIFICATIONS_PER_PAGE
            );
            const paginatedMessages = filteredMessages.slice(
              (notificationPage - 1) * NOTIFICATIONS_PER_PAGE,
              notificationPage * NOTIFICATIONS_PER_PAGE
            );

            return (
              <>
                {filteredMessages.length > 0 ? (
                  <>
                    {/* Messages List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {paginatedMessages.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border ${
                            notification.is_read
                              ? "bg-gray-50 border-gray-200"
                              : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4
                                  className={`font-semibold ${
                                    notification.is_read
                                      ? "text-gray-700"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    notification.priority === "high"
                                      ? "bg-red-100 text-red-700"
                                      : notification.priority === "normal"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {notification.priority === "high"
                                    ? "Yüksek"
                                    : notification.priority === "normal"
                                    ? "Normal"
                                    : "Düşük"}
                                </span>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p
                                className={`text-sm mb-3 ${
                                  notification.is_read
                                    ? "text-gray-600"
                                    : "text-gray-700"
                                }`}
                              >
                                {notification.content}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  <div>Gönderen: {notification.sent_by}</div>
                                  <div>
                                    Tarih:{" "}
                                    {new Date(
                                      notification.created_at
                                    ).toLocaleString("tr-TR")}
                                  </div>
                                  {notification.is_read &&
                                    notification.read_at && (
                                      <div>
                                        Okunma:{" "}
                                        {new Date(
                                          notification.read_at
                                        ).toLocaleString("tr-TR")}
                                      </div>
                                    )}
                                </div>
                                {!notification.is_read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                    Okundu olarak işaretle
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() =>
                            setNotificationPage((p) => Math.max(1, p - 1))
                          }
                          disabled={notificationPage === 1}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Önceki
                        </button>
                        <span className="text-sm text-gray-700 px-2">
                          Sayfa {notificationPage} / {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setNotificationPage((p) =>
                              Math.min(totalPages, p + 1)
                            )
                          }
                          disabled={notificationPage === totalPages}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sonraki
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {showAllMessages
                        ? "Mesaj Bulunamadı"
                        : "Okunmamış Mesaj Yok"}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {showAllMessages
                        ? "Henüz size gönderilmiş mesaj bulunmamaktadır."
                        : "Tüm mesajlarınızı okudunuz! 🎉"}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setNotificationModalOpen(false);
              setShowAllMessages(false);
              setNotificationPage(1);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </Modal>

      {/* 🚨 Öğretmen Hata ve Değişiklik Bildirim FAB & Modalı */}
      {(teacher?.id || (session?.user as any)?.teacherId) && (
        <TeacherIssueModal
          teacherId={teacher?.id || (session?.user as any)?.teacherId}
          isletmeler={isletmeler}
        />
      )}
    </div>
  );
};

export default TeacherPanel;
