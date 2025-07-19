'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Building2, User } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Isletme {
  id: string
  ad: string
  adres?: string
  telefon?: string
  students?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
    baslangic_tarihi: string
    bitis_tarihi: string
  }[]
  koordinatorOgretmen?: {
    id: string
    ad: string
    soyad: string
    email: string
    telefon: string
  } | null
}

interface IsletmeListItem {
  id: string
  ad: string
  telefon?: string
}

interface Props {
  alanId: string
  initialIsletmeListesi: IsletmeListItem[]
}

export default function IsletmelerTab({ alanId, initialIsletmeListesi }: Props) {
  const supabase = createClient()
  const [isletmeListesi] = useState<IsletmeListItem[]>(initialIsletmeListesi)
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isletmeListesi.length > 0 && !selectedIsletme) {
      fetchSelectedIsletme(isletmeListesi[0].id)
    }
  }, [isletmeListesi])

  const fetchSelectedIsletme = async (isletmeId: string) => {
    setLoading(true)
    try {
      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, adres, telefon')
        .eq('id', isletmeId)
        .single()

      if (isletmeError) throw isletmeError
      if (!isletmeData) throw new Error("İşletme bulunamadı")

      const { data: stajlarData, error: stajlarError } = await supabase
        .from('stajlar')
        .select(`
          id,
          baslangic_tarihi,
          bitis_tarihi,
          ogrenciler!inner(id, ad, soyad, no, sinif),
          ogretmenler(id, ad, soyad, email, telefon)
        `)
        .eq('isletme_id', isletmeId)
        .eq('durum', 'aktif')
        .eq('ogrenciler.alan_id', alanId)

      if (stajlarError) throw stajlarError

      const students = stajlarData?.map(staj => {
        const ogrenci = staj.ogrenciler as any
        return {
          id: ogrenci.id,
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          no: ogrenci.no,
          sinif: ogrenci.sinif,
          baslangic_tarihi: staj.baslangic_tarihi,
          bitis_tarihi: staj.bitis_tarihi,
        }
      }) || []

      const koordinatorOgretmen = stajlarData?.find(staj => staj.ogretmenler)?.ogretmenler as any || null

      setSelectedIsletme({
        ...isletmeData,
        students,
        koordinatorOgretmen,
      })
    } catch (error: any) {
      toast.error(`İşletme bilgileri yüklenirken hata: ${error.message}`)
      setSelectedIsletme(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">İşletme Seçimi</h3>
        <select
          value={selectedIsletme?.id || ''}
          onChange={(e) => { if (e.target.value) fetchSelectedIsletme(e.target.value) }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">İşletme seçin...</option>
          {isletmeListesi.map((isletme) => (
            <option key={isletme.id} value={isletme.id}>
              {isletme.ad}{isletme.telefon && ` - ${isletme.telefon}`}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">İşletme bilgileri yükleniyor...</p>
        </div>
      ) : selectedIsletme ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg"><Building2 className="h-6 w-6 text-indigo-600" /></div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedIsletme.ad}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    {selectedIsletme.adres && <p className="text-sm text-gray-600">{selectedIsletme.adres}</p>}
                    {selectedIsletme.telefon && <p className="text-sm text-gray-600">{selectedIsletme.telefon}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Stajyer Sayısı</div>
                <div className="text-2xl font-bold text-indigo-600">{selectedIsletme.students?.length || 0}</div>
              </div>
            </div>
          </div>
          {selectedIsletme.koordinatorOgretmen && (
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full"><User className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <div className="text-sm font-medium text-blue-900">Koordinatör Öğretmen</div>
                  <div className="text-sm text-blue-700">{selectedIsletme.koordinatorOgretmen.ad} {selectedIsletme.koordinatorOgretmen.soyad}</div>
                </div>
              </div>
            </div>
          )}
          {selectedIsletme.students && selectedIsletme.students.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınıf</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedIsletme.students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.ad} {student.soyad}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.sinif}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(student.baslangic_tarihi).toLocaleDateString('tr-TR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(student.bitis_tarihi).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p>Bu işletmede aktif stajyer bulunmamaktadır.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">İşletme seçin</h3>
          <p className="mt-1 text-sm text-gray-500">Detayları görüntülemek için yukarıdan bir işletme seçin.</p>
        </div>
      )}
    </div>
  )
}