'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { ArrowLeft, Loader, User, Mail, Phone, Briefcase, Building2, FileText, Receipt, MapPin, UserCircle, Settings, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email: string | null
  telefon: string | null
  alan_id: string | null
  aktif: boolean
  pin: string | null
  alan: {
    id: string
    ad: string
  } | null
}

interface Isletme {
  id: string
  ad: string
  yetkili_kisi: string | null
  adres: string | null
  ogrenciler: {
    id: string
    ad: string
    soyad: string
    sinif: string
    no: string
  }[]
}

interface Sayilar {
  ogrenci_sayisi: number
  isletme_sayisi: number
}

export default function OgretmenDetayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [ogretmen, setOgretmen] = useState<Ogretmen | null>(null)
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [sayilar, setSayilar] = useState<Sayilar>({ ogrenci_sayisi: 0, isletme_sayisi: 0 })
  const [deleteModal, setDeleteModal] = useState(false)
  const activeTab = searchParams.get('tab') || 'temel-bilgiler'

  useEffect(() => {
    fetchOgretmen()
  }, [])

  async function fetchOgretmen() {
    setLoading(true)
    const { data: ogretmen, error } = await supabase
      .from('ogretmenler')
      .select(`
        *,
        alan:alan_id (
          id,
          ad
        )
      `)
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

    setOgretmen(ogretmen)

    // İşletmeleri ve öğrencileri çek
    const { data: isletmeData, error: isletmeError } = await supabase
      .from('isletmeler')
      .select(`
        id,
        ad,
        yetkili_kisi,
        adres,
        ogrenciler:ogrenciler(
          id,
          ad,
          soyad,
          sinif,
          no
        )
      `)
      .eq('ogretmen_id', ogretmen.id)
      .order('ad')

    if (isletmeError) {
      console.error('İşletme bilgileri çekilirken hata:', isletmeError)
    } else {
      const isletmelerWithOgrenciler = isletmeData?.map(isletme => ({
        ...isletme,
        ogrenciler: isletme.ogrenciler || []
      })) || []

      setIsletmeler(isletmelerWithOgrenciler)
      setSayilar({
        isletme_sayisi: isletmelerWithOgrenciler.length,
        ogrenci_sayisi: isletmelerWithOgrenciler.reduce((total, isletme) => total + isletme.ogrenciler.length, 0)
      })
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('ogretmenler')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Öğretmen silinirken hata:', error)
      alert('Öğretmen silinirken bir hata oluştu.')
      return
    }

    router.push('/admin/ogretmenler')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!ogretmen) return null

  const tabs = [
    {
      id: 'temel-bilgiler',
      label: 'Temel Bilgiler',
      icon: User
    },
    {
      id: 'isletmeler',
      label: 'İşletmeler',
      count: sayilar.isletme_sayisi,
      icon: Building2
    },
    {
      id: 'belgeler',
      label: 'Belgeler',
      icon: FileText
    },
    {
      id: 'dekontlar',
      label: 'Dekontlar',
      icon: Receipt
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              Geri Dön
            </button>

            <h1 className="text-2xl font-bold">{ogretmen.ad} {ogretmen.soyad}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Briefcase className="h-4 w-4" />
              {ogretmen.alan?.ad || 'Alan Belirtilmemiş'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -top-2 -right-2 bg-white text-gray-600 text-xs px-2 py-1 rounded-full shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity">
                PIN: {ogretmen.pin}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteModal(true)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Kalıcı Olarak Sil"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <Link
                  href={`/admin/ogretmenler/${ogretmen.id}/duzenle`}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Ayarlar"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/admin/ogretmenler/${params.id}?tab=${tab.id}`}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'temel-bilgiler' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">E-posta</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    {ogretmen.email ? (
                      <a href={`mailto:${ogretmen.email}`} className="text-blue-500 hover:text-blue-600">
                        {ogretmen.email}
                      </a>
                    ) : (
                      <span className="text-gray-500">Belirtilmemiş</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Telefon</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-gray-400" />
                    {ogretmen.telefon ? (
                      <a href={`tel:${ogretmen.telefon}`} className="text-blue-500 hover:text-blue-600">
                        {ogretmen.telefon}
                      </a>
                    ) : (
                      <span className="text-gray-500">Belirtilmemiş</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Durum</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ogretmen.aktif
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ogretmen.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'isletmeler' && (
            <div className="space-y-6">
              {isletmeler.length > 0 ? (
                isletmeler.map((isletme) => (
                  <div key={isletme.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-500" />
                            {isletme.ad}
                          </h3>
                          
                          <div className="mt-2 space-y-2">
                            {isletme.yetkili_kisi && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <UserCircle className="h-4 w-4" />
                                {isletme.yetkili_kisi}
                              </div>
                            )}
                            {isletme.adres && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4" />
                                {isletme.adres}
                              </div>
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/admin/isletmeler/${isletme.id}`}
                          className="text-sm text-blue-500 hover:text-blue-600"
                        >
                          Detay
                        </Link>
                      </div>

                      {isletme.ogrenciler.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Stajyer Öğrenciler</h4>
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Öğrenci No
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Ad Soyad
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Sınıf
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    İşlem
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {isletme.ogrenciler.map((ogrenci) => (
                                  <tr key={ogrenci.id} className="hover:bg-gray-100">
                                    <td className="px-4 py-3 text-sm font-mono">
                                      {ogrenci.no}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {ogrenci.ad} {ogrenci.soyad}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {ogrenci.sinif}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <Link
                                        href={`/admin/ogrenciler/${ogrenci.id}`}
                                        className="text-sm text-blue-500 hover:text-blue-600"
                                      >
                                        Detay
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">İşletme Bulunamadı</h3>
                  <p className="text-gray-500 mb-6">
                    Bu öğretmen henüz hiçbir işletmenin koordinatörü değil.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'belgeler' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-500">Bu özellik henüz hazır değil.</p>
            </div>
          )}

          {activeTab === 'dekontlar' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-500">Bu özellik henüz hazır değil.</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Öğretmeni Sil"
        description={`${ogretmen?.ad} ${ogretmen?.soyad} isimli öğretmeni kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
      />
    </div>
  )
} 