import { useEffect, useState } from 'react'
import { Bell, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DekontBildirim {
  id: number
  ogrenci_adi: string
  ogrenci_soyadi: string
  isletme_adi: string
  odeme_son_tarihi: string
  miktar: number
  ay: number
  yil: number
}

interface DekontData {
  id: number
  miktar: number
  odeme_son_tarihi: string
  ay: number
  yil: number
  ogrenciler: {
    ad: string
    soyad: string
  }
  isletmeler: {
    ad: string
  }
}

export default function DekontBildirim() {
  const [bildirimler, setBildirimler] = useState<DekontBildirim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBildirimler()
    // Her 5 dakikada bir bildirimleri güncelle
    const interval = setInterval(fetchBildirimler, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchBildirimler = async () => {
    const ogretmen = JSON.parse(localStorage.getItem('ogretmen') || '{}')
    if (!ogretmen.id) return

    const today = new Date()
    const { data, error } = await supabase
      .from('dekontlar')
      .select(`
        id,
        miktar,
        odeme_son_tarihi,
        ay,
        yil,
        ogrenciler:ogrenciler(ad, soyad),
        isletmeler:isletmeler(ad)
      `)
      .eq('ogretmen_id', ogretmen.id)
      .eq('onay_durumu', 'bekliyor')
      .lte('odeme_son_tarihi', today.toISOString())
      .order('odeme_son_tarihi', { ascending: true })

    if (error) {
      console.error('Bildirimler getirilemedi:', error)
      return
    }

    const formattedBildirimler = (data as unknown as DekontData[]).map(d => ({
      id: d.id,
      ogrenci_adi: d.ogrenciler.ad,
      ogrenci_soyadi: d.ogrenciler.soyad,
      isletme_adi: d.isletmeler.ad,
      odeme_son_tarihi: d.odeme_son_tarihi,
      miktar: d.miktar,
      ay: d.ay,
      yil: d.yil
    }))

    setBildirimler(formattedBildirimler)
    setLoading(false)
  }

  if (loading || bildirimler.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-red-200 p-4 max-w-sm">
        <div className="flex items-center mb-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">
            Geciken Ödemeler ({bildirimler.length})
          </h3>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {bildirimler.map(bildirim => (
            <div key={bildirim.id} className="bg-red-50 rounded-md p-3">
              <div className="text-sm font-medium text-red-800">
                {bildirim.ogrenci_adi} {bildirim.ogrenci_soyadi}
              </div>
              <div className="text-xs text-red-600 mt-1">
                {bildirim.isletme_adi} - {bildirim.ay}/{bildirim.yil}
              </div>
              <div className="text-xs text-red-500 mt-1">
                Son Ödeme: {new Date(bildirim.odeme_son_tarihi).toLocaleDateString('tr-TR')}
              </div>
              <div className="text-xs font-medium text-red-700 mt-1">
                {bildirim.miktar.toLocaleString('tr-TR')} ₺
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 