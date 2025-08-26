'use client'

import { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react'
import { Eye, Download, Check, X, Filter, Search, Calendar, Trash2, Loader, AlertTriangle, Shield, MoreVertical, ChevronDown } from 'lucide-react'

interface Dekont {
  id: string
  isletme_ad: string
  koordinator_ogretmen: string
  ogrenci_ad: string
  ogrenci_sinif: string
  ogrenci_no: string
  miktar: number | null
  odeme_tarihi: string
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi'
  ay: number
  yil: number
  dosya_url: string | null
  aciklama: string | null
  red_nedeni: string | null
  yukleyen_kisi: string
  created_at: string
}

// Güvenli tarih formatlama yardımcısı
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('tr-TR')
  } catch (error) {
    return '-'
  }
}

// Güvenli para formatlaması
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '-'
  return `₺${amount.toLocaleString('tr-TR')}`
}

// Dosya tipini kontrol eden fonksiyonlar
const isImageFile = (fileUrl: string | null): boolean => {
  if (!fileUrl) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const lowerCaseUrl = fileUrl.toLowerCase()
  return imageExtensions.some(ext => lowerCaseUrl.includes(ext))
}

const isPdfFile = (fileUrl: string | null): boolean => {
  if (!fileUrl) return false
  const lowerCaseUrl = fileUrl.toLowerCase()
  return lowerCaseUrl.includes('.pdf')
}

const isPreviewableFile = (fileUrl: string | null): boolean => {
  return isImageFile(fileUrl) || isPdfFile(fileUrl)
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const STATUS_COLORS = {
  bekliyor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  onaylandi: 'bg-green-100 text-green-800 border-green-200',
  reddedildi: 'bg-red-100 text-red-800 border-red-200'
}

const STATUS_LABELS = {
  bekliyor: 'Beklemede',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi'
}

export default function ClientDekontlarPage() {
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showApprovedDeleteWarning, setShowApprovedDeleteWarning] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedImageName, setSelectedImageName] = useState<string>('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Memoized fetch function - prevents re-creation on every render
  const fetchDekontlar = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dekontlar')
      if (response.ok) {
        const result = await response.json()
        setDekontlar(result.data || [])
      }
    } catch (error) {
      console.error('Dekont verisi alınırken hata:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoized filtered data calculation - expensive operation
  const filteredDekontlar = useMemo(() => {
    let filtered = [...dekontlar]

    // Durum filtresi
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(d => d.onay_durumu === selectedStatus)
    }

    // Ay filtresi
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(d => d.ay === parseInt(selectedMonth))
    }

    // Yıl filtresi
    if (selectedYear !== 'all') {
      filtered = filtered.filter(d => d.yil === parseInt(selectedYear))
    }

    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(d =>
        d.isletme_ad.toLowerCase().includes(term) ||
        d.ogrenci_ad.toLowerCase().includes(term) ||
        d.yukleyen_kisi.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [dekontlar, selectedStatus, selectedMonth, selectedYear, searchTerm])

  // Memoized pagination calculations - expensive computation
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredDekontlar.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentDekontlar = filteredDekontlar.slice(startIndex, endIndex)
    
    return {
      totalPages,
      startIndex,
      endIndex,
      currentDekontlar
    }
  }, [filteredDekontlar, currentPage, itemsPerPage])

  // Memoized available years calculation - expensive operation
  const availableYears = useMemo(() => {
    return Array.from(new Set(dekontlar.map(d => d.yil))).sort((a, b) => b - a)
  }, [dekontlar])

  // Memoized event handlers - prevent re-creation
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginationData.currentDekontlar.map(d => d.id))
    } else {
      setSelectedIds([])
    }
  }, [paginationData.currentDekontlar])

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])

  const handleBulkAction = useCallback(async () => {
    if (selectedIds.length === 0 || !bulkAction) return

    if (bulkAction === 'DELETE') {
      setShowBulkDeleteModal(true)
      return
    }

    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await updateDekontStatus(id, bulkAction as 'APPROVED' | 'REJECTED')
      }
      setSelectedIds([])
      setBulkAction('')
    } catch (error) {
      console.error('Toplu işlem hatası:', error)
      setWarningMessage('Toplu işlem sırasında bir hata oluştu')
      setShowWarningModal(true)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedIds, bulkAction])

  const handleBulkDelete = useCallback(async () => {
    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await deleteDekont(id)
      }
      setSelectedIds([])
      setBulkAction('')
      setShowBulkDeleteModal(false)
    } catch (error) {
      console.error('Toplu silme hatası:', error)
      setWarningMessage('Toplu silme sırasında bir hata oluştu')
      setShowWarningModal(true)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedIds])

  useEffect(() => {
    fetchDekontlar()
  }, [fetchDekontlar])

  // Reset page and selections when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [filteredDekontlar])

  // Memoized API functions to prevent re-creation
  const updateDekontStatus = useCallback(async (dekontId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const updateData = {
        status,
        ...(status === 'APPROVED' && { approvedBy: 'admin', approvedAt: new Date() }),
        ...(status === 'REJECTED' && {
          rejectedBy: 'admin',
          rejectedAt: new Date(),
          rejectReason: reason || null
        })
      }

      const response = await fetch(`/api/admin/dekontlar/${dekontId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        await fetchDekontlar() // Refresh the list
        setShowRejectModal(false)
        setShowApproveModal(false)
        setSelectedDekont(null)
        setRejectReason('')
      } else {
        console.error('Dekont güncelleme hatası')
        setWarningMessage('Dekont güncellenirken bir hata oluştu')
        setShowWarningModal(true)
      }
    } catch (error) {
      console.error('Dekont durumu güncellenirken hata:', error)
      setWarningMessage('Dekont durumu güncellenirken bir hata oluştu')
      setShowWarningModal(true)
    }
  }, [fetchDekontlar])

  const deleteDekont = useCallback(async (dekontId: string) => {
    try {
      const response = await fetch(`/api/admin/dekontlar/${dekontId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDekontlar() // Refresh the list
        setShowDeleteModal(false)
        setSelectedDekont(null)
      } else if (response.status === 403) {
        // Onaylanmış dekont silme hatası - şık modal göster
        setShowDeleteModal(false)
        setShowApprovedDeleteWarning(true)
      } else {
        console.error('Dekont silme hatası')
        setWarningMessage('Dekont silinirken bir hata oluştu')
        setShowWarningModal(true)
      }
    } catch (error) {
      console.error('Dekont silinirken hata:', error)
      setWarningMessage('Dekont silinirken bir hata oluştu')
        setShowWarningModal(true)
    }
  }, [fetchDekontlar])

  // Memoized modal handlers
  const handleApprove = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowApproveModal(true)
  }, [])

  const handleReject = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowRejectModal(true)
  }, [])

  const handleDelete = useCallback((dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowDeleteModal(true)
  }, [])

  // Memoized submit handlers
  const submitApprove = useCallback(async () => {
    if (selectedDekont) {
      await updateDekontStatus(selectedDekont.id, 'APPROVED')
    }
  }, [selectedDekont, updateDekontStatus])

  const submitReject = useCallback(async () => {
    if (selectedDekont && rejectReason.trim()) {
      await updateDekontStatus(selectedDekont.id, 'REJECTED', rejectReason)
    }
  }, [selectedDekont, rejectReason, updateDekontStatus])

  const closeModals = useCallback(() => {
    setShowRejectModal(false)
    setShowApproveModal(false)
    setShowDeleteModal(false)
    setShowBulkDeleteModal(false)
    setShowApprovedDeleteWarning(false)
    setShowImageModal(false)
    setShowWarningModal(false)
    setSelectedDekont(null)
    setSelectedImageUrl(null)
    setSelectedImageName('')
    setWarningMessage('')
    setRejectReason('')
    setOpenDropdown(null)
  }, [])

  // Resim modalını açma fonksiyonu
  const openImageModal = useCallback((fileUrl: string, filename: string) => {
    setSelectedImageUrl(fileUrl)
    setSelectedImageName(filename)
    setShowImageModal(true)
  }, [])

  // Memoized download function
  const downloadFile = useCallback(async (fileUrl: string, filename: string) => {
    try {
      // Dosya URL'inden dosya adını çıkar
      const urlParts = fileUrl.split('/')
      const actualFilename = urlParts[urlParts.length - 1]
      
      if (!actualFilename) {
        setWarningMessage('Dosya adı bulunamadı')
        setShowWarningModal(true)
        return
      }

      // Güvenli download API'sini kullan
      const response = await fetch(`/api/admin/dekontlar/download/${encodeURIComponent(actualFilename)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setWarningMessage('Dosya bulunamadı')
          setShowWarningModal(true)
        } else if (response.status === 401) {
          setWarningMessage('Bu işlem için yetkiniz yok')
          setShowWarningModal(true)
        } else {
          setWarningMessage('Dosya indirilemedi')
          setShowWarningModal(true)
        }
        return
      }

      // Blob oluştur ve indir
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
    } catch (error) {
      console.error('Download error:', error)
      setWarningMessage('Dosya indirme sırasında bir hata oluştu')
      setShowWarningModal(true)
    }
  }, [])

  // Dosya görüntüleme/indirme işlemi
  const handleFileAction = useCallback((fileUrl: string, filename: string) => {
    if (isPreviewableFile(fileUrl)) {
      openImageModal(fileUrl, filename)
    } else {
      downloadFile(fileUrl, filename)
    }
  }, [openImageModal, downloadFile])

  // Memoized filter clear handler
  const clearFilters = useCallback(() => {
    setSelectedStatus('all')
    setSelectedMonth('all')
    setSelectedYear('all')
    setSearchTerm('')
  }, [])

  // Dropdown handlers
  const toggleDropdown = useCallback((dekontId: string) => {
    setOpenDropdown(openDropdown === dekontId ? null : dekontId)
  }, [openDropdown])

  const closeDropdown = useCallback(() => {
    setOpenDropdown(null)
  }, [])

  // Extract current page data from memoized pagination
  const { totalPages, startIndex, endIndex, currentDekontlar } = paginationData

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dekont Yönetimi</h1>
        <div className="text-sm text-gray-600">
          Toplam: {filteredDekontlar.length} dekont
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="İşletme, öğrenci veya öğretmen ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="bekliyor">Beklemede</option>
            <option value="onaylandi">Onaylandı</option>
            <option value="reddedildi">Reddedildi</option>
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Aylar</option>
            {MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Yıllar</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Filtreleri Temizle
          </button>
        </div>
        
        {/* Toplu İşlemler */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 font-medium">
                {selectedIds.length} dekont seçildi:
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">İşlem Seçin</option>
                <option value="APPROVED">Toplu Onayla</option>
                <option value="DELETE">Toplu Sil</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || isProcessing}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Uygula
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={currentDekontlar.length > 0 && selectedIds.length === currentDekontlar.length}
                    onChange={handleSelectAll}
                    disabled={currentDekontlar.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğrenci / İşletme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dönem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Miktar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yükleyen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentDekontlar.map((dekont) => (
                <tr key={dekont.id} className={selectedIds.includes(dekont.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}>
                  <td className="relative px-7 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(dekont.id)}
                      onChange={() => handleSelectOne(dekont.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dekont.ogrenci_ad} {dekont.ogrenci_sinif && dekont.ogrenci_no && `(${dekont.ogrenci_sinif}-${dekont.ogrenci_no})`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dekont.isletme_ad}
                      </div>
                      <div className="text-xs text-blue-600">
                        Koordinatör: {dekont.koordinator_ogretmen}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {MONTHS[dekont.ay - 1]} {dekont.yil}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(dekont.miktar)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[dekont.onay_durumu]}`}>
                        {STATUS_LABELS[dekont.onay_durumu]}
                      </span>
                      {dekont.onay_durumu === 'reddedildi' && dekont.red_nedeni && (
                        <div className="mt-1 text-xs text-red-600 max-w-xs">
                          <strong>Gerekçe:</strong> {dekont.red_nedeni}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dekont.yukleyen_kisi}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(dekont.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      {/* İşlemler Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => toggleDropdown(dekont.id)}
                          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          title="İşlemler"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openDropdown === dekont.id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={closeDropdown}
                            ></div>
                            
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                              <div className="py-1">
                                {/* Dosya İşlemleri */}
                                {dekont.dosya_url && dekont.dosya_url.trim() !== '' ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleFileAction(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.${isImageFile(dekont.dosya_url!) ? 'jpg' : 'pdf'}`)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      {isPreviewableFile(dekont.dosya_url!) ? <Eye className="h-4 w-4 mr-3" /> : <Download className="h-4 w-4 mr-3" />}
                                      {isPreviewableFile(dekont.dosya_url!) ? (isImageFile(dekont.dosya_url!) ? 'Resmi Görüntüle' : 'PDF Önizle') : 'Dosyayı İndir'}
                                    </button>
                                    
                                    <div className="border-t border-gray-100 my-1"></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="px-4 py-2 text-sm text-gray-400">
                                      Dosya bulunamadı
                                    </div>
                                    <div className="border-t border-gray-100 my-1"></div>
                                  </>
                                )}
                                
                                {/* Onay İşlemleri */}
                                {dekont.onay_durumu === 'bekliyor' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleApprove(dekont)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                    >
                                      <Check className="h-4 w-4 mr-3" />
                                      Onayla
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleReject(dekont)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4 mr-3" />
                                      Reddet
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                  </>
                                )}
                                
                                {/* Sil */}
                                <button
                                  onClick={() => {
                                    handleDelete(dekont)
                                    closeDropdown()
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Sil
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentDekontlar.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Dekont bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {dekontlar.length === 0 ? 'Henüz hiç dekont yüklenmemiş.' : 'Arama kriterlerinize uygun dekont bulunamadı.'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View (visible on mobile only) */}
      <div className="md:hidden space-y-4">
        {/* Mobile Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length} dekont seçildi
              </span>
              <div className="flex gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="text-sm px-3 py-1 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">İşlem Seçin</option>
                  <option value="APPROVED">Toplu Onayla</option>
                  <option value="DELETE">Toplu Sil</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isProcessing}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : 'Uygula'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Select All */}
        {currentDekontlar.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={currentDekontlar.length > 0 && selectedIds.length === currentDekontlar.length}
                onChange={handleSelectAll}
              />
              <span className="ml-2 text-sm text-gray-700">Tümünü seç</span>
            </label>
          </div>
        )}

        {/* Mobile Cards */}
        {currentDekontlar.map((dekont) => (
          <div
            key={dekont.id}
            className={`bg-white rounded-lg shadow-sm border ${
              selectedIds.includes(dekont.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            }`}
          >
            {/* Card Header with Checkbox */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.includes(dekont.id)}
                    onChange={() => handleSelectOne(dekont.id)}
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {dekont.ogrenci_ad} {dekont.ogrenci_sinif && dekont.ogrenci_no && `(${dekont.ogrenci_sinif}-${dekont.ogrenci_no})`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {dekont.isletme_ad}
                    </div>
                    <div className="text-xs text-blue-600">
                      Koordinatör: {dekont.koordinator_ogretmen}
                    </div>
                  </div>
                </label>
                {/* Dropdown trigger */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown(dekont.id)}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="İşlemler"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdown === dekont.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={closeDropdown} />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                        <div className="py-1">
                          {/* Dosya İşlemleri */}
                          {dekont.dosya_url && dekont.dosya_url.trim() !== '' ? (
                            <>
                              <button
                                onClick={() => {
                                  handleFileAction(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.${isImageFile(dekont.dosya_url!) ? 'jpg' : 'pdf'}`)
                                  closeDropdown()
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {isPreviewableFile(dekont.dosya_url!) ? <Eye className="h-4 w-4 mr-3" /> : <Download className="h-4 w-4 mr-3" />}
                                {isPreviewableFile(dekont.dosya_url!) ? (isImageFile(dekont.dosya_url!) ? 'Resmi Görüntüle' : 'PDF Önizle') : 'Dosyayı İndir'}
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                            </>
                          ) : (
                            <>
                              <div className="px-4 py-2 text-sm text-gray-400">Dosya bulunamadı</div>
                              <div className="border-t border-gray-100 my-1"></div>
                            </>
                          )}

                          {/* Onay İşlemleri */}
                          {dekont.onay_durumu === 'bekliyor' && (
                            <>
                              <button
                                onClick={() => {
                                  handleApprove(dekont)
                                  closeDropdown()
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4 mr-3" />
                                Onayla
                              </button>
                              <button
                                onClick={() => {
                                  handleReject(dekont)
                                  closeDropdown()
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-3" />
                                Reddet
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                            </>
                          )}

                          {/* Sil */}
                          <button
                            onClick={() => {
                              handleDelete(dekont)
                              closeDropdown()
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Sil
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {MONTHS[dekont.ay - 1]} {dekont.yil}
                    </div>
                    <div className="text-sm text-gray-900">{formatCurrency(dekont.miktar)}</div>
                  </div>
                  <div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[dekont.onay_durumu]}`}>
                      {STATUS_LABELS[dekont.onay_durumu]}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-blue-600">
                  Koordinatör: {dekont.koordinator_ogretmen}
                </div>

                <div className="text-xs text-gray-500">Yükleyen: {dekont.yukleyen_kisi}</div>
                <div className="text-xs text-gray-500">Tarih: {formatDate(dekont.created_at)}</div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
                {dekont.dosya_url && (
                  <>
                    {isPreviewableFile(dekont.dosya_url) ? (
                      <button
                        onClick={() => openImageModal(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.${isImageFile(dekont.dosya_url!) ? 'jpg' : 'pdf'}`)}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {isImageFile(dekont.dosya_url) ? 'Resmi Görüntüle' : 'PDF Önizle'}
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadFile(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.${isImageFile(dekont.dosya_url!) ? 'jpg' : 'pdf'}`)}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Dosyayı İndir
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => handleApprove(dekont)}
                  disabled={dekont.onay_durumu !== 'bekliyor'}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-md disabled:opacity-50"
                >
                  <Check className="h-4 w-4 mr-2" /> Onayla
                </button>
                <button
                  onClick={() => handleReject(dekont)}
                  disabled={dekont.onay_durumu !== 'bekliyor'}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md disabled:opacity-50"
                >
                  <X className="h-4 w-4 mr-2" /> Reddet
                </button>
                <button
                  onClick={() => handleDelete(dekont)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Gösteriliyor <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredDekontlar.length)}</span> / <span className="font-medium">{filteredDekontlar.length}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Önceki</span>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Sonraki</span>
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedDekont && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Dekont Onayı</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedDekont.ogrenci_ad} - {formatCurrency(selectedDekont.miktar)} - {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={submitApprove}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDekont && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Dekont Reddi</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedDekont.ogrenci_ad} - {formatCurrency(selectedDekont.miktar)} - {MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red gerekçesi"
              className="w-full border border-gray-300 rounded-md p-2 h-24 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Toplu Silme</h2>
            <p className="text-sm text-gray-600 mb-4">
              Seçili {selectedIds.length} dekontu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onaylanmış Silme Uyarısı Modal */}
      {showApprovedDeleteWarning && selectedDekont && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Onaylı Dekontu Silme</h2>
            <p className="text-sm text-gray-600 mb-4">
              Bu dekont zaten onaylanmış. Silmek istediğinizden emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">{selectedImageName || 'Dosya Önizleme'}</h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[75vh]">
              {isImageFile(selectedImageUrl) ? (
                <img src={selectedImageUrl} alt={selectedImageName || 'Dosya Önizleme'} className="max-w-full h-auto mx-auto" />
              ) : (
                <iframe src={selectedImageUrl} title="PDF Önizleme" className="w-full h-[70vh]" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Uyarı</h2>
            <p className="text-sm text-gray-600 mb-4">{warningMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </Suspense>
  )
}
