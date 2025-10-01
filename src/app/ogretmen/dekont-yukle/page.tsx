"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Ogrenci = {
  id: string;
  ad: string;
  soyad: string;
  sinif?: string;
  no?: string;
  baslangic_tarihi: string;
};

type Isletme = {
  id: string;
  ad: string;
  ogrenciler: Ogrenci[];
};

const aylar = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
];

function getPrevMonthYear(d = new Date()) {
  const m = d.getMonth();
  const y = d.getFullYear();
  if (m === 0) return { ay: 12, yil: y - 1 };
  return { ay: m, yil: y };
}

function DekontYukleInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { data: session, status } = useSession();

  const [teacherId, setTeacherId] = useState<string>("");
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [selectedIsletmeId, setSelectedIsletmeId] = useState<string>("");
  const [selectedOgrenciId, setSelectedOgrenciId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [miktar, setMiktar] = useState<number | "">("");
  const [aciklama, setAciklama] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const { ay: defaultAy, yil: defaultYil } = useMemo(() => getPrevMonthYear(), []);
  const [ay, setAy] = useState<number>(defaultAy);
  const [yil, setYil] = useState<number>(defaultYil);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auth ve veri çekme (panel ile aynı mantık)
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.user?.teacherId) {
      router.push("/");
      return;
    }
    const tid = session.user.teacherId as string;
    setTeacherId(tid);

    (async () => {
      try {
        const res = await fetch(`/api/admin/teachers/${tid}/internships`);
        if (!res.ok) throw new Error("Staj verisi alınamadı");
        const data = await res.json();
        const normalized: Isletme[] = (data || []).map((i: any) => ({
          id: String(i.id),
          ad: i.ad,
          ogrenciler: (i.ogrenciler || []).map((o: any) => ({
            id: String(o.id),
            ad: o.ad,
            soyad: o.soyad,
            sinif: o.sinif,
            no: o.no,
            baslangic_tarihi: o.baslangic_tarihi,
          }))
        }));
        setIsletmeler(normalized);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [status, session, router]);

  // Liste geldikten sonra query'leri uygula ve tek seçenek varsa otomatik seç
  useEffect(() => {
    const qIsletme = search.get("isletmeId") || "";
    const qOgrenci = search.get("ogrenciId") || "";
    if (!isletmeler.length) return;

    // Query ile ön seçim
    if (qIsletme && isletmeler.some(i => i.id === qIsletme)) {
      setSelectedIsletmeId(prev => prev || qIsletme);
      const isl = isletmeler.find(i => i.id === qIsletme);
      if (isl && qOgrenci && isl.ogrenciler.some(o => o.id === qOgrenci)) {
        setSelectedOgrenciId(prev => prev || qOgrenci);
      }
    }

    // Otomatik seçim (tek seçenek)
    if (!qIsletme && !selectedIsletmeId && isletmeler.length === 1) {
      setSelectedIsletmeId(isletmeler[0].id);
    }
    const isl = isletmeler.find(i => i.id === (qIsletme || selectedIsletmeId));
    if (isl && !qOgrenci && !selectedOgrenciId && isl.ogrenciler.length === 1) {
      setSelectedOgrenciId(isl.ogrenciler[0].id);
    }
  }, [isletmeler, search, selectedIsletmeId, selectedOgrenciId]);

  // Yıla göre izin verilen maksimum ay (mevcut yıl için: geçen ay; geçmiş yıllar için: 12)
  const maxAyForYil = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12
    if (yil < currentYear) return 12;
    if (yil === currentYear) return prevMonth;
    // Gelecek yıl seçildiyse kısıtla
    return prevMonth;
  }, [yil]);

  // Yıl değiştiğinde, seçili ay izin verilen aralığın üstündeyse kırp
  useEffect(() => {
    if (ay > maxAyForYil) setAy(maxAyForYil);
  }, [maxAyForYil, ay]);

  const selectedIsletme = useMemo(() => isletmeler.find(i => i.id === selectedIsletmeId) || null, [isletmeler, selectedIsletmeId]);
  const selectedOgrenci = useMemo(() => selectedIsletme?.ogrenciler.find(o => o.id === selectedOgrenciId) || null, [selectedIsletme, selectedOgrenciId]);

  const handleSubmit = async () => {
    if (!teacherId || !selectedIsletme || !selectedOgrenci) {
      setUploadStatus("Eksik seçimler var.");
      return;
    }
    if (!file) {
      setUploadStatus("Lütfen dosya seçin.");
      return;
    }

    setIsSubmitting(true);
    setUploadStatus("Yükleniyor...");
    try {
      // Staj ID'yi bul
      const stajRes = await fetch(`/api/admin/internships/find?ogrenci_id=${selectedOgrenci.id}&isletme_id=${selectedIsletme.id}`);
      if (!stajRes.ok) throw new Error("Staj ID bulunamadı");
      const stajData = await stajRes.json();
      const stajId = String(stajData.id || "");

      // Görsel ise istemci tarafında boyut/kalite küçültme uygula (PDF'lere dokunma)
      const maybeCompressed = await (async () => {
        try {
          if (!file || !file.type?.startsWith("image/")) return file;
          // 10 MB üzeri ise kesin sıkıştır, altı ise de 2MB üzerini sıkıştır
          const sizeMB = file.size / (1024 * 1024);
          const mustCompress = sizeMB > 2;
          if (!mustCompress) return file;

          const blobUrl = URL.createObjectURL(file);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = blobUrl;
          });

          const maxW = 1600; // max genişlik
          const maxH = 1600; // max yükseklik
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          const targetW = Math.max(1, Math.round(width * ratio));
          const targetH = Math.max(1, Math.round(height * ratio));

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) return file;
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const outType = file.type.includes("png") ? "image/png" : "image/jpeg";
          const quality = outType === "image/png" ? 0.92 : 0.8; // jpeg için kalite
          const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), outType, quality));
          URL.revokeObjectURL(blobUrl);
          if (!blob) return file;
          // Orijinal isim + -compressed eki
          const newName = file.name.replace(/(\.[^.]+)?$/, (m) => `-compressed${m || ''}`);
          return new File([blob], newName, { type: outType, lastModified: Date.now() });
        } catch {
          return file;
        }
      })();

      const fd = new FormData();
      fd.append("staj_id", stajId);
      if (miktar !== "" && Number(miktar) > 0) fd.append("miktar", String(miktar));
      fd.append("ay", String(ay));
      fd.append("yil", String(yil));
      fd.append("aciklama", aciklama);
      fd.append("ogretmen_id", teacherId);
      fd.append("dosya", maybeCompressed || file);

      const res = await fetch("/api/admin/dekontlar", { method: "POST", body: fd });

      if (res.status === 409) {
        const warn = await res.json();
        setUploadStatus(`Uyarı: Bu ay için zaten ${warn.mevcutDekontSayisi || 1} dekont var. Yine de eklendi (ek dekont).`);
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Yükleme başarısız (${res.status})`);
      } else {
        setUploadStatus("Başarılı! Dekont yüklendi.");
      }

      // 2 sn sonra dekont listesine yönlendir
      setTimeout(() => router.push("/ogretmen/panel?tab=dekontlar"), 1500);
    } catch (e: any) {
      setUploadStatus(`Hata: ${e?.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Dekont Yükle (Sayfa)</h1>

        <div className="space-y-4 bg-white p-4 rounded-lg border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">İşletme</label>
              <select
                value={selectedIsletmeId}
                onChange={(e) => {
                  setSelectedIsletmeId(e.target.value);
                  setSelectedOgrenciId("");
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seçiniz</option>
                {isletmeler.map(i => (
                  <option key={i.id} value={i.id}>{i.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Öğrenci</label>
              <select
                value={selectedOgrenciId}
                onChange={(e) => setSelectedOgrenciId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={!selectedIsletme}
              >
                <option value="">Seçiniz</option>
                {selectedIsletme?.ogrenciler.map(o => (
                  <option key={o.id} value={o.id}>{o.ad} {o.soyad}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ay</label>
              <select value={ay} onChange={e => setAy(Number(e.target.value))} className="w-full border rounded px-3 py-2">
                {aylar.map((a, idx) => {
                  const val = idx + 1;
                  if (val > maxAyForYil) return null;
                  return (
                    <option key={val} value={val}>{a}</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Yıl</label>
              <input
                type="number"
                value={yil}
                onChange={e => {
                  const next = Number(e.target.value);
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  // Gelecek yıllara izin verme; en fazla mevcut yıl
                  const clamped = Math.min(next, currentYear);
                  setYil(clamped);
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Miktar (TL, opsiyonel)</label>
            <input
              type="number"
              value={miktar}
              onChange={e => setMiktar(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
              min={0}
              step={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Açıklama (opsiyonel)</label>
            <input
              type="text"
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Örn: Eylül 2025 dekontu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dosya</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="block w-full"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="text-xs text-gray-600 mt-1">Seçildi: {file.name} ({file.type || "?"})</div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedIsletme || !selectedOgrenci || !file}
            >
              {isSubmitting ? "Yükleniyor..." : "Yükle"}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
                setUploadStatus("");
              }}
            >
              Sıfırla
            </button>
          </div>

          {uploadStatus && (
            <div className="text-sm mt-2 p-2 rounded bg-gray-50 border">{uploadStatus}</div>
          )}
          </div>

          {null}
        </div>
      </div>
  );
}

export default function DekontYukleSayfasi() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">Yükleniyor...</div>}>
      <DekontYukleInner />
    </Suspense>
  );
}
