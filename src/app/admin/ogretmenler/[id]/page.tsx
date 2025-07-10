'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader, User, Mail, Phone, Briefcase, Building2, FileText, Receipt, CheckCircle, XCircle, AlertTriangle, Calendar, Info, Clock, Printer, Settings, Key, Shield, Edit3, Save, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import KoordinatoerlukProgrami from '@/components/ui/KoordinatoerlukProgrami'
import OgretmenDekontListesi, { DekontDetay } from '@/components/ui/OgretmenDekontListesi'

// --- Type Definitions ---
interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email: string | null
  telefon: string | null
  alan: { ad: string } | null
}

interface Dekont {
  id: string
  ay: number
  yil: number
  onay_durumu: 'onaylandi' | 'bekliyor' | 'reddedildi'
}

interface StajOgrenci {
  id: string
  ad: string
  soyad: string
  sinif: string
  no: string
}

interface StajIsletme {
  id: string
  ad: string
}

interface Program {
  id: string
  isletme_id: string
  gun: string
  saat_araligi: string
}

interface Staj {
  id: string
  baslangic_tarihi: string
  ogrenci_id: string
  isletme_id: string
  ogrenciler: StajOgrenci | null
  isletmeler: StajIsletme | null
  dekontlar: Dekont[]
}

interface OgretmenDetay extends Ogretmen {
  stajlar: Staj[]
  koordinatorluk_programi: Program[]
}

// --- Helper Functions ---
const getDekontDurumu = (staj: Staj) => {
  const bugun = new Date()
  const baslangic = new Date(staj.baslangic_tarihi)
  let beklenenDekontSayisi = 0

  if (bugun > baslangic) {
    const yilFarki = bugun.getFullYear() - baslangic.getFullYear()
    const ayFarki = bugun.getMonth() - baslangic.getMonth()
    beklenenDekontSayisi = yilFarki * 12 + ayFarki + 1
  }
  
  const yuklenenDekontSayisi = staj.dekontlar.length
  const sonDekont = [...staj.dekontlar].sort((a, b) => new Date(b.yil, b.ay - 1).getTime() - new Date(a.yil, a.ay - 1).getTime())[0]
  
  let sonDekontGecikmis = false
  if (yuklenenDekontSayisi < beklenenDekontSayisi) {
    if (!sonDekont) {
      sonDekontGecikmis = true
    } else {
      const sonBeklenenTarih = new Date(bugun.getFullYear(), bugun.getMonth() - 1)
      const sonDekontTarihi = new Date(sonDekont.yil, sonDekont.ay - 1)
      if (sonDekontTarihi < sonBeklenenTarih) {
        sonDekontGecikmis = true
      }
    }
  }

  return {
    beklenen: beklenenDekontSayisi,
    yuklenen: yuklenenDekontSayisi,
    eksik: Math.max(0, beklenenDekontSayisi - yuklenenDekontSayisi),
    gecikmis: sonDekontGecikmis,
  }
}

// --- Main Component ---
export default function OgretmenDetaySayfasi() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const ogretmenId = params.id as string
  const activeTab = searchParams.get('tab') || 'detaylar'

  const [loading, setLoading] = useState(true)
  const [ogretmen, setOgretmen] = useState<OgretmenDetay | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Ayarlar tab state'leri
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [editModeContact, setEditModeContact] = useState(false)
  const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' })
  const [showPin, setShowPin] = useState(false)
  const [contactForm, setContactForm] = useState({ email: '', telefon: '' })
  const [pinLoading, setPinLoading] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    if (ogretmenId) {
      fetchOgretmenDetay()
    }
  }, [ogretmenId])
  
  // Öğretmen verisi geldiğinde contact form'u initialize et
  useEffect(() => {
    if (ogretmen) {
      setContactForm({
        email: ogretmen.email || '',
        telefon: ogretmen.telefon || ''
      })
    }
  }, [ogretmen])

  const fetchOgretmenDetay = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch teacher details
      const { data: ogretmenData, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select(`
          id,
          ad,
          soyad,
          email,
          telefon,
          alan:alan_id ( ad )
        `)
        .eq('id', ogretmenId)
        .single();

      if (ogretmenError) throw new Error(`Öğretmen bilgisi çekilemedi: ${ogretmenError.message}`);
      if (!ogretmenData) throw new Error('Öğretmen bulunamadı.');

      // 2. Fetch internships (stajlar) without dekontlar
      const { data: stajlarData, error: stajlarError } = await supabase
        .from('stajlar')
        .select(`
          id,
          baslangic_tarihi,
          ogrenci_id,
          isletme_id,
          ogrenciler ( id, ad, soyad, sinif, no ),
          isletmeler ( id, ad )
        `)
        .eq('ogretmen_id', ogretmenId);

      if (stajlarError) throw new Error(`Staj bilgileri çekilemedi: ${stajlarError.message}`);

      // 3. Fetch dekontlar for each staj
      const stajlarWithDekontlar = await Promise.all(
        (stajlarData || []).map(async (staj) => {
          const { data: dekontlarData, error: dekontlarError } = await supabase
            .from('dekontlar')
            .select('id, ay, yil, onay_durumu')
            .eq('staj_id', staj.id);
          
          if (dekontlarError) {
            console.warn(`Dekontlar for staj ${staj.id} could not be fetched:`, dekontlarError);
          }
          
          return {
            ...staj,
            dekontlar: dekontlarData || [],
          };
        })
      );

      // 4. Fetch coordination program
      const { data: programData, error: programError } = await supabase
        .from('koordinatorluk_programi')
        .select('id, isletme_id, gun, saat_araligi')
        .eq('ogretmen_id', ogretmenId);

      if (programError) throw new Error(`Koordinatörlük programı çekilemedi: ${programError.message}`);

      // 5. Combine data
      const ogretmenDetay: OgretmenDetay = {
        ...ogretmenData,
        alan: Array.isArray(ogretmenData.alan) ? ogretmenData.alan[0] : ogretmenData.alan,
        stajlar: stajlarWithDekontlar.map(staj => ({
          ...staj,
          ogrenciler: Array.isArray(staj.ogrenciler) ? staj.ogrenciler[0] : staj.ogrenciler,
          isletmeler: Array.isArray(staj.isletmeler) ? staj.isletmeler[0] : staj.isletmeler,
        })),
        koordinatorluk_programi: programData || [],
      };

      setOgretmen(ogretmenDetay);

    } catch (err: any) {
      console.error('Öğretmen detayları çekilirken hata:', err);
      setError(err.message || 'Bilinmeyen bir hata oluştu.');
      toast.error('Öğretmen bilgileri yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleProgramEkle = async (yeniProgram: Omit<Program, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('koordinatorluk_programi')
        .insert({ ...yeniProgram, ogretmen_id: ogretmenId })
        .select()
        .single()

      if (error) throw error

      fetchOgretmenDetay()
      toast.success('Program başarıyla eklendi.')
    } catch (error) {
      toast.error('Program eklenirken bir hata oluştu.')
      console.error(error)
    }
  }

  const handleProgramSil = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('koordinatorluk_programi')
        .delete()
        .eq('id', programId)

      if (error) throw error

      fetchOgretmenDetay()
      toast.success('Program başarıyla silindi.')
    } catch (error) {
      toast.error('Program silinirken bir hata oluştu.')
      console.error(error)
    }
  }

  const handlePinAta = async () => {
    if (pinLoading) return
    
    try {
      setPinLoading(true)
      
      if (!pinForm.pin || pinForm.pin.length !== 4) {
        toast.error('PIN 4 haneli olmalıdır')
        return
      }
      
      if (pinForm.pin !== pinForm.confirmPin) {
        toast.error('PIN\'ler eşleşmiyor')
        return
      }
      
      const { error } = await supabase
        .from('ogretmenler')
        .update({ pin: pinForm.pin })
        .eq('id', ogretmenId)
      
      if (error) throw error
      
      toast.success('PIN başarıyla atandı')
      setPinModalOpen(false)
      setPinForm({ pin: '', confirmPin: '' })
      
    } catch (error: any) {
      console.error('PIN atama hatası:', error)
      toast.error('PIN atanırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setPinLoading(false)
    }
  }
  
  const handleContactUpdate = async () => {
    if (contactLoading) return
    
    try {
      setContactLoading(true)
      
      const { error } = await supabase
        .from('ogretmenler')
        .update({ 
          email: contactForm.email || null,
          telefon: contactForm.telefon || null
        })
        .eq('id', ogretmenId)
      
      if (error) throw error
      
      toast.success('İletişim bilgileri güncellendi')
      setEditModeContact(false)
      fetchOgretmenDetay() // Verileri yeniden yükle
      
    } catch (error: any) {
      console.error('İletişim güncelleme hatası:', error)
      toast.error('İletişim bilgileri güncellenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setContactLoading(false)
    }
  }

  const ozet = useMemo(() => {
    if (!ogretmen) return { isletmeSayisi: 0, ogrenciSayisi: 0, eksikDekontluOgrenci: 0, zamanindaOgrenci: 0 }

    const isletmeIdleri = new Set<string>()
    let eksikDekontluOgrenci = 0

    ogretmen.stajlar.forEach(staj => {
      if (staj.isletmeler) isletmeIdleri.add(staj.isletmeler.id)
      const durum = getDekontDurumu(staj)
      if (durum.eksik > 0 || durum.gecikmis) {
        eksikDekontluOgrenci++
      }
    })

    const ogrenciSayisi = ogretmen.stajlar.length
    return {
      isletmeSayisi: isletmeIdleri.size,
      ogrenciSayisi,
      eksikDekontluOgrenci,
      zamanindaOgrenci: ogrenciSayisi - eksikDekontluOgrenci,
    }
  }, [ogretmen])

  const sorumluIsletmeler = useMemo(() => {
    if (!ogretmen) return []
    const tumIsletmeler = ogretmen.stajlar
      .map(s => s.isletmeler)
      .filter((i): i is StajIsletme => i !== null)
    return Array.from(new Map(tumIsletmeler.map(i => [i.id, i])).values())
  }, [ogretmen])

  const sorumluOgrenciler = useMemo(() => {
      if (!ogretmen) return []
      return ogretmen.stajlar
        .filter(s => s.ogrenciler)
        .map(s => ({
            ...s.ogrenciler!,
            isletme_id: s.isletme_id
        }))
  }, [ogretmen])

  const tumDekontlar = useMemo(() => {
    if (!ogretmen) return []
    const dekontList: DekontDetay[] = []
    ogretmen.stajlar.forEach(staj => {
        if (staj.ogrenciler && staj.isletmeler) {
            staj.dekontlar.forEach(dekont => {
                dekontList.push({
                    ...dekont,
                    ogrenci_ad_soyad: `${staj.ogrenciler!.ad} ${staj.ogrenciler!.soyad}`,
                    isletme_ad: staj.isletmeler!.ad
                })
            })
        }
    })
    return dekontList.sort((a, b) => b.yil - a.yil || b.ay - a.ay);
  }, [ogretmen])

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin h-8 w-8 text-indigo-600" /></div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700 p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Bir Hata Oluştu</h2>
        <p className="text-center mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </button>
      </div>
    )
  }

  if (!ogretmen) {
    return <div className="text-center py-12">Öğretmen bulunamadı.</div>
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.back()} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{ogretmen.ad} {ogretmen.soyad}</h1>
            <p className="text-gray-600 flex items-center mt-1">
              <Briefcase className="h-4 w-4 mr-2" />
              {ogretmen.alan?.ad || 'Alan belirtilmemiş'}
            </p>
          </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <OzetKarti icon={Building2} baslik="Sorumlu İşletme" deger={ozet.isletmeSayisi} />
          <OzetKarti icon={User} baslik="Sorumlu Öğrenci" deger={ozet.ogrenciSayisi} />
          <OzetKarti icon={CheckCircle} baslik="Dekontları Tamam" deger={ozet.zamanindaOgrenci} renk="green" />
          <OzetKarti icon={AlertTriangle} baslik="Eksik/Gecikmiş Dekont" deger={ozet.eksikDekontluOgrenci} renk="red" />
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-6 space-x-6">
              <TabButton id="detaylar" label="Koordinatörlük Detayları" icon={Info} />
              <TabButton id="program" label="Haftalık Program" icon={Clock} />
              <TabButton id="dekontlar" label="Dekontlar" icon={Receipt} />
              <TabButton id="ayarlar" label="Ayarlar" icon={Settings} />
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'detaylar' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşletme</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Staj Başlangıcı</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dekont Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ogretmen.stajlar.map(staj => {
                      if (!staj.ogrenciler || !staj.isletmeler) return null
                      const durum = getDekontDurumu(staj)
                      return (
                        <tr key={staj.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{staj.ogrenciler.ad} {staj.ogrenciler.soyad}</div>
                            <div className="text-sm text-gray-500">{staj.ogrenciler.sinif}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/admin/isletmeler/${staj.isletmeler.id}`} className="text-blue-600 hover:underline">
                              {staj.isletmeler.ad}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                            {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <DekontDurumGostergesi durum={durum} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {ogretmen.stajlar.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Info className="mx-auto h-10 w-10 mb-2" />
                    Bu öğretmenin sorumlu olduğu aktif staj bulunmuyor.
                  </div>
                )}
              </div>
            )}
            {activeTab === 'program' && (
              <KoordinatoerlukProgrami
                programlar={ogretmen.koordinatorluk_programi}
                isletmeler={sorumluIsletmeler}
                ogrenciler={sorumluOgrenciler}
                onProgramEkle={handleProgramEkle}
                onProgramSil={handleProgramSil}
              />
            )}
            {activeTab === 'dekontlar' && (
              <OgretmenDekontListesi dekontlar={tumDekontlar} />
            )}
            {activeTab === 'ayarlar' && (
              <div className="space-y-8">
                {/* PIN Yönetimi */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Key className="h-5 w-5 mr-2 text-indigo-600" />
                        PIN Yönetimi
                      </h3>
                      <p className="text-sm text-gray-600">Öğretmenin giriş PIN'ini oluşturun veya değiştirin</p>
                    </div>
                    <button
                      onClick={() => setPinModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Key className="h-4 w-4" />
                      <span>PIN Ata/Değiştir</span>
                    </button>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">PIN Durumu:</span>
                      <span className="text-sm text-green-600 font-medium">Aktif</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Öğretmen bu PIN ile sistem giriş yapabilir. Güvenlik için PIN'i düzenli olarak değiştirin.
                    </p>
                  </div>
                </div>

                {/* İletişim Bilgileri */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-indigo-600" />
                        İletişim Bilgileri
                      </h3>
                      <p className="text-sm text-gray-600">E-posta ve telefon bilgilerini düzenleyin</p>
                    </div>
                    {!editModeContact && (
                      <button
                        onClick={() => setEditModeContact(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Düzenle</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-posta Adresi
                      </label>
                      {editModeContact ? (
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="ornek@email.com"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {ogretmen?.email || 'E-posta adresi belirtilmemiş'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon Numarası
                      </label>
                      {editModeContact ? (
                        <input
                          type="tel"
                          value={contactForm.telefon}
                          onChange={(e) => setContactForm({ ...contactForm, telefon: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0555 123 45 67"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {ogretmen?.telefon || 'Telefon numarası belirtilmemiş'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {editModeContact && (
                      <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleContactUpdate}
                          disabled={contactLoading}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {contactLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          <span>{contactLoading ? 'Kaydediliyor...' : 'Kaydet'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditModeContact(false)
                            setContactForm({
                              email: ogretmen?.email || '',
                              telefon: ogretmen?.telefon || ''
                            })
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hesap Bilgileri */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-indigo-600" />
                      Hesap Bilgileri
                    </h3>
                    <p className="text-sm text-gray-600">Öğretmen hesap durumu ve temel bilgiler</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Hesap Durumu:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktif
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Alan:</span>
                      <span className="text-sm text-gray-700">{ogretmen?.alan?.ad || 'Alan belirtilmemiş'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Kayıt Tarihi:</span>
                      <span className="text-sm text-gray-700">Sistem kaydında mevcut değil</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PIN Modal */}
            {pinModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setPinModalOpen(false)}></div>
                  </div>

                  <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                          <Key className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                          <h3 className="text-lg leading-6 font-medium text-gray-900">
                            PIN Ata/Değiştir
                          </h3>
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Yeni PIN (4 haneli)
                              </label>
                              <div className="relative">
                                <input
                                  type={showPin ? "text" : "password"}
                                  value={pinForm.pin}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                    setPinForm({ ...pinForm, pin: value })
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="1234"
                                  maxLength={4}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPin(!showPin)}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                  {showPin ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN Tekrar
                              </label>
                              <input
                                type={showPin ? "text" : "password"}
                                value={pinForm.confirmPin}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                  setPinForm({ ...pinForm, confirmPin: value })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="1234"
                                maxLength={4}
                              />
                            </div>
                            {pinForm.pin && pinForm.confirmPin && pinForm.pin !== pinForm.confirmPin && (
                              <p className="text-sm text-red-600">PIN'ler eşleşmiyor</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="button"
                        onClick={handlePinAta}
                        disabled={pinLoading || !pinForm.pin || !pinForm.confirmPin || pinForm.pin !== pinForm.confirmPin}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pinLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : null}
                        {pinLoading ? 'Atanıyor...' : 'PIN Ata'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPinModalOpen(false)
                          setPinForm({ pin: '', confirmPin: '' })
                        }}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub-Components ---
const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: React.ElementType }) => {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'detaylar'

  const handleClick = () => {
    router.push(`/admin/ogretmenler/${params.id}?tab=${id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm ${
        activeTab === id
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  )
}

const OzetKarti = ({ icon: Icon, baslik, deger, renk = 'indigo' }: { icon: React.ElementType, baslik: string, deger: number, renk?: string }) => {
    const renkSiniflari: { [key: string]: string } = {
        indigo: 'bg-indigo-100 text-indigo-600',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600',
    }
    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${renkSiniflari[renk] || renkSiniflari.indigo}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{baslik}</p>
                <p className="text-2xl font-bold text-gray-900">{deger}</p>
            </div>
        </div>
    )
}

const DekontDurumGostergesi = ({ durum }: { durum: ReturnType<typeof getDekontDurumu> }) => {
  if (durum.eksik > 0 || durum.gecikmis) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" title={`${durum.eksik} dekont eksik veya gecikmiş`}>
        <AlertTriangle className="h-4 w-4 mr-1.5" />
        Eksik/Gecikmiş
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" title="Tüm beklenen dekontlar yüklenmiş">
      <CheckCircle className="h-4 w-4 mr-1.5" />
      Tamam
    </span>
  )
}