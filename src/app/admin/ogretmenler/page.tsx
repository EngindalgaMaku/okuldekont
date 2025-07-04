'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Edit, Trash2, Loader, Save, User, Mail, Phone, Briefcase, ToggleLeft, ToggleRight, Key, Search, Filter, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Link from 'next/link'

interface Alan {
    id: number;
    ad: string;
}

interface Ogretmen {
    id: number;
    ad: string;
    soyad: string;
    email?: string;
    telefon?: string;
    alan_id?: number;
    aktif: boolean;
    pin?: string;
    alanlar?: { ad: string };
}

export default function OgretmenYonetimiPage() {
  const router = useRouter()
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [filteredOgretmenler, setFilteredOgretmenler] = useState<Ogretmen[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlan, setSelectedAlan] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [paginatedData, setPaginatedData] = useState<Ogretmen[]>([])
  const [totalPages, setTotalPages] = useState(0)
  
  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedOgretmen, setSelectedOgretmen] = useState<Ogretmen | null>(null)
  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    email: '',
    telefon: '',
    alan_id: '',
    aktif: true,
    pin: ''
  })
  const [submitLoading, setSubmitLoading] = useState(false)

  async function fetchOgretmenler() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ogretmenler')
      .select(`
        *,
        alanlar (ad)
      `)
      .order('ad', { ascending: true });
      
    if (error) {
        console.error('Öğretmenler çekilirken hata:', error)
        alert('Öğretmenler yüklenirken bir hata oluştu.')
    } else {
        setOgretmenler(data || [])
        setFilteredOgretmenler(data || [])
    }
    setLoading(false)
  }

  async function fetchAlanlar() {
    const { data, error } = await supabase.from('alanlar').select('*').order('ad', { ascending: true });
    if (error) {
        console.error('Alanlar çekilirken hata:', error)
    } else {
        setAlanlar(data || [])
    }
  }

  useEffect(() => {
    fetchOgretmenler()
    fetchAlanlar()
  }, [])

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = ogretmenler

    // Alan filtresi
    if (selectedAlan) {
      filtered = filtered.filter(ogretmen => 
        ogretmen.alan_id?.toString() === selectedAlan
      )
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(ogretmen =>
        ogretmen.ad.toLowerCase().includes(query) ||
        ogretmen.soyad.toLowerCase().includes(query) ||
        ogretmen.email?.toLowerCase().includes(query) ||
        ogretmen.telefon?.includes(query)
      )
    }

    // Aktif öğretmenleri başa, pasif öğretmenleri sona al
    filtered = [...filtered].sort((a, b) => {
      if (a.aktif === b.aktif) return 0;
      return a.aktif ? -1 : 1;
    });

    setFilteredOgretmenler(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [ogretmenler, selectedAlan, searchQuery])

  // Sayfalama fonksiyonu
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = filteredOgretmenler.slice(startIndex, endIndex)
    
    setPaginatedData(paginated)
    setTotalPages(Math.ceil(filteredOgretmenler.length / pageSize))
  }, [filteredOgretmenler, currentPage, pageSize])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleFirstPage = () => {
    setCurrentPage(1)
  }

  const handleLastPage = () => {
    setCurrentPage(totalPages)
  }

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleAdd = () => {
    setFormData({
      ad: '',
      soyad: '',
      email: '',
      telefon: '',
      alan_id: '',
      aktif: true,
      pin: generateRandomPin()
    })
    setAddModal(true)
  }

  const handleEdit = (ogretmen: Ogretmen) => {
    setSelectedOgretmen(ogretmen)
    setFormData({
      ad: ogretmen.ad,
      soyad: ogretmen.soyad,
      email: ogretmen.email || '',
      telefon: ogretmen.telefon || '',
      alan_id: ogretmen.alan_id?.toString() || '',
      aktif: ogretmen.aktif,
      pin: ogretmen.pin || ''
    })
    setEditModal(true)
  }

  const handleSaveAdd = async () => {
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
      .insert([{
        ad: formData.ad.trim(),
        soyad: formData.soyad.trim(),
        email: formData.email.trim() || null,
        telefon: formData.telefon.trim() || null,
        alan_id: formData.alan_id ? parseInt(formData.alan_id) : null,
        aktif: formData.aktif,
        pin: formData.pin.trim()
      }])

    if (error) {
      alert('Öğretmen eklenirken bir hata oluştu: ' + error.message)
    } else {
      setAddModal(false)
      fetchOgretmenler()
    }
    setSubmitLoading(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedOgretmen || !formData.ad.trim() || !formData.soyad.trim()) {
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
      .eq('id', selectedOgretmen.id)

    if (error) {
      alert('Öğretmen güncellenirken bir hata oluştu: ' + error.message)
    } else {
      setEditModal(false)
      fetchOgretmenler()
    }
    setSubmitLoading(false)
  }

  const handleDelete = (ogretmen: Ogretmen) => {
    setSelectedOgretmen(ogretmen)
    setDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedOgretmen) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('ogretmenler')
      .delete()
      .eq('id', selectedOgretmen.id)

    if (error) {
      alert('Öğretmen silinirken bir hata oluştu: ' + error.message)
    } else {
      setDeleteModal(false)
      fetchOgretmenler()
    }
    setSubmitLoading(false)
  }

  const handleToggleActive = async (ogretmen: Ogretmen) => {
    console.log('Durum güncelleniyor:', ogretmen.id, 'mevcut:', ogretmen.aktif, 'yeni:', !ogretmen.aktif)
    
    const { data, error } = await supabase
      .from('ogretmenler')
      .update({ aktif: !ogretmen.aktif })
      .eq('id', ogretmen.id)
      .select()

    console.log('Güncelleme sonucu:', { data, error })

    if (error) {
      alert('Durum güncellenirken bir hata oluştu: ' + error.message)
    } else {
      fetchOgretmenler()
    }
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Öğretmen Yönetimi
          </h1>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedAlan}
              onChange={(e) => setSelectedAlan(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            >
              <option value="">Tüm Alanlar</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Öğretmen ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <button
            onClick={handleAdd}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg flex items-center"
            title="Yeni Öğretmen"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğretmen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alan
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((ogretmen) => (
                <tr 
                  key={ogretmen.id} 
                  className={`hover:bg-gray-50 ${!ogretmen.aktif ? 'bg-red-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <Link href={`/admin/ogretmenler/${ogretmen.id}`} className="group">
                      <div className="flex items-center gap-3">
                        <User className={`h-5 w-5 ${!ogretmen.aktif ? 'text-red-400' : 'text-gray-400'} group-hover:text-blue-500`} />
                        <div>
                          <div className="font-medium group-hover:text-blue-500">
                            {ogretmen.ad} {ogretmen.soyad}
                            {!ogretmen.aktif && (
                              <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                Pasif
                              </span>
                            )}
                          </div>
                          {ogretmen.telefon && (
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Phone className="h-4 w-4" />
                              {ogretmen.telefon}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className={`h-5 w-5 ${!ogretmen.aktif ? 'text-red-400' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-900">
                        {ogretmen.alanlar?.ad || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <Link
                        href={`/admin/ogretmenler/${ogretmen.id}`}
                        className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Öğretmen Detayı"
                      >
                        <User className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Toplam {filteredOgretmenler.length} öğretmen
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-gray-700">
            Sayfa {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Ekleme Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Yeni Öğretmen Ekle"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad
              </label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad
              </label>
              <input
                type="text"
                value={formData.soyad}
                onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alan
            </label>
            <select
              value={formData.alan_id}
              onChange={(e) => setFormData({ ...formData, alan_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alan Seçin</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN Kodu
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                maxLength={4}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <button
                onClick={() => setFormData({ ...formData, pin: generateRandomPin() })}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
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
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setAddModal(false)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            İptal
          </button>
          <button
            onClick={handleSaveAdd}
            disabled={submitLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Kaydet
          </button>
        </div>
      </Modal>

      {/* Düzenleme Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Öğretmen Düzenle"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad
              </label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Soyad
              </label>
              <input
                type="text"
                value={formData.soyad}
                onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alan
            </label>
            <select
              value={formData.alan_id}
              onChange={(e) => setFormData({ ...formData, alan_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alan Seçin</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN Kodu
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                maxLength={4}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
              <button
                onClick={() => setFormData({ ...formData, pin: generateRandomPin() })}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Yeni PIN
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="aktif-edit"
              checked={formData.aktif}
              onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
              className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="aktif-edit" className="text-sm text-gray-700">
              Aktif
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setEditModal(false)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            İptal
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={submitLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Kaydet
          </button>
        </div>
      </Modal>

      {/* Silme Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Öğretmen Sil"
        description={`${selectedOgretmen?.ad} ${selectedOgretmen?.soyad} isimli öğretmeni silmek istediğinize emin misiniz?`}
        confirmText="Sil"
        confirmLoadingText="Siliniyor..."
        isLoading={submitLoading}
      />
    </div>
  )
} 