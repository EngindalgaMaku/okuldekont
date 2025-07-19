'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'react-hot-toast'

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanId: string
}

interface Sinif {
  id: string
  ad: string
}

interface Props {
  alanId: string
  siniflar: Sinif[]
  initialOgrenciler: Ogrenci[]
  initialTotalOgrenciler: number
  initialTotalPages: number
  initialCurrentPage: number
}

export default function OgrencilerTab({ 
  alanId, 
  siniflar, 
  initialOgrenciler, 
  initialTotalOgrenciler, 
  initialTotalPages, 
  initialCurrentPage 
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(initialOgrenciler)
  const [totalOgrenciler, setTotalOgrenciler] = useState(initialTotalOgrenciler)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [currentPage, setCurrentPage] = useState(initialCurrentPage)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [editOgrenciModal, setEditOgrenciModal] = useState(false)
  const [deleteOgrenciModal, setDeleteOgrenciModal] = useState(false)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSinif, setSelectedSinif] = useState<string>('all')
  
  // Form data
  const initialFormState = { ad: '', soyad: '', no: '', sinif: '' }
  const [ogrenciFormData, setOgrenciFormData] = useState(initialFormState)
  const [editOgrenciFormData, setEditOgrenciFormData] = useState(initialFormState)

  // Fetch filtered students
  const fetchOgrenciler = async (page: number = 1, search: string = '', sinifFilter: string = 'all') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        alanId,
        page: page.toString(),
        ...(search && { search }),
        ...(sinifFilter !== 'all' && { sinif: sinifFilter })
      })
      
      const response = await fetch(`/api/admin/students?${params}`)
      if (!response.ok) throw new Error('Öğrenciler getirilemedi')
      
      const data = await response.json()
      setOgrenciler(data.students || [])
      setTotalOgrenciler(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
      setCurrentPage(page)
      
      // Update URL without refresh
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', page.toString())
      if (search) newParams.set('search', search)
      else newParams.delete('search')
      if (sinifFilter !== 'all') newParams.set('sinif', sinifFilter)
      else newParams.delete('sinif')
      
      router.push(`?${newParams.toString()}`, { scroll: false })
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || selectedSinif !== 'all') {
        fetchOgrenciler(1, searchTerm, selectedSinif)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedSinif])

  // Add student
  const handleOgrenciEkle = async () => {
    if (!ogrenciFormData.ad.trim() || !ogrenciFormData.soyad.trim() || !ogrenciFormData.no.trim() || !ogrenciFormData.sinif) {
      toast.error('Tüm alanlar zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ogrenciFormData.ad.trim(),
          surname: ogrenciFormData.soyad.trim(),
          number: ogrenciFormData.no.trim(),
          className: ogrenciFormData.sinif,
          alanId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci eklenirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla eklendi!')
      setOgrenciModalOpen(false)
      setOgrenciFormData(initialFormState)
      fetchOgrenciler(currentPage, searchTerm, selectedSinif)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Edit student
  const handleOgrenciDuzenle = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setEditOgrenciFormData({
      ad: ogrenci.ad,
      soyad: ogrenci.soyad,
      no: ogrenci.no,
      sinif: ogrenci.sinif
    })
    setEditOgrenciModal(true)
  }

  const handleOgrenciGuncelle = async () => {
    if (!selectedOgrenci || !editOgrenciFormData.ad.trim() || !editOgrenciFormData.soyad.trim() || !editOgrenciFormData.no.trim() || !editOgrenciFormData.sinif) {
      toast.error('Tüm alanlar zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students?id=${selectedOgrenci.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editOgrenciFormData.ad.trim(),
          surname: editOgrenciFormData.soyad.trim(),
          number: editOgrenciFormData.no.trim(),
          className: editOgrenciFormData.sinif
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci güncellenirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla güncellendi!')
      setEditOgrenciModal(false)
      setSelectedOgrenci(null)
      fetchOgrenciler(currentPage, searchTerm, selectedSinif)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete student
  const handleOgrenciSil = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setDeleteOgrenciModal(true)
  }

  const handleOgrenciSilOnayla = async () => {
    if (!selectedOgrenci) return
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students?id=${selectedOgrenci.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci silinirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla silindi!')
      setDeleteOgrenciModal(false)
      setSelectedOgrenci(null)
      fetchOgrenciler(currentPage, searchTerm, selectedSinif)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Pagination
  const handlePageChange = (page: number) => {
    fetchOgrenciler(page, searchTerm, selectedSinif)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Öğrenciler ({totalOgrenciler})
        </h2>
        <button
          onClick={() => {
            setOgrenciFormData(initialFormState)
            setOgrenciModalOpen(true)
          }}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Öğrenci Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Öğrenci ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={selectedSinif}
            onChange={(e) => setSelectedSinif(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
          >
            <option value="all">Tüm Sınıflar</option>
            {siniflar.map((sinif) => (
              <option key={sinif.id} value={sinif.ad}>
                {sinif.ad}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      ) : ogrenciler.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numara
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sınıf
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ogrenciler.map((ogrenci) => (
                  <tr key={ogrenci.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ogrenci.no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {ogrenci.sinif}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOgrenciDuzenle(ogrenci)}
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Öğrenciyi Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOgrenciSil(ogrenci)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Öğrenciyi Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{((currentPage - 1) * 10) + 1}</span>
                      {' - '}
                      <span className="font-medium">{Math.min(currentPage * 10, totalOgrenciler)}</span>
                      {' / '}
                      <span className="font-medium">{totalOgrenciler}</span>
                      {' sonuç'}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Öğrenci bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedSinif !== 'all' 
              ? 'Arama kriterlerinize uygun öğrenci bulunamadı.'
              : 'Bu alan için henüz öğrenci eklenmemiş.'
            }
          </p>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={ogrenciModalOpen} onClose={() => setOgrenciModalOpen(false)} title="Yeni Öğrenci Ekle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
            <input
              type="text"
              value={ogrenciFormData.ad}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Öğrenci adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
            <input
              type="text"
              value={ogrenciFormData.soyad}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, soyad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Öğrenci soyadı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
            <input
              type="text"
              value={ogrenciFormData.no}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Örn: 1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
            <select
              value={ogrenciFormData.sinif}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, sinif: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Sınıf Seçin</option>
              {siniflar.map((sinif) => (
                <option key={sinif.id} value={sinif.ad}>
                  {sinif.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setOgrenciModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleOgrenciEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      {editOgrenciModal && selectedOgrenci && (
        <Modal isOpen={editOgrenciModal} onClose={() => setEditOgrenciModal(false)} title="Öğrenciyi Düzenle">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
              <input
                type="text"
                value={editOgrenciFormData.ad}
                onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, ad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
              <input
                type="text"
                value={editOgrenciFormData.soyad}
                onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, soyad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
              <input
                type="text"
                value={editOgrenciFormData.no}
                onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
              <select
                value={editOgrenciFormData.sinif}
                onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, sinif: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {siniflar.map((sinif) => (
                  <option key={sinif.id} value={sinif.ad}>
                    {sinif.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setEditOgrenciModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleOgrenciGuncelle}
                disabled={submitLoading}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteOgrenciModal}
        onClose={() => setDeleteOgrenciModal(false)}
        onConfirm={handleOgrenciSilOnayla}
        title="Öğrenciyi Sil"
        description={`"${selectedOgrenci?.ad} ${selectedOgrenci?.soyad}" adlı öğrenciyi kalıcı olarak silmek istediğinizden emin misiniz?`}
        isLoading={submitLoading}
      />
    </div>
  )
}