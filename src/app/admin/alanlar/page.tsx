'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, Edit, Trash2, Users, Building, GraduationCap,
  Monitor, Calculator, Heart, Globe, Sprout, Settings,
  Car, Wrench, Camera, Palette, ChefHat, BookOpen,
  Zap, Hammer, Scissors, Stethoscope
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Alan {
  id: string
  ad: string
  aciklama?: string
  aktif: boolean
  created_at: string
  ogretmen_sayisi?: number
  ogrenci_sayisi?: number
}

// Alan ismine göre icon ve renk döndüren fonksiyon
const getAlanIconAndColor = (alanAd: string) => {
  const alanAdLower = alanAd.toLowerCase()
  
  if (alanAdLower.includes('bilişim') || alanAdLower.includes('bilgisayar') || alanAdLower.includes('yazılım')) {
    return {
      icon: Monitor,
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
      borderColor: 'border-blue-200'
    }
  }
  if (alanAdLower.includes('muhasebe') || alanAdLower.includes('finans') || alanAdLower.includes('ekonomi')) {
    return {
      icon: Calculator,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderColor: 'border-green-200'
    }
  }
  if (alanAdLower.includes('sağlık') || alanAdLower.includes('hemşire') || alanAdLower.includes('tıp')) {
    return {
      icon: Heart,
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
      borderColor: 'border-red-200'
    }
  }
  if (alanAdLower.includes('turizm') || alanAdLower.includes('otel') || alanAdLower.includes('muhasebe')) {
    return {
      icon: Globe,
      color: 'from-orange-500 to-yellow-600',
      bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
      borderColor: 'border-orange-200'
    }
  }
  if (alanAdLower.includes('tarım') || alanAdLower.includes('ziraat') || alanAdLower.includes('hayvancılık')) {
    return {
      icon: Sprout,
      color: 'from-lime-500 to-green-600',
      bgColor: 'bg-gradient-to-r from-lime-50 to-green-50',
      borderColor: 'border-lime-200'
    }
  }
  if (alanAdLower.includes('endüstri') || alanAdLower.includes('makine') || alanAdLower.includes('üretim')) {
    return {
      icon: Settings,
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50',
      borderColor: 'border-gray-200'
    }
  }
  if (alanAdLower.includes('otomotiv') || alanAdLower.includes('araç')) {
    return {
      icon: Car,
      color: 'from-indigo-500 to-blue-600',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-50',
      borderColor: 'border-indigo-200'
    }
  }
  if (alanAdLower.includes('radyo') || alanAdLower.includes('elektronik')) {
    return {
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200'
    }
  }
  if (alanAdLower.includes('inşaat') || alanAdLower.includes('yapı')) {
    return {
      icon: Hammer,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
      borderColor: 'border-amber-200'
    }
  }
  if (alanAdLower.includes('kuaför') || alanAdLower.includes('güzellik') || alanAdLower.includes('berber')) {
    return {
      icon: Scissors,
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50',
      borderColor: 'border-pink-200'
    }
  }
  if (alanAdLower.includes('aşçı') || alanAdLower.includes('yemek') || alanAdLower.includes('mutfak')) {
    return {
      icon: ChefHat,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-50',
      borderColor: 'border-orange-200'
    }
  }
  if (alanAdLower.includes('halk') || alanAdLower.includes('tasarım') || alanAdLower.includes('sanat')) {
    return {
      icon: Palette,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-gradient-to-r from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200'
    }
  }
  
  // Varsayılan
  return {
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-50',
    borderColor: 'border-slate-200'
  }
}

export default function AlanlarPage() {
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [countsLoading, setCountsLoading] = useState(false)

  useEffect(() => {
    fetchAlanlar()
  }, [])

  const fetchAlanlar = async () => {
    try {
      setLoading(true)
      
      // İlk önce sadece alanları hızlıca yükle
      const { data: alanlarData, error: alanlarError } = await supabase
        .from('alanlar')
        .select('*')
        .order('ad')

      if (alanlarError) throw alanlarError

      // Alanları hemen göster (sayılar olmadan)
      const alanlarWithoutCounts = alanlarData.map(alan => ({
        ...alan,
        ogretmen_sayisi: undefined,
        ogrenci_sayisi: undefined,
      }))
      
      setAlanlar(alanlarWithoutCounts)
      setLoading(false)

      // Sayıları arka planda lazy load et
      loadCounts(alanlarData)
    } catch (error) {
      console.error('Alanları getirme hatası:', error)
      setLoading(false)
    }
  }

  const loadCounts = async (alanlarData: any[]) => {
    try {
      setCountsLoading(true)

      // Tek sorguda tüm sayıları al (çok daha hızlı)
      const [ogretmenResult, ogrenciResult] = await Promise.all([
        supabase
          .from('ogretmenler')
          .select('alan_id')
          .not('alan_id', 'is', null),
        supabase
          .from('ogrenciler')
          .select('alan_id')
          .not('alan_id', 'is', null)
      ])

      // Sayıları manuel olarak say
      const ogretmenCounts: Record<string, number> = {}
      const ogrenciCounts: Record<string, number> = {}

      ogretmenResult.data?.forEach(item => {
        ogretmenCounts[item.alan_id] = (ogretmenCounts[item.alan_id] || 0) + 1
      })

      ogrenciResult.data?.forEach(item => {
        ogrenciCounts[item.alan_id] = (ogrenciCounts[item.alan_id] || 0) + 1
      })

      // Alanları sayılarla güncelle
      const alanlarWithCounts = alanlarData.map(alan => ({
        ...alan,
        ogretmen_sayisi: ogretmenCounts[alan.id] || 0,
        ogrenci_sayisi: ogrenciCounts[alan.id] || 0,
      }))

      setAlanlar(alanlarWithCounts)
    } catch (error) {
      console.error('Sayıları getirme hatası:', error)
    } finally {
      setCountsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meslek Alanları</h1>
          <p className="text-gray-600">Alan bazlı öğrenci, öğretmen ve staj yönetimi</p>
        </div>
        <Link
          href="/admin/alanlar/yeni"
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Yeni Alan
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Tüm Alanlar ({alanlar.length})</h2>
        </div>
        
        {alanlar.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz alan yok</h3>
            <p className="mt-2 text-gray-500">İlk meslek alanını oluşturmak için yeni alan ekleyin.</p>
            <Link
              href="/admin/alanlar/yeni"
              className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni Alan
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alanlar.map((alan) => {
              const { icon: IconComponent, color, bgColor, borderColor } = getAlanIconAndColor(alan.ad)
              
              return (
                <Link
                  key={alan.id}
                  href={`/admin/alanlar/${alan.id}`}
                  className={`block px-6 py-4 hover:shadow-md transition-all duration-200 ${bgColor} border-l-4 ${borderColor} hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors">{alan.ad}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          alan.aktif
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {alan.aktif ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      {alan.aciklama && (
                        <p className="mt-1 text-gray-600">{alan.aciklama}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {alan.ogretmen_sayisi !== undefined ? (
                            <span>{alan.ogretmen_sayisi} Öğretmen</span>
                          ) : countsLoading ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                              <span>Öğretmen</span>
                            </div>
                          ) : (
                            <span>- Öğretmen</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {alan.ogrenci_sayisi !== undefined ? (
                            <span>{alan.ogrenci_sayisi} Öğrenci</span>
                          ) : countsLoading ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                              <span>Öğrenci</span>
                            </div>
                          ) : (
                            <span>- Öğrenci</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}