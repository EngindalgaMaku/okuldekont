'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MesajlarClient from '../../../components/admin/MesajlarClient'

export default function MesajlarPage() {
  const [loading, setLoading] = useState(true)
  const [gidenMesajlar, setGidenMesajlar] = useState<any[]>([])
  const [sablonlar, setSablonlar] = useState<any[]>([])
  const [isletmeler, setIsletmeler] = useState<any[]>([])
  const [ogretmenler, setOgretmenler] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Giden mesajları getir
      const { data: gidenMesajlarRaw, error: gidenError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      // Mesaj şablonları geçici olarak devre dışı - tablo henüz oluşturulmamış
      const sablonlar: any[] = []

      // İşletmeleri getir
      const { data: isletmeler, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, yetkili_kisi')
        .order('ad')

      // Öğretmenleri getir
      const { data: ogretmenler, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad, email')
        .order('ad')

      if (gidenError) console.error('Giden mesajlar hatası:', gidenError)
      if (isletmeError) console.error('İşletmeler hatası:', isletmeError)
      if (ogretmenError) console.error('Öğretmenler hatası:', ogretmenError)

      // Mesajları alıcı bilgileri ile eşleştir
      const gidenMesajlar = (gidenMesajlarRaw || []).map(mesaj => {
        if (mesaj.recipient_type === 'isletme') {
          const isletme = isletmeler?.find(i => i.id === mesaj.recipient_id)
          return { ...mesaj, isletme }
        } else if (mesaj.recipient_type === 'ogretmen') {
          const ogretmen = ogretmenler?.find(o => o.id === mesaj.recipient_id)
          return { ...mesaj, ogretmen }
        }
        return mesaj
      })

      setGidenMesajlar(gidenMesajlar || [])
      setSablonlar(sablonlar || [])
      setIsletmeler(isletmeler || [])
      setOgretmenler(ogretmenler || [])
    } catch (error) {
      console.error('Veri getirme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Mesajlaşma Merkezi</h1>
      </div>
      
      <MesajlarClient
        gidenMesajlar={gidenMesajlar}
        sablonlar={sablonlar}
        isletmeler={isletmeler}
        ogretmenler={ogretmenler}
        onRefresh={fetchData}
      />
    </div>
  )
}