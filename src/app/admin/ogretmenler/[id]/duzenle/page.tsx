'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader, Save, User, Mail, Phone, Briefcase, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Alan {
  id: number
  ad: string
}

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email: string | null
  telefon: string | null
  alan_id: number | null
  aktif: boolean
  pin: string | null
}

export default function OgretmenDuzenlePage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    email: '',
    telefon: '',
    alan_id: '',
    aktif: true,
    pin: ''
  })

  useEffect(() => {
    fetchOgretmen()
    fetchAlanlar()
  }, [])

  async function fetchOgretmen() {
    setLoading(true)
    const { data: ogretmen, error } = await supabase
      .from('ogretmenler')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Öğretmen bilgileri çekilirken hata:', error)
      alert('Öğretmen bilgileri yüklenirken bir hata oluştu.')
      router.push('/admin/ogretmenler')
      return
    }

    if (!ogretmen) {
      alert('Öğretmen bulunamadı.')
      router.push('/admin/ogretmenler')
      return
    }

    setFormData({
      ad: ogretmen.ad,
      soyad: ogretmen.soyad,
      email: ogretmen.email || '',
      telefon: ogretmen.telefon || '',
      alan_id: ogretmen.alan_id?.toString() || '',
      aktif: ogretmen.aktif,
      pin: ogretmen.pin || ''
    })
    setLoading(false)
  }

  async function fetchAlanlar() {
    const { data, error } = await supabase
      .from('alanlar')
      .select('*')
      .order('ad', { ascending: true })

    if (error) {
      console.error('Alanlar çekilirken hata:', error)
    } else {
      setAlanlar(data || [])
    }
  }

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.ad.trim() || !formData.soyad.trim()) {
      alert('Ad ve soyad zorunludur.')
      return
    }

    if (!formData.pin.trim() || formData.pin.length !== 4) {
      alert('PIN kodu 4 haneli olmalıdır.')
      return
    }

    setSubmitLoading(true)
    const { error } = await supabase
      .from('ogretmenler')
      .update({
        ad: formData.ad.trim(),
        soyad: formData.soyad.trim(),
        email: formData.email.trim() || null,
        telefon: formData.telefon.trim() || null,
        alan_id: formData.alan_id ? parseInt(formData.alan_id) : null,
        aktif: formData.aktif,
        pin: formData.pin.trim()
      })
      .eq('id', params.id)

    if (error) {
      alert('Öğretmen güncellenirken bir hata oluştu: ' + error.message)
    } else {
      router.push('/admin/ogretmenler')
    }
    setSubmitLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Geri Dön
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Öğretmen Düzenle</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={formData.ad}
                    onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={formData.soyad}
                    onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alan
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={formData.alan_id}
                  onChange={(e) => setFormData({ ...formData, alan_id: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Alan Seçin</option>
                  {alanlar.map((alan) => (
                    <option key={alan.id} value={alan.id}>
                      {alan.ad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN Kodu
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pin: generateRandomPin() })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                >
                  <Key className="h-5 w-5" />
                  Yeni PIN
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aktif"
                checked={formData.aktif}
                onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aktif" className="text-sm text-gray-700">
                Aktif
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 