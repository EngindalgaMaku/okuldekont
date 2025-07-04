'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building, Plus, Loader, Phone, Mail, MapPin, User, Key, Save, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Isletme {
    id: number;
    ad: string;
    adres?: string;
    telefon?: string;
    email?: string;
    yetkili_kisi?: string;
    pin?: string;
    ogretmen_id?: number;
    ogretmenler?: {
        id: number;
        ad: string;
        soyad: string;
    };
}

interface Ogretmen {
    id: number;
    ad: string;
    soyad: string;
    aktif?: boolean;
    alan_id?: number;
}



export default function IsletmeYonetimiPage() {
  const router = useRouter()
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [filteredIsletmeler, setFilteredIsletmeler] = useState<Isletme[]>([])
  const [paginatedData, setPaginatedData] = useState<Isletme[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [formData, setFormData] = useState({
    ad: '',
    adres: '',
    telefon: '',
    email: '',
    yetkili_kisi: '',
    pin: '',
    ogretmen_id: ''
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const itemsPerPage = 8

  async function fetchIsletmeler() {
    setLoading(true)
    
    try {
      // Önce işletmeleri al
      const { data: isletmelerData, error: isletmelerError } = await supabase
        .from('isletmeler')
        .select('*')
        .order('ad', { ascending: true });
      
      if (isletmelerError) {
        console.error('İşletmeler çekilirken hata:', isletmelerError)
        alert('İşletmeler yüklenirken bir hata oluştu: ' + isletmelerError.message)
        setLoading(false)
        return
      }

      // Sonra öğretmenleri al
      const { data: ogretmenlerData, error: ogretmenlerError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad, alan_id')

      if (ogretmenlerError) {
        console.error('Öğretmenler çekilirken hata:', ogretmenlerError)
      }

      // İşletmelere koordinatör bilgilerini ekle
      const isletmelerWithKoordinator = isletmelerData?.map(isletme => {
        const koordinator = ogretmenlerData?.find(ogr => ogr.id === isletme.ogretmen_id)
        return {
          ...isletme,
          ogretmenler: koordinator || null
        }
      }) || []

      setIsletmeler(isletmelerWithKoordinator)
      setFilteredIsletmeler(isletmelerWithKoordinator)
    } catch (error) {
      console.error('Genel hata:', error)
      alert('Veriler yüklenirken bir hata oluştu.')
    }
    
    setLoading(false)
  }

  async function fetchOgretmenler() {
    try {
      const { data, error } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad, alan_id')
        .order('ad', { ascending: true });
      
      if (error) {
        console.error('Öğretmenler çekilirken hata:', error)
      } else {
        setOgretmenler(data || [])
      }
    } catch (error) {
      console.error('Öğretmenler fetch hatası:', error)
    }
  }

  useEffect(() => {
    fetchIsletmeler()
    fetchOgretmenler()
  }, [])

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = isletmeler

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(isletme =>
        isletme.ad.toLowerCase().includes(query) ||
        isletme.adres?.toLowerCase().includes(query) ||
        isletme.telefon?.includes(query) ||
        isletme.email?.toLowerCase().includes(query) ||
        isletme.yetkili_kisi?.toLowerCase().includes(query) ||
        isletme.pin?.includes(query) ||
        isletme.ogretmenler?.ad.toLowerCase().includes(query) ||
        isletme.ogretmenler?.soyad.toLowerCase().includes(query)
      )
    }

    setFilteredIsletmeler(filtered)
    setCurrentPage(1) // Reset to first page when search changes
  }, [isletmeler, searchQuery])

  // Sayfalama fonksiyonu
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredIsletmeler.slice(startIndex, endIndex)
    
    setPaginatedData(paginated)
    setTotalPages(Math.ceil(filteredIsletmeler.length / itemsPerPage))
  }, [filteredIsletmeler, currentPage, itemsPerPage])

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleAdd = () => {
    setFormData({
      ad: '',
      adres: '',
      telefon: '',
      email: '',
      yetkili_kisi: '',
      pin: generateRandomPin(),
      ogretmen_id: ''
    })
    setAddModal(true)
  }

  const handleEdit = (isletme: Isletme) => {
    setSelectedIsletme(isletme)
    setFormData({
      ad: isletme.ad,
      adres: isletme.adres || '',
      telefon: isletme.telefon || '',
      email: isletme.email || '',
      yetkili_kisi: isletme.yetkili_kisi || '',
      pin: isletme.pin || '',
      ogretmen_id: isletme.ogretmen_id?.toString() || ''
    })
    setEditModal(true)
  }

  const handleSaveAdd = async () => {
    if (!formData.ad.trim()) {
      alert('İşletme adı zorunludur.')
      return
    }
    
    if (!formData.pin.trim() || formData.pin.length !== 4) {
      alert('PIN kodu 4 haneli olmalıdır.')
      return
    }
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('isletmeler')
      .insert([{
        ad: formData.ad.trim(),
        adres: formData.adres.trim() || null,
        telefon: formData.telefon.trim() || null,
        email: formData.email.trim() || null,
        yetkili_kisi: formData.yetkili_kisi.trim() || null,
        pin: formData.pin.trim(),
        ogretmen_id: formData.ogretmen_id ? parseInt(formData.ogretmen_id) : null
      }])

    if (error) {
      alert('İşletme eklenirken bir hata oluştu: ' + error.message)
    } else {
      setAddModal(false)
      fetchIsletmeler()
    }
    setSubmitLoading(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedIsletme || !formData.ad.trim()) {
      alert('İşletme adı zorunludur.')
      return
    }
    
    if (!formData.pin.trim() || formData.pin.length !== 4) {
      alert('PIN kodu 4 haneli olmalıdır.')
      return
    }
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('isletmeler')
      .update({
        ad: formData.ad.trim(),
        adres: formData.adres.trim() || null,
        telefon: formData.telefon.trim() || null,
        email: formData.email.trim() || null,
        yetkili_kisi: formData.yetkili_kisi.trim() || null,
        pin: formData.pin.trim(),
        ogretmen_id: formData.ogretmen_id ? parseInt(formData.ogretmen_id) : null
      })
      .eq('id', selectedIsletme.id)

    if (error) {
      alert('İşletme güncellenirken bir hata oluştu: ' + error.message)
    } else {
      setEditModal(false)
      fetchIsletmeler()
    }
    setSubmitLoading(false)
  }

  const handleDelete = (isletme: Isletme) => {
    setSelectedIsletme(isletme)
    setDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedIsletme) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('isletmeler')
      .delete()
      .eq('id', selectedIsletme.id)

    if (error) {
      alert('İşletme silinirken bir hata oluştu: ' + error.message)
    } else {
      setDeleteModal(false)
      fetchIsletmeler()
    }
    setSubmitLoading(false)
  }

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

  if (loading) {
    return (
        <div className="flex justify-center items-center h-32">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              İşletme Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Staj yapacak işletmeleri yönetin ve bilgilerini güncelleyin.</p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center p-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
            title="Yeni İşletme Ekle"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          {/* Arama Bölümü */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Arama */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="İşletme adı, adres, telefon, email, yetkili veya koordinatör ara..."
                  className="pl-10 pr-10 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/70"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {filteredIsletmeler.length} işletme gösteriliyor
                </span>
                {searchQuery && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                      Arama: "{searchQuery}"
                    </span>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Temizle
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {filteredIsletmeler.length > 0 ? (
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  Toplam <span className="font-medium text-gray-900">{filteredIsletmeler.length}</span> kayıttan{' '}
                  <span className="font-medium text-gray-900">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredIsletmeler.length)}
                  </span> arası gösteriliyor
                </div>
                <div>
                  Sayfa {currentPage} / {totalPages}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isletmeler.length === 0 ? 'Henüz işletme eklenmemiş' : 'Arama kriterlerinize uygun işletme bulunamadı'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isletmeler.length === 0
                  ? 'İlk işletmenizi eklemek için yukarıdaki "Yeni İşletme Ekle" butonunu kullanın.'
                  : 'Farklı arama terimleri deneyin.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Aramayı Temizle
                </button>
              )}
            </div>
          )}
          
          {filteredIsletmeler.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        İşletme
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        İletişim
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Detay
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/60 divide-y divide-gray-200">
                    {paginatedData.map((isletme) => (
                      <tr key={isletme.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <Building className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                {isletme.ad}
                              </div>
                              {isletme.adres && (
                                <div className="text-xs text-gray-500 truncate max-w-[200px]" title={isletme.adres}>
                                  📍 {isletme.adres}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {isletme.telefon && (
                              <div className="text-xs text-gray-600 flex items-center">
                                📞 {isletme.telefon}
                              </div>
                            )}
                            {isletme.email && (
                              <div className="text-xs text-gray-600 flex items-center truncate max-w-[150px]" title={isletme.email}>
                                ✉️ {isletme.email}
                              </div>
                            )}
                            {isletme.yetkili_kisi && (
                              <div className="text-xs text-gray-500">
                                👤 {isletme.yetkili_kisi}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button 
                              onClick={() => router.push(`/admin/isletmeler/${isletme.id}`)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="İşletme Detayı"
                            >
                              <Building className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Enhanced Pagination */}
              {filteredIsletmeler.length > 0 && totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Toplam <span className="font-medium text-gray-900">{filteredIsletmeler.length}</span> kayıttan{' '}
                      <span className="font-medium text-gray-900">
                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredIsletmeler.length)}
                      </span> arası gösteriliyor
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* First Page */}
                      <button
                        onClick={handleFirstPage}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="İlk sayfa"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      
                      {/* Previous Page */}
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Önceki sayfa"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex space-x-1">
                        {(() => {
                          const startPage = Math.max(1, currentPage - 2)
                          const endPage = Math.min(totalPages, currentPage + 2)
                          const pages = []

                          // İlk sayfa ve ellipsis
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => handlePageChange(1)}
                                className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                              >
                                1
                              </button>
                            )
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis-start" className="inline-flex items-center justify-center w-10 h-10 text-sm text-gray-500">
                                  ...
                                </span>
                              )
                            }
                          }

                          // Orta sayfalar
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => handlePageChange(i)}
                                className={`inline-flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  i === currentPage
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </button>
                            )
                          }

                          // Son sayfa ve ellipsis
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis-end" className="inline-flex items-center justify-center w-10 h-10 text-sm text-gray-500">
                                  ...
                                </span>
                              )
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => handlePageChange(totalPages)}
                                className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                              >
                                {totalPages}
                              </button>
                            )
                          }

                          return pages
                        })()}
                      </div>
                      
                      {/* Next Page */}
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Sonraki sayfa"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {/* Last Page */}
                      <button
                        onClick={handleLastPage}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Son sayfa"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Yeni İşletme Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme Adı *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData(prev => ({ ...prev, ad: e.target.value }))}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="İşletme adını giriniz"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adres
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                rows={3}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="İşletme adresini giriniz"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="0212 123 45 67"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="ornek@isletme.com"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinatör Öğretmen
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.ogretmen_id}
                onChange={(e) => setFormData(prev => ({ ...prev, ogretmen_id: e.target.value }))}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              >
                <option value="">Koordinatör seçin (opsiyonel)</option>
                {ogretmenler.map(ogretmen => (
                  <option key={ogretmen.id} value={ogretmen.id}>
                    {ogretmen.ad} {ogretmen.soyad}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">Bu işletmenin koordinatörlüğünü yapacak öğretmen</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yetkili Kişi
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.yetkili_kisi}
                  onChange={(e) => setFormData(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Yetkili kişinin adı soyadı"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Kodu *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setFormData(prev => ({ ...prev, pin: value }))
                  }}
                  className="pl-10 pr-20 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-mono"
                  placeholder="0000"
                  maxLength={4}
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, pin: generateRandomPin() }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Yeni
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">4 haneli sayı (giriş için gerekli)</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
              disabled={submitLoading}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveAdd}
              disabled={submitLoading || !formData.ad.trim() || !formData.pin.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="İşletmeyi Düzenle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme Adı *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData(prev => ({ ...prev, ad: e.target.value }))}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="İşletme adını giriniz"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adres
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                rows={3}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="İşletme adresini giriniz"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="0212 123 45 67"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="ornek@isletme.com"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinatör Öğretmen
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.ogretmen_id}
                onChange={(e) => setFormData(prev => ({ ...prev, ogretmen_id: e.target.value }))}
                className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              >
                <option value="">Koordinatör seçin (opsiyonel)</option>
                {ogretmenler.map(ogretmen => (
                  <option key={ogretmen.id} value={ogretmen.id}>
                    {ogretmen.ad} {ogretmen.soyad}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">Bu işletmenin koordinatörlüğünü yapacak öğretmen</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yetkili Kişi
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.yetkili_kisi}
                  onChange={(e) => setFormData(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Yetkili kişinin adı soyadı"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Kodu * 
                <span className="text-indigo-600 font-normal">(Giriş için gerekli)</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setFormData(prev => ({ ...prev, pin: value }))
                  }}
                  className="pl-10 pr-20 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-mono"
                  placeholder="0000"
                  maxLength={4}
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, pin: generateRandomPin() }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Yeni
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">PIN değiştirilirse işletmeye bilgi verilmeli</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
              disabled={submitLoading}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={submitLoading || !formData.ad.trim() || !formData.pin.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {submitLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="İşletmeyi Sil"
        description={`"${selectedIsletme?.ad}" işletmesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm ilgili veriler de silinecektir.`}
        confirmText="Sil"
        isLoading={submitLoading}
      />
    </div>
  )
} 