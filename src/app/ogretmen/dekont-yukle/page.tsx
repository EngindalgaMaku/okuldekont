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
  bitis_tarihi?: string | null;
  staj_id?: string;
};

type Isletme = {
  id: string;
  ad: string;
  ogrenciler: Ogrenci[];
};

const aylar = [
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
  const [errors, setErrors] = useState<{
    isletme?: string;
    ogrenci?: string;
    miktar?: string;
    file?: string;
  }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const { ay: defaultAy, yil: defaultYil } = useMemo(
    () => getPrevMonthYear(),
    []
  );
  const [ay, setAy] = useState<number>(defaultAy);
  const [yil, setYil] = useState<number>(defaultYil);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Dosya önizleme yönetimi
  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setIsPdf(false);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsPdf(!!file.type && file.type.includes("pdf"));
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

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
        const res = await fetch(
          `/api/admin/teachers/${tid}/internships?includeInactive=true`
        );
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
            bitis_tarihi: o.bitis_tarihi,
            staj_id: o.staj_id,
          })),
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
    if (qIsletme && isletmeler.some((i) => i.id === qIsletme)) {
      setSelectedIsletmeId((prev) => prev || qIsletme);
      const isl = isletmeler.find((i) => i.id === qIsletme);
      if (isl && qOgrenci && isl.ogrenciler.some((o) => o.id === qOgrenci)) {
        setSelectedOgrenciId((prev) => prev || qOgrenci);
      }
    }

    // Otomatik seçim (tek seçenek)
    if (!qIsletme && !selectedIsletmeId && isletmeler.length === 1) {
      setSelectedIsletmeId(isletmeler[0].id);
    }
    const isl = isletmeler.find(
      (i) => i.id === (qIsletme || selectedIsletmeId)
    );
    if (isl && !qOgrenci && !selectedOgrenciId && isl.ogrenciler.length === 1) {
      setSelectedOgrenciId(isl.ogrenciler[0].id);
    }
  }, [isletmeler, search, selectedIsletmeId, selectedOgrenciId]);

  // Öğrencinin başlangıç ve bitiş tarihlerini al
  const ogrenciStart = useMemo(() => {
    const isl = isletmeler.find((i) => i.id === selectedIsletmeId);
    const ogr = isl?.ogrenciler.find((o) => o.id === selectedOgrenciId);
    if (!ogr?.baslangic_tarihi) return null;
    const d = new Date(ogr.baslangic_tarihi);
    if (isNaN(d.getTime())) return null;
    return d;
  }, [isletmeler, selectedIsletmeId, selectedOgrenciId]);

  // Seçili stajın bitiş tarihini al
  const selectedStaj = useMemo(() => {
    const isl = isletmeler.find((i) => i.id === selectedIsletmeId);
    const ogr = isl?.ogrenciler.find((o) => o.id === selectedOgrenciId);
    return ogr
      ? {
          endDate: ogr.bitis_tarihi,
          id: ogr.staj_id,
        }
      : null;
  }, [isletmeler, selectedIsletmeId, selectedOgrenciId]);

  const nowDate = useMemo(() => new Date(), []);
  const currentYear = nowDate.getFullYear();
  const prevMonth = nowDate.getMonth() === 0 ? 12 : nowDate.getMonth(); // 1-12, içinde bulunduğumuz aydan bir önceki

  const allowedYears = useMemo(() => {
    if (!ogrenciStart) return [yil];
    const startYear = ogrenciStart.getFullYear();
    const endYear = currentYear;
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);
    return years;
  }, [ogrenciStart, currentYear, yil]);

  const getMonthBounds = (year: number) => {
    if (!ogrenciStart) return { min: 1, max: prevMonth };

    const startYear = ogrenciStart.getFullYear();
    const startMonth = ogrenciStart.getMonth() + 1;

    // Staj bitiş tarihi kontrolü eklenmeli
    const stajBitis = selectedStaj?.endDate
      ? new Date(selectedStaj.endDate)
      : null;
    const bitisYear = stajBitis?.getFullYear();
    const bitisMonth = stajBitis ? stajBitis.getMonth() + 1 : 12;

    if (year < startYear) return { min: 1, max: 0 };
    if (year > currentYear) return { min: 13, max: 12 };

    const min = year === startYear ? startMonth : 1;
    let max = year === currentYear ? prevMonth : 12;

    // Staj bitiş tarihi sınırlaması
    if (stajBitis && bitisYear && year === bitisYear) {
      max = Math.min(max, bitisMonth);
    } else if (stajBitis && bitisYear && year > bitisYear) {
      max = 0; // O yılda hiçbir ay seçilemez
    }

    return { min, max };
  };

  // Öğrenci veya yıl değiştiğinde ayı sınırlar içinde tut
  useEffect(() => {
    const { min, max } = getMonthBounds(yil);
    if (ay < min) setAy(min);
    if (ay > max) setAy(max);
  }, [yil, selectedOgrenciId, selectedStaj]);

  // Öğrenci seçimi değiştiğinde uygun en yakın ay-yılı seç
  useEffect(() => {
    if (!ogrenciStart) return;
    const y = Math.min(currentYear, Math.max(ogrenciStart.getFullYear(), yil));
    const { max } = getMonthBounds(y);
    setYil(y);
    setAy(max);
  }, [ogrenciStart, selectedStaj]);

  const selectedIsletme = useMemo(
    () => isletmeler.find((i) => i.id === selectedIsletmeId) || null,
    [isletmeler, selectedIsletmeId]
  );
  const selectedOgrenci = useMemo(
    () =>
      selectedIsletme?.ogrenciler.find((o) => o.id === selectedOgrenciId) ||
      null,
    [selectedIsletme, selectedOgrenciId]
  );

  const handleSubmit = async () => {
    const newErrors: {
      isletme?: string;
      ogrenci?: string;
      miktar?: string;
      file?: string;
    } = {};
    if (!selectedIsletmeId) newErrors.isletme = "İşletme seçiniz";
    if (!selectedOgrenciId) newErrors.ogrenci = "Öğrenci seçiniz";
    if (miktar === "" || Number(miktar) <= 0)
      newErrors.miktar = "Geçerli bir miktar (TL) giriniz";
    if (!file) newErrors.file = "Lütfen bir dosya seçiniz (PDF veya görsel)";
    if (!teacherId)
      newErrors.isletme = newErrors.isletme || "Oturum doğrulanamadı";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setUploadStatus("");
      return;
    }

    setIsSubmitting(true);
    setUploadStatus("Yükleniyor...");
    try {
      // Staj ID'yi bul (doğrudan ID'lerden kullan, TS null uyarısını önle)
      const stajRes = await fetch(
        `/api/admin/internships/find?ogrenci_id=${encodeURIComponent(
          selectedOgrenciId
        )}&isletme_id=${encodeURIComponent(selectedIsletmeId)}`
      );
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

          const outType = file.type.includes("png")
            ? "image/png"
            : "image/jpeg";
          const quality = outType === "image/png" ? 0.92 : 0.8; // jpeg için kalite
          const blob: Blob = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b as Blob), outType, quality)
          );
          URL.revokeObjectURL(blobUrl);
          if (!blob) return file;
          // Orijinal isim + -compressed eki
          const newName = file.name.replace(
            /(\.[^.]+)?$/,
            (m) => `-compressed${m || ""}`
          );
          return new File([blob], newName, {
            type: outType,
            lastModified: Date.now(),
          });
        } catch {
          return file;
        }
      })();

      const fd = new FormData();
      fd.append("staj_id", stajId);
      // Miktar artık zorunlu
      fd.append("miktar", String(miktar));
      fd.append("ay", String(ay));
      fd.append("yil", String(yil));
      fd.append("aciklama", aciklama);
      fd.append("ogretmen_id", teacherId);
      fd.append("dosya", (maybeCompressed || file) as File);

      const res = await fetch("/api/admin/dekontlar", {
        method: "POST",
        body: fd,
      });

      if (res.status === 409) {
        const warn = await res.json();
        setUploadStatus(
          `Uyarı: Bu ay için zaten ${
            warn.mevcutDekontSayisi || 1
          } dekont var. Yine de eklendi (ek dekont).`
        );
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur rounded-xl border shadow-sm p-4 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Dekont Yükle
            </h1>
            <p className="hidden sm:block text-sm text-gray-500 mt-1">
              İlgili ay ve yıl için dekont bilgilerini girin ve dosyayı ekleyin.
            </p>
          </div>

          <div className="space-y-2.5 sm:space-y-4">
            {/* İşletme / Öğrenci: mobilde de 2 kolon ile kısalt */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  İşletme
                </label>
                <select
                  value={selectedIsletmeId}
                  onChange={(e) => {
                    setSelectedIsletmeId(e.target.value);
                    setSelectedOgrenciId("");
                    setErrors((prev) => ({ ...prev, isletme: undefined }));
                  }}
                  className={`w-full border rounded px-2.5 py-2 text-sm ${
                    errors.isletme
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                >
                  <option value="">Seçiniz</option>
                  {isletmeler.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.ad}
                    </option>
                  ))}
                </select>
                {errors.isletme && (
                  <p className="mt-1 text-xs text-red-600">{errors.isletme}</p>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Öğrenci
                </label>
                <select
                  value={selectedOgrenciId}
                  onChange={(e) => {
                    setSelectedOgrenciId(e.target.value);
                    setErrors((prev) => ({ ...prev, ogrenci: undefined }));
                  }}
                  className={`w-full border rounded px-2.5 py-2 text-sm ${
                    errors.ogrenci
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                  disabled={!selectedIsletme}
                >
                  <option value="">Seçiniz</option>
                  {selectedIsletme?.ogrenciler.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.ad} {o.soyad}
                    </option>
                  ))}
                </select>
                {errors.ogrenci && (
                  <p className="mt-1 text-xs text-red-600">{errors.ogrenci}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Ay
                </label>
                <select
                  value={ay}
                  onChange={(e) => setAy(Number(e.target.value))}
                  className="w-full border rounded px-2.5 py-2 text-sm"
                >
                  {aylar.map((a, idx) => {
                    const val = idx + 1;
                    const { min, max } = getMonthBounds(yil);
                    if (val < min || val > max) return null;
                    return (
                      <option key={val} value={val}>
                        {a}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Yıl
                </label>
                <select
                  value={yil}
                  onChange={(e) => setYil(Number(e.target.value))}
                  className="w-full border rounded px-2.5 py-2 text-sm"
                >
                  {allowedYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Miktar (TL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={miktar}
                  onChange={(e) => {
                    setMiktar(
                      e.target.value === "" ? "" : Number(e.target.value)
                    );
                    setErrors((prev) => ({ ...prev, miktar: undefined }));
                  }}
                  className={`w-full border rounded-lg px-2.5 py-2 pr-10 sm:px-3 sm:pr-12 text-sm focus:ring-2 ${
                    errors.miktar
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  min={0}
                  step={0.01}
                  onBlur={() => {
                    if (miktar !== "") {
                      const num = Number(miktar);
                      if (!isNaN(num)) setMiktar(Number(num.toFixed(2)));
                    }
                  }}
                  required
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 text-gray-500 text-xs sm:text-sm">
                  ₺
                </span>
              </div>
              {errors.miktar && (
                <p className="mt-1 text-xs text-red-600">{errors.miktar}</p>
              )}
              {miktar !== "" && Number(miktar) >= 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  ≈{" "}
                  {new Intl.NumberFormat("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  }).format(Number(miktar))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Açıklama (isteğe bağlı)
              </label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
                className="w-full border rounded px-2.5 py-2 text-sm resize-none"
                placeholder="Belirtmek istediğiniz birşey varsa yazınız"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dosya</label>
              <div
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed rounded-lg p-2.5 sm:p-4 text-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm text-gray-600">
                  {file ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      {previewUrl && !isPdf ? (
                        <img
                          src={previewUrl}
                          alt="Önizleme"
                          className="h-24 sm:h-32 w-auto object-contain rounded"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-gray-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-8 h-8 text-rose-600"
                          >
                            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h8.5a2 2 0 001.414-.586l3.5-3.5A2 2 0 0020 16.5V4a2 2 0 00-2-2H6zM8 7h8v2H8V7zm0 4h8v2H8v-2z" />
                          </svg>
                          <span className="font-medium">PDF seçildi</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700">
                            PDF
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">
                          {file.name}
                        </span>
                        <span className="text-gray-400">
                          ({file.type || "dosya"})
                        </span>
                        {!isPdf && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                            {(
                              file.type?.split("/")?.[1] ||
                              file.name.split(".").pop() ||
                              "IMG"
                            ).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span>
                      Dosyayı buraya bırakın veya tıklayarak seçin (PDF veya
                      Görsel)
                    </span>
                  )}
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setErrors((prev) => ({ ...prev, file: undefined }));
                }}
              />
              {errors.file && (
                <p className="mt-1 text-xs text-red-600">{errors.file}</p>
              )}
            </div>

            <div className="flex gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-50 shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || !selectedIsletme || !selectedOgrenci || !file
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Dekont Yükle
                  </>
                )}
              </button>
              <button
                type="button"
                className="px-4 py-3 sm:px-6 sm:py-3 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-semibold shadow-lg transition-all duration-200"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                  setUploadStatus("");
                }}
              >
                <svg
                  className="w-4 h-4 mr-2 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sıfırla
              </button>
            </div>

            {uploadStatus && (
              <div className="text-sm mt-2 p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DekontYukleSayfasi() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Yükleniyor...
        </div>
      }
    >
      <DekontYukleInner />
    </Suspense>
  );
}
