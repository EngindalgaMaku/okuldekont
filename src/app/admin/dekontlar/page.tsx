'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Eye, Download, Check, X, Filter, Search, Calendar, Trash2, Loader, Brain, FileSearch, AlertTriangle, Shield, MoreVertical, ChevronDown } from 'lucide-react'

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
  // Yeni analiz alanları
  isAnalyzed?: boolean
  reliabilityScore?: number
  analyzedAt?: string
  aiAnalysisResult?: any
  securityFlags?: any[]
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

export default function DekontlarPage() {
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
  const [showApprovedDeleteWarning, setShowApprovedDeleteWarning] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [analyzingDekont, setAnalyzingDekont] = useState<string | null>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false)
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

  // Toplu analiz fonksiyonu
  const analyzeBatch = useCallback(async () => {
    if (selectedIds.length === 0) {
      setWarningMessage('Lütfen analiz edilecek dekontları seçin')
      setShowWarningModal(true)
      return
    }

    if (selectedIds.length > 20) {
      setWarningMessage('Toplu analiz için maksimum 20 dekont seçilebilir')
      setShowWarningModal(true)
      return
    }

    try {
      setBulkAnalyzing(true)
      
      const response = await fetch('/api/admin/dekontlar/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dekontIds: selectedIds
        })
      })

      if (response.ok) {
        const result = await response.json()
        await fetchDekontlar() // Listeyi yenile
        
        const summary = result.summary
        setWarningMessage(`Toplu analiz tamamlandı!\n\nİşlenen: ${summary.successful}/${summary.totalRequested}\nOrtalama güvenirlik: ${Math.round(summary.averageReliability * 100)}%\n\nÖneriler:\n- Onayla: ${summary.recommendations.approve}\n- Reddet: ${summary.recommendations.reject}\n- Manuel İnceleme: ${summary.recommendations.manualReview}`)
        setShowWarningModal(true)
        
        setSelectedIds([])
      } else {
        const errorData = await response.json()
        setWarningMessage(`Toplu analiz hatası: ${errorData.error || 'Bilinmeyen hata'}`)
        setShowWarningModal(true)
      }
    } catch (error) {
      console.error('Toplu analiz hatası:', error)
      setWarningMessage('Toplu analiz sırasında bir hata oluştu')
      setShowWarningModal(true)
    } finally {
      setBulkAnalyzing(false)
    }
  }, [selectedIds, fetchDekontlar])

  const handleBulkAction = useCallback(async () => {
    if (selectedIds.length === 0 || !bulkAction) return

    if (bulkAction === 'DELETE') {
      setShowBulkDeleteModal(true)
      return
    }

    if (bulkAction === 'ANALYZE') {
      await analyzeBatch()
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
  }, [selectedIds, bulkAction, analyzeBatch])

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
    setShowApprovedDeleteWarning(false)
    setShowAnalysisModal(false)
    setShowImageModal(false)
    setShowWarningModal(false)
    setSelectedDekont(null)
    setSelectedAnalysis(null)
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

  // AI Analiz fonksiyonu
  const analyzeDekont = useCallback(async (dekontId: string, fileUrl?: string | null) => {
    // Resim dosyası değilse uyarı göster
    if (fileUrl && !isImageFile(fileUrl)) {
      setWarningMessage('AI Analizi sadece resim dosyaları için kullanılabilir. PDF ve diğer dosya türleri desteklenmemektedir.')
      setShowWarningModal(true)
      return
    }

    try {
      setAnalyzingDekont(dekontId)
      
      const response = await fetch(`/api/admin/dekontlar/${dekontId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        await fetchDekontlar() // Listeyi yenile
        
        // Analiz sonuçlarını göster
        setSelectedAnalysis({
          analysis: result.analysis,
          reliability: result.analysis.overallReliability,
          analyzedAt: new Date().toISOString()
        })
        setShowAnalysisModal(true)
      } else {
        const errorData = await response.json()
        setWarningMessage(`Analiz hatası: ${errorData.error || 'Bilinmeyen hata'}`)
        setShowWarningModal(true)
      }
    } catch (error) {
      console.error('Analiz hatası:', error)
      setWarningMessage('Analiz sırasında bir hata oluştu')
      setShowWarningModal(true)
    } finally {
      setAnalyzingDekont(null)
    }
  }, [fetchDekontlar])


  // Analiz sonuçlarını görüntüle
  const viewAnalysis = useCallback((dekont: Dekont) => {
    if (!dekont.aiAnalysisResult) {
      setWarningMessage('Bu dekont henüz analiz edilmemiş')
      setShowWarningModal(true)
      return
    }
    
    setSelectedAnalysis({
      dekont,
      analysis: dekont.aiAnalysisResult,
      reliability: dekont.reliabilityScore,
      analyzedAt: dekont.analyzedAt
    })
    setShowAnalysisModal(true)
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
                <option value="ANALYZE">AI Analiz</option>
                <option value="DELETE">Toplu Sil</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || isProcessing || bulkAnalyzing}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isProcessing || bulkAnalyzing) ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : bulkAction === 'ANALYZE' ? (
                  <Brain className="h-4 w-4 mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {bulkAnalyzing ? 'Analiz Ediliyor...' : 'Uygula'}
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
                      {/* Analiz Durumu Göstergesi */}
                      {dekont.isAnalyzed && dekont.reliabilityScore !== undefined && (
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            dekont.reliabilityScore > 0.7 ? 'bg-green-500' :
                            dekont.reliabilityScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600">
                            {Math.round(dekont.reliabilityScore * 100)}%
                          </span>
                        </div>
                      )}
                      
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
                                    
                                    {/* AI Analiz */}
                                    {dekont.isAnalyzed ? (
                                      <button
                                        onClick={() => {
                                          viewAnalysis(dekont)
                                          closeDropdown()
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                                      >
                                        <FileSearch className="h-4 w-4 mr-3" />
                                        Analiz Sonuçları
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          analyzeDekont(dekont.id, dekont.dosya_url)
                                          closeDropdown()
                                        }}
                                        disabled={analyzingDekont === dekont.id}
                                        className="flex items-center w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                                      >
                                        {analyzingDekont === dekont.id ? (
                                          <Loader className="h-4 w-4 mr-3 animate-spin" />
                                        ) : (
                                          <Brain className="h-4 w-4 mr-3" />
                                        )}
                                        AI Analizi Yap
                                      </button>
                                    )}
                                    
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
                  <option value="ANALYZE">AI Analiz</option>
                  <option value="DELETE">Toplu Sil</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isProcessing || bulkAnalyzing}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {(isProcessing || bulkAnalyzing) ? <Loader className="h-4 w-4 animate-spin" /> : 'Uygula'}
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
                    <div className="font-medium text-gray-900 text-base">
                      {dekont.ogrenci_ad}
                    </div>
                    {dekont.ogrenci_sinif && dekont.ogrenci_no && (
                      <div className="text-sm text-gray-600">
                        Sınıf: {dekont.ogrenci_sinif} - No: {dekont.ogrenci_no}
                      </div>
                    )}
                    <div className="text-sm text-gray-700 font-medium mt-1">
                      {dekont.isletme_ad}
                    </div>
                  </div>
                </label>
                {/* Status Badge - Prominent on Mobile */}
                <div className="flex flex-col items-end">
                  <span className={`inline-flex px-3 py-2 text-sm font-bold rounded-lg border-2 ${STATUS_COLORS[dekont.onay_durumu]}`}>
                    {STATUS_LABELS[dekont.onay_durumu]}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 space-y-3">
              {/* Period and Amount */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-600">Dönem</div>
                  <div className="font-medium text-gray-900">
                    {MONTHS[dekont.ay - 1]} {dekont.yil}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Miktar</div>
                  <div className="font-bold text-lg text-gray-900">
                    {formatCurrency(dekont.miktar)}
                  </div>
                </div>
              </div>

              {/* Coordinator and Uploader */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Koordinatör</div>
                  <div className="text-blue-600 font-medium">{dekont.koordinator_ogretmen}</div>
                </div>
                <div>
                  <div className="text-gray-600">Yükleyen</div>
                  <div className="text-gray-900">{dekont.yukleyen_kisi}</div>
                </div>
              </div>

              {/* Upload Date */}
              <div className="text-sm">
                <span className="text-gray-600">Yükleme Tarihi: </span>
                <span className="text-gray-900">{formatDate(dekont.created_at)}</span>
              </div>

              {/* Rejection Reason */}
              {dekont.onay_durumu === 'reddedildi' && dekont.red_nedeni && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-red-800 mb-1">Reddetme Gerekçesi:</div>
                  <div className="text-sm text-red-700">{dekont.red_nedeni}</div>
                </div>
              )}
            </div>

            {/* Analiz Durumu (Mobil) */}
            {dekont.isAnalyzed && dekont.reliabilityScore !== undefined && (
              <div className="px-4 py-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">AI Analiz Sonucu:</span>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      dekont.reliabilityScore > 0.7 ? 'bg-green-500' :
                      dekont.reliabilityScore > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(dekont.reliabilityScore * 100)}% Güvenilir
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Card Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <div className="flex items-center justify-between gap-3">
                {/* File Action Button - Prominent */}
                {dekont.dosya_url && dekont.dosya_url.trim() !== '' ? (
                  <button
                    onClick={() => handleFileAction(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.${isImageFile(dekont.dosya_url!) ? 'jpg' : 'pdf'}`)}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isPreviewableFile(dekont.dosya_url!) ? <Eye className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    {isPreviewableFile(dekont.dosya_url!) ? (isImageFile(dekont.dosya_url!) ? 'Resmi Görüntüle' : 'PDF Önizle') : 'Dosyayı İndir'}
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-500 text-sm rounded-lg">
                    <X className="h-4 w-4 mr-2" />
                    Dosya Bulunamadı
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* AI Analiz Butonu - Mobil */}
                  {dekont.dosya_url && dekont.dosya_url.trim() !== '' && (
                    <>
                      {dekont.isAnalyzed ? (
                        <button
                          onClick={() => viewAnalysis(dekont)}
                          className="p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          title="Analiz Sonuçlarını Görüntüle"
                        >
                          <FileSearch className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => analyzeDekont(dekont.id, dekont.dosya_url)}
                          disabled={analyzingDekont === dekont.id}
                          className="p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                          title="OCR ve AI Analizi Yap"
                        >
                          {analyzingDekont === dekont.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Brain className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                  
                  {dekont.onay_durumu === 'bekliyor' && (
                    <>
                      <button
                        onClick={() => handleApprove(dekont)}
                        className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Onayla"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(dekont)}
                        className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Reddet"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(dekont)}
                    className="p-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Empty State */}
        {currentDekontlar.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Dekont bulunamadı</h3>
            <p className="text-gray-500">
              {dekontlar.length === 0 ? 'Henüz hiç dekont yüklenmemiş.' : 'Arama kriterlerinize uygun dekont bulunamadı.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredDekontlar.length)}</span> arası, 
                toplam <span className="font-medium">{filteredDekontlar.length}</span> sonuç
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1
                  if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
                  }
                  return null
                })}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDekont && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Dekont Reddet</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{selectedDekont.ogrenci_ad}</strong> öğrencisinin <strong>{MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}</strong> dekontunu neden reddediyorsunuz?
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reddetme nedeninizi yazınız..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={submitReject}
                  disabled={!rejectReason.trim()}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reddet
                </button>
                <button
                  onClick={closeModals}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedDekont && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Dekont Onayla</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <strong>{selectedDekont.ogrenci_ad}</strong> öğrencisinin <strong>{MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}</strong> ayına ait dekontunu onaylıyor musunuz?
                  </p>
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700">
                      <div><strong>İşletme:</strong> {selectedDekont.isletme_ad}</div>
                      {selectedDekont.miktar && (
                        <div><strong>Tutar:</strong> {formatCurrency(selectedDekont.miktar)}</div>
                      )}
                      <div><strong>Yükleyen:</strong> {selectedDekont.yukleyen_kisi}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={submitApprove}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Onayla
                </button>
                <button
                  onClick={closeModals}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedDekont && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Dekont Sil</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{selectedDekont.ogrenci_ad}</strong> öğrencisinin <strong>{MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}</strong> ayına ait dekontunu kalıcı olarak silmek istediğinizden emin misiniz?
                  </p>
                  <div className="mt-4 bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-sm text-red-700">
                      <div className="flex items-center mb-2">
                        <strong>⚠️ DİKKAT:</strong>
                      </div>
                      <ul className="text-xs space-y-1">
                        <li>• Bu işlem geri alınamaz</li>
                        <li>• Dekont ve tüm veriler kalıcı olarak silinecek</li>
                        <li>• Durum: <span className="font-medium">{STATUS_LABELS[selectedDekont.onay_durumu]}</span></li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700">
                      <div><strong>İşletme:</strong> {selectedDekont.isletme_ad}</div>
                      {selectedDekont.miktar && (
                        <div><strong>Tutar:</strong> {formatCurrency(selectedDekont.miktar)}</div>
                      )}
                      <div><strong>Yükleyen:</strong> {selectedDekont.yukleyen_kisi}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={() => selectedDekont && deleteDekont(selectedDekont.id)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Evet, Sil
                </button>
                <button
                  onClick={closeModals}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Toplu Dekont Silme</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{selectedIds.length} adet dekont</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </p>
                  
                  {/* Uyarı Notu */}
                  <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start">
                      <div className="text-yellow-800">
                        <strong>⚠️ ÖNEMLİ UYARI:</strong>
                        <p className="text-sm mt-2 text-left">
                          Veri kaybı olmaması için yalnızca <strong>hatalı oluşturulan dekontları</strong> siliniz.
                          Normal dekontlar için silme yerine reddetme işlemini kullanın.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-sm text-red-700">
                      <div className="flex items-center mb-2">
                        <strong>🚨 DİKKAT:</strong>
                      </div>
                      <ul className="text-xs space-y-1 text-left">
                        <li>• Bu işlem geri alınamaz</li>
                        <li>• Tüm dekont verileri kalıcı olarak silinecek</li>
                        <li>• Dosyalar da sistemden kaldırılacak</li>
                        <li>• Yalnızca hatalı kayıtlar için kullanın</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    'Evet, Hepsini Sil'
                  )}
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onaylanmış Dekont Silme Uyarısı Modal */}
      {showApprovedDeleteWarning && selectedDekont && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Onaylanmış Dekont</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{selectedDekont.ogrenci_ad}</strong> öğrencisinin <strong>{MONTHS[selectedDekont.ay - 1]} {selectedDekont.yil}</strong> dekontunu silemezsiniz.
                  </p>
                  
                  <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-orange-800">
                        <strong>Güvenlik Koruması</strong>
                        <p className="text-sm mt-1 text-left">
                          Onaylanmış dekontlar sistem güvenliği nedeniyle silinemez. Bu dekontun silinmesi gerekiyorsa:
                        </p>
                        <ul className="text-sm mt-2 text-left space-y-1">
                          <li>• Önce dekontun onayını iptal edin</li>
                          <li>• Sonra silme işlemini gerçekleştirin</li>
                          <li>• Veya sistem yöneticisi ile iletişime geçin</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700">
                      <div><strong>İşletme:</strong> {selectedDekont.isletme_ad}</div>
                      {selectedDekont.miktar && (
                        <div><strong>Tutar:</strong> {formatCurrency(selectedDekont.miktar)}</div>
                      )}
                      <div><strong>Durum:</strong> <span className="text-green-600 font-medium">Onaylandı</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={closeModals}
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Anladım
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analiz Sonuçları Modal */}
      {showAnalysisModal && selectedAnalysis && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">AI Analiz Sonuçları</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Genel Bilgiler */}
                {selectedAnalysis.dekont && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Dekont Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Öğrenci:</span>
                        <span className="ml-2 font-medium">{selectedAnalysis.dekont.ogrenci_ad}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">İşletme:</span>
                        <span className="ml-2 font-medium">{selectedAnalysis.dekont.isletme_ad}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Dönem:</span>
                        <span className="ml-2 font-medium">{MONTHS[selectedAnalysis.dekont.ay - 1]} {selectedAnalysis.dekont.yil}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Analiz Tarihi:</span>
                        <span className="ml-2 font-medium">{selectedAnalysis.analyzedAt ? formatDate(selectedAnalysis.analyzedAt) : '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Güvenilirlik Skoru */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Genel Güvenilirlik Skoru</h4>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Güvenilirlik</span>
                        <span className="font-medium">{Math.round((selectedAnalysis.reliability || 0) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            (selectedAnalysis.reliability || 0) > 0.7 ? 'bg-green-500' :
                            (selectedAnalysis.reliability || 0) > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.round((selectedAnalysis.reliability || 0) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                      (selectedAnalysis.reliability || 0) > 0.7 ? 'bg-green-100 text-green-800' :
                      (selectedAnalysis.reliability || 0) > 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {(selectedAnalysis.reliability || 0) > 0.7 ? 'Güvenilir' :
                       (selectedAnalysis.reliability || 0) > 0.4 ? 'Dikkatli İnceleme' : 'Şüpheli'}
                    </div>
                  </div>
                </div>

                {/* OCR Sonuçları */}
                {selectedAnalysis.analysis?.ocrResult && (
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Veri Çıkarma Sonuçları</h4>
                    
                    {/* Çıkarılan Veriler */}
                    {selectedAnalysis.analysis.ocrResult.extractedData && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">Çıkarılan Veriler</h5>
                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <pre className="whitespace-pre-wrap text-gray-700">
                            {JSON.stringify(selectedAnalysis.analysis.ocrResult.extractedData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Ham Metin Verisi */}
                    {selectedAnalysis.analysis.ocrResult.text && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Ham Metin Verisi</h5>
                        <div className="bg-gray-50 rounded p-3 text-sm max-h-40 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-gray-600">
                            {selectedAnalysis.analysis.ocrResult.text}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Analiz Sonuçları */}
                {selectedAnalysis.analysis?.aiAnalysis && (
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">AI Analiz Sonuçları</h4>
                    
                    {/* Doğrulama Sonuçları */}
                    {selectedAnalysis.analysis.aiAnalysis.validation && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">Doğrulama Sonuçları</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedAnalysis.analysis.aiAnalysis.validation).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span className={`text-sm font-medium ${
                                value === true ? 'text-green-600' :
                                value === false ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {value === true ? '✓' : value === false ? '✗' : '?'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Güvenlik Uyarıları */}
                    {selectedAnalysis.analysis.aiAnalysis.securityFlags && selectedAnalysis.analysis.aiAnalysis.securityFlags.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-800 mb-2">Güvenlik Uyarıları</h5>
                        <div className="space-y-2">
                          {selectedAnalysis.analysis.aiAnalysis.securityFlags.map((flag: any, index: number) => (
                            <div key={index} className="flex items-start p-2 bg-red-50 border border-red-200 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-red-800">{flag.type}</div>
                                <div className="text-red-700">{flag.message}</div>
                                {flag.severity && (
                                  <div className="text-xs text-red-600 mt-1">Önem: {flag.severity}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Önerisi */}
                    {selectedAnalysis.analysis.aiAnalysis.recommendation && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">AI Önerisi</h5>
                        <div className={`p-3 rounded-lg border ${
                          selectedAnalysis.analysis.aiAnalysis.recommendation === 'approve' ? 'bg-green-50 border-green-200' :
                          selectedAnalysis.analysis.aiAnalysis.recommendation === 'reject' ? 'bg-red-50 border-red-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className={`font-medium ${
                            selectedAnalysis.analysis.aiAnalysis.recommendation === 'approve' ? 'text-green-800' :
                            selectedAnalysis.analysis.aiAnalysis.recommendation === 'reject' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            {selectedAnalysis.analysis.aiAnalysis.recommendation === 'approve' ? 'Onaylanabilir' :
                             selectedAnalysis.analysis.aiAnalysis.recommendation === 'reject' ? 'Reddedilmeli' :
                             'Manuel İnceleme Gerekli'}
                          </div>
                          {selectedAnalysis.analysis.aiAnalysis.reasoningSummary && (
                            <div className="text-sm mt-1 text-gray-700">
                              {selectedAnalysis.analysis.aiAnalysis.reasoningSummary}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ham Analiz Verisi (Geliştiriciler için) */}
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="font-medium text-gray-900 cursor-pointer">Ham Analiz Verisi (Geliştiriciler İçin)</summary>
                  <div className="mt-3 text-sm">
                    <pre className="whitespace-pre-wrap text-gray-600 bg-white p-3 rounded border overflow-auto max-h-64">
                      {JSON.stringify(selectedAnalysis.analysis, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isPdfFile(selectedImageUrl) ? 'PDF Önizleyici' : 'Dekont Görüntüleyici'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Download Button */}
                <button
                  onClick={() => downloadFile(selectedImageUrl, selectedImageName)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  title="İndir"
                >
                  <Download className="h-4 w-4 mr-2" />
                  İndir
                </button>
                {/* Close Button */}
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Kapat"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-4">
              <div className="flex justify-center">
                {isPdfFile(selectedImageUrl) ? (
                  <iframe
                    src={selectedImageUrl}
                    className="w-full h-[70vh] rounded-lg shadow-md border"
                    title="PDF Önizleyici"
                    onError={(e) => {
                      const target = e.target as HTMLIFrameElement;
                      target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex items-center justify-center h-64 bg-gray-100 rounded-lg border';
                      errorDiv.innerHTML = '<div class="text-center text-gray-500"><div class="mb-2">PDF yüklenemedi</div><div class="text-sm">Dosya bozuk olabilir veya tarayıcınız PDF önizlemeyi desteklemiyor olabilir</div></div>';
                      target.parentNode?.insertBefore(errorDiv, target);
                    }}
                  />
                ) : (
                  <img
                    src={selectedImageUrl}
                    alt="Dekont"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex items-center justify-center h-64 bg-gray-100 rounded-lg';
                      errorDiv.innerHTML = '<div class="text-center text-gray-500"><div class="mb-2">Resim yüklenemedi</div><div class="text-sm">Dosya bozuk olabilir veya desteklenmeyen bir format olabilir</div></div>';
                      target.parentNode?.insertBefore(errorDiv, target);
                    }}
                  />
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedImageName}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadFile(selectedImageUrl, selectedImageName)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    İndir
                  </button>
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Bilgilendirme</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {warningMessage}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={closeModals}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Anladım
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}