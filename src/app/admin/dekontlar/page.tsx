'use client'

import { useState, useEffect } from 'react'
import { Eye, Download, Check, X, Filter, Search, Calendar, Trash2, Loader } from 'lucide-react'

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
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([])
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
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

  useEffect(() => {
    fetchDekontlar()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [dekontlar, selectedStatus, selectedMonth, selectedYear, searchTerm])

  const fetchDekontlar = async () => {
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
  }

  const applyFilters = () => {
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

    setFilteredDekontlar(filtered)
    setCurrentPage(1) // Reset to first page when filters change
    setSelectedIds([]) // Clear selections when filters change
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentDekontlar.map(d => d.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkAction = async () => {
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
      alert('Toplu işlem sırasında bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
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
      alert('Toplu silme sırasında bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  const updateDekontStatus = async (dekontId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
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
        alert('Dekont güncellenirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Dekont durumu güncellenirken hata:', error)
      alert('Dekont durumu güncellenirken bir hata oluştu')
    }
  }

  const handleApprove = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowApproveModal(true)
  }

  const handleReject = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowRejectModal(true)
  }

  const handleDelete = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowDeleteModal(true)
  }

  const deleteDekont = async (dekontId: string) => {
    try {
      const response = await fetch(`/api/admin/dekontlar/${dekontId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDekontlar() // Refresh the list
        setShowDeleteModal(false)
        setSelectedDekont(null)
      } else {
        console.error('Dekont silme hatası')
        alert('Dekont silinirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Dekont silinirken hata:', error)
      alert('Dekont silinirken bir hata oluştu')
    }
  }

  const submitApprove = async () => {
    if (selectedDekont) {
      await updateDekontStatus(selectedDekont.id, 'APPROVED')
    }
  }

  const submitReject = async () => {
    if (selectedDekont && rejectReason.trim()) {
      await updateDekontStatus(selectedDekont.id, 'REJECTED', rejectReason)
    }
  }

  const closeModals = () => {
    setShowRejectModal(false)
    setShowApproveModal(false)
    setShowDeleteModal(false)
    setSelectedDekont(null)
    setRejectReason('')
  }

  const downloadFile = async (fileUrl: string, filename: string) => {
    try {
      // Dosya URL'inden dosya adını çıkar
      const urlParts = fileUrl.split('/')
      const actualFilename = urlParts[urlParts.length - 1]
      
      if (!actualFilename) {
        alert('Dosya adı bulunamadı')
        return
      }

      // Güvenli download API'sini kullan
      const response = await fetch(`/api/admin/dekontlar/download/${encodeURIComponent(actualFilename)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          alert('Dosya bulunamadı')
        } else if (response.status === 401) {
          alert('Bu işlem için yetkiniz yok')
        } else {
          alert('Dosya indirilemedi')
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
      alert('Dosya indirme sırasında bir hata oluştu')
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredDekontlar.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDekontlar = filteredDekontlar.slice(startIndex, endIndex)

  // Get unique years from data
  const availableYears = Array.from(new Set(dekontlar.map(d => d.yil))).sort((a, b) => b - a)

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
            onClick={() => {
              setSelectedStatus('all')
              setSelectedMonth('all')
              setSelectedYear('all')
              setSearchTerm('')
            }}
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
                    <div className="flex items-center justify-end gap-2">
                      {dekont.dosya_url && dekont.dosya_url.trim() !== '' ? (
                        <button
                          onClick={() => downloadFile(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.pdf`)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                          title="Dosyayı İndir"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Dosya yok</span>
                      )}
                      {dekont.onay_durumu === 'bekliyor' && (
                        <>
                          <button
                            onClick={() => handleApprove(dekont)}
                            className="text-green-600 hover:text-green-900 p-1 transition-colors"
                            title="Onayla"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(dekont)}
                            className="text-red-600 hover:text-red-900 p-1 transition-colors"
                            title="Reddet"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(dekont)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors"
                        title="Sil"
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

            {/* Card Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <div className="flex items-center justify-between gap-3">
                {/* Download Button - Prominent */}
                {dekont.dosya_url && dekont.dosya_url.trim() !== '' ? (
                  <button
                    onClick={() => downloadFile(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad.replace(/\s+/g, '_')}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.pdf`)}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Dosyayı İndir
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-500 text-sm rounded-lg">
                    <X className="h-4 w-4 mr-2" />
                    Dosya Bulunamadı
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
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
    </div>
  )
}