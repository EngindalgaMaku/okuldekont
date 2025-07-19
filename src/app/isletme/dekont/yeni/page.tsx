'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowLeft, CheckCircle } from 'lucide-react'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import { validateFile } from '@/lib/storage-client'
import { DekontFormData } from '@/types/dekont'
import DekontUpload from '@/components/ui/DekontUpload'

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
    const storedIsletmeId = sessionStorage.getItem('isletme_id')
    if (!storedIsletmeId) {
      router.push('/')
      return
    }

    // Fetch company details
    fetchIsletmeData(storedIsletmeId)
    fetchStajyerler(storedIsletmeId)
  }, [])

  const fetchIsletmeData = async (isletmeId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${isletmeId}`);
      if (response.ok) {
        const data = await response.json();
        setIsletme(data);
      }
    } catch (error) {
      console.error('İşletme bilgisi alınırken hata:', error);
    }
  }

  const fetchStajyerler = async (isletmeId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${isletmeId}/students`);
      if (!response.ok) {
        throw new Error('Stajyerler getirilemedi');
      }
      const data = await response.json();
      
      const formattedStajyerler = data.map((student: any) => ({
        id: student.staj_id || student.id,
        ogrenci_id: student.id,
        ad: student.ad || student.name,
        soyad: student.soyad || student.surname,
        sinif: student.sinif || student.className,
        no: student.no || student.number,
        alan: {
          ad: student.alanlar?.ad || student.alanlar?.name || 'Bilinmeyen'
        }
      }));
      
      console.log('Formatlanmış stajyerler:', formattedStajyerler);
      setStajyerler(formattedStajyerler);
    } catch (error) {
      console.error('Stajyerleri çekerken hata:', error);
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

        // FormData ile dosya yükleme - API kendi file naming ve ek dekont kontrolünü yapacak
        const uploadFormData = new FormData();
        uploadFormData.append('dosya', formData.dosya);
        uploadFormData.append('staj_id', formData.staj_id);
        uploadFormData.append('ay', formData.ay);
        uploadFormData.append('yil', formData.yil);
        uploadFormData.append('aciklama', formData.aciklama || '');
        uploadFormData.append('miktar', String(formData.miktar || ''));

        const uploadResponse = await fetch('/api/admin/dekontlar', {
          method: 'POST',
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Dosya yüklenirken hata oluştu!');
        }

        const uploadResult = await uploadResponse.json();
        dosyaUrl = uploadResult.dosya_url;
        dosyaPath = uploadResult.dosya_url;
      }

      // API zaten database insert işlemini yapıyor, burada sadece success durumunu ayarlıyoruz

      setSuccess(true)
      
      // 3 saniye sonra panele dön
      setTimeout(() => {
        router.push('/isletme')
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
                onClick={() => router.push('/isletme')}
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