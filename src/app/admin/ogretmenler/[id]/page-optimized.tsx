'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader, User, Mail, Phone, Briefcase, Building2, FileText, Receipt, CheckCircle, XCircle, AlertTriangle, Calendar, Info, Clock, Printer, Settings, Key, Shield, Edit3, Save, Eye, EyeOff, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

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
const bugun = new Date()
const getDekontDurumu = (staj: Staj) => {
  const baslangic = new Date(staj.baslangic_tarihi)
  let beklenenDekontSayisi = 0

  const ilkDekontAyi = new Date(baslangic.getFullYear(), baslangic.getMonth() + 1, 1)

  if (bugun >= ilkDekontAyi) {
    const yilFarki = bugun.getFullYear() - ilkDekontAyi.getFullYear()
    const ayFarki = bugun.getMonth() - ilkDekontAyi.getMonth()
    beklenenDekontSayisi = yilFarki * 12 + ayFarki + 1
  }
  
  const yuklenenDekontSayisi = staj.dekontlar.length
  
  let sonDekont = null
  let latestTime = 0
  for (const dekont of staj.dekontlar) {
    const dekontTime = new Date(dekont.yil, dekont.ay - 1).getTime()
    if (dekontTime > latestTime) {
      latestTime = dekontTime
      sonDekont = dekont
    }
  }
  
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

  useEffect(() => {
    if (ogretmenId) {
      fetchOgretmenDetay()
    }
  }, [ogretmenId])

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

      // 3. Fetch ALL dekontlar in ONE optimized query
      const stajIds = (stajlarData || []).map(staj => staj.id);
      let allDekontlar: any[] = [];
      
      if (stajIds.length > 0) {
        const { data: dekontlarData, error: dekontlarError } = await supabase
          .from('dekontlar')
          .select('id, ay, yil, onay_durumu, staj_id')
          .in('staj_id', stajIds)
          .order('yil', { ascending: false })
          .order('ay', { ascending: false });
        
        if (dekontlarError) {
          console.warn('Dekontlar could not be fetched:', dekontlarError);
        } else {
          allDekontlar = dekontlarData || [];
        }
      }

      // Group dekontlar by staj_id for efficient lookup
      const dekontlarByStajId = allDekontlar.reduce((acc, dekont) => {
        if (!acc[dekont.staj_id]) {
          acc[dekont.staj_id] = [];
        }
        acc[dekont.staj_id].push(dekont);
        return acc;
      }, {} as Record<string, any[]>);

      // Combine stajlar with their dekontlar efficiently
      const stajlarWithDekontlar = (stajlarData || []).map(staj => ({
        ...staj,
        dekontlar: dekontlarByStajId[staj.id] || [],
      }));

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
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin h-8 w-8 text-indigo-600" /></div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700 p-4">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">Bir Hata Oluştu</h2>
        <p className="text-center mb-4">{error}</p>
        <Link
          href="/admin/ogretmenler"
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Link>
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
            <Link href="/admin/ogretmenler" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{ogretmen.ad} {ogretmen.soyad}</h1>
            <p className="text-gray-600 flex items-center mt-1">
              <Briefcase className="h-4 w-4 mr-2" />
              {ogretmen.alan?.ad || 'Alan belirtilmemiş'}
            </p>
          </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <OzetKarti icon={Building2} baslik="Koordinatör Olduğu İşletme" deger={ozet.isletmeSayisi} />
          <OzetKarti icon={User} baslik="Sorumlu Olduğu Öğrenci" deger={ozet.ogrenciSayisi} />
          <OzetKarti icon={CheckCircle} baslik="Dekontları Tamam Öğrenci" deger={ozet.zamanindaOgrenci} renk="green" />
          <OzetKarti icon={AlertTriangle} baslik="Eksik/Gecikmiş Dekont" deger={ozet.eksikDekontluOgrenci} renk="red" />
        </div>

        {/* Ana İçerik - Sadece Detaylar Tabı */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6">
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
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub-Components ---
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