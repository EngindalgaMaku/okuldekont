'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, User, Eye, Edit, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Pagination from '@/components/ui/Pagination'

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  isletme_adi?: string | null
  staj_durumu?: 'aktif' | 'isletmesi_yok'
  baslama_tarihi?: string | null
  bitis_tarihi?: string | null
  koordinator_ogretmen?: string | null
}

interface Sinif {
  id: string
  ad: string
}

interface Props {
  initialOgrenciler: Ogrenci[]
  siniflar: Sinif[]
  alanId: string
  initialCurrentPage: number
  initialTotalPages: number
  initialTotalOgrenciler: number
}

export default function OgrencilerTab({ initialOgrenciler, siniflar, alanId, initialCurrentPage, initialTotalPages, initialTotalOgrenciler }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(initialOgrenciler)
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Modals
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [ogrenciDetayModal, setOgrenciDetayModal] = useState(false)
  const [deleteOgrenciModal, setDeleteOgrenciModal] = useState(false)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [ogrenciEditMode, setOgrenciEditMode] = useState(false)
  
  // Forms
  const [submitLoading, setSubmitLoading] = useState(false)
  const [ogrenciFormData, setOgrenciFormData] = useState({ ad: '', soyad: '', no: '', sinif_id: '' })
  const [editOgrenciFormData, setEditOgrenciFormData] = useState({ ad: '', soyad: '', no: '', sinif: '' })

  useEffect(() => {
    const fetchStajDetails = async () => {
      if (initialOgrenciler.length === 0) {
        setLoadingDetails(false)
        return
      }
      
      setLoadingDetails(true)
      const studentIds = initialOgrenciler.map(s => s.id)
      
      try {
        const response = await fetch(`/api/admin/internships?studentIds=${studentIds.join(',')}&status=ACTIVE`)
        if (!response.ok) {
          throw new Error('Staj detayları yüklenemedi')
        }
        
        const { data: stajlar } = await response.json()
        const stajMap = new Map(stajlar.map((staj: any) => [staj.studentId, staj]))

        const hydratedOgrenciler = initialOgrenciler.map((ogrenci): Ogrenci => {
          const staj = stajMap.get(ogrenci.id)
          if (!staj) {
            return { ...ogrenci, staj_durumu: 'isletmesi_yok' }
          }
          return {
            ...ogrenci,
            staj_durumu: 'aktif',
            isletme_adi: staj.company?.name || null,
            koordinator_ogretmen: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : null,
            baslama_tarihi: staj.startDate,
            bitis_tarihi: staj.endDate,
          }
        })
        setOgrenciler(hydratedOgrenciler)
      } catch (error) {
        console.error('Staj detayları yüklenirken hata:', error)
        toast.error("Öğrenci staj detayları yüklenemedi.")
        setOgrenciler(initialOgrenciler.map(ogrenci => ({ ...ogrenci, staj_durumu: 'isletmesi_yok' })))
      } finally {
        setLoadingDetails(false)
      }
    }
    fetchStajDetails()
  }, [initialOgrenciler])

  const handleFilterChange = (key: 'sinif' | 'staj', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleOgrenciEkle = async () => {
    if (!ogrenciFormData.ad.trim() || !ogrenciFormData.soyad.trim() || !ogrenciFormData.no.trim() || !ogrenciFormData.sinif_id) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.')
      return
    }
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: ogrenciFormData.ad.trim(),
          surname: ogrenciFormData.soyad.trim(),
          number: ogrenciFormData.no.trim(),
          className: ogrenciFormData.sinif_id,
          alanId: alanId
        })
      })
      
      if (!response.ok) {
        throw new Error('Öğrenci eklenirken bir hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla eklendi.')
      setOgrenciModalOpen(false)
      setOgrenciFormData({ ad: '', soyad: '', no: '', sinif_id: '' })
      router.refresh()
    } catch (error: any) {
      toast.error(`Öğrenci eklenirken bir hata oluştu: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleOgrenciDetay = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setEditOgrenciFormData({ ad: ogrenci.ad, soyad: ogrenci.soyad, no: ogrenci.no, sinif: ogrenci.sinif })
    setOgrenciEditMode(false)
    setOgrenciDetayModal(true)
  }
  
  const handleOgrenciGuncelle = async () => {
    if (!selectedOgrenci) return
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students/${selectedOgrenci.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editOgrenciFormData.ad,
          surname: editOgrenciFormData.soyad,
          number: editOgrenciFormData.no,
          className: editOgrenciFormData.sinif
        })
      })
      
      if (!response.ok) {
        throw new Error('Öğrenci güncellenirken bir hata oluştu')
      }
      
      toast.success('Öğrenci bilgileri güncellendi.')
      setOgrenciEditMode(false)
      setOgrenciDetayModal(false)
      router.refresh()
    } catch (error: any) {
      toast.error(`Öğrenci güncellenirken hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }
  
  const handleOgrenciSilOnayla = async () => {
    if (!selectedOgrenci) return
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students/${selectedOgrenci.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Öğrenci silinirken bir hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla silindi.')
      setDeleteOgrenciModal(false)
      setOgrenciDetayModal(false)
      setSelectedOgrenci(null)
      router.refresh()
    } catch (error: any) {
      toast.error(`Öğrenci silinirken hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Öğrenciler ({initialTotalOgrenciler})</h2>
        <div className="flex gap-3">
          <select value={searchParams.get('sinif') || ''} onChange={(e) => handleFilterChange('sinif', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Tüm sınıflar</option>{siniflar.map((sinif) => (<option key={sinif.id} value={sinif.ad}>{sinif.ad}</option>))}</select>
          <select value={searchParams.get('staj') || ''} onChange={(e) => handleFilterChange('staj', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Tüm Staj Durumları</option><option value="var">İşletmesi Olanlar</option><option value="yok">İşletmesi Olmayanlar</option></select>
          <button onClick={() => setOgrenciModalOpen(true)} className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl" title="Yeni Öğrenci Ekle"><Plus className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşletme</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Koordinatör</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ogrenciler.map((ogrenci) => (
              <tr key={ogrenci.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{ogrenci.ad} {ogrenci.soyad}</div><div className="text-sm text-gray-500">{ogrenci.no} - {ogrenci.sinif}</div></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{loadingDetails ? <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div> : ogrenci.isletme_adi || <span className="text-gray-400 italic">Yok</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{loadingDetails ? <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div> : ogrenci.koordinator_ogretmen || <span className="text-gray-400 italic">Yok</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap">{loadingDetails ? <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse"></div> : <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ogrenci.staj_durumu === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{ogrenci.staj_durumu === 'aktif' ? 'Aktif Staj' : 'Staj Yok'}</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleOgrenciDetay(ogrenci)} className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg" title="Detayları Görüntüle"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {initialTotalPages > 1 && <Pagination currentPage={initialCurrentPage} totalPages={initialTotalPages} />}
      </div>

      <Modal isOpen={ogrenciModalOpen} onClose={() => setOgrenciModalOpen(false)} title="Yeni Öğrenci Ekle">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ad</label><input type="text" value={ogrenciFormData.ad} onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, ad: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label><input type="text" value={ogrenciFormData.soyad} onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, soyad: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci No</label><input type="text" value={ogrenciFormData.no} onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, no: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label><select value={ogrenciFormData.sinif_id} onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, sinif_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="">Sınıf seçin</option>{siniflar.map((sinif) => (<option key={sinif.id} value={sinif.ad}>{sinif.ad}</option>))}</select></div>
          <div className="flex justify-end space-x-3 pt-4 border-t"><button onClick={() => setOgrenciModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border">İptal</button><button onClick={handleOgrenciEkle} disabled={submitLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">{submitLoading ? 'Ekleniyor...' : 'Ekle'}</button></div>
        </div>
      </Modal>

      {selectedOgrenci && (
        <Modal isOpen={ogrenciDetayModal} onClose={() => setOgrenciDetayModal(false)} title={`${selectedOgrenci.ad} ${selectedOgrenci.soyad}`}>
          <div className="space-y-6">
            {ogrenciEditMode ? (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ad</label><input type="text" value={editOgrenciFormData.ad} onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, ad: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label><input type="text" value={editOgrenciFormData.soyad} onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, soyad: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci No</label><input type="text" value={editOgrenciFormData.no} onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, no: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label><select value={editOgrenciFormData.sinif} onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, sinif: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="">Sınıf seçin</option>{siniflar.map((sinif) => (<option key={sinif.id} value={sinif.ad}>{sinif.ad}</option>))}</select></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-500">Öğrenci No</label><p className="text-gray-900">{selectedOgrenci.no}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Sınıf</label><p className="text-gray-900">{selectedOgrenci.sinif}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">İşletme</label><p className="text-gray-900">{selectedOgrenci.isletme_adi || 'Yok'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Koordinatör</label><p className="text-gray-900">{selectedOgrenci.koordinator_ogretmen || 'Yok'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Başlama Tarihi</label><p className="text-gray-900">{selectedOgrenci.baslama_tarihi ? new Date(selectedOgrenci.baslama_tarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Durum</label><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedOgrenci.staj_durumu === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{selectedOgrenci.staj_durumu === 'aktif' ? 'Aktif Staj' : 'Staj Yok'}</span></div>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => { setOgrenciDetayModal(false); setDeleteOgrenciModal(true); }} className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="h-4 w-4 mr-2" />Sil</button>
              <div className="flex space-x-3">
                <button onClick={() => setOgrenciDetayModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border">Kapat</button>
                {ogrenciEditMode ? (
                  <button onClick={handleOgrenciGuncelle} disabled={submitLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">{submitLoading ? 'Kaydediliyor...' : 'Kaydet'}</button>
                ) : (
                  <button onClick={() => setOgrenciEditMode(true)} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Edit className="h-4 w-4 mr-2" />Düzenle</button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmModal isOpen={deleteOgrenciModal} onClose={() => setDeleteOgrenciModal(false)} onConfirm={handleOgrenciSilOnayla} title="Öğrenciyi Sil" description={`"${selectedOgrenci?.ad} ${selectedOgrenci?.soyad}" adlı öğrenciyi kalıcı olarak silmek istediğinizden emin misiniz?`} isLoading={submitLoading} />
    </div>
  )
}