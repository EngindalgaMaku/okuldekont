'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Calendar, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Check,
  X,
  ArrowLeft,
  Shield,
  Database,
  Bell,
  Globe,
  Palette,
  AlertTriangle,
  Unlock,
  Eye,
  Clock,
  User,
  Building,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface EgitimYili {
  id: number;
  yil: string;
  aktif: boolean;
}

interface KilitliHesap {
  id: number
  ad: string
  soyad?: string
  hesap_tipi: 'ogretmen' | 'isletme'
  yanlis_pin_sayisi: number
  kilitlenme_tarihi: string
  son_yanlis_giris: string
  yetkili_kisi?: string
}

interface PinLog {
  id: number
  hesap_tipi: string
  hesap_id: number
  girilen_pin: string
  basarili: boolean
  ip_adresi?: string
  created_at: string
  hesap_adi?: string
}

const ayarKategorileri = [
  {
    id: 'egitim',
    baslik: 'Eğitim Yönetimi',
    aciklama: 'Eğitim yılları ve akademik takvim ayarları',
    ikon: Calendar,
    renk: 'blue'
  },
  {
    id: 'sistem',
    baslik: 'Sistem Ayarları',
    aciklama: 'Veritabanı ve güvenlik ayarları',
    ikon: Database,
    renk: 'gray',
    gelecek: true
  },
  {
    id: 'bildirimler',
    baslik: 'Bildirimler',
    aciklama: 'E-posta ve sistem bildirimleri',
    ikon: Bell,
    renk: 'yellow',
    gelecek: true
  },
  {
    id: 'genel',
    baslik: 'Genel Ayarlar',
    aciklama: 'Okul bilgileri ve görünüm ayarları',
    ikon: Globe,
    renk: 'green',
    gelecek: true
  },
  {
    id: 'tema',
    baslik: 'Tema ve Görünüm',
    aciklama: 'Renk teması ve arayüz ayarları',
    ikon: Palette,
    renk: 'purple',
    gelecek: true
  },
  {
    id: 'guvenlik',
    baslik: 'Güvenlik',
    aciklama: 'PIN kilitlenmeleri ve güvenlik logları',
    ikon: Shield,
    renk: 'red'
  }
]

export default function AyarlarPage() {
  const router = useRouter()
  const [egitimYillari, setEgitimYillari] = useState<EgitimYili[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [selectedEgitimYili, setSelectedEgitimYili] = useState<EgitimYili | null>(null)
  const [yeniYil, setYeniYil] = useState('')
  const [duzenlenecekYil, setDuzenlenecekYil] = useState('')
  const [activeSection, setActiveSection] = useState<'egitim' | 'guvenlik'>('egitim')
  
  // Güvenlik state'leri
  const [kilitliHesaplar, setKilitliHesaplar] = useState<KilitliHesap[]>([])
  const [pinLoglari, setPinLoglari] = useState<PinLog[]>([])
  const [guvenlikLoading, setGuvenlikLoading] = useState(false)
  const [activeGuvenlikTab, setActiveGuvenlikTab] = useState<'kilitli' | 'loglar'>('kilitli')
  const [unlockLoading, setUnlockLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchEgitimYillari()
  }, [])

  useEffect(() => {
    if (activeSection === 'guvenlik') {
      fetchGuvenlikVerileri()
    }
  }, [activeSection])

  const fetchEgitimYillari = async () => {
    try {
      const { data, error } = await supabase
        .from('egitim_yillari')
        .select('*')
        .order('yil', { ascending: false })

      if (error) {
        console.error('Eğitim yılları çekilirken hata:', error)
        return
      }

      setEgitimYillari(data || [])
    } catch (error) {
      console.error('Fetch hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuvenlikVerileri = async () => {
    setGuvenlikLoading(true)
    try {
      await Promise.all([fetchKilitliHesaplar(), fetchPinLoglari()])
    } finally {
      setGuvenlikLoading(false)
    }
  }

  const fetchKilitliHesaplar = async () => {
    try {
      // Kilitli öğretmenler
      const { data: ogretmenler, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad, hesap_kilitli, yanlis_pin_sayisi, kilitlenme_tarihi, son_yanlis_giris')
        .eq('hesap_kilitli', true)

      // Kilitli işletmeler
      const { data: isletmeler, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, yetkili_kisi, hesap_kilitli, yanlis_pin_sayisi, kilitlenme_tarihi, son_yanlis_giris')
        .eq('hesap_kilitli', true)

      const birlestirilmisList: KilitliHesap[] = []

      if (ogretmenler) {
        ogretmenler.forEach(og => {
          birlestirilmisList.push({
            ...og,
            hesap_tipi: 'ogretmen'
          })
        })
      }

      if (isletmeler) {
        isletmeler.forEach(isl => {
          birlestirilmisList.push({
            ...isl,
            hesap_tipi: 'isletme'
          })
        })
      }

      setKilitliHesaplar(birlestirilmisList)
    } catch (error) {
      console.error('Kilitli hesaplar yüklenirken hata:', error)
    }
  }

  const fetchPinLoglari = async () => {
    try {
      const { data, error } = await supabase
        .from('pin_giris_loglari')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        // Hesap isimlerini al
        const loglarWithNames = await Promise.all(
          data.map(async (log) => {
            let hesap_adi = 'Bilinmeyen'
            
            if (log.hesap_tipi === 'ogretmen') {
              const { data: ogretmen } = await supabase
                .from('ogretmenler')
                .select('ad, soyad')
                .eq('id', log.hesap_id)
                .single()
              
              if (ogretmen) {
                hesap_adi = `${ogretmen.ad} ${ogretmen.soyad}`
              }
            } else if (log.hesap_tipi === 'isletme') {
              const { data: isletme } = await supabase
                .from('isletmeler')
                .select('ad')
                .eq('id', log.hesap_id)
                .single()
              
              if (isletme) {
                hesap_adi = isletme.ad
              }
            }

            return {
              ...log,
              hesap_adi
            }
          })
        )

        setPinLoglari(loglarWithNames)
      }
    } catch (error) {
      console.error('Pin logları yüklenirken hata:', error)
    }
  }

  const handleKilidiAc = async (hesap: KilitliHesap) => {
    setUnlockLoading(hesap.id)
    
    try {
      const { data, error } = await supabase
        .rpc('admin_hesap_kilidi_ac', {
          p_hesap_tipi: hesap.hesap_tipi,
          p_hesap_id: hesap.id,
          p_admin_notu: `Admin tarafından ${new Date().toLocaleString('tr-TR')} tarihinde açıldı`
        })

      if (error) {
        console.error('Kilit açma hatası:', error)
        alert('Kilit açılırken hata oluştu!')
        return
      }

      if (data?.basarili) {
        alert('Hesap kilidi başarıyla açıldı!')
        fetchKilitliHesaplar() // Listeyi yenile
        fetchPinLoglari() // Logları yenile
      } else {
        alert(data?.mesaj || 'Kilit açılamadı!')
      }
    } catch (error) {
      console.error('Kilit açma hatası:', error)
      alert('Bir hata oluştu!')
    } finally {
      setUnlockLoading(null)
    }
  }

  const handleGuvenlikRefresh = () => {
    fetchGuvenlikVerileri()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const getHesapIcon = (tip: string) => {
    return tip === 'ogretmen' ? User : Building
  }

  const getStatusColor = (basarili: boolean) => {
    return basarili ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
  }

  const handleYeniYilEkle = async () => {
    if (!yeniYil.trim()) {
      alert('Eğitim yılı gereklidir!')
      return
    }

    try {
      const { error } = await supabase
        .from('egitim_yillari')
        .insert({ yil: yeniYil.trim(), aktif: false })

      if (error) {
        alert('Eğitim yılı eklenirken hata oluştu!')
        return
      }

      setModalOpen(false)
      setYeniYil('')
      fetchEgitimYillari()
    } catch (error) {
      console.error('Ekleme hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  const handleAktifYapma = async (id: number) => {
    try {
      // Önce tüm yılları pasif yap
      await supabase
        .from('egitim_yillari')
        .update({ aktif: false })
        .neq('id', 0)

      // Seçilen yılı aktif yap
      const { error } = await supabase
        .from('egitim_yillari')
        .update({ aktif: true })
        .eq('id', id)

      if (error) {
        alert('Aktif yapma işlemi sırasında hata oluştu!')
        return
      }

      fetchEgitimYillari()
    } catch (error) {
      console.error('Aktif yapma hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  const handleDuzenle = async () => {
    if (!duzenlenecekYil.trim() || !selectedEgitimYili) {
      alert('Eğitim yılı gereklidir!')
      return
    }

    try {
      const { error } = await supabase
        .from('egitim_yillari')
        .update({ yil: duzenlenecekYil.trim() })
        .eq('id', selectedEgitimYili.id)

      if (error) {
        alert('Güncelleme sırasında hata oluştu!')
        return
      }

      setEditModalOpen(false)
      setDuzenlenecekYil('')
      setSelectedEgitimYili(null)
      fetchEgitimYillari()
    } catch (error) {
      console.error('Düzenleme hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  const handleSilmeOnay = (egitimYili: EgitimYili) => {
    if (egitimYili.aktif) {
      setSelectedEgitimYili(egitimYili)
      setWarningModalOpen(true)
      return
    }
    
    setSelectedEgitimYili(egitimYili)
    setDeleteModalOpen(true)
  }

  const handleSil = async () => {
    if (!selectedEgitimYili) return

    try {
      const { error } = await supabase
        .from('egitim_yillari')
        .delete()
        .eq('id', selectedEgitimYili.id)

      if (error) {
        alert('Silme işlemi sırasında hata oluştu!')
        return
      }

      setDeleteModalOpen(false)
      setSelectedEgitimYili(null)
      fetchEgitimYillari()
    } catch (error) {
      console.error('Silme hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Ayarlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 mr-3 text-indigo-600" />
                Sistem Ayarları
              </h1>
              <p className="text-gray-600 mt-1">Sistem genelindeki ayarları buradan yönetebilirsiniz</p>
            </div>
          </div>
        </div>

        {/* Ayar Kategorileri Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {ayarKategorileri.map((kategori) => {
            const IconComponent = kategori.ikon
            const renk = kategori.renk
            
            return (
              <div
                key={kategori.id}
                onClick={() => kategori.gelecek ? null : setActiveSection(kategori.id as 'egitim' | 'guvenlik')}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${
                  kategori.gelecek ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300'
                } ${activeSection === kategori.id ? 'border-indigo-500 bg-indigo-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-${renk}-100 rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`h-6 w-6 text-${renk}-600`} />
                  </div>
                  {kategori.gelecek && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      Yakında
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{kategori.baslik}</h3>
                <p className="text-sm text-gray-600 mb-4">{kategori.aciklama}</p>
                {!kategori.gelecek && kategori.id === 'egitim' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Aktif Dönem</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="relative">
                      <select 
                        disabled
                        value={egitimYillari.find(y => y.aktif)?.yil || ''}
                        className="w-full text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 cursor-not-allowed focus:outline-none"
                      >
                        {egitimYillari.find(y => y.aktif) ? (
                          <option value={egitimYillari.find(y => y.aktif)?.yil}>
                            {egitimYillari.find(y => y.aktif)?.yil}
                          </option>
                        ) : (
                          <option value="">Aktif dönem yok</option>
                        )}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Toplam {egitimYillari.length} dönem
                    </div>
                  </div>
                )}
                {!kategori.gelecek && kategori.id === 'guvenlik' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {kilitliHesaplar.length} kilitli hesap
                    </span>
                    <div className={`w-2 h-2 rounded-full ${kilitliHesaplar.length > 0 ? 'bg-red-400' : 'bg-green-400'}`}></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Eğitim Yılları Yönetimi */}
        {activeSection === 'egitim' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Eğitim Yılları Yönetimi</h2>
                  <p className="text-sm text-gray-600 mt-1">Aktif eğitim yılını belirleyin ve yeni yıllar ekleyin</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Yıl Ekle
              </button>
            </div>
          </div>

          <div className="p-6">
            {egitimYillari.length > 0 ? (
              <div className="space-y-3">
                {egitimYillari.map((yil) => (
                  <div
                    key={yil.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      yil.aktif 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      {yil.aktif && (
                        <Check className="h-5 w-5 text-green-600 mr-3" />
                      )}
                      <div>
                        <span className={`text-lg font-medium ${yil.aktif ? 'text-green-900' : 'text-gray-900'}`}>
                          {yil.yil}
                        </span>
                        {yil.aktif && (
                          <span className="ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Aktif Yıl
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!yil.aktif && (
                        <button
                          onClick={() => handleAktifYapma(yil.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Aktif Yap
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedEgitimYili(yil)
                          setDuzenlenecekYil(yil.yil)
                          setEditModalOpen(true)
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSilmeOnay(yil)}
                        className={`p-2 rounded transition-colors ${
                          yil.aktif 
                            ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 cursor-help' 
                            : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={yil.aktif ? "Aktif eğitim yılı silinemez" : "Eğitim yılını sil"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz eğitim yılı yok</h3>
                <p className="mt-1 text-sm text-gray-500">İlk eğitim yılınızı ekleyerek başlayın.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Güvenlik Yönetimi */}
        {activeSection === 'guvenlik' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Güvenlik Yönetimi</h2>
                  <p className="text-sm text-gray-600 mt-1">PIN kilitlenmeleri ve güvenlik logları</p>
                </div>
              </div>
              <button
                onClick={handleGuvenlikRefresh}
                disabled={guvenlikLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${guvenlikLoading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveGuvenlikTab('kilitli')}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeGuvenlikTab === 'kilitli'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Kilitli Hesaplar ({kilitliHesaplar.length})</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveGuvenlikTab('loglar')}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeGuvenlikTab === 'loglar'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Güvenlik Logları ({pinLoglari.length})</span>
                  </div>
                </button>
              </div>
            </div>

            {guvenlikLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-3 text-gray-600">Güvenlik verileri yükleniyor...</span>
              </div>
            ) : (
              <>
                {activeGuvenlikTab === 'kilitli' ? (
                  <div>
                    {kilitliHesaplar.length === 0 ? (
                      <div className="text-center py-12">
                        <Shield className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Kilitli hesap yok</h3>
                        <p className="mt-1 text-sm text-gray-500">Tüm hesaplar güvenli durumda.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {kilitliHesaplar.map((hesap) => {
                          const Icon = getHesapIcon(hesap.hesap_tipi)
                          return (
                            <div key={`${hesap.hesap_tipi}-${hesap.id}`} className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-red-100 rounded-lg">
                                    <Icon className="h-5 w-5 text-red-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">
                                      {hesap.hesap_tipi === 'ogretmen' 
                                        ? `${hesap.ad} ${hesap.soyad}` 
                                        : hesap.ad}
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p>Hesap Tipi: {hesap.hesap_tipi === 'ogretmen' ? 'Öğretmen' : 'İşletme'}</p>
                                      {hesap.yetkili_kisi && <p>Yetkili: {hesap.yetkili_kisi}</p>}
                                      <p>Yanlış Deneme: {hesap.yanlis_pin_sayisi} kez</p>
                                      <p>Kilitlenme: {formatDate(hesap.kilitlenme_tarihi)}</p>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleKilidiAc(hesap)}
                                  disabled={unlockLoading === hesap.id}
                                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
                                >
                                  {unlockLoading === hesap.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  ) : (
                                    <Unlock className="h-4 w-4 mr-2" />
                                  )}
                                  Kilidi Aç
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {pinLoglari.length === 0 ? (
                      <div className="text-center py-12">
                        <Eye className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Log bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500">Henüz güvenlik logu bulunmuyor.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hesap
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Durum
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                IP Adresi
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarih/Saat
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {pinLoglari.map((log) => {
                              const Icon = getHesapIcon(log.hesap_tipi)
                              return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Icon className="h-4 w-4 text-gray-400 mr-2" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{log.hesap_adi}</div>
                                        <div className="text-sm text-gray-500 capitalize">{log.hesap_tipi}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.basarili)}`}>
                                      {log.basarili ? 'Başarılı' : 'Başarısız'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {log.ip_adresi || 'Bilinmiyor'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(log.created_at)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Yeni Yıl Ekleme Modalı */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Eğitim Yılı Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Eğitim Yılı
            </label>
            <input
              type="text"
              value={yeniYil}
              onChange={(e) => setYeniYil(e.target.value)}
              placeholder="2024-2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Örnek: 2024-2025, 2025-2026
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleYeniYilEkle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ekle
            </button>
          </div>
        </div>
      </Modal>

      {/* Düzenleme Modalı */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Eğitim Yılını Düzenle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Eğitim Yılı
            </label>
            <input
              type="text"
              value={duzenlenecekYil}
              onChange={(e) => setDuzenlenecekYil(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleDuzenle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      {/* Silme Onay Modalı */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleSil}
        title="Eğitim Yılını Sil"
        description={
          selectedEgitimYili
            ? `"${selectedEgitimYili.yil}" eğitim yılını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`
            : ""
        }
        confirmText="Sil"
      />

      {/* Aktif Yıl Uyarı Modalı */}
      <Modal
        isOpen={warningModalOpen}
        onClose={() => {
          setWarningModalOpen(false)
          setSelectedEgitimYili(null)
        }}
        title="⚠️ Aktif Eğitim Yılı Silinemez"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">
                  {selectedEgitimYili && `"${selectedEgitimYili.yil}" aktif eğitim yılıdır`}
                </h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>Aktif olan eğitim yılı silinemez. Silmek için önce başka bir eğitim yılını aktif yapmalısınız.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Nasıl Silebilirim?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Başka bir eğitim yılını "Aktif Yap" butonuyla aktif yapın</li>
                    <li>Bu eğitim yılı otomatik olarak pasif hale gelecek</li>
                    <li>Artık bu eğitim yılını silebilirsiniz</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                setWarningModalOpen(false)
                setSelectedEgitimYili(null)
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tamam, Anladım
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 