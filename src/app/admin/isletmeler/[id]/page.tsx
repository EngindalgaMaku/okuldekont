'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { 
  Building, 
  ArrowLeft, 
  User, 
  Key, 
  GraduationCap, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader,
  UserCheck,
  BookOpen,
  MapPin,
  Building2,
  Phone,
  Mail,
  Shield,
  Calendar,
  Hash,
  FileText,
  Receipt,
  Upload,
  Download,
  Eye,
  File,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'

interface Isletme {
  id: number;
  ad: string;
  adres?: string;
  telefon?: string;
  email?: string;
  yetkili_kisi?: string;
  pin?: string;
  ogretmen_id?: number;
  ogretmenler?: {
    id: number;
    ad: string;
    soyad: string;
  };
}

interface Ogrenci {
  id: number;
  ad: string;
  soyad: string;
  no: string;
  alan_id: number;
  sinif: string;
  isletme_id?: number;
  alanlar: {
    ad: string;
  };
}

interface Staj {
  id: number;
  ogrenci_id: number;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  fesih_tarihi?: string;
  durum: string;
  ogrenciler: {
    id: number;
    ad: string;
    soyad: string;
    no: string;
    sinif: string;
    alanlar: {
      ad: string;
    };
  };
}

interface IsletmeAlan {
  id: number;
  alan_id: number;
  alanlar: {
    id: number;
    ad: string;
  };
  ogretmenler?: {
    id: number;
    ad: string;
    soyad: string;
    alan_id: number;
  } | null;
}

interface Alan {
  id: number;
  ad: string;
}

interface Belge {
  id: number;
  isletme_id: number;
  ad: string;
  tur: string;
  dosya_url?: string;
  yukleme_tarihi: string;
}

interface Dekont {
  id: number;
  isletme_id: number;
  tarih: string;
  aciklama: string;
  tutar: number;
  ay: string;
  ogrenci_adi?: string;
  dosya_url?: string;
  onay_durumu?: string;
  staj_id?: number;
  ogrenci_id?: number;
}

interface IsletmeData {
  id: number;
  ogretmen_id: number | null;
  ogretmenler: {
    id: number;
    ad: string;
    soyad: string;
    alan_id: number;
  } | null;
}

interface AlanData {
  id: number;
  alan_id: number;
  alanlar: {
    id: number;
    ad: string;
  };
}

export default function IsletmeDetayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const isletmeId = params.id as string
  const referrer = searchParams.get('ref')

  const [activeTab, setActiveTab] = useState('temel')
  const [isletme, setIsletme] = useState<Isletme | null>(null)
  const [stajlar, setStajlar] = useState<Staj[]>([])
  const [isletmeAlanlar, setIsletmeAlanlar] = useState<IsletmeAlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [fesihModalOpen, setFesihModalOpen] = useState(false)
  const [belgeModalOpen, setBelgeModalOpen] = useState(false)
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [belgeler, setBelgeler] = useState<Belge[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [mevcutOgrenciler, setMevcutOgrenciler] = useState<Ogrenci[]>([])
  const [selectedStaj, setSelectedStaj] = useState<Staj | null>(null)
  
  // Dekont görüntüleme için state'ler
  const [dekontViewModalOpen, setDekontViewModalOpen] = useState(false)
  const [selectedStajDekontlar, setSelectedStajDekontlar] = useState<Dekont[]>([])
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [dekontDetailModalOpen, setDekontDetailModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    ad: '',
    adres: '',
    telefon: '',
    email: '',
    yetkili_kisi: '',
    pin: ''
  })

  const [ogrenciFormData, setOgrenciFormData] = useState({
    ogrenci_id: '',
    baslangic_tarihi: ''
  })

  const [fesihFormData, setFesihFormData] = useState({
    fesih_tarihi: ''
  })

  const [belgeFormData, setBelgeFormData] = useState({
    ad: '',
    tur: 'sozlesme',
    customTur: '',
    dosya: null as File | null
  })

  const [dekontFormData, setDekontFormData] = useState({
    tarih: '',
    ay: '',
    aciklama: '',
    tutar: '',
    dosya: null as File | null
  })

  // Fetch işletme bilgileri
  async function fetchIsletme() {
    try {
      const { data, error } = await supabase
        .from('isletmeler')
        .select(`
          *,
          ogretmenler (id, ad, soyad)
        `)
        .eq('id', isletmeId)
        .single()

      if (error) {
        console.error('İşletme çekilirken hata:', error)
        return
      }

      setIsletme(data)
      setFormData({
        ad: data.ad || '',
        adres: data.adres || '',
        telefon: data.telefon || '',
        email: data.email || '',
        yetkili_kisi: data.yetkili_kisi || '',
        pin: data.pin || ''
      })
    } catch (error) {
      console.error('Genel hata:', error)
    }
  }

  // Fetch stajlar ve öğrenciler
  async function fetchStajlar() {
    try {
      const { data, error } = await supabase
        .from('stajlar')
        .select(`
          id,
          ogrenci_id,
          baslangic_tarihi,
          bitis_tarihi,
          fesih_tarihi,
          durum,
          ogrenciler!inner (
            id,
            ad,
            soyad,
            no,
            sinif,
            alanlar (ad)
          )
        `)
        .eq('isletme_id', isletmeId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Stajlar çekilirken hata:', error)
        return
      }

      setStajlar(data as any || [])
    } catch (error) {
      console.error('Staj fetch hatası:', error)
    }
  }

  // Fetch mevcut öğrenciler (işletmenin alanlarına göre)
  async function fetchMevcutOgrenciler() {
    try {
      // Önce işletmenin alanlarını al
      const { data: isletmeAlanData } = await supabase
        .from('isletme_alanlar')
        .select('alan_id')
        .eq('isletme_id', isletmeId)

      if (!isletmeAlanData || isletmeAlanData.length === 0) {
        setMevcutOgrenciler([])
        return
      }

      const alanIds = isletmeAlanData.map(ia => ia.alan_id)

      // Bu alanlardaki öğrencileri getir (aktif stajda olmayanlar)
      const { data, error } = await supabase
        .from('ogrenciler')
        .select(`
          id,
          ad,
          soyad,
          no,
          sinif,
          alan_id,
          alanlar!inner (ad)
        `)
        .in('alan_id', alanIds)
        .is('isletme_id', null) // Aktif stajda olmayan öğrenciler
        .order('ad')

      if (error) {
        console.error('Mevcut öğrenciler çekilirken hata:', error)
        return
      }

      const transformedData = data?.map(item => ({
        ...item,
        alanlar: item.alanlar
      })) || []

      setMevcutOgrenciler(transformedData as any)
    } catch (error) {
      console.error('Mevcut öğrenci fetch hatası:', error)
    }
  }

  // Fetch işletme alanları
  async function fetchIsletmeAlanlar() {
    try {
      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select(`
          id,
          ogretmen_id,
          ogretmenler (
            id, ad, soyad, alan_id
          )
        `)
        .eq('id', isletmeId)
        .single()

      if (isletmeError) {
        console.error('İşletme bilgileri çekilirken hata:', isletmeError)
        return
      }

      const { data: alanData, error: alanError } = await supabase
        .from('isletme_alanlar')
        .select(`
          id,
          alan_id,
          alanlar (id, ad)
        `)
        .eq('isletme_id', isletmeId)

      if (alanError) {
        console.error('İşletme alanları çekilirken hata:', alanError)
        return
      }

      const typedIsletmeData = isletmeData as unknown as IsletmeData
      const typedAlanData = alanData as unknown as AlanData[]

      const transformedData = typedAlanData?.map(item => ({
        id: item.id,
        alan_id: item.alan_id,
        alanlar: item.alanlar,
        ogretmenler: typedIsletmeData?.ogretmenler?.alan_id === item.alan_id ? typedIsletmeData.ogretmenler : null
      })) || []

      setIsletmeAlanlar(transformedData)
    } catch (error) {
      console.error('İşletme alanları fetch hatası:', error)
    }
  }

  // Fetch alanlar
  async function fetchAlanlar() {
    try {
      const { data, error } = await supabase
        .from('alanlar')
        .select('id, ad')
        .order('ad')

      if (error) {
        console.error('Alanlar çekilirken hata:', error)
        return
      }

      setAlanlar(data || [])
    } catch (error) {
      console.error('Alanlar fetch hatası:', error)
    }
  }

  // Fetch belgeler
  async function fetchBelgeler() {
    console.log('Belgeler yükleniyor... İşletme ID:', isletmeId)
    try {
      const { data, error } = await supabase
        .from('belgeler')
        .select('id, isletme_id, ad, tur, dosya_url, yukleme_tarihi')
        .eq('isletme_id', parseInt(isletmeId))

      if (error) {
                  console.error('Belgeler çekilirken hata:', error.message)
          console.error('Hata detayları:', error)
        console.log('İşletme ID:', isletmeId)
        console.log('Sorgu sonucu:', { data, error })
        setBelgeler([])
        return
      }

      console.log('Belgeler başarıyla yüklendi:', data)
      setBelgeler(data || [])
    } catch (error) {
      console.error('Belge fetch hatası:', error)
      alert('Belgeler yüklenirken beklenmeyen bir hata oluştu!')
    }
  }

  // Fetch dekontlar
  async function fetchDekontlar() {
    try {
      const { data, error } = await supabase
        .from('dekontlar')
        .select('*')
        .eq('isletme_id', isletmeId)
        .order('tarih', { ascending: false })

      if (error) {
        console.error('Dekontlar çekilirken hata:', error)
        return
      }

      setDekontlar(data || [])
    } catch (error) {
      console.error('Dekont fetch hatası:', error)
    }
  }

  useEffect(() => {
    if (isletmeId) {
      Promise.all([
        fetchIsletme(),
        fetchStajlar(), 
        fetchIsletmeAlanlar(),
        fetchAlanlar(),
        fetchBelgeler(),
        fetchDekontlar(),
        fetchMevcutOgrenciler()
      ]).then(() => {
        setLoading(false)
      })
    }
  }, [isletmeId])

  // Bilgileri güncelle
  const handleSave = async () => {
    if (!isletme) return

    try {
      const { error } = await supabase
        .from('isletmeler')
        .update({
          ad: formData.ad.trim(),
          adres: formData.adres.trim() || null,
          telefon: formData.telefon.trim() || null,
          email: formData.email.trim() || null,
          yetkili_kisi: formData.yetkili_kisi.trim() || null,
          pin: formData.pin.trim() || null
        })
        .eq('id', isletme.id)

      if (error) {
        alert('Güncelleme sırasında hata: ' + error.message)
        return
      }

      setEditMode(false)
      fetchIsletme()
    } catch (error) {
      console.error('Güncelleme hatası:', error)
      alert('Bir hata oluştu.')
    }
  }

  // Öğrenci ekle (mevcut öğrenciden seç)
  const handleOgrenciEkle = async () => {
    try {
      // Form validation
      if (!ogrenciFormData.ogrenci_id || !ogrenciFormData.baslangic_tarihi) {
        alert('Lütfen tüm alanları doldurun!')
        return
      }

      console.log('Staj ekleme başlatılıyor...', ogrenciFormData)

      // Aktif eğitim yılını al
      const { data: egitimYiliData, error: egitimYiliError } = await supabase
        .from('egitim_yillari')
        .select('id')
        .eq('aktif', true)
        .single()

      if (egitimYiliError) {
        console.warn('Aktif eğitim yılı bulunamadı, varsayılan kullanılacak:', egitimYiliError)
      }

      // Staj kaydı oluştur
      const stajInsertData = {
        ogrenci_id: parseInt(ogrenciFormData.ogrenci_id),
        isletme_id: parseInt(isletmeId),
        ogretmen_id: isletme?.ogretmen_id || null,
        egitim_yili_id: egitimYiliData?.id || 1,
        baslangic_tarihi: ogrenciFormData.baslangic_tarihi,
        bitis_tarihi: new Date(new Date(ogrenciFormData.baslangic_tarihi).getTime() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        durum: 'aktif'
      }

      console.log('Staj verisi:', stajInsertData)

      const { error: stajError } = await supabase
        .from('stajlar')
        .insert(stajInsertData)

      if (stajError) {
        console.error('Staj kaydı ekleme hatası:', stajError)
        alert('Staj kaydı oluşturulurken hata oluştu: ' + stajError.message)
        return
      }

      // Öğrencinin isletme_id'sini güncelle (aktif staj için)
      const { error: ogrenciUpdateError } = await supabase
        .from('ogrenciler')
        .update({ isletme_id: parseInt(isletmeId) })
        .eq('id', parseInt(ogrenciFormData.ogrenci_id))

      if (ogrenciUpdateError) {
        console.error('Öğrenci güncelleme hatası:', ogrenciUpdateError)
      }

      // Başarılı
      alert('Öğrenci başarıyla işletmeye eklendi!')
      setOgrenciModalOpen(false)
      setOgrenciFormData({
        ogrenci_id: '',
        baslangic_tarihi: ''
      })
      
      // Veriyi yeniden fetch et
      await Promise.all([fetchStajlar(), fetchMevcutOgrenciler()])
      
    } catch (error) {
      console.error('Staj ekleme genel hatası:', error)
      alert('Staj eklenirken beklenmeyen bir hata oluştu!')
    }
  }

  // Belge ekleme fonksiyonu
  const handleBelgeEkle = async () => {
    if (!belgeFormData.ad.trim()) {
      alert('Belge adı gereklidir!')
      return
    }

    const belgeTuru = belgeFormData.tur === 'other' ? belgeFormData.customTur : belgeFormData.tur

    if (!belgeTuru.trim()) {
      alert('Belge türü gereklidir!')
      return
    }

    if (!belgeFormData.dosya) {
      alert('Dosya seçimi zorunludur!')
      return
    }

    try {
      // Dosya yükle
      const dosyaAdi = `${Date.now()}_${belgeFormData.dosya.name}`
      const { data: dosyaData, error: dosyaError } = await supabase.storage
        .from('belgeler')
        .upload(dosyaAdi, belgeFormData.dosya)

      if (dosyaError) {
        console.error('Dosya yükleme hatası:', dosyaError)
        alert('Dosya yüklenirken hata oluştu!')
        return
      }

      // Public URL al
      const { data: publicUrl } = supabase.storage
        .from('belgeler')
        .getPublicUrl(dosyaData.path)
      
      const dosyaUrl = publicUrl.publicUrl

      // Belge kaydını veritabanına ekle
      const { error: belgeError } = await supabase
        .from('belgeler')
        .insert({
          isletme_id: parseInt(isletmeId),
          ad: belgeFormData.ad,
          tur: belgeTuru,
          dosya_url: dosyaUrl,
          yukleme_tarihi: new Date().toISOString()
        })

      if (belgeError) {
        console.error('Belge ekleme hatası:', belgeError)
        alert('Belge eklenirken hata oluştu!')
        return
      }

      alert('Belge başarıyla eklendi!')
      setBelgeModalOpen(false)
      setBelgeFormData({
        ad: '',
        tur: 'sozlesme',
        customTur: '',
        dosya: null
      })
      
      await fetchBelgeler()
      
    } catch (error) {
      console.error('Belge ekleme hatası:', error)
      alert('Belge eklenirken hata oluştu!')
    }
  }

  const handleDekontEkle = async () => {
    if (!selectedStaj || !dekontFormData.tarih || !dekontFormData.ay || !dekontFormData.aciklama || !dekontFormData.tutar) {
      alert('Tüm alanlar zorunludur!')
      return
    }

    try {
      let dosyaUrl = null
      
      // Dosya varsa yükle
      if (dekontFormData.dosya) {
        // Simülasyon - gerçek uygulamada Supabase Storage kullanılacak
        dosyaUrl = `/uploads/dekontlar/${Date.now()}_${dekontFormData.dosya.name}`
      }

      const { error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: selectedStaj.id,
          ogrenci_id: selectedStaj.ogrenci_id,
          isletme_id: Number(isletmeId),
          tarih: dekontFormData.tarih,
          aciklama: dekontFormData.aciklama,
          tutar: parseFloat(dekontFormData.tutar),
          dosya_url: dosyaUrl,
          onay_durumu: 'beklemede'
        })

      if (error) {
        console.error('Dekont ekleme hatası:', error)
        alert('Dekont eklenirken hata oluştu!')
        return
      }

      alert('Dekont başarıyla eklendi!')
      setDekontModalOpen(false)
      setSelectedStaj(null)
      setDekontFormData({ tarih: '', ay: '', aciklama: '', tutar: '', dosya: null })
      fetchDekontlar()
    } catch (error) {
      console.error('Dekont ekleme hatası:', error)
      alert('Dekont eklenirken hata oluştu!')
    }
  }

  // Dekont görüntüleme fonksiyonları
  const handleDekontlarGoster = async (staj: Staj) => {
    try {
      const { data: dekontData } = await supabase
        .from('dekontlar')
        .select(`
          id,
          tarih,
          aciklama,
          tutar,
          dosya_url,
          onay_durumu,
          created_at
        `)
        .eq('ogrenci_id', staj.ogrenci_id)
        .eq('isletme_id', isletmeId)
        .order('created_at', { ascending: false })

      if (dekontData) {
        const formattedDekontlar = dekontData.map((dekont: any) => ({
          id: dekont.id,
          ogrenci_adi: `${staj.ogrenciler.ad} ${staj.ogrenciler.soyad}`,
          isletme_id: parseInt(isletmeId),
          tarih: dekont.tarih,
          ay: dekont.ay || '',
          aciklama: dekont.aciklama,
          tutar: dekont.tutar,
          dosya_url: dekont.dosya_url,
          onay_durumu: dekont.onay_durumu,
          staj_id: staj.id,
          ogrenci_id: staj.ogrenci_id
        }))
        setSelectedStajDekontlar(formattedDekontlar)
        setSelectedStaj(staj)
        setDekontViewModalOpen(true)
      }
    } catch (error) {
      console.error('Dekont listesi alınırken hata:', error)
      alert('Dekontlar yüklenirken hata oluştu!')
    }
  }

  const handleDekontDetay = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setDekontDetailModalOpen(true)
  }

  const getOnayDurumuRenk = (durum: string) => {
    switch (durum) {
      case 'onaylandi':
        return 'bg-green-100 text-green-800'
      case 'reddedildi':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getOnayDurumuText = (durum: string) => {
    switch (durum) {
      case 'onaylandi':
        return 'Onaylandı'
      case 'reddedildi':
        return 'Reddedildi'
      case 'beklemede':
        return 'Beklemede'
      default:
        return 'Bekliyor'
    }
  }

  const tabs = [
    { 
      id: 'temel', 
      name: 'Temel Bilgiler', 
      icon: Building
    },
    { 
      id: 'ogrenciler', 
      name: 'Öğrenciler', 
      icon: GraduationCap,
      count: stajlar.length
    },
    { 
      id: 'koordinatorler', 
      name: 'Koordinatörler', 
      icon: UserCheck,
      count: isletmeAlanlar.length
    },
    { 
      id: 'alanlar', 
      name: 'Staj Alanları', 
      icon: BookOpen
    },
    { 
      id: 'belgeler', 
      name: 'Belgeler', 
      icon: FileText
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">İşletme bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isletme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">İşletme bulunamadı</h2>
          <p className="text-gray-600 mb-6">Belirtilen işletme mevcut değil veya silinmiş olabilir.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(referrer || '/admin/isletmeler')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {referrer?.includes('alanlar') ? 'Alan Detayına Dön' : 'İşletme Listesi'}
            </button>
            
            <div className="flex gap-3">
              {activeTab === 'temel' && (
                <button
                  onClick={() => editMode ? handleSave() : setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  {editMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Düzenle
                    </>
                  )}
                </button>
              )}
              
              {editMode && (
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData({
                      ad: isletme.ad || '',
                      adres: isletme.adres || '',
                      telefon: isletme.telefon || '',
                      email: isletme.email || '',
                      yetkili_kisi: isletme.yetkili_kisi || '',
                      pin: isletme.pin || ''
                    })
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  İptal
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mr-6">
                <Building className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {isletme.ad}
                </h1>
                <div className="flex items-center mt-2 space-x-4">
                  {isletme.adres && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{isletme.adres}</span>
                    </div>
                  )}
                  {isletme.pin && (
                    <div className="flex items-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                        <Key className="h-3 w-3 mr-1" />
                        <span className="text-xs font-mono font-medium">PIN: {isletme.pin}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>{tab.name}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive 
                            ? 'bg-indigo-100 text-indigo-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'temel' && (
              <TemelBilgilerPanel 
                isletme={isletme}
                formData={formData}
                setFormData={setFormData}
                editMode={editMode}
              />
            )}
            
            {activeTab === 'ogrenciler' && (
              <OgrencilerPanel 
                stajlar={stajlar}
                isletmeId={Number(isletmeId)}
                onRefresh={fetchStajlar}
                onOgrenciEkle={() => setOgrenciModalOpen(true)}
                onDekontEkle={(staj) => {
                  setSelectedStaj(staj)
                  setDekontFormData({ 
                    tarih: new Date().toISOString().split('T')[0], 
                    ay: '',
                    aciklama: '', 
                    tutar: '', 
                    dosya: null 
                  })
                  setDekontModalOpen(true)
                }}
                onDekontlarGoster={handleDekontlarGoster}
              />
            )}
            
            {activeTab === 'koordinatorler' && (
              <KoordinatorlerPanel 
                isletmeAlanlar={isletmeAlanlar}
                isletmeId={Number(isletmeId)}
                onRefresh={fetchIsletmeAlanlar}
              />
            )}
            
            {activeTab === 'alanlar' && (
              <AlanlarPanel 
                isletmeAlanlar={isletmeAlanlar}
              />
            )}
            
            {activeTab === 'belgeler' && (
              <BelgelerPanel 
                belgeler={belgeler}
                isletmeId={Number(isletmeId)}
                onRefresh={fetchBelgeler}
                onBelgeEkle={() => setBelgeModalOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Öğrenci Ekleme Modalı - Mevcut Öğrencilerden Seç */}
      <Modal 
        isOpen={ogrenciModalOpen} 
        onClose={() => setOgrenciModalOpen(false)}
        title="İşletmeye Öğrenci Ekle"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Sadece işletmenizin alanlarında kayıtlı olan ve şu anda aktif stajda olmayan öğrenciler listelenmektedir.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci Seç
            </label>
            <select
              value={ogrenciFormData.ogrenci_id}
              onChange={(e) => setOgrenciFormData({...ogrenciFormData, ogrenci_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Öğrenci seçiniz...</option>
              {mevcutOgrenciler.map((ogrenci) => (
                <option key={ogrenci.id} value={ogrenci.id}>
                  {ogrenci.ad} {ogrenci.soyad} - {ogrenci.no} ({ogrenci.sinif}) - {ogrenci.alanlar.ad}
                </option>
              ))}
            </select>
            {mevcutOgrenciler.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Bu işletmenin alanlarında staja uygun öğrenci bulunmuyor.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşe Başlama Tarihi
            </label>
            <input
              type="date"
              value={ogrenciFormData.baslangic_tarihi}
              onChange={(e) => setOgrenciFormData({...ogrenciFormData, baslangic_tarihi: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setOgrenciModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleOgrenciEkle}
              disabled={!ogrenciFormData.ogrenci_id || !ogrenciFormData.baslangic_tarihi}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Staj Başlat
            </button>
          </div>
        </div>
      </Modal>

      {/* Fesih Modalı */}
      <Modal 
        isOpen={fesihModalOpen} 
        onClose={() => setFesihModalOpen(false)}
        title="Staj Feshi"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              <strong>Dikkat:</strong> Bu işlem geri alınamaz. Stajı feshettiğinizde öğrenci aktif staj listesinden çıkarılacaktır.
            </p>
          </div>

          {selectedStaj && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Feshedilecek Staj:</h4>
              <p className="text-sm text-gray-600">
                <strong>Öğrenci:</strong> {(selectedStaj as any).ogrenciler.ad} {(selectedStaj as any).ogrenciler.soyad}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Başlangıç:</strong> {new Date((selectedStaj as any).baslangic_tarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Tarihi
            </label>
            <input
              type="date"
              value={fesihFormData.fesih_tarihi}
              onChange={(e) => setFesihFormData({...fesihFormData, fesih_tarihi: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setFesihModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={async () => {
                if (!fesihFormData.fesih_tarihi || !selectedStaj) {
                  alert('Fesih tarihi gereklidir!')
                  return
                }

                try {
                  // Stajı feshet
                  const { error: stajError } = await supabase
                    .from('stajlar')
                    .update({ 
                      fesih_tarihi: fesihFormData.fesih_tarihi,
                      durum: 'fesih' 
                    })
                    .eq('id', (selectedStaj as any).id)

                  if (stajError) {
                    alert('Fesih işlemi sırasında hata oluştu!')
                    return
                  }

                  // Öğrencinin isletme_id'sini temizle
                  const { error: ogrenciError } = await supabase
                    .from('ogrenciler')
                    .update({ isletme_id: null })
                    .eq('id', (selectedStaj as any).ogrenci_id)

                  if (ogrenciError) {
                    console.error('Öğrenci güncelleme hatası:', ogrenciError)
                  }

                  alert('Staj başarıyla feshedildi!')
                  setFesihModalOpen(false)
                  setFesihFormData({ fesih_tarihi: '' })
                  setSelectedStaj(null)
                  
                  // Veriyi yeniden fetch et
                  await Promise.all([fetchStajlar(), fetchMevcutOgrenciler()])
                } catch (error) {
                  console.error('Fesih hatası:', error)
                  alert('Fesih işlemi sırasında hata oluştu!')
                }
              }}
              disabled={!fesihFormData.fesih_tarihi}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Stajı Feshet
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Ekleme Modalı */}
      <Modal 
        isOpen={belgeModalOpen} 
        onClose={() => setBelgeModalOpen(false)}
        title="Yeni Belge Ekle"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Adı
            </label>
            <input
              type="text"
              value={belgeFormData.ad}
              onChange={(e) => setBelgeFormData({...belgeFormData, ad: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Belge adını giriniz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Türü
            </label>
            <select
              value={belgeFormData.tur}
              onChange={(e) => setBelgeFormData({...belgeFormData, tur: e.target.value, customTur: ''})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="sozlesme">Sözleşme</option>
              <option value="fesih_belgesi">Fesih Belgesi</option>
              <option value="usta_ogretici_belgesi">Usta Öğretici Belgesi</option>
              <option value="other">Diğer (Manuel Giriş)</option>
            </select>
          </div>

          {belgeFormData.tur === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özel Belge Türü
              </label>
              <input
                type="text"
                value={belgeFormData.customTur}
                onChange={(e) => setBelgeFormData({...belgeFormData, customTur: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Belge türünü yazınız"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosya Seçin <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="belge-dosya"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setBelgeFormData({...belgeFormData, dosya: e.target.files?.[0] || null})}
                className="hidden"
                required
              />
              <label htmlFor="belge-dosya" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {belgeFormData.dosya ? belgeFormData.dosya.name : 'Dosya seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setBelgeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleBelgeEkle}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
            >
              Belge Ekle
            </button>
          </div>
        </div>
      </Modal>

      {/* Dekont Ekleme Modal */}
      <Modal 
        isOpen={dekontModalOpen} 
        onClose={() => {
          setDekontModalOpen(false)
          setSelectedStaj(null)
          setDekontFormData({ tarih: '', ay: '', aciklama: '', tutar: '', dosya: null })
        }}
        title={selectedStaj ? `${selectedStaj.ogrenciler.ad} ${selectedStaj.ogrenciler.soyad} - Dekont Yükle` : 'Dekont Yükle'}
      >
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Öğrenci:</strong> {selectedStaj ? `${selectedStaj.ogrenciler.ad} ${selectedStaj.ogrenciler.soyad} (${selectedStaj.ogrenciler.no})` : ''}
            </p>
            <p className="text-sm text-green-800">
              <strong>Alan:</strong> {selectedStaj ? selectedStaj.ogrenciler.alanlar.ad : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dekont Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dekontFormData.tarih}
              onChange={(e) => setDekontFormData({...dekontFormData, tarih: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama <span className="text-red-500">*</span>
            </label>
            <textarea
              value={dekontFormData.aciklama}
              onChange={(e) => setDekontFormData({...dekontFormData, aciklama: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Dekont açıklamasını giriniz"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tutar (₺) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={dekontFormData.tutar}
              onChange={(e) => setDekontFormData({...dekontFormData, tutar: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dekont Dosyası (Opsiyonel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
              <input
                type="file"
                id="dekont-dosya"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDekontFormData({...dekontFormData, dosya: e.target.files?.[0] || null})}
                className="hidden"
              />
              <label htmlFor="dekont-dosya" className="cursor-pointer">
                <Receipt className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {dekontFormData.dosya ? dekontFormData.dosya.name : 'Dekont dosyası seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setDekontModalOpen(false)
                setSelectedStaj(null)
                setDekontFormData({ tarih: '', ay: '', aciklama: '', tutar: '', dosya: null })
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleDekontEkle}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
            >
              Dekont Ekle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Belgeler Paneli
function BelgelerPanel({ 
  belgeler, 
  isletmeId, 
  onRefresh,
  onBelgeEkle 
}: { 
  belgeler: Belge[]
  isletmeId: number
  onRefresh: () => void
  onBelgeEkle: () => void
}) {
  const formatTur = (tur: string) => {
    switch (tur) {
      case 'sozlesme': return 'Sözleşme'
      case 'fesih_belgesi': return 'Fesih Belgesi'
      case 'usta_ogretici_belgesi': return 'Usta Öğretici Belgesi'
      default: return tur
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Belgeler</h3>
          <p className="text-sm text-gray-600">Toplam {belgeler.length} belge yüklendi</p>
        </div>
        <button 
          onClick={onBelgeEkle}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Belge Ekle
        </button>
      </div>

      {belgeler.length > 0 ? (
        <div className="space-y-4">
          {belgeler.map((belge) => (
            <div key={belge.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{belge.ad}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {formatTur(belge.tur)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(belge.yukleme_tarihi).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => window.open(belge.dosya_url, '_blank')}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Belgeyi görüntüle"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = belge.dosya_url!
                      link.download = belge.ad
                      link.click()
                    }}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                    title="Belgeyi indir"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button 
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    title="Belgeyi sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz belge yok</h3>
          <p className="text-gray-600 mb-6">Bu işletme için henüz belge yüklenmemiş.</p>
          <button 
            onClick={onBelgeEkle}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            İlk Belgeyi Ekle
          </button>
        </div>
      )}
    </div>
  )
}


// Temel Bilgiler Paneli
function TemelBilgilerPanel({ 
  isletme, 
  formData, 
  setFormData, 
  editMode 
}: { 
  isletme: Isletme
  formData: {
    ad: string;
    adres: string;
    telefon: string;
    email: string;
    yetkili_kisi: string;
    pin: string;
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    ad: string;
    adres: string;
    telefon: string;
    email: string;
    yetkili_kisi: string;
    pin: string;
  }>>
  editMode: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme Adı
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData(prev => ({ ...prev, ad: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {isletme.ad}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adres
            </label>
            {editMode ? (
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 min-h-[84px]">
                {isletme.adres || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yetkili Kişi
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.yetkili_kisi}
                onChange={(e) => setFormData(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {isletme.yetkili_kisi || 'Belirtilmemiş'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon
            </label>
            {editMode ? (
              <input
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {isletme.telefon || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            {editMode ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {isletme.email || 'Belirtilmemiş'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN Kodu
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 font-mono">
                {isletme.pin || 'Belirtilmemiş'}
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  )
}

// Öğrenciler Paneli  
function OgrencilerPanel({ 
  stajlar, 
  isletmeId, 
  onRefresh,
  onOgrenciEkle,
  onDekontEkle,
  onDekontlarGoster
}: { 
  stajlar: Staj[]
  isletmeId: number
  onRefresh: () => void
  onOgrenciEkle: () => void
  onDekontEkle: (staj: Staj) => void
  onDekontlarGoster: (staj: Staj) => void
}) {
  const [stajDuzenleModalOpen, setStajDuzenleModalOpen] = useState(false)
  const [fesihModalOpen, setFesihModalOpen] = useState(false)
  const [selectedStaj, setSelectedStaj] = useState<Staj | null>(null)
  const [stajDuzenleFormData, setStajDuzenleFormData] = useState({
    baslangic_tarihi: '',
    bitis_tarihi: ''
  })
  const [fesihFormData, setFesihFormData] = useState({
    fesih_tarihi: ''
  })

  const handleStajDuzenle = async () => {
    if (!selectedStaj) return

    try {
      const { error } = await supabase
        .from('stajlar')
        .update({ 
          baslangic_tarihi: stajDuzenleFormData.baslangic_tarihi,
          bitis_tarihi: stajDuzenleFormData.bitis_tarihi
        })
        .eq('id', selectedStaj.id)

      if (error) {
        console.error('Staj düzenleme hatası:', error)
        alert('Staj düzenlenirken hata oluştu!')
        return
      }

      alert(`${selectedStaj.ogrenciler.ad} ${selectedStaj.ogrenciler.soyad} öğrencisinin staj tarihleri başarıyla güncellendi!`)
      setStajDuzenleModalOpen(false)
      setSelectedStaj(null)
      setStajDuzenleFormData({ baslangic_tarihi: '', bitis_tarihi: '' })
      onRefresh()
    } catch (error) {
      console.error('Staj düzenleme hatası:', error)
      alert('Staj düzenlenirken hata oluştu!')
    }
  }

  const handleFesihSubmit = async () => {
    if (!selectedStaj) return

    try {
      const { error } = await supabase
        .from('stajlar')
        .update({ 
          fesih_tarihi: fesihFormData.fesih_tarihi,
          durum: 'feshedildi'
        })
        .eq('id', selectedStaj.id)

      if (error) {
        console.error('Fesih hatası:', error)
        alert('Fesih işlemi sırasında hata oluştu!')
        return
      }

      alert('Staj başarıyla feshedildi!')
      setFesihModalOpen(false)
      setSelectedStaj(null)
      setFesihFormData({ fesih_tarihi: '' })
      onRefresh()
    } catch (error) {
      console.error('Fesih hatası:', error)
      alert('Fesih işlemi sırasında hata oluştu!')
    }
  }

  const handleStajSil = async (stajId: number, ogrenciAd: string) => {
    if (!confirm(`${ogrenciAd} öğrencisinin stajını kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return
    }

    try {
      // Önce staj ile ilgili dekontları kontrol et
      const { data: dekontlar, error: dekontError } = await supabase
        .from('dekontlar')
        .select('id')
        .eq('staj_id', stajId)

      if (dekontError) {
        console.error('Dekont kontrol hatası:', dekontError)
        alert('Dekont kontrolü sırasında hata oluştu!')
        return
      }

      if (dekontlar && dekontlar.length > 0) {
        const silDekont = confirm(`Bu stajın ${dekontlar.length} adet dekont kaydı var. Bunları da silmek istediğinizden emin misiniz?`)
        if (!silDekont) return

        // Dekontları sil
        const { error: dekontSilError } = await supabase
          .from('dekontlar')
          .delete()
          .eq('staj_id', stajId)

        if (dekontSilError) {
          console.error('Dekont silme hatası:', dekontSilError)
          alert('Dekont silme sırasında hata oluştu!')
          return
        }
      }

      // Stajı sil
      const { error } = await supabase
        .from('stajlar')
        .delete()
        .eq('id', stajId)

      if (error) {
        console.error('Staj silme hatası:', error)
        alert('Staj silinirken hata oluştu: ' + error.message)
        return
      }

      alert('Staj ve ilgili kayıtlar başarıyla silindi!')
      onRefresh()
    } catch (error) {
      console.error('Staj silme hatası:', error)
      alert('Staj silinirken hata oluştu!')
    }
  }





  const getStatusBadge = (durum: string, fesihTarihi?: string) => {
    if (fesihTarihi) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Feshedildi
        </span>
      )
    }
    
    switch (durum) {
      case 'aktif':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Aktif
          </span>
        )
      case 'tamamlandi':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Tamamlandı
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {durum}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Staj Yapan Öğrenciler</h3>
          <p className="text-sm text-gray-600">Toplam {stajlar.length} öğrenci bu işletmede staj yapıyor</p>
        </div>
        <button 
          onClick={onOgrenciEkle}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Öğrenci Ekle
        </button>
      </div>

      {stajlar.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staj Dönemi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stajlar.map((staj) => (
                  <tr key={staj.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                          <GraduationCap className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {staj.ogrenciler.ad} {staj.ogrenciler.soyad}
                          </div>
                          <div className="text-sm text-gray-500">
                            No: {staj.ogrenciler.no} • {staj.ogrenciler.sinif}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{staj.ogrenciler.alanlar.ad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(staj.bitis_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                      {staj.fesih_tarihi && (
                        <div className="text-sm text-red-600">
                          Fesih: {new Date(staj.fesih_tarihi).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(staj.durum, staj.fesih_tarihi)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onDekontlarGoster(staj)}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-all"
                          title="Dekontları görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => onDekontEkle(staj)}
                          className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-all"
                          title="Dekont yükle"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStaj(staj)
                            setStajDuzenleFormData({
                              baslangic_tarihi: staj.baslangic_tarihi,
                              bitis_tarihi: staj.bitis_tarihi
                            })
                            setStajDuzenleModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-all"
                          title="Staj tarihlerini düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        {staj.durum === 'aktif' && !staj.fesih_tarihi && (
                          <button
                            onClick={() => {
                              setSelectedStaj(staj)
                              setFesihFormData({ fesih_tarihi: new Date().toISOString().split('T')[0] })
                              setFesihModalOpen(true)
                            }}
                            className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded transition-all"
                            title="Stajı feshet"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleStajSil(staj.id, `${staj.ogrenciler.ad} ${staj.ogrenciler.soyad}`)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-all"
                          title="Stajı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz öğrenci yok</h3>
          <p className="text-gray-600 mb-6">Bu işletmede staj yapan öğrenci bulunmuyor.</p>
          <button 
            onClick={onOgrenciEkle}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            İlk Öğrenciyi Ekle
          </button>
        </div>
      )}

      {/* Staj Düzenleme Modal */}
      <Modal
        isOpen={stajDuzenleModalOpen}
        onClose={() => {
          setStajDuzenleModalOpen(false)
          setSelectedStaj(null)
          setStajDuzenleFormData({ baslangic_tarihi: '', bitis_tarihi: '' })
        }}
        title={selectedStaj ? `${selectedStaj.ogrenciler.ad} ${selectedStaj.ogrenciler.soyad} - Staj Tarihlerini Düzenle` : 'Staj Düzenle'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={stajDuzenleFormData.baslangic_tarihi}
              onChange={(e) => setStajDuzenleFormData({ 
                ...stajDuzenleFormData, 
                baslangic_tarihi: e.target.value 
              })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={stajDuzenleFormData.bitis_tarihi}
              onChange={(e) => setStajDuzenleFormData({ 
                ...stajDuzenleFormData, 
                bitis_tarihi: e.target.value 
              })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setStajDuzenleModalOpen(false)
                setSelectedStaj(null)
                setStajDuzenleFormData({ baslangic_tarihi: '', bitis_tarihi: '' })
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleStajDuzenle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      {/* Fesih Modal */}
      <Modal
        isOpen={fesihModalOpen}
        onClose={() => {
          setFesihModalOpen(false)
          setSelectedStaj(null)
          setFesihFormData({ fesih_tarihi: '' })
        }}
        title={selectedStaj ? `${selectedStaj.ogrenciler.ad} ${selectedStaj.ogrenciler.soyad} - Stajı Feshet` : 'Stajı Feshet'}
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <p className="text-orange-800 text-sm">
                Bu staj feshedilecek. Bu işlem geri alınamaz!
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Tarihi
            </label>
            <input
              type="date"
              value={fesihFormData.fesih_tarihi}
              onChange={(e) => setFesihFormData({ 
                ...fesihFormData, 
                fesih_tarihi: e.target.value 
              })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setFesihModalOpen(false)
                setSelectedStaj(null)
                setFesihFormData({ fesih_tarihi: '' })
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleFesihSubmit}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all"
            >
              Feshet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Koordinatörler Paneli
function KoordinatorlerPanel({ 
  isletmeAlanlar, 
  isletmeId, 
  onRefresh 
}: { 
  isletmeAlanlar: IsletmeAlan[]
  isletmeId: number
  onRefresh: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Alan Koordinatörleri</h3>
          <p className="text-sm text-gray-600">Her alan için atanmış koordinatör öğretmenler</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Koordinatör Ekle
        </button>
      </div>

      {isletmeAlanlar.length > 0 ? (
        <div className="space-y-4">
          {isletmeAlanlar.map((isletmeAlan) => (
            <div key={isletmeAlan.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{isletmeAlan.alanlar.ad}</h4>
                    {isletmeAlan.ogretmenler ? (
                      <div className="flex items-center mt-1">
                        <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm text-green-700">
                          {isletmeAlan.ogretmenler.ad} {isletmeAlan.ogretmenler.soyad}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center mt-1">
                        <User className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">Koordinatör atanmamış</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz koordinatör yok</h3>
          <p className="text-gray-600 mb-6">Bu işletme için alan koordinatörü atanmamış.</p>
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            İlk Koordinatörü Ata
          </button>
        </div>
      )}
    </div>
  )
}

// Alanlar Paneli
function AlanlarPanel({ 
  isletmeAlanlar 
}: { 
  isletmeAlanlar: IsletmeAlan[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Staj Alanları</h3>
        <p className="text-sm text-gray-600">Bu işletmede yapılabilecek staj alanları</p>
      </div>

      {isletmeAlanlar.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isletmeAlanlar.map((isletmeAlan) => (
            <div key={isletmeAlan.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{isletmeAlan.alanlar.ad}</h4>
                  <p className="text-sm text-gray-600">Staj Alanı</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz alan yok</h3>
          <p className="text-gray-600">Bu işletme için staj alanı tanımlanmamış.</p>
        </div>
      )}
    </div>
  )
}