"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  Suspense,
} from "react";
import { parseDekontFileName } from "@/utils/dekontNaming";
import {
  Eye,
  Download,
  Check,
  X,
  Filter,
  Search,
  Calendar,
  Trash2,
  Loader,
  AlertTriangle,
  Shield,
  MoreVertical,
  ChevronDown,
  Upload,
  Archive,
  FileText,
  Edit3,
  Save,
  Users,
  FileSpreadsheet,
  Menu,
} from "lucide-react";
import { toast } from "react-hot-toast";
import MultiFileUploadModal from "@/components/admin/MultiFileUploadModal";
import ZipDownloadModal from "@/components/admin/ZipDownloadModal";
import DekontReportsModal from "@/components/admin/DekontReportsModal";
import ClassReportsModal from "@/components/admin/ClassReportsModal";
import ExcelImportModal from "@/components/admin/ExcelImportModal";

interface MonthlyPaymentInfo {
  id: string;
  amount: number;
  paymentType: string;
  status: string;
  importedAt: string;
  importSource: string | null;
}

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
  monthlyPayment?: MonthlyPaymentInfo | null; // Import edilen ödeme bilgisi
}

// Güvenli tarih formatlama yardımcısı (tarih + saat)
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return (
      date.toLocaleDateString("tr-TR") +
      " " +
      date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  } catch (error) {
    return "-";
  }
};

// Güvenli tarih formatlama yardımcısı (sadece tarih)
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("tr-TR");
  } catch (error) {
    return "-";
  }
};

// Güvenli para formatlaması
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  return `${amount.toLocaleString("tr-TR")} ₺`;
};

// Parantez içindeki bilgileri kaldıran fonksiyon
const removeParentheses = (text: string): string => {
  if (!text) return text;
  return text.replace(/\s*\([^)]*\)/g, "").trim();
};

// Metni kısaltan ve tooltip için hazırlayan fonksiyon
const truncateText = (
  text: string | null,
  maxLength: number = 50
): { truncated: string; isTruncated: boolean; original: string } => {
  if (!text) return { truncated: "-", isTruncated: false, original: "" };

  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return { truncated: trimmed, isTruncated: false, original: trimmed };
  }

  return {
    truncated: trimmed.substring(0, maxLength) + "...",
    isTruncated: true,
    original: trimmed,
  };
};

// Dekont sequence bilgisini çıkaran fonksiyon
const getDekontSequenceInfo = (dekont: Dekont, allDekontlar: Dekont[]) => {
  // Aynı öğrenci, aynı ay ve yıl için dekontları bul
  const sameStudentSameMonth = allDekontlar
    .filter(
      (d) =>
        d.ogrenci_ad === dekont.ogrenci_ad &&
        d.ay === dekont.ay &&
        d.yil === dekont.yil
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (sameStudentSameMonth.length <= 1) {
    return { displayName: dekont.ogrenci_ad, sequenceText: "" };
  }

  // Bu dekontun sırasını bul
  const currentIndex = sameStudentSameMonth.findIndex(
    (d) => d.id === dekont.id
  );

  if (currentIndex === 0) {
    // İlk dekont - sequence gösterme
    return { displayName: dekont.ogrenci_ad, sequenceText: "" };
  } else {
    // Sonraki dekontlar - ek1, ek2, vs.
    const sequenceNumber = currentIndex;
    return {
      displayName: `${dekont.ogrenci_ad} (ek${sequenceNumber})`,
      sequenceText: `ek${sequenceNumber}`,
    };
  }
};

// Dosya adından sequence bilgisini çıkaran yardımcı fonksiyon
const extractSequenceFromFileName = (fileUrl: string | null): string => {
  if (!fileUrl) return "";

  const filename = fileUrl.split("/").pop();
  if (!filename) return "";

  const parsedData = parseDekontFileName(filename);
  if (
    parsedData?.isAdditional &&
    parsedData.additionalIndex &&
    parsedData.additionalIndex > 0
  ) {
    return `ek${parsedData.additionalIndex}`;
  }

  return "";
};

// Dosya tipini kontrol eden fonksiyonlar
const isImageFile = (fileUrl: string | null): boolean => {
  if (!fileUrl) return false;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const lowerCaseUrl = fileUrl.toLowerCase();
  return imageExtensions.some((ext) => lowerCaseUrl.includes(ext));
};

const isPdfFile = (fileUrl: string | null): boolean => {
  if (!fileUrl) return false;
  const lowerCaseUrl = fileUrl.toLowerCase();
  return lowerCaseUrl.includes(".pdf");
};

const isPreviewableFile = (fileUrl: string | null): boolean => {
  return isImageFile(fileUrl) || isPdfFile(fileUrl);
};

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

// Gerçek uzantıyı fileUrl'den çıkar (jpeg -> jpg normalize)
function getFileExtFromUrl(fileUrl: string | null): string {
  if (!fileUrl) return "pdf";
  const lower = fileUrl.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  if (lastDot === -1) return isImageFile(fileUrl) ? "jpg" : "pdf";
  const ext = lower.substring(lastDot + 1);
  if (ext === "jpeg") return "jpg";
  return ext;
}

const STATUS_COLORS = {
  bekliyor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  onaylandi: "bg-green-100 text-green-800 border-green-200",
  reddedildi: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS = {
  bekliyor: "Beklemede",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

// Helper function to calculate previous month defaults
const calculatePreviousMonthDefaults = () => {
  const currentDate = new Date();
  const previousMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1
  );
  const defaultMonth = (previousMonth.getMonth() + 1).toString(); // 1-based month as string
  const defaultYear = previousMonth.getFullYear().toString();

  return {
    defaultMonth,
    defaultYear,
  };
};

export default function ClientDekontlarPage() {
  // Calculate intelligent defaults for previous month
  const { defaultMonth, defaultYear } = calculatePreviousMonthDefaults();

  const [dekontlar, setDekontlar] = useState<Dekont[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedAlan, setSelectedAlan] = useState<string>("all");
  const [selectedSinif, setSelectedSinif] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showApprovedDeleteWarning, setShowApprovedDeleteWarning] =
    useState(false);
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [modalStatistics, setModalStatistics] = useState({
    totalStudents: 0,
    studentsWithDekont: 0,
    totalDekontlar: 0,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showZipModal, setShowZipModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showClassReportsModal, setShowClassReportsModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Quick amount update states
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");
  const [updatingAmountId, setUpdatingAmountId] = useState<string | null>(null);

  // Fetch modal statistics - same calculation as in modal
  const fetchModalStatistics = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/reports/dekont-status?month=${selectedMonth}&year=${selectedYear}`
      );
      if (response.ok) {
        const data = await response.json();
        const teacherReports = data.teachers || [];

        let totalStudents = 0;
        let studentsWithDekont = 0;
        let totalDekontlar = 0;

        teacherReports.forEach((teacher: any) => {
          teacher.isletmeler.forEach((company: any) => {
            if (company.ogrenciler) {
              totalStudents += company.ogrenciler.length;
              const studentsWithDekontInCompany = company.ogrenciler.filter(
                (student: any) => student.has_dekont
              ).length;
              studentsWithDekont += studentsWithDekontInCompany;
              totalDekontlar += company.dekont_sayisi;
            }
          });
        });

        setModalStatistics({
          totalStudents,
          studentsWithDekont,
          totalDekontlar,
        });
      }
    } catch (error) {
      console.error("Modal istatistik verisi alınırken hata:", error);
    }
  }, [selectedMonth, selectedYear]);

  // Memoized fetch function - prevents re-creation on every render
  const fetchDekontlar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/dekontlar");
      if (response.ok) {
        const result = await response.json();
        setDekontlar(result.data || []);
        setTotalStudentsCount(result.totalStudents || 0);
      }
    } catch (error) {
      console.error("Dekont verisi alınırken hata:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized filtered data calculation - expensive operation
  const filteredDekontlar = useMemo(() => {
    let filtered = [...dekontlar];

    // Durum filtresi
    if (selectedStatus !== "all") {
      filtered = filtered.filter((d) => d.onay_durumu === selectedStatus);
    }

    // Ay filtresi
    if (selectedMonth !== "all") {
      filtered = filtered.filter((d) => d.ay === parseInt(selectedMonth));
    }

    // Yıl filtresi
    if (selectedYear !== "all") {
      filtered = filtered.filter((d) => d.yil === parseInt(selectedYear));
    }

    // Alan filtresi
    if (selectedAlan !== "all") {
      filtered = filtered.filter((d) => d.ogrenci_alan === selectedAlan);
    }

    // Sınıf filtresi
    if (selectedSinif !== "all") {
      filtered = filtered.filter((d) => d.ogrenci_sinif === selectedSinif);
    }

    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.isletme_ad.toLowerCase().includes(term) ||
          d.ogrenci_ad.toLowerCase().includes(term) ||
          d.yukleyen_kisi.toLowerCase().includes(term)
      );
    }

    // Son yüklenen önce gelecek şekilde sırala (created_at'e göre azalan)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [
    dekontlar,
    selectedStatus,
    selectedMonth,
    selectedYear,
    selectedAlan,
    selectedSinif,
    searchTerm,
  ]);

  // Memoized pagination calculations - expensive computation
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredDekontlar.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentDekontlar = filteredDekontlar.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      currentDekontlar,
    };
  }, [filteredDekontlar, currentPage, itemsPerPage]);

  // Memoized available years calculation - expensive operation
  const availableYears = useMemo(() => {
    return Array.from(new Set(dekontlar.map((d) => d.yil))).sort(
      (a, b) => b - a
    );
  }, [dekontlar]);

  // Memoized available alanlar calculation
  const availableAlanlar = useMemo(() => {
    const alanlar = dekontlar
      .map((d) => d.ogrenci_alan)
      .filter((alan): alan is string => !!alan);
    return Array.from(new Set(alanlar)).sort();
  }, [dekontlar]);

  // Memoized available siniflar calculation
  const availableSiniflar = useMemo(() => {
    const siniflar = dekontlar
      .map((d) => d.ogrenci_sinif)
      .filter((sinif): sinif is string => !!sinif);
    return Array.from(new Set(siniflar)).sort();
  }, [dekontlar]);

  // İstatistik hesaplamaları
  const statistics = useMemo(() => {
    // Seçili ay ve yıl için istatistik
    let targetDekontlar = dekontlar;

    if (selectedMonth !== "all") {
      targetDekontlar = targetDekontlar.filter(
        (d) => d.ay === parseInt(selectedMonth)
      );
    }
    if (selectedYear !== "all") {
      targetDekontlar = targetDekontlar.filter(
        (d) => d.yil === parseInt(selectedYear)
      );
    }

    // Benzersiz öğrenci sayısı (staja giden toplam öğrenci)
    const uniqueStudents = new Set(targetDekontlar.map((d) => d.ogrenci_ad))
      .size;

    // Toplam dekont sayısı
    const totalDekont = targetDekontlar.length;

    // İşletme bazlı dekont yüklenen sayısı (aynı işletmeden birden fazla dekont karışıklığını önlemek)
    const uniqueCompaniesWithDekont = new Set(
      targetDekontlar.map((d) => d.isletme_ad)
    ).size;

    // Onay bekleyen
    const pending = targetDekontlar.filter(
      (d) => d.onay_durumu === "bekliyor"
    ).length;

    // Onaylanan
    const approved = targetDekontlar.filter(
      (d) => d.onay_durumu === "onaylandi"
    ).length;

    // Reddedilen
    const rejected = targetDekontlar.filter(
      (d) => d.onay_durumu === "reddedildi"
    ).length;

    return {
      totalStudents: uniqueStudents,
      totalDekont,
      withDekont: uniqueCompaniesWithDekont,
      pending,
      approved,
      rejected,
    };
  }, [dekontlar, selectedMonth, selectedYear]);

  // Memoized event handlers - prevent re-creation
  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedIds(paginationData.currentDekontlar.map((d) => d.id));
      } else {
        setSelectedIds([]);
      }
    },
    [paginationData.currentDekontlar]
  );

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleBulkAction = useCallback(async () => {
    if (selectedIds.length === 0 || !bulkAction) return;

    if (bulkAction === "DELETE") {
      setShowBulkDeleteModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDekontStatus(id, bulkAction as "APPROVED" | "REJECTED");
      }
      setSelectedIds([]);
      setBulkAction("");
    } catch (error) {
      console.error("Toplu işlem hatası:", error);
      setWarningMessage("Toplu işlem sırasında bir hata oluştu");
      setShowWarningModal(true);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, bulkAction]);

  const handleBulkDelete = useCallback(async () => {
    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        await deleteDekont(id);
      }
      setSelectedIds([]);
      setBulkAction("");
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error("Toplu silme hatası:", error);
      setWarningMessage("Toplu silme sırasında bir hata oluştu");
      setShowWarningModal(true);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    fetchDekontlar();
    fetchModalStatistics();
  }, [fetchDekontlar, fetchModalStatistics]);

  // Reset page and selections when filters change (but not when data changes)
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [
    selectedStatus,
    selectedMonth,
    selectedYear,
    selectedAlan,
    selectedSinif,
    searchTerm,
  ]);

  // Memoized API functions to prevent re-creation
  const updateDekontStatus = useCallback(
    async (
      dekontId: string,
      status: "APPROVED" | "REJECTED",
      reason?: string
    ) => {
      try {
        const updateData = {
          decision: status,
          ...(status === "REJECTED" && { rejectReason: reason || null }),
        };

        const response = await fetch(
          `/api/admin/dekontlar/${dekontId}/approve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (response.ok) {
          await fetchDekontlar(); // Refresh the list
          setShowRejectModal(false);
          setShowApproveModal(false);
          setSelectedDekont(null);
          setRejectReason("");
        } else {
          console.error("Dekont güncelleme hatası");
          setWarningMessage("Dekont güncellenirken bir hata oluştu");
          setShowWarningModal(true);
        }
      } catch (error) {
        console.error("Dekont durumu güncellenirken hata:", error);
        setWarningMessage("Dekont durumu güncellenirken bir hata oluştu");
        setShowWarningModal(true);
      }
    },
    [fetchDekontlar]
  );

  const deleteDekont = useCallback(
    async (dekontId: string) => {
      console.log("🗑️ Delete dekont called:", dekontId);
      try {
        const response = await fetch(`/api/admin/dekontlar/${dekontId}`, {
          method: "DELETE",
        });

        console.log("Delete response status:", response.status);

        if (response.ok) {
          console.log("✅ Dekont silindi, liste yenileniyor...");
          await fetchDekontlar(); // Refresh the list
          setShowDeleteModal(false);
          setSelectedDekont(null);
        } else if (response.status === 403) {
          // Onaylanmış dekont silme hatası - şık modal göster
          console.log("⚠️ 403: Onaylı dekont silinemez");
          setShowDeleteModal(false);
          setShowApprovedDeleteWarning(true);
        } else {
          console.error("❌ Dekont silme hatası, status:", response.status);
          const errorData = await response.json().catch(() => ({}));
          console.error("Error data:", errorData);
          setWarningMessage(
            errorData.error || "Dekont silinirken bir hata oluştu"
          );
          setShowWarningModal(true);
          setShowDeleteModal(false);
        }
      } catch (error) {
        console.error("❌ Dekont silinirken hata:", error);
        setWarningMessage("Dekont silinirken bir hata oluştu");
        setShowWarningModal(true);
        setShowDeleteModal(false);
      }
    },
    [fetchDekontlar]
  );

  // Quick amount update handlers
  const handleStartAmountEdit = useCallback((dekont: Dekont) => {
    setEditingAmountId(dekont.id);
    setEditingAmount(dekont.miktar?.toString() || "");
  }, []);

  const handleCancelAmountEdit = useCallback(() => {
    setEditingAmountId(null);
    setEditingAmount("");
  }, []);

  const handleSaveAmountEdit = useCallback(
    async (dekontId: string) => {
      if (updatingAmountId) return; // Prevent double submissions

      const numericAmount = parseFloat(editingAmount);
      if (editingAmount !== "" && (isNaN(numericAmount) || numericAmount < 0)) {
        toast.error("Geçerli bir tutar giriniz");
        return;
      }

      setUpdatingAmountId(dekontId);
      try {
        const response = await fetch(
          `/api/admin/dekontlar/${dekontId}/update-amount`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: editingAmount === "" ? null : numericAmount,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          toast.success("Tutar başarıyla güncellendi");

          // Update the local state
          setDekontlar((prev) =>
            prev.map((d) =>
              d.id === dekontId ? { ...d, miktar: result.amount } : d
            )
          );

          setEditingAmountId(null);
          setEditingAmount("");
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Tutar güncellenirken hata oluştu");
        }
      } catch (error) {
        console.error("Amount update error:", error);
        toast.error("Tutar güncellenirken hata oluştu");
      } finally {
        setUpdatingAmountId(null);
      }
    },
    [editingAmount, updatingAmountId]
  );

  const handleAmountKeyDown = useCallback(
    (e: React.KeyboardEvent, dekontId: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveAmountEdit(dekontId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelAmountEdit();
      }
    },
    [handleSaveAmountEdit, handleCancelAmountEdit]
  );

  // Memoized modal handlers
  const handleApprove = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont);
    setShowApproveModal(true);
  }, []);

  const handleReject = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont);
    setShowRejectModal(true);
  }, []);

  const handleDelete = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont);
    setShowDeleteModal(true);
  }, []);

  // Memoized submit handlers
  const submitApprove = useCallback(async () => {
    if (selectedDekont) {
      await updateDekontStatus(selectedDekont.id, "APPROVED");
    }
  }, [selectedDekont, updateDekontStatus]);

  const submitReject = useCallback(async () => {
    if (selectedDekont && rejectReason.trim()) {
      await updateDekontStatus(selectedDekont.id, "REJECTED", rejectReason);
    }
  }, [selectedDekont, rejectReason, updateDekontStatus]);

  const closeModals = useCallback(() => {
    setShowRejectModal(false);
    setShowApproveModal(false);
    setShowDeleteModal(false);
    setShowBulkDeleteModal(false);
    setShowApprovedDeleteWarning(false);
    setShowImageModal(false);
    setShowWarningModal(false);
    setShowStatusModal(false);
    setSelectedDekont(null);
    setSelectedImageUrl(null);
    setSelectedImageName("");
    setWarningMessage("");
    setRejectReason("");
    setOpenDropdown(null);
  }, []);

  // Resim modalını açma fonksiyonu
  const openImageModal = useCallback((fileUrl: string, filename: string) => {
    // Dosya URL'inden dosya adını çıkar ve download API'sini kullan
    const urlParts = fileUrl.split("/");
    const actualFilename = urlParts[urlParts.length - 1];
    const downloadUrl = `/api/admin/dekontlar/download/${encodeURIComponent(
      actualFilename
    )}?inline=true`;

    setSelectedImageUrl(downloadUrl);
    setSelectedImageName(actualFilename); // Gerçek dosya adını kullan
    setShowImageModal(true);
  }, []);

  // Memoized download function
  const downloadFile = useCallback(
    async (fileUrl: string, filename: string) => {
      try {
        // Dosya URL'inden dosya adını çıkar
        const urlParts = fileUrl.split("/");
        const actualFilename = urlParts[urlParts.length - 1];

        if (!actualFilename) {
          setWarningMessage("Dosya adı bulunamadı");
          setShowWarningModal(true);
          return;
        }

        // Güvenli download API'sini kullan
        const response = await fetch(
          `/api/admin/dekontlar/download/${encodeURIComponent(actualFilename)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setWarningMessage("Dosya bulunamadı");
            setShowWarningModal(true);
          } else if (response.status === 401) {
            setWarningMessage("Bu işlem için yetkiniz yok");
            setShowWarningModal(true);
          } else {
            setWarningMessage("Dosya indirilemedi");
            setShowWarningModal(true);
          }
          return;
        }

        // Blob oluştur ve indir
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Download error:", error);
        setWarningMessage("Dosya indirme sırasında bir hata oluştu");
        setShowWarningModal(true);
      }
    },
    []
  );

  // Dosya görüntüleme/indirme işlemi
  const handleFileAction = useCallback(
    (fileUrl: string, filename: string) => {
      if (isPreviewableFile(fileUrl)) {
        openImageModal(fileUrl, filename);
      } else {
        downloadFile(fileUrl, filename);
      }
    },
    [openImageModal, downloadFile]
  );

  // Memoized filter clear handler
  const clearFilters = useCallback(() => {
    setSelectedStatus("all");
    setSelectedMonth("all");
    setSelectedYear("all");
    setSelectedAlan("all");
    setSelectedSinif("all");
    setSearchTerm("");
  }, []);

  // Dropdown handlers
  const toggleDropdown = useCallback(
    (dekontId: string) => {
      setOpenDropdown(openDropdown === dekontId ? null : dekontId);
    },
    [openDropdown]
  );

  const closeDropdown = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  // Extract current page data from memoized pagination
  const { totalPages, startIndex, endIndex, currentDekontlar } = paginationData;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dekont Yönetimi</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Menu className="h-4 w-4 mr-2" />
                İşlemler
                <ChevronDown
                  className={`ml-2 h-4 w-4 transform transition-transform ${
                    showActionsDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showActionsDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionsDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUploadModal(true);
                          setShowActionsDropdown(false);
                        }}
                        className="flex items-start w-full px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-md mr-3 flex-shrink-0">
                          <Upload className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            Dekont Yükle
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Öğrenci dekontlarını toplu olarak yükleyin
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowZipModal(true);
                          setShowActionsDropdown(false);
                        }}
                        className="flex items-start w-full px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-md mr-3 flex-shrink-0">
                          <Archive className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            ZIP İndir
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Seçili dekontları ZIP dosyası olarak indirin
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowExcelImportModal(true);
                          setShowActionsDropdown(false);
                        }}
                        className="flex items-start w-full px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-md mr-3 flex-shrink-0">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            Excel İçe Aktar
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Aylık ödeme listelerini Excel'den içe aktarın
                          </div>
                        </div>
                      </button>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          setShowReportsModal(true);
                          setShowActionsDropdown(false);
                        }}
                        className="flex items-start w-full px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-md mr-3 flex-shrink-0">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            Dekont Raporları
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Öğretmen ve işletme bazında detaylı raporlar
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowClassReportsModal(true);
                          setShowActionsDropdown(false);
                        }}
                        className="flex items-start w-full px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-md mr-3 flex-shrink-0">
                          <Users className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            Sınıf Raporları
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Sınıf bazında dekont durumu ve istatistikler
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Toplam: {filteredDekontlar.length} dekont
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="İşletme, öğrenci veya öğretmen ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="bekliyor">Beklemede</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="reddedildi">Reddedildi</option>
            </select>

            {/* Alan Filter */}
            <select
              value={selectedAlan}
              onChange={(e) => setSelectedAlan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Alanlar</option>
              {availableAlanlar.map((alan) => (
                <option key={alan} value={alan}>
                  {alan}
                </option>
              ))}
            </select>

            {/* Sinif Filter */}
            <select
              value={selectedSinif}
              onChange={(e) => setSelectedSinif(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Sınıflar</option>
              {availableSiniflar.map((sinif) => (
                <option key={sinif} value={sinif}>
                  {sinif}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Aylar</option>
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Yıllar</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button - Full width on mobile */}
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="w-full md:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Filtreleri Temizle
            </button>
          </div>

          {/* Toplu İşlemler */}
          {selectedIds.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700 font-medium">
                  {selectedIds.length} dekont seçildi:
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">İşlem Seçin</option>
                  <option value="APPROVED">Toplu Onayla</option>
                  <option value="DELETE">Toplu Sil</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isProcessing}
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Uygula
                </button>
              </div>
            </div>
          )}
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Dekont Beklenen Öğrenci
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {modalStatistics.totalStudents}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Toplam Dekont Sayısı
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {statistics.totalDekont}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Onay Bekliyor
                </p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {statistics.pending}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Onaylanan</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {statistics.approved}
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reddedilen</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {statistics.rejected}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table View (hidden on mobile) */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto overflow-y-visible">
            <table
              className="min-w-full divide-y divide-gray-200"
              style={{ overflow: "visible" }}
            >
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={
                        currentDekontlar.length > 0 &&
                        selectedIds.length === currentDekontlar.length
                      }
                      onChange={handleSelectAll}
                      disabled={currentDekontlar.length === 0}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci / İşletme / Koordinatör
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dönem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dekont Tutarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Tutarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fark
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yükleyen / Tarih
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Önizle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody
                className="bg-white divide-y divide-gray-200"
                style={{ overflow: "visible" }}
              >
                {currentDekontlar.map((dekont) => (
                  <tr
                    key={dekont.id}
                    className={`${
                      selectedIds.includes(dekont.id)
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-gray-50"
                    } relative`}
                    style={{
                      zIndex: openDropdown === dekont.id ? 100 : "auto",
                    }}
                  >
                    <td className="relative px-7 sm:w-12 sm:px-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(dekont.id)}
                        onChange={() => handleSelectOne(dekont.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {(() => {
                            const sequenceInfo = getDekontSequenceInfo(
                              dekont,
                              filteredDekontlar
                            );
                            return sequenceInfo.displayName;
                          })()}{" "}
                          {dekont.ogrenci_sinif &&
                            dekont.ogrenci_no &&
                            `(${dekont.ogrenci_sinif}-${dekont.ogrenci_no})`}
                          {(() => {
                            const sequenceFromFile =
                              extractSequenceFromFileName(dekont.dosya_url);
                            if (sequenceFromFile) {
                              return (
                                <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                                  {sequenceFromFile}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dekont.isletme_ad}
                        </div>
                        <div className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md inline-block mt-1">
                          👤 {dekont.koordinator_ogretmen}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {MONTHS[dekont.ay - 1]} {dekont.yil}
                      </div>
                    </td>
                    {/* Dekont Tutarı Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 group">
                        {editingAmountId === dekont.id ? (
                          // Inline editing mode
                          <>
                            <input
                              type="number"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              onKeyDown={(e) =>
                                handleAmountKeyDown(e, dekont.id)
                              }
                              className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tutar"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveAmountEdit(dekont.id)}
                              disabled={updatingAmountId === dekont.id}
                              className="flex items-center justify-center w-6 h-6 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Kaydet"
                            >
                              {updatingAmountId === dekont.id ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelAmountEdit}
                              disabled={updatingAmountId === dekont.id}
                              className="flex items-center justify-center w-6 h-6 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="İptal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          // Display mode
                          <>
                            <span className="text-sm text-gray-900 font-medium">
                              {formatCurrency(dekont.miktar)}
                            </span>
                            <button
                              onClick={() => handleStartAmountEdit(dekont)}
                              className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all"
                              title="Tutarı Düzenle"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Ödeme Tutarı Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-emerald-600 font-medium">
                        {dekont.monthlyPayment
                          ? formatCurrency(dekont.monthlyPayment.amount)
                          : "-"}
                      </span>
                    </td>

                    {/* Fark Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dekont.miktar && dekont.monthlyPayment?.amount ? (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            Math.abs(
                              dekont.miktar - dekont.monthlyPayment.amount
                            ) < 0.01
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {Math.abs(
                            dekont.miktar - dekont.monthlyPayment.amount
                          ) < 0.01
                            ? "✓ Eşleşti"
                            : `${
                                dekont.miktar > dekont.monthlyPayment.amount
                                  ? "+"
                                  : ""
                              }${(
                                dekont.miktar - dekont.monthlyPayment.amount
                              ).toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                              })} ₺`}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Durum Column - Clickable */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedDekont(dekont);
                          setShowStatusModal(true);
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${
                          STATUS_COLORS[dekont.onay_durumu]
                        }`}
                        title="Durum detaylarını görüntüle"
                      >
                        {STATUS_LABELS[dekont.onay_durumu]}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {removeParentheses(dekont.yukleyen_kisi)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(dekont.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {/* Önizleme Butonu */}
                      {dekont.dosya_url && dekont.dosya_url.trim() !== "" ? (
                        <button
                          onClick={() => {
                            // Gerçek dosya adını çıkar
                            const urlParts = dekont.dosya_url!.split("/");
                            const actualFilename =
                              urlParts[urlParts.length - 1];
                            handleFileAction(dekont.dosya_url!, actualFilename);
                          }}
                          className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                          title={
                            isPreviewableFile(dekont.dosya_url!)
                              ? isImageFile(dekont.dosya_url!)
                                ? "Resmi Görüntüle"
                                : "PDF Önizle"
                              : "Dosyayı İndir"
                          }
                        >
                          {isPreviewableFile(dekont.dosya_url!) ? (
                            <Eye className="h-5 w-5" />
                          ) : (
                            <Download className="h-5 w-5" />
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center w-8 h-8 text-gray-300">
                          <Eye className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {/* Onay İşlemleri */}
                        {dekont.onay_durumu === "bekliyor" && (
                          <>
                            <button
                              onClick={() => handleApprove(dekont)}
                              className="flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                              title="Onayla"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(dekont)}
                              className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                              title="Reddet"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {/* Sil Butonu */}
                        <button
                          onClick={() => handleDelete(dekont)}
                          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {currentDekontlar.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Dekont bulunamadı
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {dekontlar.length === 0
                  ? "Henüz hiç dekont yüklenmemiş."
                  : "Arama kriterlerinize uygun dekont bulunamadı."}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View (visible on mobile only) */}
        <div className="md:hidden space-y-4">
          {/* Mobile Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedIds.length} dekont seçildi
                </span>
                <div className="flex gap-2">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="text-sm px-3 py-1 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">İşlem Seçin</option>
                    <option value="APPROVED">Toplu Onayla</option>
                    <option value="DELETE">Toplu Sil</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || isProcessing}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      "Uygula"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Select All */}
          {currentDekontlar.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={
                    currentDekontlar.length > 0 &&
                    selectedIds.length === currentDekontlar.length
                  }
                  onChange={handleSelectAll}
                />
                <span className="ml-2 text-sm text-gray-700">Tümünü seç</span>
              </label>
            </div>
          )}

          {/* Mobile Cards */}
          {currentDekontlar.map((dekont) => (
            <div
              key={dekont.id}
              className={`bg-white rounded-lg shadow-sm border ${
                selectedIds.includes(dekont.id)
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              {/* Card Header with Checkbox */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(dekont.id)}
                      onChange={() => handleSelectOne(dekont.id)}
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          const sequenceInfo = getDekontSequenceInfo(
                            dekont,
                            filteredDekontlar
                          );
                          return sequenceInfo.displayName;
                        })()}{" "}
                        {dekont.ogrenci_sinif &&
                          dekont.ogrenci_no &&
                          `(${dekont.ogrenci_sinif}-${dekont.ogrenci_no})`}
                        {(() => {
                          const sequenceFromFile = extractSequenceFromFileName(
                            dekont.dosya_url
                          );
                          if (sequenceFromFile) {
                            return (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-medium">
                                {sequenceFromFile}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dekont.isletme_ad}
                      </div>
                      <div className="text-xs text-blue-600">
                        Koordinatör: {dekont.koordinator_ogretmen}
                      </div>
                    </div>
                  </label>
                  {/* Dropdown trigger */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(dekont.id)}
                      className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      title="İşlemler"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === dekont.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={closeDropdown}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                          <div className="py-1">
                            {/* Onay İşlemleri */}
                            {dekont.onay_durumu === "bekliyor" && (
                              <>
                                <button
                                  onClick={() => {
                                    handleApprove(dekont);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4 mr-3" />
                                  Onayla
                                </button>
                                <button
                                  onClick={() => {
                                    handleReject(dekont);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-3" />
                                  Reddet
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                              </>
                            )}

                            {/* Sil */}
                            <button
                              onClick={() => {
                                handleDelete(dekont);
                                closeDropdown();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-3" />
                              Sil
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {MONTHS[dekont.ay - 1]} {dekont.yil}
                        {(() => {
                          const sequenceFromFile = extractSequenceFromFileName(
                            dekont.dosya_url
                          );
                          if (sequenceFromFile) {
                            return (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-medium">
                                {sequenceFromFile}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {/* Mobile inline editing for amount */}
                      <div className="flex flex-col space-y-1">
                        {editingAmountId === dekont.id ? (
                          // Mobile inline editing mode
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              onKeyDown={(e) =>
                                handleAmountKeyDown(e, dekont.id)
                              }
                              className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tutar"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveAmountEdit(dekont.id)}
                              disabled={updatingAmountId === dekont.id}
                              className="flex items-center justify-center w-5 h-5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Kaydet"
                            >
                              {updatingAmountId === dekont.id ? (
                                <Loader className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelAmountEdit}
                              disabled={updatingAmountId === dekont.id}
                              className="flex items-center justify-center w-5 h-5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="İptal"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          // Mobile display mode with separate amounts
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 group">
                              <span className="text-sm text-gray-900 font-medium">
                                Dekont: {formatCurrency(dekont.miktar)}
                              </span>
                              <button
                                onClick={() => handleStartAmountEdit(dekont)}
                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all"
                                title="Tutarı Düzenle"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                            {dekont.monthlyPayment && (
                              <div className="text-xs space-y-1">
                                <div className="text-emerald-600 font-medium">
                                  Ödeme:{" "}
                                  {formatCurrency(dekont.monthlyPayment.amount)}
                                </div>
                                {dekont.miktar &&
                                  dekont.monthlyPayment.amount && (
                                    <div className="flex items-center">
                                      <span className="text-gray-600 mr-2">
                                        Fark:
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                          Math.abs(
                                            dekont.miktar -
                                              dekont.monthlyPayment.amount
                                          ) < 0.01
                                            ? "bg-green-100 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {Math.abs(
                                          dekont.miktar -
                                            dekont.monthlyPayment.amount
                                        ) < 0.01
                                          ? "✓ Eşleşti"
                                          : `${
                                              dekont.miktar >
                                              dekont.monthlyPayment.amount
                                                ? "+"
                                                : ""
                                            }${(
                                              dekont.miktar -
                                              dekont.monthlyPayment.amount
                                            ).toLocaleString("tr-TR", {
                                              minimumFractionDigits: 2,
                                            })} ₺`}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setSelectedDekont(dekont);
                          setShowStatusModal(true);
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${
                          STATUS_COLORS[dekont.onay_durumu]
                        }`}
                        title="Durum detaylarını görüntüle"
                      >
                        {STATUS_LABELS[dekont.onay_durumu]}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-blue-600">
                    Koordinatör: {dekont.koordinator_ogretmen}
                  </div>

                  <div className="text-xs text-gray-500">
                    Yükleyen: {removeParentheses(dekont.yukleyen_kisi)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tarih: {formatDateTime(dekont.created_at)}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
                  {dekont.dosya_url && (
                    <>
                      {isPreviewableFile(dekont.dosya_url) ? (
                        <button
                          onClick={() => {
                            // Gerçek dosya adını çıkar
                            const urlParts = dekont.dosya_url!.split("/");
                            const actualFilename =
                              urlParts[urlParts.length - 1];
                            openImageModal(dekont.dosya_url!, actualFilename);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {isImageFile(dekont.dosya_url)
                            ? "Resmi Görüntüle"
                            : "PDF Önizle"}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // Gerçek dosya adını çıkar
                            const urlParts = dekont.dosya_url!.split("/");
                            const actualFilename =
                              urlParts[urlParts.length - 1];
                            downloadFile(dekont.dosya_url!, actualFilename);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Dosyayı İndir
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => handleApprove(dekont)}
                    disabled={dekont.onay_durumu !== "bekliyor"}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-md disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-2" /> Onayla
                  </button>
                  <button
                    onClick={() => handleReject(dekont)}
                    disabled={dekont.onay_durumu !== "bekliyor"}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" /> Reddet
                  </button>
                  <button
                    onClick={() => handleDelete(dekont)}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Önceki
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Gösteriliyor{" "}
                  <span className="font-medium">{startIndex + 1}</span> -{" "}
                  <span className="font-medium">
                    {Math.min(endIndex, filteredDekontlar.length)}
                  </span>{" "}
                  /{" "}
                  <span className="font-medium">
                    {filteredDekontlar.length}
                  </span>
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Önceki</span>‹
                  </button>
                  {(() => {
                    const maxVisiblePages = 5;
                    const pages = [];

                    if (totalPages <= maxVisiblePages + 2) {
                      // Show all pages if total is small
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Smart pagination logic
                      if (currentPage <= 3) {
                        // Show first pages + ellipsis + last
                        for (let i = 1; i <= maxVisiblePages; i++) {
                          pages.push(i);
                        }
                        pages.push("...");
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        // Show first + ellipsis + last pages
                        pages.push(1);
                        pages.push("...");
                        for (
                          let i = totalPages - maxVisiblePages + 1;
                          i <= totalPages;
                          i++
                        ) {
                          pages.push(i);
                        }
                      } else {
                        // Show first + ellipsis + middle pages + ellipsis + last
                        pages.push(1);
                        pages.push("...");
                        for (
                          let i = currentPage - 1;
                          i <= currentPage + 1;
                          i++
                        ) {
                          pages.push(i);
                        }
                        pages.push("...");
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((page, index) => {
                      if (page === "...") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                          >
                            ...
                          </span>
                        );
                      }

                      const pageNum = page as number;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Sonraki</span>›
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedDekont && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Dekont Onayı</h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedDekont.ogrenci_ad} -{" "}
                {formatCurrency(selectedDekont.miktar)} -{" "}
                {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={submitApprove}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Onayla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedDekont && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Dekont Reddi</h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedDekont.ogrenci_ad} -{" "}
                {formatCurrency(selectedDekont.miktar)} -{" "}
                {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red gerekçesi"
                className="w-full border border-gray-300 rounded-md p-2 h-24 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={submitReject}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedDekont && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Dekont Silme</h2>
              <p className="text-sm text-gray-600 mb-4">
                {selectedDekont.ogrenci_ad} -{" "}
                {formatCurrency(selectedDekont.miktar)} -{" "}
                {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Bu dekontu silmek istediğinizden emin misiniz? Bu işlem geri
                alınamaz.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={() =>
                    selectedDekont && deleteDekont(selectedDekont.id)
                  }
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Modal */}
        {showBulkDeleteModal && selectedIds.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Toplu Silme</h2>
              <p className="text-sm text-gray-600 mb-4">
                Seçili {selectedIds.length} dekontu silmek istediğinizden emin
                misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onaylanmış Silme Uyarısı Modal */}
        {showApprovedDeleteWarning && selectedDekont && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                Onaylı Dekontu Silme
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Bu dekont zaten onaylanmış. Silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {showImageModal && selectedImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={(e) => {
              // Overlay'e tıklanırsa modalı kapat
              if (e.target === e.currentTarget) {
                closeModals();
              }
            }}
            onKeyDown={(e) => {
              // ESC tuşuna basılırsa modalı kapat
              if (e.key === "Escape") {
                closeModals();
              }
            }}
            tabIndex={-1}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden relative">
              {/* Sticky Header - Her zaman görünür */}
              <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10 shadow-sm">
                <h2 className="text-lg font-semibold truncate pr-4">
                  {selectedImageName || "Dosya Önizleme"}
                </h2>
                <button
                  onClick={closeModals}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Kapat"
                  title="Kapat (ESC)"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {isImageFile(selectedImageUrl) ? (
                  <img
                    src={selectedImageUrl}
                    alt={selectedImageName || "Dosya Önizleme"}
                    className="max-w-full h-auto mx-auto block"
                    style={{ maxHeight: "none" }}
                  />
                ) : (
                  <iframe
                    src={selectedImageUrl}
                    title="PDF Önizleme"
                    className="w-full h-[70vh] border-0"
                  />
                )}
              </div>

              {/* Fixed Close Button - Sağ üst köşede her zaman görünür */}
              <button
                onClick={closeModals}
                className="absolute top-2 right-2 z-20 w-10 h-10 flex items-center justify-center text-white bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full transition-all shadow-lg"
                aria-label="Kapat"
                title="Kapat (ESC)"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Uyarı</h2>
              <p className="text-sm text-gray-600 mb-4">{warningMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi File Upload Modal */}
        <MultiFileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            setShowUploadModal(false);
            fetchDekontlar(); // Refresh the list
          }}
        />

        {/* ZIP Download Modal */}
        {showZipModal && (
          <ZipDownloadModal
            isOpen={showZipModal}
            onClose={() => setShowZipModal(false)}
            dekontlar={filteredDekontlar}
          />
        )}

        {/* Reports Modal */}
        <DekontReportsModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
        />

        {/* Class Reports Modal */}
        <ClassReportsModal
          isOpen={showClassReportsModal}
          onClose={() => setShowClassReportsModal(false)}
        />

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={showExcelImportModal}
          onClose={() => setShowExcelImportModal(false)}
          onImportComplete={() => {
            setShowExcelImportModal(false);
            fetchDekontlar(); // Refresh the list
            fetchModalStatistics(); // Refresh statistics
          }}
        />

        {/* Status Detail Modal */}
        {showStatusModal && selectedDekont && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Dekont Durumu</h2>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Öğrenci:{" "}
                  </span>
                  <span className="text-sm text-gray-900">
                    {selectedDekont.ogrenci_ad}
                  </span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Dönem:{" "}
                  </span>
                  <span className="text-sm text-gray-900">
                    {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
                  </span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Tutar:{" "}
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(selectedDekont.miktar)}
                  </span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Durum:{" "}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                      STATUS_COLORS[selectedDekont.onay_durumu]
                    }`}
                  >
                    {STATUS_LABELS[selectedDekont.onay_durumu]}
                  </span>
                </div>

                {selectedDekont.onay_durumu === "reddedildi" &&
                  selectedDekont.red_nedeni && (
                    <div>
                      <span className="text-sm font-medium text-red-700">
                        Red Gerekçesi:{" "}
                      </span>
                      <div className="text-sm text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200">
                        {selectedDekont.red_nedeni}
                      </div>
                    </div>
                  )}

                {selectedDekont.aciklama && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Açıklama:{" "}
                    </span>
                    <div className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                      {selectedDekont.aciklama}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <div>
                    Yükleyen: {removeParentheses(selectedDekont.yukleyen_kisi)}
                  </div>
                  <div>Tarih: {formatDateTime(selectedDekont.created_at)}</div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Suspense>
  );
}
