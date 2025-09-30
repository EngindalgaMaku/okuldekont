"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

  const [teacherId, setTeacherId] = useState<string>("");
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [selectedIsletmeId, setSelectedIsletmeId] = useState<string>("");
  const [selectedOgrenciId, setSelectedOgrenciId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [miktar, setMiktar] = useState<number | "">("");
  const [aciklama, setAciklama] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");

  const { ay: defaultAy, yil: defaultYil } = useMemo(() => getPrevMonthYear(), []);
  const [ay, setAy] = useState<number>(defaultAy);
  const [yil, setYil] = useState<number>(defaultYil);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const qIsletme = search.get("isletmeId") || "";
    const qOgrenci = search.get("ogrenciId") || "";
    if (qIsletme) setSelectedIsletmeId(qIsletme);
    if (qOgrenci) setSelectedOgrenciId(qOgrenci);
  }, [search]);

  useEffect(() => {
    const tid = typeof window !== "undefined" ? sessionStorage.getItem("ogretmen_id") || "" : "";
    setTeacherId(tid);

    async function fetchData(teacher: string) {
      if (!teacher) return;
      try {
        const res = await fetch(`/api/admin/teachers/${teacher}/internships`);
        if (!res.ok) throw new Error("Staj verisi alınamadı");
        const data = await res.json();
        setIsletmeler(data || []);
      } catch (e) {
        console.error(e);
      }
    }

    fetchData(tid);
  }, []);

  const selectedIsletme = useMemo(() => isletmeler.find(i => i.id === selectedIsletmeId) || null, [isletmeler, selectedIsletmeId]);
  const selectedOgrenci = useMemo(() => selectedIsletme?.ogrenciler.find(o => o.id === selectedOgrenciId) || null, [selectedIsletme, selectedOgrenciId]);

  const handleSubmit = async () => {
    if (!teacherId || !selectedIsletme || !selectedOgrenci) {
      setStatus("Eksik seçimler var.");
      return;
    }
    if (!file) {
      setStatus("Lütfen dosya seçin.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Yükleniyor...");
    try {
      // Staj ID'yi bul
      const stajRes = await fetch(`/api/admin/internships/find?ogrenci_id=${selectedOgrenci.id}&isletme_id=${selectedIsletme.id}`);
      if (!stajRes.ok) throw new Error("Staj ID bulunamadı");
      const stajData = await stajRes.json();
      const stajId = String(stajData.id || "");

      const fd = new FormData();
      fd.append("staj_id", stajId);
      if (miktar !== "" && Number(miktar) > 0) fd.append("miktar", String(miktar));
      fd.append("ay", String(ay));
      fd.append("yil", String(yil));
      fd.append("aciklama", aciklama);
      fd.append("ogretmen_id", teacherId);
      fd.append("dosya", file);

      const res = await fetch("/api/admin/dekontlar", { method: "POST", body: fd });

      if (res.status === 409) {
        const warn = await res.json();
        setStatus(`Uyarı: Bu ay için zaten ${warn.mevcutDekontSayisi || 1} dekont var. Yine de eklendi (ek dekont).`);
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Yükleme başarısız (${res.status})`);
      } else {
        setStatus("Başarılı! Dekont yüklendi.");
      }

      // 2 sn sonra dekont listesine yönlendir
      setTimeout(() => router.push("/ogretmen/panel?tab=dekontlar"), 1500);
    } catch (e: any) {
      setStatus(`Hata: ${e?.message || e}`);
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
                {aylar.map((a, idx) => (
                  <option key={idx+1} value={idx+1}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Yıl</label>
              <input type="number" value={yil} onChange={e => setYil(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
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

          <div className="flex gap-2">
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
                setStatus("");
              }}
            >
              Sıfırla
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100"
              onClick={() => router.push("/ogretmen/panel?tab=isletmeler")}
            >
              Panele Dön
            </button>
          </div>

          {status && (
            <div className="text-sm mt-2 p-2 rounded bg-gray-50 border">{status}</div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Not: Bu sayfa, mobilde dosya seçiminden sonra beklenmeyen yeniden yükleme veya odak kaybı sorunlarını tamamen
          devre dışı bırakmak amacıyla modal yerine sayfa düzeniyle tasarlanmıştır.
        </p>
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
