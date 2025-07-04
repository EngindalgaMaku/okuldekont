'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus, Loader, Monitor, Newspaper, Users, Calculator, Radio, Palette, Code, Mic, MessageCircle, DollarSign, FileText, AlertTriangle, PlusCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

interface Alan {
    id: number;
    ad: string;
    aktif: boolean;
    aciklama?: string;
}

export default function AlanYonetimi() {
  const router = useRouter()
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [yeniAlanAdi, setYeniAlanAdi] = useState('')

  const fetchAlanlar = async () => {
    const { data, error } = await supabase
      .from('alanlar')
      .select('*')
      .order('ad', { ascending: true })

    if (error) {
      console.error('Alanlar yüklenirken hata:', error)
      return
    }

    setAlanlar(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAlanlar()
  }, [])

  const alanIkonlari: { [key: string]: any } = {
    'Bilişim Teknolojileri': Monitor,
    'Muhasebe ve Finansman': Calculator,
    'Gazetecilik': FileText,
    'Radyo ve Televizyon': Radio,
    'Halkla İlişkiler': Users,
    'Sanat Tasarım': Palette
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const aktifAlanlar = alanlar.filter(alan => alan.aktif)
  const pasifAlanlar = alanlar.filter(alan => !alan.aktif)

  const handleYeniAlanEkle = async () => {
    try {
      const { data, error } = await supabase
        .from('alanlar')
        .insert([
          { 
            ad: yeniAlanAdi,
            aktif: true 
          }
        ])
        .select()

      if (error) throw error

      setAlanlar([...alanlar, data[0]])
      setShowNewModal(false)
      setYeniAlanAdi('')
      router.refresh()
    } catch (error) {
      console.error('Alan eklenirken hata:', error)
      alert('Alan eklenirken bir hata oluştu')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Meslek Alanları</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors duration-200"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {aktifAlanlar.map((alan) => {
            const Icon = alanIkonlari[alan.ad] || Briefcase
            return (
              <div
                key={alan.id}
                onClick={() => router.push(`/admin/alanlar/${alan.id}`)}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer border border-indigo-100 hover:border-indigo-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{alan.ad}</h3>
                    {alan.aciklama && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {alan.aciklama}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {pasifAlanlar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pasif Alanlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pasifAlanlar.map((alan) => {
                const Icon = alanIkonlari[alan.ad] || Briefcase
                return (
                  <div
                    key={alan.id}
                    onClick={() => router.push(`/admin/alanlar/${alan.id}`)}
                    className="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-200 hover:border-gray-300 opacity-75"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Icon className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-700">{alan.ad}</h3>
                          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                            Pasif
                          </span>
                        </div>
                        {alan.aciklama && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {alan.aciklama}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Modal
          isOpen={showNewModal}
          onClose={() => {
            setShowNewModal(false)
            setYeniAlanAdi('')
          }}
          title="Yeni Alan Ekle"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="alanAdi" className="block text-sm font-medium text-gray-700">
                Alan Adı
              </label>
              <input
                type="text"
                id="alanAdi"
                value={yeniAlanAdi}
                onChange={(e) => setYeniAlanAdi(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Örn: Bilişim Teknolojileri"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewModal(false)
                  setYeniAlanAdi('')
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleYeniAlanEkle}
                disabled={!yeniAlanAdi.trim()}
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ekle
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
} 