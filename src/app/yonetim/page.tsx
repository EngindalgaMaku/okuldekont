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
  Copy,
  Shuffle,
} from "lucide-react";
import { openFilePreview } from "@/components/ui/FilePreviewOverlay";

type Tab = "dekontlar" | "ogretmenler" | "stajlar";

interface BekleyenDekont {
  id: string;
  miktar: number | null;
  ay: number;
  yil: number;
  sira: number;
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

// Aynı içerik akışını kullanan alt pencere (bottom sheet)
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Android geri tuşu pencereyi kapatsın
    window.history.pushState({ yonetimSheet: true }, "");
    const onPop = () => onCloseRef.current();
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

function DekontlarSekmesi({ onSayi }: { onSayi: (n: number) => void }) {
  const [liste, setListe] = useState<BekleyenDekont[]>([]);
  const [toplam, setToplam] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState("");
  const [onayBekleyen, setOnayBekleyen] = useState<string | null>(null);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);
  const [redDekont, setRedDekont] = useState<BekleyenDekont | null>(null);
  const [redNedeni, setRedNedeni] = useState("");
  const onayZamanlayici = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const res = await fetch("/api/admin/mobil/dekontlar", { cache: "no-store" });
      if (!res.ok) throw new Error(await hataMesaji(res, "Dekontlar alınamadı"));
      const data = await res.json();
      setListe(data.dekontlar || []);
      setToplam(data.toplam || 0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  useEffect(() => {
    if (!yukleniyor) onSayi(toplam);
  }, [toplam, yukleniyor, onSayi]);

  const listedenCikar = (id: string) => {
    setListe((l) => l.filter((d) => d.id !== id));
    setToplam((t) => Math.max(0, t - 1));
  };

  const karar = async (d: BekleyenDekont, decision: "APPROVED" | "REJECTED", rejectReason?: string) => {
    setIsleniyor(d.id);
    try {
      const res = await fetch(`/api/admin/dekontlar/${d.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(rejectReason ? { rejectReason } : {}) }),
      });
      if (!res.ok) throw new Error(await hataMesaji(res, "İşlem yapılamadı"));
      listedenCikar(d.id);
      toast.success(decision === "APPROVED" ? `${d.ogrenci} · onaylandı` : `${d.ogrenci} · reddedildi`);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setIsleniyor(null);
    }
  };

  // Yanlışlıkla onayı önlemek için iki dokunuş: ilk dokunuş "Emin misiniz?" gösterir
  const onaylaDokun = (d: BekleyenDekont) => {
    if (onayBekleyen === d.id) {
      clearTimeout(onayZamanlayici.current);
      setOnayBekleyen(null);
      karar(d, "APPROVED");
      return;
    }
    setOnayBekleyen(d.id);
    clearTimeout(onayZamanlayici.current);
    onayZamanlayici.current = setTimeout(() => setOnayBekleyen(null), 3000);
  };

  const onizle = (d: BekleyenDekont) => {
    if (!d.dosyaUrl) return;
    const dosya = d.dosyaUrl.split("/").pop() || "";
    openFilePreview({
      src: `/api/admin/dekontlar/preview/${dosya}`,
      downloadUrl: `/api/admin/dekontlar/download/${dosya}`,
      title: `${d.ogrenci} · ${AYLAR[d.ay - 1]} ${d.yil}`,
    });
  };

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return liste;
    return liste.filter((d) =>
      [d.ogrenci, d.isletme, d.ogretmen || "", d.no, d.sinif].some((v) => v.toLocaleLowerCase("tr-TR").includes(q))
    );
  }, [liste, arama]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{toplam}</span> dekont onay bekliyor
          {toplam > liste.length && liste.length > 0 ? ` · ilk ${liste.length} gösteriliyor` : ""}
        </p>
        <button type="button" onClick={yukle} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Yenile">
          <RefreshCw className={`h-4 w-4 ${yukleniyor ? "animate-spin" : ""}`} />
        </button>
      </div>

      {liste.length > 5 && <AramaKutusu value={arama} onChange={setArama} placeholder="Öğrenci, işletme veya öğretmen ara" />}

      {yukleniyor && liste.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : filtreli.length === 0 ? (
        <BosDurum
          icon={<Check className="h-7 w-7" />}
          text={arama ? "Aramanızla eşleşen dekont yok." : "Onay bekleyen dekont yok. Hepsi tamam!"}
        />
      ) : (
        filtreli.map((d) => {
          const mesgul = isleniyor === d.id;
          return (
            <article key={d.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{d.ogrenci}</h3>
                    <p className="text-xs text-slate-500">
                      {[d.sinif, d.no && `No ${d.no}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    {AYLAR[d.ay - 1]} {d.yil}
                    {d.sira > 1 ? ` · ${d.sira}. dosya` : ""}
                  </span>
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
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => onizle(d)}
                  disabled={!d.dosyaUrl}
                  className="flex items-center justify-center gap-1.5 py-3 text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-300"
                >
                  <Eye className="h-4 w-4" /> Önizle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRedNedeni("");
                    setRedDekont(d);
                  }}
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
            </article>
          );
        })
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
              const ok = await karar(redDekont, "REJECTED", redNedeni.trim());
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

export default function YonetimPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("dekontlar");
  const [menuAcik, setMenuAcik] = useState(false);
  const [bekleyenSayisi, setBekleyenSayisi] = useState<number | null>(null);

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem("yonetim:tab");
      if (kayitli === "dekontlar" || kayitli === "ogretmenler" || kayitli === "stajlar") setTab(kayitli);
    } catch {}
  }, []);

  const sekmeSec = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem("yonetim:tab", t);
    } catch {}
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return <YoneticiGiris />;

  const sekmeler: { id: Tab; ad: string; icon: React.ReactNode; rozet?: number | null }[] = [
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
        <div hidden={tab !== "dekontlar"}>
          <DekontlarSekmesi onSayi={setBekleyenSayisi} />
        </div>
        {tab === "ogretmenler" && <OgretmenlerSekmesi />}
        {tab === "stajlar" && <StajlarSekmesi userId={session.user.id as string} />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto grid max-w-2xl grid-cols-3">
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
                <span className={`relative rounded-full px-5 py-1 ${aktif ? "bg-indigo-100" : ""}`}>
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
