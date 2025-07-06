'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Upload, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'

interface Stajyer {
  id: number
  ad: string
  soyad: string
  sinif: string
  isletme: {
    id: number
    ad: string
  }
}

export default function YeniDekontPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [ogretmen, setOgretmen] = useState<any>(null)
  const [stajyerler, setStajyerler] = useState<Stajyer[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Form state
  const [selectedStajyer, setSelectedStajyer] = useState('')
  const [miktar, setMiktar] = useState('')
  const [odemeTarihi, setOdemeTarihi] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dekontDosyasi, setDekontDosyasi] = useState<File | null>(null)

  useEffect(() => {
    const storedOgretmen = localStorage.getItem('ogretmen')
    if (!storedOgretmen) {
      router.push('/')
      return
    }

    setOgretmen(JSON.parse(storedOgretmen))
    fetchStajyerler()
  }, [])

  const fetchStajyerler = async () => {
    const storedOgretmen = JSON.parse(localStorage.getItem('ogretmen') || '{}')
    
    const { data } = await supabase
      .from('stajlar')
      .select(`
        id,
        isletmeler (
          id,
          ad
        ),
        ogrenciler (
          id,
          ad,
          soyad,
          sinif
        )
      `)
      .eq('ogretmen_id', storedOgretmen.id)
      .eq('durum', 'aktif')

    if (data) {
      const formattedStajyerler = data.map((staj: any) => ({
        id: staj.id,
        ad: staj.ogrenciler.ad,
        soyad: staj.ogrenciler.soyad,
        sinif: staj.ogrenciler.sinif,
        isletme: {
          id: staj.isletmeler.id,
          ad: staj.isletmeler.ad
        }
      }))
      setStajyerler(formattedStajyerler)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dekontDosyasi) return
    setLoading(true)

    try {
      const selectedStajyerData = stajyerler.find(s => s.id.toString() === selectedStajyer)
      if (!selectedStajyerData) throw new Error('Stajyer bulunamadı')

      // Dosya yükleme işlemi
      const fileName = `dekont_${Date.now()}_${dekontDosyasi.name.replace(/\s/g, '_')}`;
      const filePath = `${selectedStajyerData.isletme.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dekontlar')
        .upload(filePath, dekontDosyasi, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw new Error(`Dosya yükleme hatası: ${uploadError.message}`);

      // Public URL'i al
      const { data: urlData } = supabase.storage
        .from('dekontlar')
        .getPublicUrl(filePath);
      
      let dosyaUrl = urlData.publicUrl;

      // Eğer public URL çalışmıyorsa signed URL kullan
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('dekontlar')
          .createSignedUrl(filePath, 31536000); // 1 yıl geçerli

        if (!signedUrlError && signedUrlData) {
          dosyaUrl = signedUrlData.signedUrl;
        }
      } catch (signedUrlErr) {
        console.warn('Signed URL oluşturulamadı, public URL kullanılıyor:', signedUrlErr);
      }

      const { error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: parseInt(selectedStajyer),
          isletme_id: selectedStajyerData.isletme.id,
          ogretmen_id: ogretmen.id,
          miktar: miktar ? parseFloat(miktar) : null,
          odeme_tarihi: odemeTarihi,
          dosya_url: dosyaUrl,
          onay_durumu: 'bekliyor'
        })

      if (error) throw error

      // Form sıfırla
      setSelectedStajyer('')
      setMiktar('')
      setOdemeTarihi(new Date().toISOString().split('T')[0])
      setDekontDosyasi(null)

      // Başarı modal'ını göster
      setShowSuccessModal(true)
      
      // 3 saniye sonra panele dön
      setTimeout(() => {
        setShowSuccessModal(false)
        router.push('/ogretmen/panel')
      }, 3000)

    } catch (error) {
      console.error('Dekont gönderme hatası:', error)
      alert('Dekont gönderilirken hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  if (!ogretmen) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/ogretmen')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Panele Dön
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{okulAdi}</p>
              <p className="text-xs text-gray-500">{egitimYili} Eğitim-Öğretim Yılı</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h1 className="text-lg font-medium text-gray-900">Yeni Dekont Yükle</h1>
            <p className="mt-1 text-sm text-gray-500">
              Stajyer öğrenci için ödeme dekontu yükleyin
            </p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            {showSuccessModal ? (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <svg
                    className="h-10 w-10 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Dekont Başarıyla Gönderildi! 🎉
                </h3>
                <p className="text-gray-600 mb-4">
                  Dekontunuz sisteme kaydedildi ve onay için gönderildi.
                </p>
                <div className="text-sm text-gray-500 mb-6">
                  3 saniye sonra panele yönlendirileceksiniz...
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-3000 ease-linear"
                    style={{
                      animation: 'progress 3s linear forwards',
                      width: '0%'
                    }}
                  />
                </div>
                <style jsx>{`
                  @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                  }
                `}</style>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stajyer Öğrenci
                  </label>
                  <select
                    value={selectedStajyer}
                    onChange={(e) => setSelectedStajyer(e.target.value)}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Öğrenci Seçin</option>
                    {stajyerler.map((stajyer) => (
                      <option key={stajyer.id} value={stajyer.id}>
                        {stajyer.ad} {stajyer.soyad} - {stajyer.isletme.ad}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ödeme Miktarı (TL) <span className="text-gray-500 text-xs">(İsteğe bağlı)</span>
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      value={miktar}
                      onChange={(e) => setMiktar(e.target.value)}
                      step="0.01"
                      min="0"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ödeme Tarihi
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      value={odemeTarihi}
                      onChange={(e) => setOdemeTarihi(e.target.value)}
                      required
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dekont Dosyası <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <input
                      type="file"
                      onChange={(e) => setDekontDosyasi(e.target.files?.[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PDF, JPG veya PNG formatında dekont dosyası yükleyin
                  </p>
                </div>

                <div className="pt-5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push('/ogretmen')}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !dekontDosyasi}
                      className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                        !dekontDosyasi
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {loading ? 'Gönderiliyor...' : 'Dekont Gönder'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 