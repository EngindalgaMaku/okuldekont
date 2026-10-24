"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Delete,
  GraduationCap,
  Loader2,
  LogOut,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { DatabaseStatusHeader } from "@/components/ui/DatabaseStatus";
import { useEgitimYili } from "@/lib/context/EgitimYiliContext";
import { DEMO_PIN, DEMO_TEACHER_ID, startDemoMode } from "@/lib/demo-mode";

interface Isletme {
  id: string;
  name: string;
  contact: string;
}

interface Ogretmen {
  id: string;
  name: string;
  surname: string;
}

type LoginType = "isletme" | "ogretmen";

// Son giriş yapılan hesap: ertesi gün tek dokunuşla PIN ekranına geçmek için
interface LastEntity {
  type: LoginType;
  id: string;
  name: string;
  surname?: string;
  contact?: string;
}

const LAST_ENTITY_KEY = "lastLoginEntity";

function readLastEntity(): LastEntity | null {
  try {
    const raw = localStorage.getItem(LAST_ENTITY_KEY);
    return raw ? (JSON.parse(raw) as LastEntity) : null;
  } catch {
    return null;
  }
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function displayNameOf(item: Isletme | Ogretmen, type: LoginType) {
  return type === "isletme"
    ? (item as Isletme).name
    : `${(item as Ogretmen).name} ${(item as Ogretmen).surname}`;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function Avatar({ name, type, size = "md" }: { name: string; type: LoginType; size?: "md" | "lg" }) {
  const sizes = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-base";
  const colors =
    type === "isletme"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-indigo-100 text-indigo-700";
  return (
    <div className={`${sizes} ${colors} shrink-0 rounded-full flex items-center justify-center font-semibold`}>
      {initialsOf(name)}
    </div>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled: boolean;
}) {
  const keyClass =
    "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full text-2xl font-medium text-slate-900 bg-slate-100 active:bg-slate-300 hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center justify-center mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4 [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button key={digit} type="button" className={keyClass} disabled={disabled} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <div />
      <button type="button" className={keyClass} disabled={disabled} onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full text-slate-600 active:bg-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 flex items-center justify-center mx-auto"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Geri sil"
      >
        <Delete className="h-7 w-7" />
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { okulAdi } = useEgitimYili();
  const { data: session, status: sessionStatus } = useSession();

  const [loginType, setLoginType] = useState<LoginType>("isletme");
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null);
  const [selectedOgretmen, setSelectedOgretmen] = useState<Ogretmen | null>(null);
  const [lastEntity, setLastEntity] = useState<LastEntity | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<(Isletme | Ogretmen)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [step, setStep] = useState(1);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const [loginControlSettings, setLoginControlSettings] = useState({
    enableCompanyLogin: false,
    enableTeacherLogin: false,
    loading: true,
  });

  const fetchLoginControlSettings = useCallback(async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/public/system-settings?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();

      const settingsMap: { [key: string]: any } = {};
      if (data) {
        for (const setting of data) {
          settingsMap[setting.key] = setting.value;
        }
      }

      const enableCompanyLogin = settingsMap.enable_company_login === "true";
      const enableTeacherLogin = settingsMap.enable_teacher_login === "true";

      setLoginControlSettings({ enableCompanyLogin, enableTeacherLogin, loading: false });
      return { enableCompanyLogin, enableTeacherLogin };
    } catch (error) {
      console.error("Login control settings fetch error:", error);
      // Default to disabled if fetch fails for security
      setLoginControlSettings({ enableCompanyLogin: false, enableTeacherLogin: false, loading: false });
      return { enableCompanyLogin: false, enableTeacherLogin: false };
    }
  }, []);

  // Load login control settings and set initial login type
  useEffect(() => {
    const initializeLoginPage = async () => {
      const settings = await fetchLoginControlSettings();
      setLastEntity(readLastEntity());

      // Load last login type from localStorage, but respect admin settings
      const lastLoginType = localStorage.getItem("lastLoginType") as LoginType | null;

      if (lastLoginType === "isletme" && settings.enableCompanyLogin) {
        setLoginType("isletme");
      } else if (lastLoginType === "ogretmen" && settings.enableTeacherLogin) {
        setLoginType("ogretmen");
      } else if (settings.enableCompanyLogin) {
        setLoginType("isletme");
      } else if (settings.enableTeacherLogin) {
        setLoginType("ogretmen");
      }
    };

    initializeLoginPage();
  }, [fetchLoginControlSettings]);

  // Re-fetch settings when page becomes visible (to catch admin changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLoginControlSettings();
      }
    };
    const handleFocus = () => fetchLoginControlSettings();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLoginControlSettings]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const searchInDatabase = useCallback(
    async (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      // Demo hesabı veritabanında yok; "demo" aramasında arama sonucundan bağımsız olarak eklenir
      const demoEntry =
        loginType === "ogretmen" && term.trim().toLocaleLowerCase("tr-TR").startsWith("demo")
          ? [{ id: DEMO_TEACHER_ID, name: "Demo", surname: "Öğretmen" }]
          : [];
      // Sunucu yanıtını beklemeden göster
      if (demoEntry.length) setSearchResults(demoEntry);
      try {
        const endpoint = loginType === "isletme" ? "/api/search/companies" : "/api/search/teachers";
        const response = await fetch(`${endpoint}?term=${encodeURIComponent(term)}&limit=20`);
        if (!response.ok) {
          throw new Error(loginType === "isletme" ? "İşletme arama başarısız" : "Öğretmen arama başarısız");
        }
        const data = await response.json();
        setSearchResults([...demoEntry, ...(Array.isArray(data) ? data : [])]);
      } catch (error) {
        console.error("Arama hatası:", error);
        setSearchResults(demoEntry);
      } finally {
        setIsSearching(false);
      }
    },
    [loginType]
  );

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchInDatabase(debouncedSearchTerm);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm, searchInDatabase]);

  const resetSelection = () => {
    setSelectedIsletme(null);
    setSelectedOgretmen(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  useEffect(() => {
    resetSelection();
  }, [loginType]);

  // Arama ekranı açılınca klavyeyi aç
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const goToPin = () => {
    setPinError("");
    setPinInput("");
    setStep(2);
  };

  const handleItemSelect = (item: Isletme | Ogretmen) => {
    if (loginType === "isletme") {
      setSelectedIsletme(item as Isletme);
    } else {
      setSelectedOgretmen(item as Ogretmen);
    }
    setIsSearchOpen(false);
    goToPin();
  };

  const handleLastEntitySelect = (entity: LastEntity) => {
    if (entity.type === "isletme") {
      setSelectedIsletme({ id: entity.id, name: entity.name, contact: entity.contact || "" });
    } else {
      setSelectedOgretmen({ id: entity.id, name: entity.name, surname: entity.surname || "" });
    }
    goToPin();
  };

  const backToSelection = () => {
    setStep(1);
    setPinInput("");
    setPinError("");
    setIsLoggingIn(false);
    setLastSubmitTime(0);
  };

  const handlePinSubmit = async () => {
    // Prevent multiple submissions
    const now = Date.now();
    if (isLoggingIn || now - lastSubmitTime < 1000) {
      return;
    }

    setLastSubmitTime(now);
    setPinError("");
    setIsLoggingIn(true);

    const isIsletme = loginType === "isletme";
    const selectedEntity = isIsletme ? selectedIsletme : selectedOgretmen;

    if (!selectedEntity) {
      setPinError("Bir seçim yapılmamış. Lütfen geri dönüp tekrar deneyin.");
      setIsLoggingIn(false);
      return;
    }

    if (!pinInput || pinInput.length !== 4) {
      setPinError("Lütfen 4 haneli PIN kodunuzu tam olarak girin.");
      setIsLoggingIn(false);
      return;
    }

    // Demo hesabı: sunucuya giriş yapılmaz, uydurma verilerle çalışan demo modu açılır
    if (!isIsletme && selectedEntity.id === DEMO_TEACHER_ID) {
      if (pinInput === DEMO_PIN) {
        startDemoMode();
        window.location.href = "/ogretmen/panel";
      } else {
        setPinError("PIN kodu hatalı.");
        setPinInput("");
        setIsLoggingIn(false);
      }
      return;
    }

    try {
      const result = await signIn("pin", {
        redirect: false,
        type: isIsletme ? "isletme" : "ogretmen",
        entityId: selectedEntity.id,
        pin: pinInput,
        ipAddress: "not-collected", // Sunucu tarafında toplanacak
        userAgent: navigator.userAgent,
      });

      if (result?.ok) {
        localStorage.setItem("lastLoginType", isIsletme ? "isletme" : "ogretmen");
        try {
          const remembered: LastEntity = isIsletme
            ? { type: "isletme", id: selectedEntity.id, name: (selectedEntity as Isletme).name, contact: (selectedEntity as Isletme).contact }
            : { type: "ogretmen", id: selectedEntity.id, name: (selectedEntity as Ogretmen).name, surname: (selectedEntity as Ogretmen).surname };
          localStorage.setItem(LAST_ENTITY_KEY, JSON.stringify(remembered));
        } catch {}

        showToast({
          type: "success",
          title: "Giriş Başarılı",
          message: `Hoşgeldiniz, ${displayNameOf(selectedEntity, loginType)}!`,
          duration: 3000,
        });

        setPinInput("");
        router.push(isIsletme ? "/isletme" : "/ogretmen/panel");
      } else {
        const errorMessage =
          result?.error === "CredentialsSignin"
            ? "PIN kodu hatalı veya hesabınız bloke edilmiş olabilir."
            : result?.error || "Hatalı PIN kodu veya sistem hatası";
        setPinError(errorMessage);
        setPinInput("");
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error("PIN check error:", error);
      setPinError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setPinInput("");
      setIsLoggingIn(false);
    }
  };

  // PIN 4 hane olduğunda otomatik giriş yap (debounced)
  useEffect(() => {
    if (pinInput.length === 4 && step === 2 && !isLoggingIn) {
      const timer = setTimeout(() => {
        handlePinSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pinInput, step, isLoggingIn]);

  const addDigit = useCallback(
    (digit: string) => {
      if (isLoggingIn) return;
      setPinError("");
      setPinInput((prev) => (prev.length >= 4 ? prev : prev + digit));
    },
    [isLoggingIn]
  );

  const removeDigit = useCallback(() => {
    if (isLoggingIn) return;
    setPinInput((prev) => prev.slice(0, -1));
  }, [isLoggingIn]);

  // Bilgisayarda PIN klavyeden de yazılabilsin
  useEffect(() => {
    if (step !== 2) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) addDigit(e.key);
      else if (e.key === "Backspace") removeDigit();
      else if (e.key === "Escape") backToSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, addDigit, removeDigit]);

  // Bu cihazda geçerli bir oturum varsa giriş formu yerine bunu açıkça göster
  const sessionRole = sessionStatus === "authenticated" ? session?.user?.role : undefined;
  const activeSessionPath =
    sessionRole === "TEACHER"
      ? "/ogretmen/panel"
      : sessionRole === "COMPANY"
      ? "/isletme"
      : sessionRole === "ADMIN"
      ? "/admin"
      : null;

  const bothEnabled = loginControlSettings.enableCompanyLogin && loginControlSettings.enableTeacherLogin;
  const anyEnabled = loginControlSettings.enableCompanyLogin || loginControlSettings.enableTeacherLogin;
  const typeLabel = loginType === "isletme" ? "işletme" : "öğretmen";
  const selectedEntity = loginType === "isletme" ? selectedIsletme : selectedOgretmen;
  const showLastEntity =
    lastEntity &&
    lastEntity.type === loginType &&
    ((lastEntity.type === "isletme" && loginControlSettings.enableCompanyLogin) ||
      (lastEntity.type === "ogretmen" && loginControlSettings.enableTeacherLogin));
  const lastEntityName = lastEntity
    ? lastEntity.type === "isletme"
      ? lastEntity.name
      : `${lastEntity.name} ${lastEntity.surname || ""}`.trim()
    : "";

  const renderSelectionStep = () => (
    <div className="space-y-5">
      {loginControlSettings.loading ? (
        <div className="flex flex-col items-center py-10 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
          <p className="text-sm">Giriş seçenekleri yükleniyor...</p>
        </div>
      ) : !anyEnabled ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold text-amber-900 mb-1">Giriş Geçici Olarak Kapatıldı</h3>
          <p className="text-sm text-amber-700">
            Sistem bakım nedeniyle giriş yapılamıyor. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      ) : (
        <>
          {bothEnabled && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
              {(["isletme", "ogretmen"] as LoginType[]).map((type) => {
                const active = loginType === type;
                const Icon = type === "isletme" ? Building2 : GraduationCap;
                return (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLoginType(type)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {type === "isletme" ? "İşletme" : "Öğretmen"}
                  </button>
                );
              })}
            </div>
          )}

          {showLastEntity && lastEntity && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Son giriş</p>
              <button
                type="button"
                onClick={() => handleLastEntitySelect(lastEntity)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <Avatar name={lastEntityName} type={lastEntity.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{lastEntityName}</p>
                  <p className="text-sm text-slate-500">Devam etmek için dokunun</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          )}

          <div>
            {showLastEntity && (
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Farklı hesap</p>
            )}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100 active:bg-slate-200"
            >
              <Search className="h-5 w-5 text-slate-400" />
              <span className="flex-1 text-slate-500">
                {loginType === "isletme" ? "İşletmenizi seçin" : "Adınızı seçin"}
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderPinStep = () => {
    const name = selectedEntity ? displayNameOf(selectedEntity, loginType) : "";
    return (
      <div className="flex flex-col items-center">
        <Avatar name={name} type={loginType} size="lg" />
        <p className="mt-3 text-lg font-semibold text-slate-900 text-center">{name}</p>
        <p className="mt-1 text-sm text-slate-500">PIN kodunuzu girin</p>

        <div
          key={pinError}
          className={`my-6 flex gap-4 ${pinError ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
          aria-label={`${pinInput.length} / 4 hane girildi`}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full transition-all duration-150 ${
                pinError
                  ? "bg-red-500"
                  : i < pinInput.length
                  ? "bg-indigo-600 scale-110"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="h-10 flex items-center justify-center">
          {isLoggingIn ? (
            <span className="flex items-center gap-2 text-sm text-indigo-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Giriş yapılıyor...
            </span>
          ) : pinError ? (
            <p className="text-sm text-red-600 text-center" role="alert" aria-live="assertive">
              {pinError}
            </p>
          ) : null}
        </div>

        <div className="mt-2 w-full max-w-[18rem]">
          <Keypad onDigit={addDigit} onBackspace={removeDigit} disabled={isLoggingIn} />
        </div>

        <button
          type="button"
          onClick={backToSelection}
          className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Farklı bir hesapla giriş yap
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-indigo-600 via-indigo-600 to-violet-600 sm:items-center sm:justify-center sm:bg-gradient-to-br sm:from-slate-50 sm:via-slate-50 sm:to-indigo-50 sm:p-6">
      <div className="flex flex-1 flex-col sm:flex-none sm:w-full sm:max-w-md sm:overflow-hidden sm:rounded-3xl sm:bg-white sm:shadow-xl sm:border sm:border-slate-100">
        {/* Üst bölüm */}
        <header
          className={`relative px-6 text-center text-white sm:bg-gradient-to-br sm:from-indigo-600 sm:to-violet-600 ${
            step === 2 ? "pt-10 pb-8" : "pt-14 pb-10 sm:pt-10"
          }`}
        >
          {step === 2 && (
            <button
              type="button"
              onClick={backToSelection}
              className="absolute left-3 top-3 rounded-full p-2 text-white/90 hover:bg-white/10 active:bg-white/20"
              aria-label="Geri"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <div className={step === 2 ? "pt-8" : "pt-10 sm:pt-0"}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo_kucuk.png" alt="" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">K-Panel</h1>
            <p className="mt-1 text-sm text-white/80">{okulAdi || "Koordinatörlük Takip Uygulaması"}</p>
          </div>
        </header>

        {/* İçerik */}
        <main
          className="flex-1 rounded-t-3xl bg-white px-6 pt-7 sm:rounded-none"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
        >
          {activeSessionPath && !isLoggingIn ? (
            <div>
              <h2 className="mb-1 text-xl font-semibold text-slate-900">Oturumunuz açık</h2>
              <p className="mb-6 text-sm text-slate-500">
                Bu cihazda daha önce giriş yapılmış. Devam edebilir veya çıkış yapabilirsiniz.
              </p>
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Avatar
                  name={session?.user?.name || "K"}
                  type={session?.user?.role === "COMPANY" ? "isletme" : "ogretmen"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{session?.user?.name}</p>
                  <p className="text-sm text-slate-500">
                    {session?.user?.role === "COMPANY"
                      ? "İşletme"
                      : session?.user?.role === "ADMIN"
                      ? "Yönetici"
                      : "Öğretmen"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(activeSessionPath)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
              >
                Panele devam et
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => signOut({ redirect: false })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200"
              >
                <LogOut className="h-5 w-5" />
                Çıkış yap
              </button>
            </div>
          ) : step === 1 && (
            <>
              <h2 className="mb-1 text-xl font-semibold text-slate-900">Giriş yapın</h2>
              <p className="mb-6 text-sm text-slate-500">
                Koordinatörlük takip sistemine {typeLabel} hesabınızla girin.
              </p>
              {renderSelectionStep()}
            </>
          )}
          {!(activeSessionPath && !isLoggingIn) && step === 2 && renderPinStep()}

          <div className="mt-8">
            <DatabaseStatusHeader />
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            <a href="/gizlilik" className="hover:text-slate-600 hover:underline">
              Gizlilik Politikası
            </a>
          </p>
        </main>
      </div>

      {/* Tam ekran arama */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-white sm:items-center sm:justify-start sm:bg-slate-900/40 sm:p-6 sm:pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={loginType === "isletme" ? "İşletme seçin" : "Öğretmen seçin"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSearchOpen(false);
          }}
        >
          <div className="flex flex-1 flex-col sm:flex-none sm:w-full sm:max-w-md sm:max-h-[70vh] sm:overflow-hidden sm:rounded-2xl sm:bg-white sm:shadow-2xl">
            <div
              className="flex items-center gap-2 border-b border-slate-200 px-2 py-2"
              style={{ paddingTop: "max(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)), 0.5rem)" }}
            >
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                aria-label="Kapat"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={loginType === "isletme" ? "İşletme adı ara" : "Adınızı veya soyadınızı yazın"}
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
              />
              {isSearching ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-500" />
              ) : searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Temizle"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((item) => {
                    const name = displayNameOf(item, loginType);
                    return (
                      <li key={String(item.id)}>
                        <button
                          type="button"
                          onClick={() => handleItemSelect(item)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100"
                        >
                          <Avatar name={name} type={loginType} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">{name}</p>
                            {loginType === "isletme" && (item as Isletme).contact && (
                              <p className="truncate text-sm text-slate-500">Yetkili: {(item as Isletme).contact}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center px-6 py-16 text-center text-slate-500">
                  <Search className="mb-3 h-10 w-10 text-slate-300" />
                  {searchTerm.length < 2 ? (
                    <p className="text-sm">Aramak için en az 2 harf yazın</p>
                  ) : isSearching || searchTerm !== debouncedSearchTerm ? (
                    <p className="text-sm">Aranıyor...</p>
                  ) : (
                    <p className="text-sm">&ldquo;{searchTerm}&rdquo; için sonuç bulunamadı</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
