'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import { uploadFile, validateFile } from '@/lib/storage'
import { DekontFormData } from '@/types/dekont'
import DekontUpload from '@/components/ui/DekontUpload'
import { generateDekontFileName, DekontNamingData } from '@/utils/dekontNaming'

interface Stajyer {
  id: string // staj kaydı id'si
  ogrenci_id: string // öğrenci id'si
  ad: string
  soyad: string
  sinif: string
  no: string
  alan: {
    ad: string
  }
}

export default function YeniDekontPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [isletme, setIsletme] = useState<any>(null)
  const [stajyerler, setStajyerler] = useState<Stajyer[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedStajyer, setSelectedStajyer] = useState('')

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
    console.log('İşletme bilgisi:', storedIsletme)
    
    const { data, error } = await supabase
      .from('stajlar')
      .select(`
        id,
        ogrenciler (
          id,
          ad,
          soyad,
          sinif,
          no,
          alanlar (
            ad
          )
        )
      `)
      .eq('isletme_id', storedIsletme.id)
      .eq('durum', 'aktif')

    console.log('Stajlar sorgu sonucu:', { data, error })

    if (error) {
      console.error('Stajyerleri çekerken hata:', error)
      return
    }

    if (data) {
      const formattedStajyerler = data.map((staj: any) => ({
        id: staj.id, // staj kaydı id'si
        ogrenci_id: staj.ogrenciler.id, // öğrenci id'si
        ad: staj.ogrenciler.ad,
        soyad: staj.ogrenciler.soyad,
        sinif: staj.ogrenciler.sinif,
        no: staj.ogrenciler.no,
        alan: {
          ad: staj.ogrenciler.alanlar?.ad || 'Bilinmeyen'
        }
      }))
      console.log('Formatlanmış stajyerler:', formattedStajyerler)
      setStajyerler(formattedStajyerler)
    }
  }

  const handleStajyerChange = (stajyerId: string) => {
    setSelectedStajyer(stajyerId)
  }

  const handleSubmit = async (formData: DekontFormData) => {
    setLoading(true)

    try {
      let dosyaUrl = null
      let dosyaPath = null

      // Dosya yükleme işlemi
      if (formData.dosya) {
        // Dosya validasyonu
        const validation = validateFile(formData.dosya, 10, ['pdf', 'jpg', 'jpeg', 'png'])
        if (!validation.valid) {
          throw new Error(validation.error)
        }

        // Stajyer objesini bul (dosya yükleme öncesi)
        const staj = stajyerler.find(s => s.id === formData.staj_id)
        if (!staj) {
          throw new Error('Stajyer bulunamadı!')
        }

        // Mevcut dekontları kontrol et (ek dekont kontrolü için)
        const { data: mevcutDekontlar } = await supabase
          .from('dekontlar')
          .select('id')
          .eq('staj_id', formData.staj_id)
          .eq('ay', formData.ay)
          .eq('yil', formData.yil);

        // Anlamlı dosya ismi oluştur
        const dekontNamingData: DekontNamingData = {
          studentName: staj.ad,
          studentSurname: staj.soyad,
          studentClass: staj.sinif,
          studentNumber: staj.no,
          fieldName: staj.alan.ad,
          companyName: isletme.ad,
          month: parseInt(formData.ay),
          year: parseInt(formData.yil),
          originalFileName: formData.dosya.name,
          isAdditional: (mevcutDekontlar?.length || 0) > 0,
          additionalIndex: (mevcutDekontlar?.length || 0) + 1
        }

        const meaningfulFileName = generateDekontFileName(dekontNamingData)

        // Dosyayı anlamlı isimle yükle
        const uploadResult = await uploadFile('dekontlar', formData.dosya, undefined, meaningfulFileName)
        if (!uploadResult) {
          throw new Error('Dosya yüklenirken hata oluştu!')
        }

        dosyaUrl = uploadResult.url
        dosyaPath = uploadResult.path
      }

      // Stajyer objesini bul (veritabanı işlemi için)
      const staj = stajyerler.find(s => s.id === formData.staj_id)
      
      const { error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: staj?.id,
          ogrenci_id: staj?.ogrenci_id || null,
          miktar: formData.miktar || null,
          odeme_tarihi: formData.odeme_tarihi,
          dosya_url: dosyaUrl,
          dekont_dosya_path: dosyaPath,
          onay_durumu: 'bekliyor',
          ay: formData.ay,
          yil: formData.yil,
          aciklama: formData.aciklama || null
        })

      if (error) throw error

      setSuccess(true)
      
      // 3 saniye sonra panele dön
      setTimeout(() => {
        router.push('/panel')
      }, 3000)

    } catch (error) {
      console.error('Dekont gönderme hatası:', error)
      throw error
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-xl mr-4">
                  <Building2 className="h-8 w-8 text-white" />
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
                <DekontUpload
                  onSubmit={handleSubmit}
                  isLoading={loading}
                  stajyerler={stajyerler}
                  selectedStajyerId={selectedStajyer}
                  onStajyerChange={handleStajyerChange}
                />
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