import { useState, useEffect } from "react";
import Modal from "./Modal";
import { Upload, Info, AlertTriangle } from "lucide-react";

interface DekontModalProps {
  isOpen: boolean;
  onClose: () => void;
  ogrenci: {
    id: string;
    staj_id: number;
    ad: string;
    soyad: string;
    sinif: string;
  };
  isletmeId: number;
  onSuccess: () => void;
}

export default function DekontModal({
  isOpen,
  onClose,
  ogrenci,
  isletmeId,
  onSuccess,
}: DekontModalProps) {
  const [loading, setLoading] = useState(false);
  const [miktar, setMiktar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ay/yıl seçimi - varsayılan olarak önceki ay
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    return prevMonth;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });

  // Ödeme bilgisi state'leri
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number | null;
    loading: boolean;
    found: boolean;
  }>({
    amount: null,
    loading: false,
    found: false,
  });

  // Mevcut dekont bilgisi
  const [existingDekont, setExistingDekont] = useState<{
    exists: boolean;
    status: string | null;
    amount: number | null;
    isApproved: boolean;
  }>({
    exists: false,
    status: null,
    amount: null,
    isApproved: false,
  });

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

  // Ödeme bilgisini çek
  const fetchPaymentInfo = async () => {
    if (!ogrenci.staj_id || !selectedMonth || !selectedYear) return;

    setPaymentInfo((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch(
        `/api/admin/payments/student-payment?stajId=${ogrenci.staj_id}&month=${selectedMonth}&year=${selectedYear}`
      );

      if (response.ok) {
        const data = await response.json();

        // Ödeme bilgisini güncelle
        setPaymentInfo({
          amount: data.paymentInfo.amount,
          loading: false,
          found: data.paymentInfo.found,
        });

        // Mevcut dekont bilgisini güncelle
        setExistingDekont({
          exists: data.existingDekont.exists,
          status: data.existingDekont.status,
          amount: data.existingDekont.amount,
          isApproved: data.existingDekont.isApproved,
        });
      } else {
        setPaymentInfo({
          amount: null,
          loading: false,
          found: false,
        });
        setExistingDekont({
          exists: false,
          status: null,
          amount: null,
          isApproved: false,
        });
      }
    } catch (error) {
      console.error("Ödeme bilgisi alınırken hata:", error);
      setPaymentInfo({
        amount: null,
        loading: false,
        found: false,
      });
      setExistingDekont({
        exists: false,
        status: null,
        amount: null,
        isApproved: false,
      });
    }
  };

  // Ay/yıl değiştiğinde ödeme bilgisini güncelle
  useEffect(() => {
    fetchPaymentInfo();
  }, [selectedMonth, selectedYear, ogrenci.staj_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Lütfen bir dekont dosyası seçin");
      return;
    }

    if (!miktar || isNaN(Number(miktar))) {
      setError("Lütfen geçerli bir miktar girin");
      return;
    }

    try {
      setLoading(true);

      // FormData oluştur
      const formData = new FormData();
      formData.append("file", file);
      formData.append("staj_id", ogrenci.staj_id.toString());
      formData.append("isletme_id", isletmeId.toString());
      formData.append("miktar", miktar);
      formData.append("aciklama", aciklama);
      formData.append("ay", selectedMonth.toString());
      formData.append("yil", selectedYear.toString());

      // API'ye gönder
      const response = await fetch("/api/admin/dekontlar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Dekont yüklenirken bir hata oluştu"
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Dekont yüklenirken hata:", error);
      setError(error.message || "Dekont yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dekont Yükle">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="ogrenci"
            className="block text-sm font-medium text-gray-700"
          >
            Öğrenci Adı
          </label>
          <input
            type="text"
            id="ogrenci"
            value={`${ogrenci.ad} ${ogrenci.soyad} - ${ogrenci.sinif}`}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm text-gray-900 font-medium"
          />
        </div>

        {/* Ay/Yıl Seçimi */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="month"
              className="block text-sm font-medium text-gray-700"
            >
              Ay
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {MONTHS.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="year"
              className="block text-sm font-medium text-gray-700"
            >
              Yıl
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value={selectedYear - 1}>{selectedYear - 1}</option>
              <option value={selectedYear}>{selectedYear}</option>
            </select>
          </div>
        </div>

        {/* Ödeme Bilgisi Gösterimi */}
        {paymentInfo.loading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                Ödeme bilgisi yükleniyor...
              </span>
            </div>
          </div>
        ) : paymentInfo.found && paymentInfo.amount ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-700">
                Bu öğrenci için {MONTHS[selectedMonth - 1]} {selectedYear}{" "}
                ayında{" "}
                <span className="font-semibold">
                  {paymentInfo.amount.toLocaleString("tr-TR")} ₺
                </span>{" "}
                ödeme kaydı bulundu.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-700">
                Bu öğrenci için {MONTHS[selectedMonth - 1]} {selectedYear}{" "}
                ayında ödeme bilgisi bulunamadı.
              </span>
            </div>
          </div>
        )}

        {/* Mevcut dekont durumu göster */}
        {existingDekont.exists && existingDekont.isApproved && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
              <span className="text-sm text-orange-700">
                Bu öğrenci için {MONTHS[selectedMonth - 1]} {selectedYear}{" "}
                ayında zaten <span className="font-semibold">onaylanmış</span>{" "}
                dekont var:{" "}
                <span className="font-semibold">
                  {existingDekont.amount?.toLocaleString("tr-TR")} ₺
                </span>
                <br />
                <span className="text-orange-600 text-xs">
                  Yeni dekont yüklerseniz mevcut onaylı dekont geçersiz hale
                  gelecek.
                </span>
              </span>
            </div>
          </div>
        )}

        {existingDekont.exists && !existingDekont.isApproved && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                Bu öğrenci için {MONTHS[selectedMonth - 1]} {selectedYear}{" "}
                ayında{" "}
                <span className="font-semibold">{existingDekont.status}</span>{" "}
                durumda dekont var:{" "}
                <span className="font-semibold">
                  {existingDekont.amount?.toLocaleString("tr-TR")} ₺
                </span>
                <br />
                <span className="text-blue-600 text-xs">
                  Yeni dekont yüklerseniz mevcut dekont güncellenecek.
                </span>
              </span>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="miktar"
            className="block text-sm font-medium text-gray-700"
          >
            Dekont Miktar (₺)
          </label>
          <input
            type="number"
            id="miktar"
            value={miktar}
            onChange={(e) => setMiktar(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder={
              paymentInfo.found && paymentInfo.amount
                ? paymentInfo.amount.toString()
                : "0.00"
            }
            step="0.01"
            required
          />
          {paymentInfo.found && paymentInfo.amount && (
            <p className="mt-1 text-xs text-gray-500">
              Önerilen tutar: {paymentInfo.amount.toLocaleString("tr-TR")} ₺
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="aciklama"
            className="block text-sm font-medium text-gray-700"
          >
            Açıklama
          </label>
          <textarea
            id="aciklama"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Ödeme hakkında açıklama..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dekont Dosyası
          </label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                >
                  <span>Dosya seç</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="pl-1">veya sürükle bırak</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, PNG, JPG veya JPEG (max. 10MB)
              </p>
              {file && <p className="text-sm text-gray-500">{file.name}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? "Yükleniyor..." : "Yükle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
