"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Unlock,
  Send,
  Bell,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  CreditCard,
  UserPlus,
  Loader,
  X,
  Users,
  Calendar,
  History,
  AlertTriangle,
  GitMerge,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyQuickPinButton from "./CompanyQuickPinButton";
import IsletmelerActions from "./IsletmelerActions";
import Modal from "@/components/ui/Modal";
import CompanyHistoryModal from "./CompanyHistoryModal";
import { toast } from "react-hot-toast";
import {
  getCompanyTypeLabel,
  getCompanyTypeBadgeClass,
  type CompanyType,
} from "@/lib/company-utils";

// Helper function for government contribution badge
const getContributionBadgeClass = (contribution?: string) => {
  if (contribution === "Evet") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (contribution === "Hayır") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
};

const getContributionLabel = (contribution?: string) => {
  if (contribution === "Evet") return "✓ Devlet Katkısı";
  if (contribution === "Hayır") return "✗ Katkısız";
  return "? Belirtilmemiş";
};

interface Company {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
  pin?: string;
  companyType: CompanyType;
  stateContributionRequest?: string;
  _count?: {
    students: number;
  };
  teacher?: {
    name: string;
    surname: string;
  };
  isLocked?: boolean;
}

interface Teacher {
  id: string;
  name: string;
  surname: string;
  alan?: {
    id: string;
    name: string;
  };
}

interface YeniIsletmeFormData {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  pin: string;
  usta_ogretici_ad: string;
  usta_ogretici_telefon: string;
}

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface SearchParams {
  page?: string;
  search?: string;
  filter?: string;
  companyType?: string;
  contributionFilter?: string;
  per_page?: string;
}

interface IsletmelerServerPrismaProps {
  searchParams: SearchParams;
}

export default function IsletmelerServerPrisma({
  searchParams,
}: IsletmelerServerPrismaProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("");
  const [contributionFilterInput, setContributionFilterInput] = useState("");
  const [securityStatuses, setSecurityStatuses] = useState<Record<string, any>>(
    {}
  );
  const [unlockingCompanies, setUnlockingCompanies] = useState<Set<string>>(
    new Set()
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [mesajModalOpen, setMesajModalOpen] = useState(false);
  const [mesajData, setMesajData] = useState({
    title: "",
    content: "",
    priority: "NORMAL" as "LOW" | "NORMAL" | "HIGH",
  });
  const [sending, setSending] = useState(false);

  // Bulk Company Type Update States
  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    companyType: "GOVERNMENT" as CompanyType,
    reason: "",
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Bulk Government Contribution Update States
  const [bulkContributionModalOpen, setBulkContributionModalOpen] =
    useState(false);
  const [bulkContributionData, setBulkContributionData] = useState({
    stateContributionRequest: "Evet" as string,
    reason: "",
  });
  const [bulkContributionUpdating, setBulkContributionUpdating] =
    useState(false);

  // Duplicate Companies States
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] =
    useState<any>(null);
  const [mergeInProgress, setMergeInProgress] = useState(false);

  // Yeni İşletme Modal States
  const [yeniIsletmeModalOpen, setYeniIsletmeModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [yeniIsletmeFormData, setYeniIsletmeFormData] =
    useState<YeniIsletmeFormData>({
      name: "",
      contact: "",
      phone: "",
      email: "",
      address: "",
      taxNumber: "",
      pin: "",
      usta_ogretici_ad: "",
      usta_ogretici_telefon: "",
    });

  // Öğrenci Listesi Modal States
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [selectedCompanyStudents, setSelectedCompanyStudents] = useState<any[]>(
    []
  );
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedCompanyForStudents, setSelectedCompanyForStudents] =
    useState<Company | null>(null);

  // Company History Modal States
  const [companyHistoryModalOpen, setCompanyHistoryModalOpen] = useState(false);
  const [selectedCompanyForHistory, setSelectedCompanyForHistory] =
    useState<Company | null>(null);

  const router = useRouter();

  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  const filter = searchParams.filter || "";
  const companyType = searchParams.companyType || "";
  const contributionFilter = searchParams.contributionFilter || "";
  const perPage = parseInt(searchParams.per_page || "10");

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        filter,
        companyType,
        contributionFilter,
        per_page: perPage.toString(),
      });

      const response = await fetch(`/api/admin/companies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İşletmeler yüklenirken hata oluştu");
      }

      console.log("API Response:", data);
      const companiesData = data.data || [];
      setCompanies(companiesData);
      setPagination(data.pagination || null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      setRetryCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search, filter, companyType, contributionFilter, perPage]);

  // Real-time search with debounce (only for search input)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchInput !== search) {
        const params = new URLSearchParams();
        if (searchInput.trim()) params.set("search", searchInput.trim());
        if (filterInput) params.set("filter", filterInput);
        if (companyTypeFilter) params.set("companyType", companyTypeFilter);
        if (contributionFilterInput)
          params.set("contributionFilter", contributionFilterInput);
        params.set("page", "1");
        params.set("per_page", perPage.toString());

        router.push(`/admin/isletmeler?${params.toString()}`);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, router, search, perPage]);

  // Immediate filtering for dropdowns (no debounce)
  useEffect(() => {
    if (
      filterInput !== filter ||
      companyTypeFilter !== companyType ||
      contributionFilterInput !== contributionFilter
    ) {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterInput) params.set("filter", filterInput);
      if (companyTypeFilter) params.set("companyType", companyTypeFilter);
      if (contributionFilterInput)
        params.set("contributionFilter", contributionFilterInput);
      params.set("page", "1");
      params.set("per_page", perPage.toString());

      router.push(`/admin/isletmeler?${params.toString()}`);
    }
  }, [
    filterInput,
    companyTypeFilter,
    contributionFilterInput,
    router,
    search,
    filter,
    companyType,
    contributionFilter,
    perPage,
  ]);

  // Listen for custom event from IsletmelerClient to open create modal
  useEffect(() => {
    const handleOpenCreateModalEvent = () => {
      setYeniIsletmeFormData({
        name: "",
        contact: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        pin: "",
        usta_ogretici_ad: "",
        usta_ogretici_telefon: "",
      });
      setYeniIsletmeModalOpen(true);
    };

    window.addEventListener("openCreateModal", handleOpenCreateModalEvent);

    const handleOpenDuplicatesModalEvent = () => {
      fetchDuplicates();
    };

    window.addEventListener(
      "openDuplicatesModal",
      handleOpenDuplicatesModalEvent
    );

    return () => {
      window.removeEventListener("openCreateModal", handleOpenCreateModalEvent);
      window.removeEventListener(
        "openDuplicatesModal",
        handleOpenDuplicatesModalEvent
      );
    };
  }, []);

  useEffect(() => {
    setSearchInput(search);
    setFilterInput(filter);
    setCompanyTypeFilter(companyType);
    setContributionFilterInput(contributionFilter);
  }, [search, filter, companyType, contributionFilter]);

  // Security status kontrollerini devre dışı bırak - gereksiz
  // useEffect(() => {
  //   // Security status kontrolleri kaldırıldı
  // }, [companies])

  // Handle unlock company
  const handleUnlockCompany = async (companyId: string) => {
    setUnlockingCompanies((prev) => new Set(prev).add(companyId));
    try {
      const response = await fetch("/api/admin/security/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "company", entityId: companyId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Blok açılırken hata oluştu");
      }

      toast.success("İşletme bloğu başarıyla açıldı!");

      // Refresh security status for this company
      const statusResponse = await fetch("/api/admin/security/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "company", entityId: companyId }),
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setSecurityStatuses((prev) => ({ ...prev, [companyId]: status }));
      }
    } catch (error: any) {
      toast.error(error.message || "Blok açılırken hata oluştu.");
    } finally {
      setUnlockingCompanies((prev) => {
        const newSet = new Set(prev);
        newSet.delete(companyId);
        return newSet;
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCompanies(companies.map((c) => c.id));
    } else {
      setSelectedCompanies([]);
    }
  };

  const handleSelectCompany = (companyId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompanies((prev) => [...prev, companyId]);
    } else {
      setSelectedCompanies((prev) => prev.filter((id) => id !== companyId));
    }
  };

  const handleSendMesaj = async () => {
    if (!mesajData.title.trim() || !mesajData.content.trim()) {
      toast.error("Başlık ve içerik zorunludur!");
      return;
    }

    if (selectedCompanies.length === 0) {
      toast.error("Lütfen en az bir işletme seçin!");
      return;
    }

    setSending(true);
    try {
      // Seçili işletmelere mesaj gönder (işletme contact'larına)
      const notifications = selectedCompanies.map((companyId) => ({
        recipient_id: companyId,
        recipient_type: "isletme",
        title: mesajData.title,
        content: mesajData.content,
        priority: mesajData.priority,
        sent_by: "Admin",
        is_read: false,
      }));

      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) {
        throw new Error("API isteği başarısız");
      }

      toast.success(
        `${selectedCompanies.length} işletmeye mesaj başarıyla gönderildi!`
      );
      setMesajModalOpen(false);
      setMesajData({ title: "", content: "", priority: "NORMAL" });
      setSelectedCompanies([]);
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
      toast.error("Mesaj gönderilirken hata oluştu!");
    } finally {
      setSending(false);
    }
  };

  // Handle bulk company type update
  const handleBulkCompanyTypeUpdate = async () => {
    if (!bulkUpdateData.companyType) {
      toast.error("Lütfen bir şirket türü seçin!");
      return;
    }

    if (selectedCompanies.length === 0) {
      toast.error("Lütfen en az bir işletme seçin!");
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch("/api/admin/companies/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyIds: selectedCompanies,
          companyType: bulkUpdateData.companyType,
          reason:
            bulkUpdateData.reason ||
            `Bulk update to ${getCompanyTypeLabel(bulkUpdateData.companyType)}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk update failed");
      }

      if (data.success && data.results.updated > 0) {
        toast.success(
          `${data.results.updated} işletme başarıyla ${getCompanyTypeLabel(
            bulkUpdateData.companyType
          )} olarak işaretlendi!`
        );

        // Show details if there were any failures
        if (data.results.failed > 0) {
          toast.error(
            `${data.results.failed} işletme güncellenirken hata oluştu.`
          );
        }
      } else {
        toast.error(data.message || "Bulk update başarısız oldu");
      }

      setBulkUpdateModalOpen(false);
      setBulkUpdateData({ companyType: "GOVERNMENT", reason: "" });
      setSelectedCompanies([]);

      // Refresh companies list
      await fetchCompanies();
    } catch (error) {
      console.error("Bulk update hatası:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Bulk update sırasında hata oluştu!"
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  // Handle bulk government contribution update
  const handleBulkContributionUpdate = async () => {
    if (!bulkContributionData.stateContributionRequest) {
      toast.error("Lütfen bir devlet katkısı durumu seçin!");
      return;
    }

    if (selectedCompanies.length === 0) {
      toast.error("Lütfen en az bir işletme seçin!");
      return;
    }

    setBulkContributionUpdating(true);
    try {
      const response = await fetch(
        "/api/admin/companies/bulk-contribution-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyIds: selectedCompanies,
            stateContributionRequest:
              bulkContributionData.stateContributionRequest,
            reason:
              bulkContributionData.reason ||
              `Toplu güncelleme: ${getContributionLabel(
                bulkContributionData.stateContributionRequest
              )}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Toplu güncelleme başarısız oldu");
      }

      if (data.success && data.results.updated > 0) {
        toast.success(
          `${
            data.results.updated
          } işletmenin devlet katkısı durumu başarıyla ${getContributionLabel(
            bulkContributionData.stateContributionRequest
          )} olarak güncellendi!`
        );

        // Show details if there were any failures
        if (data.results.failed > 0) {
          toast.error(
            `${data.results.failed} işletme güncellenirken hata oluştu.`
          );
        }
      } else {
        toast.error(data.message || "Toplu güncelleme başarısız oldu");
      }

      setBulkContributionModalOpen(false);
      setBulkContributionData({ stateContributionRequest: "Evet", reason: "" });
      setSelectedCompanies([]);

      // Refresh companies list
      await fetchCompanies();
    } catch (error) {
      console.error("Toplu devlet katkısı güncellemesi hatası:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Toplu güncelleme sırasında hata oluştu!"
      );
    } finally {
      setBulkContributionUpdating(false);
    }
  };

  // Fetch duplicate companies
  const fetchDuplicates = async () => {
    setDuplicatesLoading(true);
    try {
      const response = await fetch("/api/admin/companies/duplicates");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Duplicate işletmeler yüklenirken hata oluştu"
        );
      }

      setDuplicateGroups(data.duplicateGroups || []);
      setDuplicatesModalOpen(true);

      if (data.duplicateGroups.length === 0) {
        toast.success("Tebrikler! Duplicate işletme bulunamadı.");
      } else {
        toast(
          "🔍 " +
            `${data.totalDuplicates} duplicate işletme ${data.duplicateGroups.length} grupta tespit edildi.`,
          {
            duration: 4000,
            style: { background: "#3B82F6", color: "white" },
          }
        );
      }
    } catch (error) {
      console.error("Duplicate detection error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Duplicate tespit edilirken hata oluştu"
      );
    } finally {
      setDuplicatesLoading(false);
    }
  };

  // Handle company merge
  const handleMergeCompanies = async (
    primaryCompanyId: string,
    duplicateCompanyIds: string[]
  ) => {
    setMergeInProgress(true);
    try {
      const response = await fetch("/api/admin/companies/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryCompanyId,
          duplicateCompanyIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Şirket birleştirme işlemi başarısız");
      }

      toast.success(
        `${data.mergedCompanies.length + 1} şirket başarıyla birleştirildi!`
      );

      // Show transfer summary
      const report = data.transferReport;
      const transferSummary = [
        report.students > 0 && `${report.students} öğrenci`,
        report.stajlar > 0 && `${report.stajlar} staj`,
        report.dekontlar > 0 && `${report.dekontlar} dekont`,
        report.monthlyPayments > 0 && `${report.monthlyPayments} aylık ödeme`,
      ]
        .filter(Boolean)
        .join(", ");

      if (transferSummary) {
        toast("✅ " + `Transfer edildi: ${transferSummary}`, {
          duration: 4000,
          style: { background: "#10B981", color: "white" },
        });
      }

      // Close modals and refresh data
      setMergeModalOpen(false);
      setDuplicatesModalOpen(false);
      setSelectedDuplicateGroup(null);

      // Refresh companies list
      await fetchCompanies();
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Birleştirme sırasında hata oluştu"
      );
    } finally {
      setMergeInProgress(false);
    }
  };

  const isAllSelected =
    companies.length > 0 && selectedCompanies.length === companies.length;
  const isPartiallySelected =
    selectedCompanies.length > 0 && selectedCompanies.length < companies.length;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);
    params.set("page", newPage.toString());
    params.set("per_page", perPage.toString());

    router.push(`/admin/isletmeler?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilterInput("");
    setCompanyTypeFilter("");
    setContributionFilterInput("");
    router.push("/admin/isletmeler");
  };

  const handleRetry = () => {
    fetchCompanies();
  };

  // Open create modal
  const handleOpenCreateModal = async () => {
    setYeniIsletmeFormData({
      name: "",
      contact: "",
      phone: "",
      email: "",
      address: "",
      taxNumber: "",
      pin: "",
      usta_ogretici_ad: "",
      usta_ogretici_telefon: "",
    });
    setYeniIsletmeModalOpen(true);
  };

  // Validate form data
  const validateFormData = (data: YeniIsletmeFormData): string[] => {
    const errors: string[] = [];

    if (!data.name.trim()) {
      errors.push("İşletme adı zorunludur");
    } else if (data.name.trim().length < 2) {
      errors.push("İşletme adı en az 2 karakter olmalıdır");
    }

    if (!data.contact.trim()) {
      errors.push("Yetkili kişi zorunludur");
    } else if (data.contact.trim().length < 2) {
      errors.push("Yetkili kişi en az 2 karakter olmalıdır");
    }

    if (data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push("Geçerli bir e-posta adresi girin");
      }
    }

    if (data.pin.trim()) {
      const pinRegex = /^\d{4}$/;
      if (!pinRegex.test(data.pin.trim())) {
        errors.push("PIN kodu 4 haneli sayı olmalıdır");
      }
    }

    if (data.phone.trim()) {
      // Daha esnek telefon validasyonu - uluslararası formatları da destekler
      const cleanPhone = data.phone.trim().replace(/[\s\-\(\)]/g, "");
      const phoneRegex = /^(\+\d{1,3})?\d{10,14}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errors.push(
          "Geçerli bir telefon numarası girin (örn: +90 555 123 45 67 veya +1 555 123 4567)"
        );
      }
    }

    return errors;
  };

  // Handle create company
  const handleCreateCompany = async () => {
    const errors = validateFormData(yeniIsletmeFormData);

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: yeniIsletmeFormData.name.trim(),
          contact: yeniIsletmeFormData.contact.trim(),
          phone: yeniIsletmeFormData.phone.trim() || null,
          email: yeniIsletmeFormData.email.trim() || null,
          address: yeniIsletmeFormData.address.trim() || null,
          taxNumber: yeniIsletmeFormData.taxNumber.trim() || null,
          pin: yeniIsletmeFormData.pin.trim() || null,
          usta_ogretici_ad: yeniIsletmeFormData.usta_ogretici_ad.trim() || null,
          usta_ogretici_telefon:
            yeniIsletmeFormData.usta_ogretici_telefon.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İşletme oluşturulurken hata oluştu");
      }

      toast.success(data.message || "İşletme başarıyla oluşturuldu!");
      setYeniIsletmeModalOpen(false);

      // Reset form
      setYeniIsletmeFormData({
        name: "",
        contact: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        pin: "",
        usta_ogretici_ad: "",
        usta_ogretici_telefon: "",
      });

      // Refresh companies list
      await fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || "İşletme oluşturulurken hata oluştu");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle form field changes
  const handleFormFieldChange = (
    field: keyof YeniIsletmeFormData,
    value: string
  ) => {
    setYeniIsletmeFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Fetch company students
  const fetchCompanyStudents = async (company: Company) => {
    setStudentsLoading(true);
    setSelectedCompanyForStudents(company);
    setStudentsModalOpen(true);

    try {
      const response = await fetch(
        `/api/admin/companies/${company.id}/students`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Öğrenci listesi alınamadı");
      }

      setSelectedCompanyStudents(data || []);
    } catch (error) {
      console.error("Students fetch error:", error);
      toast.error("Öğrenci listesi yüklenirken hata oluştu");
      setSelectedCompanyStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Handle student count click
  const handleStudentCountClick = (company: Company) => {
    if (company._count?.students && company._count.students > 0) {
      fetchCompanyStudents(company);
    }
  };

  // Handle company history
  const handleCompanyHistory = (company: Company) => {
    setSelectedCompanyForHistory(company);
    setCompanyHistoryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">İşletmeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Veri Yükleme Hatası
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            {retryCount > 0 && (
              <p className="text-sm text-red-600">
                Deneme sayısı: {retryCount}
              </p>
            )}
          </div>
          <button
            onClick={handleRetry}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            İşletme Yönetimi
          </h1>
          <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-base">
            Sistemdeki tüm işletmeleri yönetin
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IsletmelerActions
            companies={companies}
            searchParams={searchParams}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-3">
          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="İşletme adı, yetkili veya telefon ile ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Filtre ve Butonlar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterInput}
                  onChange={(e) => setFilterInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none text-sm"
                >
                  <option value="">Durum: Tümü</option>
                  <option value="active">Aktif Stajı Olanlar</option>
                  <option value="empty">Boş İşletmeler</option>
                </select>
              </div>
            </div>
            {/* Company Type Filter */}
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={companyTypeFilter}
                  onChange={(e) => setCompanyTypeFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none text-sm"
                >
                  <option value="">Tür: Tümü</option>
                  <option value="government">Kamu Kurumları</option>
                  <option value="private">Özel İşletmeler</option>
                </select>
              </div>
            </div>
            {/* Government Contribution Filter */}
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={contributionFilterInput}
                  onChange={(e) => setContributionFilterInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none text-sm"
                >
                  <option value="">Katkı: Tümü</option>
                  <option value="Evet">Devlet Katkısı İstiyor</option>
                  <option value="Hayır">Devlet Katkısı İstemiyor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block">
        {companies.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Bulk Actions */}
            {selectedCompanies.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedCompanies.length} işletme seçildi
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBulkUpdateModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Kurum Türü Değiştir
                    </button>
                    <button
                      onClick={() => setBulkContributionModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Katkı Durumu Değiştir
                    </button>
                    {/* Mesaj Gönder butonu şimdilik gizlendi */}
                    {/*
                    <button
                      onClick={() => setMesajModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mesaj Gönder
                    </button>
                    */}
                  </div>
                </div>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartiallySelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşletme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kurum Türü
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devlet Katkısı
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yetkili Kişi & İletişim
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koordinatör
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci Sayısı
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={(e) =>
                          handleSelectCompany(company.id, e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/isletmeler/${company.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate block"
                        >
                          {company.name}
                        </Link>
                        {company.address && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {company.address}
                          </div>
                        )}
                        {securityStatuses[company.id]?.isLocked && (
                          <div className="text-xs text-red-600 flex items-center mt-1">
                            <Shield className="w-3 h-3 mr-1" />
                            Blokeli
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCompanyTypeBadgeClass(
                          company.companyType
                        )}`}
                      >
                        {getCompanyTypeLabel(company.companyType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getContributionBadgeClass(
                          company.stateContributionRequest
                        )}`}
                      >
                        {getContributionLabel(company.stateContributionRequest)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {company.contact || "-"}
                        </div>
                        {company.phone && (
                          <a
                            href={`tel:${company.phone}`}
                            className="text-sm text-indigo-600 hover:text-indigo-900"
                          >
                            {company.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.teacher
                          ? `${company.teacher.name} ${company.teacher.surname}`
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleStudentCountClick(company)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          company._count?.students &&
                          company._count.students > 0
                            ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 cursor-pointer"
                            : "bg-gray-100 text-gray-600 cursor-default"
                        }`}
                        disabled={
                          !company._count?.students ||
                          company._count.students === 0
                        }
                      >
                        {company._count?.students || 0} öğrenci
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {securityStatuses[company.id]?.isLocked && (
                          <button
                            onClick={() => handleUnlockCompany(company.id)}
                            disabled={unlockingCompanies.has(company.id)}
                            className="inline-flex items-center p-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Bloğu Aç"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCompanyHistory(company)}
                          className="inline-flex items-center p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                          title="İşletme Geçmişi"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <CompanyQuickPinButton
                          company={{ id: company.id, name: company.name }}
                        />
                        <Link
                          href={`/admin/isletmeler/${company.id}`}
                          className="inline-flex items-center p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              İşletme bulunamadı
            </h3>
            <p className="text-gray-600 mb-6">
              {companies.length === 0 && !error && !loading
                ? "Sistemde henüz işletme kaydı bulunmuyor."
                : "Arama kriterlerinizle eşleşen işletme bulunmuyor."}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View - Hidden on desktop */}
      <div className="lg:hidden">
        {/* Bulk Actions for Mobile */}
        {selectedCompanies.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-blue-700">
                {selectedCompanies.length} işletme seçildi
              </span>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setBulkUpdateModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Kurum Türü Değiştir
                </button>
                <button
                  onClick={() => setBulkContributionModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Katkı Durumu Değiştir
                </button>
                {/* Mesaj Gönder butonu şimdilik gizlendi */}
                {/*
                <button
                  onClick={() => setMesajModalOpen(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Mesaj Gönder
                </button>
                */}
              </div>
            </div>
          </div>
        )}

        {/* Select All for Mobile */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isPartiallySelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700">Tümünü Seç</span>
          </label>
        </div>

        {companies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={(e) =>
                        handleSelectCompany(company.id, e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/isletmeler/${company.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-900 text-sm truncate block"
                      >
                        {company.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStudentCountClick(company)}
                          className={`text-xs transition-colors ${
                            company._count?.students &&
                            company._count.students > 0
                              ? "text-indigo-600 hover:text-indigo-900 cursor-pointer"
                              : "text-gray-500 cursor-default"
                          }`}
                          disabled={
                            !company._count?.students ||
                            company._count.students === 0
                          }
                        >
                          {company._count?.students || 0} öğrenci
                        </button>
                        {securityStatuses[company.id]?.isLocked && (
                          <span className="text-xs text-red-600 flex items-center">
                            <Shield className="w-3 h-3 mr-1" />
                            Blokeli
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCompanyTypeBadgeClass(
                          company.companyType
                        )}`}
                      >
                        {getCompanyTypeLabel(company.companyType)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {securityStatuses[company.id]?.isLocked && (
                      <button
                        onClick={() => handleUnlockCompany(company.id)}
                        disabled={unlockingCompanies.has(company.id)}
                        className="p-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                        title="Bloğu Aç"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCompanyHistory(company)}
                      className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                      title="İşletme Geçmişi"
                    >
                      <History className="h-3.5 w-3.5" />
                    </button>
                    <CompanyQuickPinButton
                      company={{ id: company.id, name: company.name }}
                    />
                    <Link
                      href={`/admin/isletmeler/${company.id}`}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                      title="Detayları Görüntüle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {company.contact && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Yetkili:</span>
                      <span className="ml-1 break-words">
                        {company.contact}
                      </span>
                    </p>
                  )}
                  {company.phone && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Tel:</span>
                      <a
                        href={`tel:${company.phone}`}
                        className="ml-1 text-indigo-600 hover:text-indigo-900"
                      >
                        {company.phone}
                      </a>
                    </p>
                  )}
                  {company.teacher && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Koordinatör:</span>
                      <span className="ml-1">
                        {company.teacher.name} {company.teacher.surname}
                      </span>
                    </p>
                  )}
                  {company.address && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      <span className="font-medium">Adres:</span>
                      <span className="ml-1 break-words">
                        {company.address}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              İşletme bulunamadı
            </h3>
            <p className="text-sm text-gray-600 mb-4 px-4">
              {companies.length === 0 && !error && !loading
                ? "Sistemde henüz işletme kaydı bulunmuyor."
                : "Arama kriterlerinizle eşleşen işletme bulunmuyor."}
            </p>
          </div>
        )}
      </div>

      {/* Mesaj Gönderme Modalı */}
      <Modal
        isOpen={mesajModalOpen}
        onClose={() => setMesajModalOpen(false)}
        title="Seçili İşletmelere Mesaj Gönder"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Bell className="h-5 w-5" />
              <span className="font-medium">
                {selectedCompanies.length} işletmeye mesaj gönderilecek
              </span>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Seçili işletmeler:{" "}
              {companies
                .filter((c) => selectedCompanies.includes(c.id))
                .map((c) => c.name)
                .join(", ")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={mesajData.title}
              onChange={(e) =>
                setMesajData({ ...mesajData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mesaj başlığını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçerik <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mesajData.content}
              onChange={(e) =>
                setMesajData({ ...mesajData, content: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mesaj içeriğini girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öncelik
            </label>
            <select
              value={mesajData.priority}
              onChange={(e) =>
                setMesajData({
                  ...mesajData,
                  priority: e.target.value as "LOW" | "NORMAL" | "HIGH",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LOW">Düşük</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Yüksek</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setMesajModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={sending}
            >
              İptal
            </button>
            <button
              onClick={handleSendMesaj}
              disabled={sending}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50"
            >
              {sending ? "Gönderiliyor..." : "Mesaj Gönder"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Yeni İşletme Ekleme Modal'ı */}
      <Modal
        isOpen={yeniIsletmeModalOpen}
        onClose={() => setYeniIsletmeModalOpen(false)}
        title="Yeni İşletme Ekle"
      >
        <div className="space-y-6">
          {/* Temel Bilgiler Bölümü */}
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Temel Bilgiler
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İşletme Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={yeniIsletmeFormData.name}
                  onChange={(e) =>
                    handleFormFieldChange("name", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="İşletme adını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yetkili Kişi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={yeniIsletmeFormData.contact}
                  onChange={(e) =>
                    handleFormFieldChange("contact", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Yetkili kişi adı soyadı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={yeniIsletmeFormData.phone}
                  onChange={(e) =>
                    handleFormFieldChange("phone", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0555 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  E-posta
                </label>
                <input
                  type="email"
                  value={yeniIsletmeFormData.email}
                  onChange={(e) =>
                    handleFormFieldChange("email", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ornek@sirket.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Adres
              </label>
              <textarea
                value={yeniIsletmeFormData.address}
                onChange={(e) =>
                  handleFormFieldChange("address", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="İşletme adresi"
              />
            </div>
          </div>

          {/* Teknik & Mali Bilgiler Bölümü */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                <CreditCard className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Teknik & Mali Bilgiler
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Vergi Numarası
                </label>
                <input
                  type="text"
                  value={yeniIsletmeFormData.taxNumber}
                  onChange={(e) =>
                    handleFormFieldChange("taxNumber", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN Kodu (4 haneli)
                </label>
                <input
                  type="text"
                  value={yeniIsletmeFormData.pin}
                  onChange={(e) => {
                    // Sadece sayı girişine izin ver
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    handleFormFieldChange("pin", value);
                  }}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  placeholder="0000 (boş bırakılırsa otomatik oluşturulur)"
                />
              </div>
            </div>
          </div>

          {/* Usta Öğretici Bölümü */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                <UserPlus className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Usta Öğretici
              </h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Usta Öğretici:</strong> İşletmede stajyer öğrencilere
                rehberlik edecek deneyimli personel bilgileri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Usta Öğretici Ad Soyad
                </label>
                <input
                  type="text"
                  value={yeniIsletmeFormData.usta_ogretici_ad}
                  onChange={(e) =>
                    handleFormFieldChange("usta_ogretici_ad", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Usta Öğretici Telefon
                </label>
                <input
                  type="tel"
                  value={yeniIsletmeFormData.usta_ogretici_telefon}
                  onChange={(e) =>
                    handleFormFieldChange(
                      "usta_ogretici_telefon",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0555 123 45 67"
                />
              </div>
            </div>
          </div>

          {/* Form Butonları */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={() => setYeniIsletmeModalOpen(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={createLoading}
            >
              <X className="h-4 w-4 mr-2 inline" />
              İptal
            </button>
            <button
              onClick={handleCreateCompany}
              disabled={
                createLoading ||
                !yeniIsletmeFormData.name.trim() ||
                !yeniIsletmeFormData.contact.trim()
              }
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
            >
              {createLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  İşletme Oluştur
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Öğrenci Listesi Modal'ı */}
      <Modal
        isOpen={studentsModalOpen}
        onClose={() => setStudentsModalOpen(false)}
        title={`${
          selectedCompanyForStudents?.name || "İşletme"
        } - Öğrenci Listesi`}
      >
        <div className="space-y-4">
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600">Öğrenciler yükleniyor...</p>
              </div>
            </div>
          ) : selectedCompanyStudents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Aktif Stajyer Öğrenciler
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedCompanyStudents.length} öğrenci
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {selectedCompanyStudents.map((student: any) => (
                    <div
                      key={student.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <User className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {student.ad} {student.soyad}
                              </h4>
                              <p className="text-xs text-gray-600">
                                No: {student.no} • Sınıf: {student.sinif}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 ml-11">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="text-xs">
                                <span className="font-medium text-gray-700">
                                  Alan:
                                </span>
                                <span className="ml-1 text-gray-600">
                                  {student.alanlar?.name || "Bilinmiyor"}
                                </span>
                              </div>
                              <div className="text-xs">
                                <span className="font-medium text-gray-700">
                                  Koordinatör:
                                </span>
                                <span className="ml-1 text-gray-600">
                                  {student.ogretmen_ad} {student.ogretmen_soyad}
                                  {student.ogretmen_alan && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      {student.ogretmen_alan}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Staj Dönemi */}
                            <div className="bg-white rounded-lg border border-indigo-100 p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 text-green-600 mr-1.5" />
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Başlangıç
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {new Date(
                                          student.baslangic_tarihi
                                        ).toLocaleDateString("tr-TR")}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-8 w-px bg-gray-300"></div>

                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 text-red-600 mr-1.5" />
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Bitiş
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {new Date(
                                          student.bitis_tarihi
                                        ).toLocaleDateString("tr-TR")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Öğrenci Bulunamadı
              </h3>
              <p className="text-gray-600">
                Bu işletmede aktif staj yapan öğrenci bulunmuyor.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={() => setStudentsModalOpen(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Company Type Update Modal */}
      <Modal
        isOpen={bulkUpdateModalOpen}
        onClose={() => setBulkUpdateModalOpen(false)}
        title="Toplu Kurum Türü Değişikliği"
      >
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">
                {selectedCompanies.length} işletmenin kurum türü değiştirilecek
              </span>
            </div>
            <div className="mt-2 text-sm text-yellow-600">
              Seçili işletmeler:{" "}
              {companies
                .filter((c) => selectedCompanies.includes(c.id))
                .map((c) => c.name)
                .slice(0, 3)
                .join(", ")}
              {selectedCompanies.length > 3 &&
                ` ve ${selectedCompanies.length - 3} diğeri...`}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Kurum Türü <span className="text-red-500">*</span>
            </label>
            <select
              value={bulkUpdateData.companyType}
              onChange={(e) =>
                setBulkUpdateData({
                  ...bulkUpdateData,
                  companyType: e.target.value as CompanyType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="GOVERNMENT">Kamu Kurumu</option>
              <option value="PRIVATE">Özel Sektör</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {bulkUpdateData.companyType === "GOVERNMENT"
                ? "Kamu kurumları için dekont yüklemesi zorunlu değildir."
                : "Özel sektör işletmeleri için dekont yüklemesi zorunludur."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Değişiklik Nedeni
            </label>
            <textarea
              value={bulkUpdateData.reason}
              onChange={(e) =>
                setBulkUpdateData({ ...bulkUpdateData, reason: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Toplu değişiklik nedeni (isteğe bağlı)"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              Bu işlem şunları yapacak:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Seçili {selectedCompanies.length} işletmenin kurum türünü
                güncelleyecek
              </li>
              <li>• Her değişiklik için sistem geçmişinde kayıt oluşturacak</li>
              <li>• Dekont yükleme gereksinimlerini otomatik güncelleyecek</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setBulkUpdateModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={bulkUpdating}
            >
              İptal
            </button>
            <button
              onClick={handleBulkCompanyTypeUpdate}
              disabled={bulkUpdating}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {bulkUpdating ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  {selectedCompanies.length} İşletmeyi Güncelle
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Government Contribution Update Modal */}
      <Modal
        isOpen={bulkContributionModalOpen}
        onClose={() => setBulkContributionModalOpen(false)}
        title="Toplu Devlet Katkısı Güncelleme"
      >
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700">
              <CreditCard className="h-5 w-5" />
              <span className="font-medium">
                {selectedCompanies.length} işletmenin devlet katkısı durumu
                değiştirilecek
              </span>
            </div>
            <div className="mt-2 text-sm text-emerald-600">
              Seçili işletmeler:{" "}
              {companies
                .filter((c) => selectedCompanies.includes(c.id))
                .map((c) => c.name)
                .slice(0, 3)
                .join(", ")}
              {selectedCompanies.length > 3 &&
                ` ve ${selectedCompanies.length - 3} diğeri...`}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devlet Katkısı Durumu <span className="text-red-500">*</span>
            </label>
            <select
              value={bulkContributionData.stateContributionRequest}
              onChange={(e) =>
                setBulkContributionData({
                  ...bulkContributionData,
                  stateContributionRequest: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="Evet">✓ Devlet Katkısı İstiyor</option>
              <option value="Hayır">✗ Devlet Katkısı İstemiyor</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {bulkContributionData.stateContributionRequest === "Evet"
                ? "İşletmeler devlet katkısı isteyecek şekilde işaretlenecek."
                : "İşletmeler devlet katkısı istemeyecek şekilde işaretlenecek."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Değişiklik Nedeni
            </label>
            <textarea
              value={bulkContributionData.reason}
              onChange={(e) =>
                setBulkContributionData({
                  ...bulkContributionData,
                  reason: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Toplu değişiklik nedeni (isteğe bağlı)"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              Bu işlem şunları yapacak:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Seçili {selectedCompanies.length} işletmenin devlet katkısı
                durumunu güncelleyecek
              </li>
              <li>• Her değişiklik için sistem geçmişinde kayıt oluşturacak</li>
              <li>• İşletme listesinde yeni durumu gösterecek</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setBulkContributionModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={bulkContributionUpdating}
            >
              İptal
            </button>
            <button
              onClick={handleBulkContributionUpdate}
              disabled={bulkContributionUpdating}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {bulkContributionUpdating ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {selectedCompanies.length} İşletmeyi Güncelle
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-3 sm:space-y-0">
            {/* Mobil: Basit sayfa bilgisi */}
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              <span className="sm:hidden">
                Sayfa {pagination.page} / {pagination.totalPages} (
                {pagination.totalCount} kayıt)
              </span>
              <span className="hidden sm:inline">
                Toplam{" "}
                <span className="font-medium">{pagination.totalCount}</span>{" "}
                işletme,
                <span className="font-medium"> {pagination.page}</span> /{" "}
                <span className="font-medium">{pagination.totalPages}</span>{" "}
                sayfa
              </span>
            </div>

            {/* Sayfalama butonları */}
            <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className={`inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasPrev
                    ? "bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"
                    : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Önceki</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(3, pagination.totalPages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 2) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 1) {
                      pageNum = pagination.totalPages - 2 + i;
                    } else {
                      pageNum = pagination.page - 1 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                          pageNum === pagination.page
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className={`inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasNext
                    ? "bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"
                    : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span className="hidden sm:inline">Sonraki</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company History Modal */}
      {selectedCompanyForHistory && (
        <CompanyHistoryModal
          isOpen={companyHistoryModalOpen}
          onClose={() => setCompanyHistoryModalOpen(false)}
          company={selectedCompanyForHistory}
        />
      )}

      {/* Duplicate Companies Detection Modal */}
      <Modal
        isOpen={duplicatesModalOpen}
        onClose={() => setDuplicatesModalOpen(false)}
        title="Duplicate İşletme Tespiti"
      >
        <div className="space-y-6">
          {duplicatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600">
                  Duplicate işletmeler tespit ediliyor...
                </p>
              </div>
            </div>
          ) : duplicateGroups.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    {duplicateGroups.length} grup duplicate işletme tespit
                    edildi
                  </span>
                </div>
                <div className="mt-2 text-sm text-orange-600">
                  Toplam{" "}
                  {duplicateGroups.reduce(
                    (sum, group) => sum + group.companies.length,
                    0
                  )}{" "}
                  duplicate işletme bulundu.
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-4">
                {duplicateGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Grup {groupIndex + 1}: "{group.normalizedName}"
                        </h4>
                        <p className="text-sm text-gray-600">
                          {group.companies.length} benzer işletme
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDuplicateGroup(group);
                          setMergeModalOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                      >
                        <GitMerge className="w-4 h-4 mr-2" />
                        Birleştir
                      </button>
                    </div>

                    <div className="space-y-2">
                      {group.companies.map(
                        (company: any, companyIndex: number) => (
                          <div
                            key={company.id}
                            className="bg-white rounded p-3 border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {company.name}
                                </div>
                                <div className="text-sm text-gray-600 space-x-4">
                                  <span>
                                    👥 {company.studentCount || 0} öğrenci
                                  </span>
                                  <span>
                                    📄 {company.dekontCount || 0} dekont
                                  </span>
                                  <span>🎯 {company.stajCount || 0} staj</span>
                                </div>
                                {companyIndex === 0 && (
                                  <div className="text-xs text-blue-600 mt-1 font-medium">
                                    Grup Total (Unique):{" "}
                                    {group.totalUniqueStudents || 0} öğrenci,{" "}
                                    {group.totalUniqueDekontlar || 0} dekont,{" "}
                                    {group.totalUniqueStajlar || 0} staj
                                  </div>
                                )}
                              </div>
                              {companyIndex === 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                  Ana Kayıt
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Copy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Duplicate İşletme Bulunamadı
              </h3>
              <p className="text-gray-600">
                Sistemde duplicate işletme kaydı tespit edilmedi. Tüm işletmeler
                benzersiz.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setDuplicatesModalOpen(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
            {duplicateGroups.length === 0 && (
              <button
                onClick={fetchDuplicates}
                disabled={duplicatesLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
              >
                {duplicatesLoading
                  ? "Kontrol Ediliyor..."
                  : "Tekrar Kontrol Et"}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Company Merge Modal */}
      <Modal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="İşletmeleri Birleştir"
      >
        <div className="space-y-6">
          {selectedDuplicateGroup && (
            <>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    DİKKAT: Bu işlem geri alınamaz!
                  </span>
                </div>
                <div className="mt-2 text-sm text-red-600">
                  {selectedDuplicateGroup.companies.length - 1} işletme
                  silinecek ve tüm verileri ana kayda aktarılacak.
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Ana Kayıt (Korunacak):
                </h4>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="font-medium text-green-900">
                    {selectedDuplicateGroup.companies[0].name}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Tüm duplicate veriler bu kayda aktarılacak
                  </div>
                  <div className="text-sm text-green-600 space-x-4 mt-2">
                    <span>
                      👥 {selectedDuplicateGroup.companies[0].studentCount || 0}{" "}
                      öğrenci
                    </span>
                    <span>
                      📄 {selectedDuplicateGroup.companies[0].dekontCount || 0}{" "}
                      dekont
                    </span>
                    <span>
                      🎯 {selectedDuplicateGroup.companies[0].stajCount || 0}{" "}
                      staj
                    </span>
                  </div>
                </div>

                <h4 className="font-medium text-gray-900">
                  Silinecek Kayıtlar:
                </h4>
                <div className="space-y-2">
                  {selectedDuplicateGroup.companies
                    .slice(1)
                    .map((company: any) => (
                      <div
                        key={company.id}
                        className="bg-red-50 rounded-lg p-4 border border-red-200"
                      >
                        <div className="font-medium text-red-900">
                          {company.name}
                        </div>
                        <div className="text-sm text-red-600 space-x-4 mt-1">
                          <span>👥 {company.studentCount || 0} öğrenci</span>
                          <span>📄 {company.dekontCount || 0} dekont</span>
                          <span>🎯 {company.stajCount || 0} staj</span>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Birleştirme İşlemi Özeti:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      •{" "}
                      {selectedDuplicateGroup.companies.reduce(
                        (sum: number, c: any) => sum + (c.studentCount || 0),
                        0
                      )}{" "}
                      öğrenci aktarılacak
                    </li>
                    <li>
                      •{" "}
                      {selectedDuplicateGroup.companies.reduce(
                        (sum: number, c: any) => sum + (c.dekontCount || 0),
                        0
                      )}{" "}
                      dekont aktarılacak
                    </li>
                    <li>
                      •{" "}
                      {selectedDuplicateGroup.companies.reduce(
                        (sum: number, c: any) => sum + (c.stajCount || 0),
                        0
                      )}{" "}
                      staj aktarılacak
                    </li>
                    <li>
                      • {selectedDuplicateGroup.companies.length - 1} duplicate
                      kayıt silinecek
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setMergeModalOpen(false);
                setSelectedDuplicateGroup(null);
              }}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={mergeInProgress}
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (selectedDuplicateGroup) {
                  const primaryCompanyId =
                    selectedDuplicateGroup.companies[0].id;
                  const duplicateCompanyIds = selectedDuplicateGroup.companies
                    .slice(1)
                    .map((c: any) => c.id);
                  handleMergeCompanies(primaryCompanyId, duplicateCompanyIds);
                }
              }}
              disabled={mergeInProgress || !selectedDuplicateGroup}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {mergeInProgress ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Birleştiriliyor...
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4 mr-2" />
                  Birleştir ve Sil
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
