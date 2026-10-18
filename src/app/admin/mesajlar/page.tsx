'use client'

import { useState, useEffect } from 'react'
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

      // Giden mesajları, işletmeleri ve öğretmenleri paralel olarak getir
      const [gidenResponse, isletmelerResponse, ogretmenlerResponse] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/admin/companies'),
        fetch('/api/admin/teachers')
      ]);

      const gidenMesajlarRaw = gidenResponse.ok ? await gidenResponse.json() : [];
      const isletmelerData = isletmelerResponse.ok ? await isletmelerResponse.json() : [];
      const ogretmenlerData = ogretmenlerResponse.ok ? await ogretmenlerResponse.json() : [];

      // Mesaj şablonları geçici olarak devre dışı - tablo henüz oluşturulmamış
      const sablonlar: any[] = []

      // Mesajları alıcı bilgileri ile eşleştir
      const gidenMesajlar = (gidenMesajlarRaw || []).map((mesaj: any) => {
        if (mesaj.recipient_type === 'isletme') {
          const isletme = isletmelerData?.find((i: any) => i.id === mesaj.recipient_id)
          return { ...mesaj, isletme }
        } else if (mesaj.recipient_type === 'ogretmen') {
          const ogretmen = ogretmenlerData?.find((o: any) => o.id === mesaj.recipient_id)
          return { ...mesaj, ogretmen }
        }
        return mesaj
      })

      setGidenMesajlar(gidenMesajlar || [])
      setSablonlar(sablonlar || [])
      setIsletmeler(isletmelerData || [])
      setOgretmenler(ogretmenlerData || [])
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