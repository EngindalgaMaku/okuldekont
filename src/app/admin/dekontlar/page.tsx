'use client'

import { useState, useEffect } from 'react'
import { Eye, Download, Check, X, Filter, Search, Calendar } from 'lucide-react'

interface Dekont {
  id: string
  isletme_ad: string
  ogrenci_ad: string
  miktar: number | null
  odeme_tarihi: string
  onay_durumu: 'PENDING' | 'APPROVED' | 'REJECTED'
  ay: number
  yil: number
  dosya_url: string | null
  aciklama: string | null
  red_nedeni: string | null
  yukleyen_kisi: string
  created_at: string
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200', 
  REJECTED: 'bg-red-100 text-red-800 border-red-200'
}

const STATUS_LABELS = {
  PENDING: 'Beklemede',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi'
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
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [rejectReason, setRejectReason] = useState('')

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
        setSelectedDekont(null)
        setRejectReason('')
      } else {
        console.error('Dekont güncelleme hatası')
      }
    } catch (error) {
      console.error('Dekont durumu güncellenirken hata:', error)
    }
  }

  const handleApprove = async (dekont: Dekont) => {
    if (confirm(`${dekont.ogrenci_ad} öğrencisinin ${MONTHS[dekont.ay - 1]} ${dekont.yil} dekontunu onaylıyor musunuz?`)) {
      await updateDekontStatus(dekont.id, 'APPROVED')
    }
  }

  const handleReject = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setShowRejectModal(true)
  }

  const submitReject = async () => {
    if (selectedDekont && rejectReason.trim()) {
      await updateDekontStatus(selectedDekont.id, 'REJECTED', rejectReason)
    }
  }

  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = filename
    link.click()
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
            <option value="PENDING">Beklemede</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
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
      </div>

      {/* Dekont Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                <tr key={dekont.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dekont.ogrenci_ad}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dekont.isletme_ad}
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
                      {dekont.miktar ? `₺${dekont.miktar.toLocaleString('tr-TR')}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[dekont.onay_durumu]}`}>
                      {STATUS_LABELS[dekont.onay_durumu]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dekont.yukleyen_kisi}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(dekont.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {dekont.dosya_url && (
                        <button
                          onClick={() => downloadFile(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad}-${MONTHS[dekont.ay - 1]}-${dekont.yil}.pdf`)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Dosyayı İndir"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      {dekont.onay_durumu === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(dekont)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Onayla"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(dekont)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Reddet"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedDekont(null)
                    setRejectReason('')
                  }}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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