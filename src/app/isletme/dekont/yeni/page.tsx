'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Upload, ArrowLeft, User, Calendar, CreditCard, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import { uploadFile, validateFile } from '@/lib/storage'

interface Stajyer {
  id: number // staj kaydı id'si
  ogrenci_id: number // öğrenci id'si
  ad: string
  soyad: string
  sinif: string
}

export default function YeniDekontPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [isletme, setIsletme] = useState<any>(null)
  const [stajyerler, setStajyerler] = useState<Stajyer[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [selectedStajyer, setSelectedStajyer] = useState('')
  const [miktar, setMiktar] = useState('')
  const [odemeTarihi, setOdemeTarihi] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dekontDosyasi, setDekontDosyasi] = useState<File | null>(null)
  const [ay, setAy] = useState(() => {
    const today = new Date()
    return (today.getMonth() + 1).toString().padStart(2, '0')
  })
  const [yil, setYil] = useState(() => {
    const today = new Date()
    return today.getFullYear().toString()
  })

  useEffect(() => {
    const storedIsletme = localStorage.getItem('isletme')
    if (!storedIsletme) {
      router.push('/')
      return
    }

    setIsletme(JSON.parse(storedIsletme))
    fetchStajyerler()
  }, [])

  const fetchStajyerler = async () => {
    const storedIsletme = JSON.parse(localStorage.getItem('isletme') || '{}')
    
    const { data } = await supabase
      .from('stajlar')
      .select(`
        id,
        ogrenciler (
          id,
          ad,
          soyad,
          sinif
        )
      `)
      .eq('isletme_id', storedIsletme.id)
      .eq('durum', 'aktif')

    if (data) {
      const formattedStajyerler = data.map((staj: any) => ({
        id: staj.id, // staj kaydı id'si
        ogrenci_id: staj.ogrenciler.id, // öğrenci id'si
        ad: staj.ogrenciler.ad,
        soyad: staj.ogrenciler.soyad,
        sinif: staj.ogrenciler.sinif
      }))
      setStajyerler(formattedStajyerler)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let dosyaUrl = null
      let dosyaPath = null

      // Dosya yükleme işlemi
      if (dekontDosyasi) {
        // Dosya validasyonu
        const validation = validateFile(dekontDosyasi, 10, ['pdf', 'jpg', 'jpeg', 'png'])
        if (!validation.valid) {
          alert(validation.error)
          setLoading(false)
          return
        }

        // Dosyayı Supabase Storage'a yükle
        const uploadResult = await uploadFile('dekontlar', dekontDosyasi, 'dekont_')
        if (!uploadResult) {
          alert('Dosya yüklenirken hata oluştu!')
          setLoading(false)
          return
        }

        dosyaUrl = uploadResult.url
        dosyaPath = uploadResult.path
      }

      // Panel ile uyumlu alanlar: ogrenci_id, dosya_url, ay formatı
      // Stajyer objesini bul
      const staj = stajyerler.find(s => s.id === parseInt(selectedStajyer))
      // Ay adını paneldeki gibi kaydet
      const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
      const ayAdi = aylar[parseInt(ay, 10) - 1]

      const { error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: staj?.id,
          ogrenci_id: staj?.ogrenci_id || null, // panel ile uyumlu
          miktar: miktar ? parseFloat(miktar) : null,
          odeme_tarihi: odemeTarihi,
          dosya_url: dosyaUrl, // panel ile uyumlu
          dekont_dosya_path: dosyaPath,
          onay_durumu: 'bekliyor',
          ay: ayAdi, // panel ile uyumlu
          yil: yil.toString()
        })

      if (error) throw error

      setSuccess(true)
      // Form sıfırla
      setSelectedStajyer('')
      setMiktar('')
      setOdemeTarihi(new Date().toISOString().split('T')[0])
      setDekontDosyasi(null)

      // 3 saniye sonra panele dön
      setTimeout(() => {
        router.push('/panel')
      }, 3000)

    } catch (error) {
      console.error('Dekont gönderme hatası:', error)
      alert('Dekont gönderilirken hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  if (!isletme) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-xl border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/panel')}
                className="flex items-center text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all duration-200 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Panele Dön
              </button>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {isletme.ad}
                  </h1>
                  <p className="text-sm text-gray-600">Dekont Yükleme Sistemi</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{okulAdi}</p>
              <p className="text-xs text-indigo-600">{egitimYili} Eğitim-Öğretim Yılı</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-xl mr-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Yeni Dekont Yükle</h1>
                  <p className="text-indigo-100 mt-1">
                    Stajyer öğrenci için ödeme dekontu yükleyin
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-16">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Dekont Başarıyla Gönderildi!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Dekontunuz onay için yöneticilere gönderildi.
                  </p>
                  <p className="text-sm text-indigo-600">
                    Panele yönlendiriliyorsunuz...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Stajyer Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <User className="w-4 h-4 inline mr-2" />
                      Stajyer Öğrenci
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStajyer}
                        onChange={(e) => setSelectedStajyer(e.target.value)}
                        required
                        className="w-full pl-4 pr-10 py-4 text-base border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                      >
                        <option value="">Öğrenci Seçin</option>
                        {stajyerler.map((stajyer) => (
                          <option key={stajyer.id} value={stajyer.id}>
                            {stajyer.ad} {stajyer.soyad} - {stajyer.sinif}
                          </option>
                        ))}
                      </select>
                    </div>
                    {stajyerler.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Henüz aktif stajyer bulunmuyor.
                      </p>
                    )}
                  </div>

                  {/* Ödeme Miktarı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <CreditCard className="w-4 h-4 inline mr-2" />
                      Ödeme Miktarı (TL) 
                      <span className="text-gray-500 text-xs ml-2">(İsteğe bağlı)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={miktar}
                        onChange={(e) => setMiktar(e.target.value)}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full pl-4 pr-4 py-4 text-base border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        ₺
                      </div>
                    </div>
                  </div>

                  {/* Ödeme Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Ödeme Tarihi
                    </label>
                    <input
                      type="date"
                      value={odemeTarihi}
                      onChange={(e) => setOdemeTarihi(e.target.value)}
                      required
                      className="w-full pl-4 pr-4 py-4 text-base border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                  </div>

                  {/* Ay ve Yıl Seçimi */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Ay
                      </label>
                      <select
                        value={ay}
                        onChange={(e) => setAy(e.target.value)}
                        required
                        className="w-full pl-4 pr-10 py-4 text-base border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      >
                        <option value="01">Ocak</option>
                        <option value="02">Şubat</option>
                        <option value="03">Mart</option>
                        <option value="04">Nisan</option>
                        <option value="05">Mayıs</option>
                        <option value="06">Haziran</option>
                        <option value="07">Temmuz</option>
                        <option value="08">Ağustos</option>
                        <option value="09">Eylül</option>
                        <option value="10">Ekim</option>
                        <option value="11">Kasım</option>
                        <option value="12">Aralık</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Yıl
                      </label>
                      <select
                        value={yil}
                        onChange={(e) => setYil(e.target.value)}
                        required
                        className="w-full pl-4 pr-10 py-4 text-base border-2 border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() + i - 2
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Dosya Yükleme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <FileText className="w-4 h-4 inline mr-2" />
                      Dekont Dosyası <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-indigo-400 transition-all duration-200">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Dosya yüklemek için tıklayın</span>
                            </p>
                            <p className="text-xs text-gray-500">PDF, JPG, JPEG veya PNG (MAX. 10MB)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setDekontDosyasi(e.target.files?.[0] || null)}
                            accept=".pdf,.jpg,.jpeg,.png"
                            required
                          />
                        </label>
                      </div>
                      {dekontDosyasi && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-green-600 mr-2" />
                            <span className="text-sm text-green-800 font-medium">
                              {dekontDosyasi.name}
                            </span>
                            <span className="text-xs text-green-600 ml-auto">
                              {(dekontDosyasi.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => router.push('/panel')}
                      className="flex-1 bg-white text-gray-700 py-4 px-6 border-2 border-gray-200 rounded-xl shadow-sm text-sm font-medium hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !dekontDosyasi || !selectedStajyer}
                      className={`flex-1 py-4 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white transition-all duration-200 flex items-center justify-center ${
                        !dekontDosyasi || !selectedStajyer
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105'
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Dekont Gönder
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-lg shadow-xl border-t border-indigo-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} {okulAdi} - Koordinatörlük Yönetimi Sistemi. Tüm Hakları Saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}