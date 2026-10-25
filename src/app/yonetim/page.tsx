"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession, getSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Receipt,
  Users,
  GraduationCap,
  MoreVertical,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  Lock,
  Phone,
  KeyRound,
  Unlock,
  Monitor,
  LogOut,
  Loader2,
  Building2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Maximize2,
  PlayCircle,
  LogIn,
  Home,
  Copy,
  Shuffle,
} from "lucide-react";
import { FileViewer, openFilePreview, prefetchFile } from "@/components/ui/FilePreviewOverlay";
import { DONUS_ANAHTARI } from "@/components/YoneticiOturumu";

type Tab = "anasayfa" | "dekontlar" | "ogretmenler" | "stajlar";
type DekontDurum = "PENDING" | "APPROVED" | "REJECTED";
type DurumFiltre = DekontDurum | "ALL";

const DURUM_STIL: Record<DekontDurum, { ad: string; rozet: string; kutu: string }> = {
  PENDING: { ad: "Onay bekliyor", rozet: "bg-amber-50 text-amber-700 ring-amber-200", kutu: "bg-amber-50 text-amber-800" },
  APPROVED: { ad: "Onaylandı", rozet: "bg-emerald-50 text-emerald-700 ring-emerald-200", kutu: "bg-emerald-50 text-emerald-800" },
  REJECTED: { ad: "Reddedildi", rozet: "bg-red-50 text-red-700 ring-red-200", kutu: "bg-red-50 text-red-800" },
};

const DURUM_FILTRELERI: { id: DurumFiltre; ad: string }[] = [
  { id: "PENDING", ad: "Bekleyen" },
  { id: "APPROVED", ad: "Onaylı" },
  { id: "REJECTED", ad: "Reddedilen" },
  { id: "ALL", ad: "Tümü" },
];

// Son 12 ay: [{ ay, yil }], en yeniden eskiye
const sonAylar = () => {
  const liste: { ay: number; yil: number }[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    liste.push({ ay: t.getMonth() + 1, yil: t.getFullYear() });
  }
  return liste;
};

interface BekleyenDekont {
  id: string;
  miktar: number | null;
  ay: number;
  yil: number;
  sira: number;
  durum: DekontDurum;
  redNedeni: string | null;
  dosyaUrl: string | null;
  yuklenme: string;
  ogrenci: string;
  sinif: string;
  no: string;
  isletme: string;
  ogretmen: string | null;
}

interface Ogretmen {
  id: string;
  ad: string;
  telefon: string | null;
  aktif: boolean;
  alan: string | null;
  aktifStaj: number;
  kilitli: boolean;
  kilitBitis: string | null;
  pinDegismeli: boolean;
}

interface AktifStaj {
  id: string;
  baslangic: string;
  ogrenci: string;
  sinif: string;
  no: string;
  isletme: string;
  ogretmen: string | null;
}

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const RED_NEDENLERI = [
  "Dekont okunmuyor",
  "Yanlış ay",
  "Tutar hatalı",
  "Öğrenci adı görünmüyor",
  "Başka öğrenciye ait",
];

const FESIH_NEDENLERI = [
  "Öğrenci işletmeden ayrıldı",
  "İşletme değişikliği",
  "Nakil / okul değişikliği",
  "Devamsızlık",
];

const formatTL = (n: number) =>
  n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

const gunOnce = (tarih: string) => {
  const gun = Math.floor((Date.now() - new Date(tarih).getTime()) / 86400000);
  if (gun <= 0) return "bugün";
  if (gun === 1) return "dün";
  return `${gun} gün önce`;
};

const bugunISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const hataMesaji = async (res: Response, varsayilan: string) => {
  const data = await res.json().catch(() => ({}));
  const err = data?.error;
  return (typeof err === "string" ? err : err?.message) || data?.message || varsayilan;
};

// Yöneticiyi öğretmen hesabına geçirir; dönüş belirteci "Yöneticiye dön" şeridi için saklanır
async function ogretmenHesabinaGir(teacherId: string) {
  const res = await fetch(`/api/admin/mobil/ogretmenler/${teacherId}/oturum`, { method: "POST" });
  if (!res.ok) throw new Error(await hataMesaji(res, "Öğretmen hesabına girilemedi"));
  const { girisToken, donusToken } = await res.json();
  try {
    sessionStorage.setItem(DONUS_ANAHTARI, donusToken);
  } catch {}
  const sonuc = await signIn("yonetici-ogretmen", { token: girisToken, redirect: false });
  if (sonuc?.error) throw new Error("Öğretmen hesabına girilemedi");
  window.location.href = "/ogretmen/panel";
}

// Aynı içerik akışını kullanan alt pencere (bottom sheet)
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Android geri tuşu pencereyi kapatsın
    // Effect iki kez çalışırsa (React geliştirme modu) ikinci kayıt eklenmesin
    if (!window.history.state?.yonetimSheet) {
      window.history.pushState({ ...(window.history.state || {}), yonetimSheet: true }, "");
    }
    const onPop = () => {
      if (!window.history.state?.yonetimSheet) onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const kapat = () => {
    if (window.history.state?.yonetimSheet) window.history.back();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        style={{ paddingBottom: "calc(1.25rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={kapat} className="-mr-2 -mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AramaKutusu({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>
  );
}

function BosDurum({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-slate-500">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
      {text}
    </div>
  );
}

function YoneticiGiris() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const girisYap = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setGonderiliyor(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setHata("E-posta veya şifre hatalı.");
        return;
      }
      const session = await getSession();
      if (session?.user?.role !== "ADMIN") {
        await signOut({ redirect: false });
        setHata("Bu hesabın yönetici yetkisi yok.");
      }
    } catch {
      setHata("Giriş sırasında bir hata oluştu.");
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white px-6 pt-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_kucuk.png" alt="K-Panel" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">K-Panel</h1>
            <p className="text-sm text-slate-500">Yönetici girişi</p>
          </div>
        </div>
        <form onSubmit={girisYap} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Şifre</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {hata && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p>}
          <button
            type="submit"
            disabled={gonderiliyor}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {gonderiliyor && <Loader2 className="h-4 w-4 animate-spin" />}
            Giriş yap
          </button>
        </form>
        <p className="mt-8 text-center text-sm">
          <a href="/" className="text-slate-500 hover:underline">← Öğretmen girişine dön</a>
        </p>
      </div>
    </div>
  );
}

const onizlemeAdresi = (d: BekleyenDekont) =>
  d.dosyaUrl ? `/api/admin/dekontlar/preview/${d.dosyaUrl.split("/").pop() || ""}` : undefined;
const indirmeAdresi = (d: BekleyenDekont) =>
  d.dosyaUrl ? `/api/admin/dekontlar/download/${d.dosyaUrl.split("/").pop() || ""}` : undefined;

// Tam ekran inceleme: üstte dekont, altta bilgiler ve karar düğmeleri
function IncelemeEkrani({
  liste,
  index,
  onIndex,
  onKapat,
  onOnayla,
  onReddet,
  isleniyor,
  kararModu,
}: {
  liste: BekleyenDekont[];
  index: number;
  onIndex: (i: number) => void;
  onKapat: () => void;
  onOnayla: (d: BekleyenDekont) => void;
  onReddet: (d: BekleyenDekont) => void;
  isleniyor: string | null;
  kararModu: boolean;
}) {
  const onKapatRef = useRef(onKapat);
  onKapatRef.current = onKapat;
  const dokunma = useRef<{ x: number; y: number } | null>(null);
  const d = liste[index];

  useEffect(() => {
    // Android geri tuşu inceleme ekranını kapatsın
    if (!window.history.state?.yonetimInceleme) {
      window.history.pushState({ ...(window.history.state || {}), yonetimInceleme: true }, "");
    }
    const onPop = () => {
      if (!window.history.state?.yonetimInceleme) onKapatRef.current();
    };
    window.addEventListener("popstate", onPop);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = "";
    };
  }, []);

  const kapat = () => {
    if (window.history.state?.yonetimInceleme) window.history.back();
    else onKapat();
  };

  const onceki = () => index > 0 && onIndex(index - 1);
  const sonraki = () => index < liste.length - 1 && onIndex(index + 1);

  // Sıradaki dekontu önceden indir
  useEffect(() => {
    const s = liste[index + 1];
    if (s) prefetchFile(onizlemeAdresi(s));
  }, [liste, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[aria-modal='true'][aria-label='Dekontu reddet']")) return;
      if (e.key === "ArrowRight") onIndex(Math.min(index + 1, liste.length - 1));
      else if (e.key === "ArrowLeft") onIndex(Math.max(index - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, liste.length, onIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    dokunma.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const bas = dokunma.current;
    dokunma.current = null;
    if (!bas) return;
    const dx = e.changedTouches[0].clientX - bas.x;
    const dy = e.changedTouches[0].clientY - bas.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0) sonraki();
      else onceki();
    }
  };

  const src = d ? onizlemeAdresi(d) : undefined;
  const mesgul = !!d && isleniyor === d.id;
  const kararVerilebilir = kararModu && d?.durum === "PENDING";

  return (
    <div className="fixed inset-0 z-[140] flex flex-col bg-slate-900" role="dialog" aria-modal="true" aria-label="Dekont inceleme">
      <div
        className="flex items-center gap-1 bg-indigo-700 px-2 py-2 text-white shadow"
        style={{ paddingTop: "max(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)), 0.5rem)" }}
      >
        <button type="button" onClick={kapat} className="rounded-full p-2 hover:bg-white/10 active:bg-white/20" aria-label="Kapat">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <p className="min-w-0 flex-1 truncate font-medium">
          {d ? (
            <>
              Dekont <span className="font-semibold">{index + 1}</span>
              <span className="text-indigo-200"> / {liste.length}</span>
            </>
          ) : (
            "Dekont inceleme"
          )}
        </p>
        {d && src && (
          <button
            type="button"
            onClick={() => openFilePreview({ src, downloadUrl: indirmeAdresi(d), title: `${d.ogrenci} · ${AYLAR[d.ay - 1]} ${d.yil}` })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25 active:bg-white/30"
          >
            <Maximize2 className="h-4 w-4" /> Büyüt
          </button>
        )}
      </div>

      {!d ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Check className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-white">Tüm dekontlar incelendi</p>
          <button type="button" onClick={kapat} className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900">
            Listeye dön
          </button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-y-auto overscroll-contain p-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {src ? (
              <FileViewer key={d.id} src={src} alt={`${d.ogrenci} dekontu`} />
            ) : (
              <BosDurum icon={<Receipt className="h-7 w-7" />} text="Bu dekontta dosya yok." />
            )}
          </div>

          <div
            className="rounded-t-2xl bg-white px-4 pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.25)]"
            style={{ paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold leading-tight text-slate-900">{d.ogrenci}</h2>
                <p className="text-sm text-slate-500">{[d.sinif, d.no && `No ${d.no}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold leading-tight text-slate-900">
                  {d.miktar !== null && d.miktar > 0 ? formatTL(d.miktar) : "Tutar yok"}
                </p>
                <p className="text-sm font-medium text-amber-700">
                  {AYLAR[d.ay - 1]} {d.yil}
                  {d.sira > 1 ? ` · ${d.sira}. dosya` : ""}
                </p>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{d.isletme}</span>
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {d.ogretmen ? `Yükleyen: ${d.ogretmen}` : "Yükleyen: işletme"} · {gunOnce(d.yuklenme)}
            </p>

            <div className="mt-4 flex items-stretch gap-2">
              <button
                type="button"
                onClick={onceki}
                disabled={index === 0}
                className="flex w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"
                aria-label="Önceki dekont"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {kararVerilebilir ? (
                <>
                  <button
                    type="button"
                    onClick={() => onReddet(d)}
                    disabled={mesgul}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3.5 font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" /> Reddet
                  </button>
                  <button
                    type="button"
                    onClick={() => onOnayla(d)}
                    disabled={mesgul}
                    className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" /> Onayla
                  </button>
                </>
              ) : (
                <div className={`flex min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-2 text-sm ${DURUM_STIL[d.durum].kutu}`}>
                  <span className="font-semibold">{DURUM_STIL[d.durum].ad}</span>
                  {d.durum === "REJECTED" && d.redNedeni && <span className="truncate text-xs">{d.redNedeni}</span>}
                  {d.durum === "PENDING" && <span className="text-xs">Karar için &quot;Bekleyen&quot; filtresine geçin</span>}
                </div>
              )}
              <button
                type="button"
                onClick={sonraki}
                disabled={index >= liste.length - 1}
                className="flex w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"
                aria-label="Sonraki dekont"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Onay, "Geri al" süresi dolunca sunucuya gönderilir
const GERI_AL_SURESI = 4000;

function DekontlarSekmesi({ onSayi, incelemeIstegi }: { onSayi: (n: number) => void; incelemeIstegi: number }) {
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>("PENDING");
  const [donem, setDonem] = useState(""); // "yil-ay" veya tüm aylar için ""
  const [liste, setListe] = useState<BekleyenDekont[]>([]);
  const [toplam, setToplam] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState("");
  const [onayBekleyen, setOnayBekleyen] = useState<string | null>(null);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [redDekont, setRedDekont] = useState<BekleyenDekont | null>(null);
  const [redNedeni, setRedNedeni] = useState("");
  const [incele, setIncele] = useState<number | null>(null);
  const onayZamanlayici = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bekleyenOnay = useRef<{ d: BekleyenDekont; index: number; timer: ReturnType<typeof setTimeout> } | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const params = new URLSearchParams({ durum: durumFiltre });
      if (donem) {
        const [yil, ay] = donem.split("-");
        params.set("yil", yil);
        params.set("ay", ay);
      }
      const res = await fetch(`/api/admin/mobil/dekontlar?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await hataMesaji(res, "Dekontlar alınamadı"));
      const data = await res.json();
      setListe(data.dekontlar || []);
      setToplam(data.toplam || 0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setYukleniyor(false);
    }
  }, [durumFiltre, donem]);

  useEffect(() => {
    setIncele(null);
    setListe([]);
    yukle();
  }, [yukle]);

  // Karar yalnızca "Bekleyen" filtresinde verilir; sekme rozeti de tüm bekleyenleri gösterir
  const kararModu = durumFiltre === "PENDING";

  useEffect(() => {
    if (!yukleniyor && kararModu && !donem) onSayi(toplam);
  }, [toplam, yukleniyor, kararModu, donem, onSayi]);

  // Ana sayfadaki "İncele": filtreyi bekleyenlere al, liste gelince ilk dekonttan başlat
  const incelemeBekliyor = useRef(false);
  useEffect(() => {
    if (!incelemeIstegi) return;
    incelemeBekliyor.current = true;
    setDurumFiltre("PENDING");
    setDonem("");
    setArama("");
  }, [incelemeIstegi]);
  useEffect(() => {
    if (incelemeBekliyor.current && !yukleniyor && kararModu && !donem && liste.length > 0) {
      incelemeBekliyor.current = false;
      setIncele(0);
    }
  }, [incelemeIstegi, yukleniyor, kararModu, donem, liste]);

  const listedenCikar = (id: string) => {
    setListe((l) => l.filter((d) => d.id !== id));
    setToplam((t) => Math.max(0, t - 1));
  };

  const listeyeGeriKoy = (d: BekleyenDekont, index: number) => {
    setListe((l) => {
      if (l.some((x) => x.id === d.id)) return l;
      const yeni = [...l];
      yeni.splice(Math.min(index, yeni.length), 0, d);
      return yeni;
    });
    setToplam((t) => t + 1);
  };

  const kararGonder = async (d: BekleyenDekont, decision: "APPROVED" | "REJECTED", rejectReason?: string) => {
    const res = await fetch(`/api/admin/dekontlar/${d.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, ...(rejectReason ? { rejectReason } : {}) }),
      // Sayfa kapanırken gönderilen onay da yarıda kalmasın
      keepalive: true,
    });
    if (!res.ok) throw new Error(await hataMesaji(res, "İşlem yapılamadı"));
  };

  const onayiGonder = async (d: BekleyenDekont, index: number) => {
    try {
      await kararGonder(d, "APPROVED");
    } catch (e) {
      toast.error(`${d.ogrenci}: ${(e as Error).message}`);
      listeyeGeriKoy(d, index);
    }
  };

  // Bekleyen onayı hemen gönder (yeni onay, sekmeden çıkış veya uygulamanın arka plana alınması)
  const bekleyenOnayiGonder = () => {
    const b = bekleyenOnay.current;
    if (!b) return;
    clearTimeout(b.timer);
    bekleyenOnay.current = null;
    onayiGonder(b.d, b.index);
  };
  const bekleyenOnayiGonderRef = useRef(bekleyenOnayiGonder);
  bekleyenOnayiGonderRef.current = bekleyenOnayiGonder;

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") bekleyenOnayiGonderRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      bekleyenOnayiGonderRef.current();
    };
  }, []);

  const geriAl = () => {
    const b = bekleyenOnay.current;
    if (!b) return;
    clearTimeout(b.timer);
    bekleyenOnay.current = null;
    listeyeGeriKoy(b.d, b.index);
    setIncele((i) => (i === null ? null : b.index));
  };

  const onayla = (d: BekleyenDekont) => {
    bekleyenOnayiGonder();
    const index = liste.findIndex((x) => x.id === d.id);
    listedenCikar(d.id);
    const timer = setTimeout(() => {
      bekleyenOnay.current = null;
      onayiGonder(d, index);
    }, GERI_AL_SURESI);
    bekleyenOnay.current = { d, index, timer };
    toast.success(
      (t) => (
        <span className="flex items-center gap-3">
          <span>{d.ogrenci} · onaylandı</span>
          <button
            type="button"
            onClick={() => {
              geriAl();
              toast.dismiss(t.id);
            }}
            className="rounded-md px-2 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Geri al
          </button>
        </span>
      ),
      { id: "dekont-onay", duration: GERI_AL_SURESI }
    );
  };

  const reddet = async (d: BekleyenDekont, neden: string) => {
    setIsleniyor(d.id);
    try {
      await kararGonder(d, "REJECTED", neden);
      listedenCikar(d.id);
      toast.success(`${d.ogrenci} · reddedildi`);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setIsleniyor(null);
    }
  };

  // Listede yanlışlıkla onayı önlemek için iki dokunuş: ilk dokunuş "Emin misiniz?" gösterir
  const onaylaDokun = (d: BekleyenDekont) => {
    if (onayBekleyen === d.id) {
      clearTimeout(onayZamanlayici.current);
      setOnayBekleyen(null);
      onayla(d);
      return;
    }
    setOnayBekleyen(d.id);
    clearTimeout(onayZamanlayici.current);
    onayZamanlayici.current = setTimeout(() => setOnayBekleyen(null), 3000);
  };

  const redAc = (d: BekleyenDekont) => {
    setRedNedeni("");
    setRedDekont(d);
  };

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return liste;
    return liste.filter((d) =>
      [d.ogrenci, d.isletme, d.ogretmen || "", d.no, d.sinif].some((v) => v.toLocaleLowerCase("tr-TR").includes(q))
    );
  }, [liste, arama]);

  // Karar verilen dekont listeden çıkınca aynı sıradaki (yani bir sonraki) dekont gösterilir
  const incelemeIndex = incele === null ? null : Math.min(incele, Math.max(filtreli.length - 1, 0));

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1">
        {DURUM_FILTRELERI.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setDurumFiltre(f.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium ${
              durumFiltre === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            {f.ad}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-1">
        <select
          value={donem}
          onChange={(e) => setDonem(e.target.value)}
          aria-label="Dönem"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Tüm aylar</option>
          {sonAylar().map(({ ay, yil }) => (
            <option key={`${yil}-${ay}`} value={`${yil}-${ay}`}>
              {AYLAR[ay - 1]} {yil}
            </option>
          ))}
        </select>
        <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{toplam}</span>{" "}
          {kararModu ? "onay bekliyor" : "dekont"}
          {toplam > liste.length && liste.length > 0 ? ` · ilk ${liste.length}` : ""}
        </p>
        <button type="button" onClick={yukle} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Yenile">
          <RefreshCw className={`h-4 w-4 ${yukleniyor ? "animate-spin" : ""}`} />
        </button>
      </div>

      {filtreli.length > 0 && (
        <button
          type="button"
          onClick={() => setIncele(0)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
        >
          <PlayCircle className="h-5 w-5" /> Sırayla incele ({filtreli.length})
        </button>
      )}

      {liste.length > 5 && <AramaKutusu value={arama} onChange={setArama} placeholder="Öğrenci, işletme veya öğretmen ara" />}

      {yukleniyor && liste.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : filtreli.length === 0 ? (
        <BosDurum
          icon={<Check className="h-7 w-7" />}
          text={
            arama
              ? "Aramanızla eşleşen dekont yok."
              : kararModu
              ? "Onay bekleyen dekont yok. Hepsi tamam!"
              : "Bu filtreyle eşleşen dekont yok."
          }
        />
      ) : (
        filtreli.map((d, i) => {
          const mesgul = isleniyor === d.id;
          return (
            <article key={d.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <button type="button" onClick={() => setIncele(i)} className="block w-full p-4 text-left hover:bg-slate-50 active:bg-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{d.ogrenci}</h3>
                    <p className="text-xs text-slate-500">
                      {[d.sinif, d.no && `No ${d.no}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {AYLAR[d.ay - 1]} {d.yil}
                      {d.sira > 1 ? ` · ${d.sira}. dosya` : ""}
                    </span>
                    {!kararModu && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${DURUM_STIL[d.durum].rozet}`}>
                        {DURUM_STIL[d.durum].ad}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-slate-700">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{d.isletme}</span>
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="truncate">{d.ogretmen ? `Yükleyen: ${d.ogretmen}` : "Yükleyen: işletme"} · {gunOnce(d.yuklenme)}</span>
                  {d.miktar !== null && d.miktar > 0 && (
                    <span className="shrink-0 text-sm font-semibold text-slate-900">{formatTL(d.miktar)}</span>
                  )}
                </div>
                {d.durum === "REJECTED" && d.redNedeni && (
                  <p className="mt-2 truncate rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">Red nedeni: {d.redNedeni}</p>
                )}
              </button>
              {kararModu && (
              <div className="grid grid-cols-3 border-t border-slate-100 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setIncele(i)}
                  className="flex items-center justify-center gap-1.5 py-3 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Eye className="h-4 w-4" /> İncele
                </button>
                <button
                  type="button"
                  onClick={() => redAc(d)}
                  disabled={mesgul}
                  className="flex items-center justify-center gap-1.5 border-x border-slate-100 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Reddet
                </button>
                <button
                  type="button"
                  onClick={() => onaylaDokun(d)}
                  disabled={mesgul}
                  className={`flex items-center justify-center gap-1.5 py-3 transition-colors disabled:opacity-50 ${
                    onayBekleyen === d.id ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100"
                  }`}
                >
                  {mesgul ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {onayBekleyen === d.id ? "Emin misiniz?" : "Onayla"}
                </button>
              </div>
              )}
            </article>
          );
        })
      )}

      {incelemeIndex !== null && (
        <IncelemeEkrani
          liste={filtreli}
          index={incelemeIndex}
          onIndex={setIncele}
          onKapat={() => setIncele(null)}
          onOnayla={onayla}
          onReddet={redAc}
          isleniyor={isleniyor}
          kararModu={kararModu}
        />
      )}

      {redDekont && (
        <Sheet title="Dekontu reddet" onClose={() => setRedDekont(null)}>
          <p className="mb-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{redDekont.ogrenci}</span> · {redDekont.isletme} ·{" "}
            {AYLAR[redDekont.ay - 1]} {redDekont.yil}
          </p>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Hızlı seçim</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {RED_NEDENLERI.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRedNedeni(n)}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  redNedeni === n ? "bg-red-600 text-white ring-red-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={redNedeni}
            onChange={(e) => setRedNedeni(e.target.value)}
            rows={3}
            placeholder="Red nedeni (öğretmen bu metni görecek)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <button
            type="button"
            disabled={!redNedeni.trim() || isleniyor === redDekont.id}
            onClick={async () => {
              const ok = await reddet(redDekont, redNedeni.trim());
              if (ok) window.history.back();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isleniyor === redDekont.id && <Loader2 className="h-4 w-4 animate-spin" />}
            Reddet
          </button>
        </Sheet>
      )}
    </div>
  );
}

function OgretmenlerSekmesi() {
  const [liste, setListe] = useState<Ogretmen[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Ogretmen | null>(null);
  const [yeniPin, setYeniPin] = useState("");
  const [kaydedilenPin, setKaydedilenPin] = useState<string | null>(null);
  const [isleniyor, setIsleniyor] = useState(false);
  const [pasifleriGoster, setPasifleriGoster] = useState(false);
  const [girisYapiliyor, setGirisYapiliyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const res = await fetch("/api/admin/mobil/ogretmenler", { cache: "no-store" });
      if (!res.ok) throw new Error(await hataMesaji(res, "Öğretmenler alınamadı"));
      const data = await res.json();
      setListe(data.ogretmenler || []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const ac = (o: Ogretmen) => {
    setYeniPin("");
    setKaydedilenPin(null);
    setSecili(o);
  };

  const guncelle = (id: string, alanlar: Partial<Ogretmen>) => {
    setListe((l) => l.map((o) => (o.id === id ? { ...o, ...alanlar } : o)));
    setSecili((s) => (s && s.id === id ? { ...s, ...alanlar } : s));
  };

  const kilidiAc = async (o: Ogretmen) => {
    setIsleniyor(true);
    try {
      const res = await fetch("/api/admin/security/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "teacher", entityId: o.id }),
      });
      if (!res.ok) throw new Error(await hataMesaji(res, "Kilit açılamadı"));
      guncelle(o.id, { kilitli: false, kilitBitis: null });
      toast.success("Kilit açıldı");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsleniyor(false);
    }
  };

  const pinKaydet = async (o: Ogretmen) => {
    if (!/^\d{4}$/.test(yeniPin)) {
      toast.error("PIN 4 haneli olmalı");
      return;
    }
    setIsleniyor(true);
    try {
      const res = await fetch(`/api/admin/teachers/${o.id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: yeniPin }),
      });
      if (!res.ok) throw new Error(await hataMesaji(res, "PIN kaydedilemedi"));
      // PIN değişikliği kilidi de açar
      guncelle(o.id, { kilitli: false, kilitBitis: null, pinDegismeli: false });
      setKaydedilenPin(yeniPin);
      setYeniPin("");
      toast.success("Yeni PIN kaydedildi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsleniyor(false);
    }
  };

  const hesabinaGir = async (o: Ogretmen) => {
    setGirisYapiliyor(true);
    try {
      await ogretmenHesabinaGir(o.id);
    } catch (e) {
      toast.error((e as Error).message);
      setGirisYapiliyor(false);
    }
  };

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    return liste
      .filter((o) => pasifleriGoster || o.aktif)
      .filter((o) => !q || [o.ad, o.alan || ""].some((v) => v.toLocaleLowerCase("tr-TR").includes(q)))
      .sort((a, b) => Number(b.kilitli) - Number(a.kilitli));
  }, [liste, arama, pasifleriGoster]);

  const kilitliSayisi = liste.filter((o) => o.kilitli).length;

  return (
    <div className="space-y-3">
      <AramaKutusu value={arama} onChange={setArama} placeholder="Öğretmen veya alan ara" />
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="text-slate-600">
          {kilitliSayisi > 0 ? (
            <span className="font-medium text-red-600">{kilitliSayisi} öğretmenin girişi kilitli</span>
          ) : (
            `${filtreli.length} öğretmen`
          )}
        </span>
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" checked={pasifleriGoster} onChange={(e) => setPasifleriGoster(e.target.checked)} className="rounded" />
          Pasifler
        </label>
      </div>

      {yukleniyor && liste.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : filtreli.length === 0 ? (
        <BosDurum icon={<Users className="h-7 w-7" />} text="Eşleşen öğretmen yok." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {filtreli.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => ac(o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    o.kilitli ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {o.kilitli ? <Lock className="h-4 w-4" /> : o.ad.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${o.aktif ? "text-slate-900" : "text-slate-400"}`}>
                    {o.ad}
                    {!o.aktif && " (pasif)"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {[o.alan, o.aktifStaj > 0 ? `${o.aktifStaj} öğrenci` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {o.kilitli && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Kilitli</span>}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {secili && (
        <Sheet title={secili.ad} onClose={() => setSecili(null)}>
          <p className="-mt-2 mb-4 text-sm text-slate-500">
            {[secili.alan, `${secili.aktifStaj} aktif öğrenci`].filter(Boolean).join(" · ")}
          </p>

          {secili.telefon && (
            <a
              href={`tel:${secili.telefon}`}
              className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              <Phone className="h-4 w-4 text-indigo-600" /> {secili.telefon}
            </a>
          )}

          {secili.kilitli && (
            <div className="mb-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
              <p className="text-sm text-red-800">
                Çok sayıda hatalı PIN denemesi nedeniyle giriş kilitli.
                {secili.kilitBitis &&
                  ` Kendiliğinden açılma: ${new Date(secili.kilitBitis).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
              <button
                type="button"
                onClick={() => kilidiAc(secili)}
                disabled={isleniyor}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" /> Kilidi aç
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => hesabinaGir(secili)}
            disabled={girisYapiliyor}
            className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {girisYapiliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Öğretmen hesabına gir
          </button>
          <p className="mb-3 text-center text-xs text-slate-500">
            Paneli öğretmenin gördüğü gibi açar. Yaptığınız işlemler öğretmen adına kaydedilir.
          </p>

          <div className="rounded-xl p-4 ring-1 ring-slate-200">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-indigo-600" /> Yeni PIN belirle
            </p>
            <p className="mb-3 text-xs text-slate-500">PIN&apos;ini unutan öğretmene yeni bir PIN verin. Kilit de açılır.</p>
            {kaydedilenPin ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                <p className="text-xs text-emerald-700">Öğretmene bu PIN&apos;i iletin</p>
                <p className="my-1 font-mono text-3xl font-bold tracking-[0.4em] text-emerald-900">{kaydedilenPin}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(kaydedilenPin).then(
                      () => toast.success("Kopyalandı"),
                      () => toast.error("Kopyalanamadı")
                    );
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                >
                  <Copy className="h-4 w-4" /> Kopyala
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={yeniPin}
                  onChange={(e) => setYeniPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  aria-label="Yeni PIN"
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setYeniPin(String(Math.floor(1000 + Math.random() * 9000)))}
                  className="rounded-lg px-3 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  aria-label="Rastgele PIN üret"
                  title="Rastgele PIN üret"
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => pinKaydet(secili)}
                  disabled={isleniyor || yeniPin.length !== 4}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isleniyor && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kaydet
                </button>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function StajlarSekmesi({ userId }: { userId: string }) {
  const [arama, setArama] = useState("");
  const [sonuclar, setSonuclar] = useState<AktifStaj[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [secili, setSecili] = useState<AktifStaj | null>(null);
  const [tarih, setTarih] = useState(bugunISO());
  const [neden, setNeden] = useState("");
  const [not, setNot] = useState("");
  const [onay, setOnay] = useState(false);
  const [isleniyor, setIsleniyor] = useState(false);

  useEffect(() => {
    const q = arama.trim();
    if (q.length < 2) {
      setSonuclar([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setYukleniyor(true);
      try {
        const res = await fetch(`/api/admin/mobil/stajlar?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(await hataMesaji(res, "Arama yapılamadı"));
        const data = await res.json();
        setSonuclar(data.stajlar || []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
      } finally {
        setYukleniyor(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [arama]);

  const ac = (s: AktifStaj) => {
    setTarih(bugunISO());
    setNeden("");
    setNot("");
    setOnay(false);
    setSecili(s);
  };

  const feshet = async (s: AktifStaj) => {
    setIsleniyor(true);
    try {
      const res = await fetch(`/api/admin/internships/${s.id}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: neden.trim(),
          notes: not.trim() || undefined,
          terminatedBy: userId,
          terminationDate: tarih,
        }),
      });
      if (!res.ok) throw new Error(await hataMesaji(res, "Staj feshedilemedi"));
      setSonuclar((l) => l.filter((x) => x.id !== s.id));
      toast.success(`${s.ogrenci} · staj feshedildi`);
      window.history.back();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsleniyor(false);
    }
  };

  return (
    <div className="space-y-3">
      <AramaKutusu value={arama} onChange={setArama} placeholder="Öğrenci adı, numarası veya işletme" />

      {arama.trim().length < 2 ? (
        <BosDurum icon={<GraduationCap className="h-7 w-7" />} text="Stajını sonlandırmak istediğiniz öğrenciyi arayın." />
      ) : yukleniyor && sonuclar.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : sonuclar.length === 0 ? (
        <BosDurum icon={<Search className="h-7 w-7" />} text="Bu aramayla eşleşen aktif staj yok." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {sonuclar.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => ac(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{s.ogrenci}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[s.sinif, s.no && `No ${s.no}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{s.isletme}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {secili && (
        <Sheet title="Stajı sonlandır" onClose={() => setSecili(null)}>
          <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">{secili.ogrenci}</p>
            <p className="text-slate-600">{secili.isletme}</p>
            <p className="text-xs text-slate-500">
              {secili.ogretmen ? `Koordinatör: ${secili.ogretmen} · ` : ""}
              Başlangıç: {new Date(secili.baslangic).toLocaleDateString("tr-TR")}
            </p>
          </div>

          <label htmlFor="fesih-tarih" className="mb-1 block text-sm font-medium text-slate-700">Fesih tarihi</label>
          <input
            id="fesih-tarih"
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <p className="mb-2 text-sm font-medium text-slate-700">Fesih nedeni</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {FESIH_NEDENLERI.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNeden(n)}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  neden === n ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={neden}
            onChange={(e) => setNeden(e.target.value)}
            placeholder="veya nedeni yazın"
            className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <textarea
            value={not}
            onChange={(e) => setNot(e.target.value)}
            rows={2}
            placeholder="Not (isteğe bağlı)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-0.5 rounded" />
            Bu işlem geri alınamaz. Öğrencinin bu işletmedeki stajı sonlandırılacak.
          </label>

          <button
            type="button"
            disabled={!neden.trim() || !tarih || !onay || isleniyor}
            onClick={() => feshet(secili)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isleniyor && <Loader2 className="h-4 w-4 animate-spin" />}
            Stajı feshet
          </button>
        </Sheet>
      )}
    </div>
  );
}

interface EksikOgretmen {
  id: string;
  ad: string;
  eksikler: { ogrenci: string; sinif: string; isletme: string }[];
  toplam: number;
}

// Ana sayfa: bekleyen işler ve seçilen ayın dekont durumu (varsayılan geçen ay)
function AnaSayfa({
  onSekme,
  onIncele,
  onSayi,
}: {
  onSekme: (t: Tab) => void;
  onIncele: () => void;
  onSayi: (n: number) => void;
}) {
  const [ozet, setOzet] = useState<{ bekleyenDekont: number; aktifStaj: number; kilitliOgretmen: number; okulAdi: string | null } | null>(null);
  const gecenAy = useMemo(() => {
    const d = new Date();
    const t = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return { ay: t.getMonth() + 1, yil: t.getFullYear() };
  }, []);
  const [donem, setDonem] = useState(gecenAy);
  const [durum, setDurum] = useState<{ toplam: number; gelen: number; ogretmenler: EksikOgretmen[] } | null>(null);
  const [durumYukleniyor, setDurumYukleniyor] = useState(true);
  const [telefonlar, setTelefonlar] = useState<Record<string, string | null>>({});
  const [acikOgretmen, setAcikOgretmen] = useState<string | null>(null);
  const [girisYapilan, setGirisYapilan] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/mobil/ozet", { cache: "no-store" });
        if (!res.ok) throw new Error(await hataMesaji(res, "Özet alınamadı"));
        const data = await res.json();
        setOzet(data);
        onSayi(data.bekleyenDekont);
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/admin/mobil/ogretmenler", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const harita: Record<string, string | null> = {};
        for (const o of data.ogretmenler || []) harita[o.id] = o.telefon;
        setTelefonlar(harita);
      } catch {}
    })();
  }, [onSayi]);

  useEffect(() => {
    let iptal = false;
    setDurumYukleniyor(true);
    setAcikOgretmen(null);
    (async () => {
      try {
        // Masaüstü dekontlar sayfasıyla aynı hesap
        const res = await fetch(`/api/admin/reports/dekont-status?month=${donem.ay}&year=${donem.yil}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await hataMesaji(res, "Aylık durum alınamadı"));
        const data = await res.json();
        let toplam = 0;
        let gelen = 0;
        const ogretmenler: EksikOgretmen[] = [];
        for (const t of data.teachers || []) {
          const eksikler: EksikOgretmen["eksikler"] = [];
          let ogretmenToplam = 0;
          for (const c of t.isletmeler || []) {
            for (const s of c.ogrenciler || []) {
              toplam++;
              ogretmenToplam++;
              if (s.has_dekont) gelen++;
              else eksikler.push({ ogrenci: s.ad_soyad, sinif: s.sinif || "", isletme: c.isletme_ad });
            }
          }
          if (eksikler.length > 0) ogretmenler.push({ id: t.ogretmen_id, ad: t.ogretmen_ad, eksikler, toplam: ogretmenToplam });
        }
        ogretmenler.sort((a, b) => b.eksikler.length - a.eksikler.length);
        if (!iptal) setDurum({ toplam, gelen, ogretmenler });
      } catch (e) {
        if (!iptal) {
          setDurum(null);
          toast.error((e as Error).message);
        }
      } finally {
        if (!iptal) setDurumYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [donem]);

  const ayDegistir = (fark: number) => {
    const t = new Date(donem.yil, donem.ay - 1 + fark, 1);
    setDonem({ ay: t.getMonth() + 1, yil: t.getFullYear() });
  };
  // En fazla içinde bulunulan aya kadar ileri gidilebilir
  const simdi = new Date();
  const sonrakiAyVar = donem.yil * 12 + donem.ay < simdi.getFullYear() * 12 + simdi.getMonth() + 1;

  const hesabinaGir = async (id: string) => {
    setGirisYapilan(id);
    try {
      await ogretmenHesabinaGir(id);
    } catch (e) {
      toast.error((e as Error).message);
      setGirisYapilan(null);
    }
  };

  const eksikSayisi = durum ? durum.toplam - durum.gelen : 0;
  const yuzde = durum && durum.toplam > 0 ? Math.round((durum.gelen / durum.toplam) * 100) : 0;
  const bugun = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-sm text-slate-500">{bugun}</p>
        {ozet?.okulAdi && <p className="truncate font-semibold text-slate-900">{ozet.okulAdi}</p>}
      </div>

      {/* Bekleyen dekontlar */}
      <button
        type="button"
        onClick={onIncele}
        disabled={!ozet}
        className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 active:bg-slate-100"
      >
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
            ozet?.bekleyenDekont ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {ozet?.bekleyenDekont ? <Receipt className="h-7 w-7" /> : <Check className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold leading-none text-slate-900">{ozet ? ozet.bekleyenDekont : "–"}</p>
          <p className="mt-1 text-sm text-slate-600">dekont onay bekliyor</p>
        </div>
        {!!ozet?.bekleyenDekont && (
          <span className="flex shrink-0 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
            <PlayCircle className="h-4 w-4" /> İncele
          </span>
        )}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSekme("stajlar")}
          className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <p className="text-2xl font-bold text-slate-900">{ozet ? ozet.aktifStaj : "–"}</p>
          <p className="text-sm text-slate-600">aktif staj</p>
        </button>
        <button
          type="button"
          onClick={() => onSekme("ogretmenler")}
          className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <p className={`text-2xl font-bold ${ozet?.kilitliOgretmen ? "text-red-600" : "text-slate-900"}`}>
            {ozet ? ozet.kilitliOgretmen : "–"}
          </p>
          <p className="text-sm text-slate-600">kilitli öğretmen</p>
        </button>
      </div>

      {/* Aylık dekont durumu */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-2">
          <button type="button" onClick={() => ayDegistir(-1)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Önceki ay">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-center font-semibold text-slate-900">
            {AYLAR[donem.ay - 1]} {donem.yil} dekontları
          </p>
          <button
            type="button"
            onClick={() => ayDegistir(1)}
            disabled={!sonrakiAyVar}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {durumYukleniyor ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : !durum || durum.toplam === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Bu ay için dekont beklenen öğrenci yok.</p>
        ) : (
          <>
            <div className="p-4">
              <div className="flex items-end justify-between">
                <p className="text-sm text-slate-600">
                  <span className="text-2xl font-bold text-slate-900">{durum.gelen}</span> / {durum.toplam} öğrencinin dekontu geldi
                </p>
                <span className="text-sm font-semibold text-slate-700">%{yuzde}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${yuzde}%` }} />
              </div>
              <p className={`mt-2 text-sm font-medium ${eksikSayisi > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {eksikSayisi > 0 ? `${eksikSayisi} öğrencinin dekontu eksik` : "Eksik dekont yok"}
              </p>
            </div>

            {durum.ogretmenler.length > 0 && (
              <>
                <p className="border-t border-slate-100 px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Eksiği olan öğretmenler
                </p>
                <ul className="divide-y divide-slate-100">
                  {durum.ogretmenler.map((o) => {
                    const acik = acikOgretmen === o.id;
                    const tel = telefonlar[o.id];
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setAcikOgretmen(acik ? null : o.id)}
                          aria-expanded={acik}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-red-50 px-2 text-sm font-bold text-red-700">
                            {o.eksikler.length}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-900">{o.ad}</span>
                            <span className="text-xs text-slate-500">{o.toplam} öğrenciden {o.eksikler.length} eksik</span>
                          </span>
                          <ChevronRight className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${acik ? "rotate-90" : ""}`} />
                        </button>
                        {acik && (
                          <div className="bg-slate-50 px-4 pb-3 pt-1">
                            <ul className="space-y-1.5">
                              {o.eksikler.map((e, i) => (
                                <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                                  <span className="font-medium text-slate-900">{e.ogrenci}</span>
                                  {e.sinif && <span className="text-slate-500"> · {e.sinif}</span>}
                                  <span className="block truncate text-xs text-slate-500">{e.isletme}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 flex gap-2">
                              {tel && (
                                <a
                                  href={`tel:${tel}`}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                  <Phone className="h-4 w-4" /> Ara
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => hesabinaGir(o.id)}
                                disabled={girisYapilan === o.id}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                              >
                                {girisYapilan === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                                Hesabına gir
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function YonetimPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("anasayfa");
  const [menuAcik, setMenuAcik] = useState(false);
  const [bekleyenSayisi, setBekleyenSayisi] = useState<number | null>(null);
  const [incelemeIstegi, setIncelemeIstegi] = useState(0);

  useEffect(() => {
    // Sayfa açık pencereyle yenilendiyse geçmiş kaydında kalan işaretleri temizle
    const st = window.history.state;
    if (st?.yonetimInceleme || st?.yonetimSheet) {
      const { yonetimInceleme, yonetimSheet, ...rest } = st;
      window.history.replaceState(rest, "");
    }
  }, []);

  const sekmeSec = useCallback((t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  const incelemeyeBasla = useCallback(() => {
    sekmeSec("dekontlar");
    setIncelemeIstegi((n) => n + 1);
  }, [sekmeSec]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return <YoneticiGiris />;

  const sekmeler: { id: Tab; ad: string; icon: React.ReactNode; rozet?: number | null }[] = [
    { id: "anasayfa", ad: "Ana sayfa", icon: <Home className="h-5 w-5" /> },
    { id: "dekontlar", ad: "Dekontlar", icon: <Receipt className="h-5 w-5" />, rozet: bekleyenSayisi },
    { id: "ogretmenler", ad: "Öğretmenler", icon: <Users className="h-5 w-5" /> },
    { id: "stajlar", ad: "Stajlar", icon: <GraduationCap className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-24">
      <header className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-3 pb-4 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_kucuk.png" alt="K-Panel" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-white">K-Panel</h1>
            <p className="truncate text-xs text-indigo-100">Yönetici · {session.user.email}</p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuAcik(!menuAcik)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25"
              aria-label="Menü"
              aria-haspopup="menu"
              aria-expanded={menuAcik}
            >
              <MoreVertical className="h-6 w-6" />
            </button>
            {menuAcik && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAcik(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5">
                  <a href="/admin" role="menuitem" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <Monitor className="h-4 w-4 text-slate-400" /> Tam yönetim paneli
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/yonetim" })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Çıkış yap
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6">
        {/* Sekmeler bağımsız yüklenir; Dekontlar sekmesi rozet sayısını da günceller */}
        {tab === "anasayfa" && <AnaSayfa onSekme={sekmeSec} onIncele={incelemeyeBasla} onSayi={setBekleyenSayisi} />}
        <div hidden={tab !== "dekontlar"}>
          <DekontlarSekmesi onSayi={setBekleyenSayisi} incelemeIstegi={incelemeIstegi} />
        </div>
        {tab === "ogretmenler" && <OgretmenlerSekmesi />}
        {tab === "stajlar" && <StajlarSekmesi userId={session.user.id as string} />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {sekmeler.map((s) => {
            const aktif = tab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => sekmeSec(s.id)}
                aria-current={aktif ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${aktif ? "text-indigo-700" : "text-slate-500"}`}
              >
                <span className={`relative rounded-full px-4 py-1 ${aktif ? "bg-indigo-100" : ""}`}>
                  {s.icon}
                  {!!s.rozet && (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {s.rozet > 99 ? "99+" : s.rozet}
                    </span>
                  )}
                </span>
                {s.ad}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
