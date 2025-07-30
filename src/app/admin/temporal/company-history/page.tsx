'use client'

import { useState, useEffect } from 'react'
import { 
  Building, 
  History, 
  Search, 
  Calendar, 
  Filter,
  RefreshCw,
  ArrowLeft,
  Eye,
  Download,
  Clock,
  User,
  Phone,
  MapPin,
  Building2,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'

interface CompanyHistoryItem {
  id: string
  company_id: string
  company_name: string
  change_type: string
  changed_field: string
  old_value: string | null
  new_value: string | null
  valid_from: string
  valid_to: string | null
  description: string | null
  changed_by: string | null
}

export default function CompanyHistoryPage() {
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState<CompanyHistoryItem[]>([])
  const [filteredData, setFilteredData] = useState<CompanyHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChangeType, setSelectedChangeType] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState({ start: '', end: '' })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const changeTypes = [
    { value: '', label: 'Tüm Değişiklikler' },
    { value: 'OTHER_UPDATE', label: 'Bilgi Güncelleme' },
    { value: 'CONTACT_INFO_UPDATE', label: 'İletişim Güncelleme' },
    { value: 'MASTER_TEACHER_UPDATE', label: 'Usta Öğretmen Değişikliği' },
    { value: 'EMPLOYEE_COUNT_UPDATE', label: 'Çalışan Sayısı Güncelleme' },
    { value: 'ADDRESS_UPDATE', label: 'Adres Güncelleme' },
    { value: 'BANK_ACCOUNT_UPDATE', label: 'Banka Bilgisi Güncelleme' },
    { value: 'ACTIVITY_FIELD_UPDATE', label: 'Faaliyet Alanı Güncelleme' }
  ]

  const fetchCompanyHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedChangeType) params.append('change_type', selectedChangeType)
      if (selectedDateRange.start) params.append('start_date', selectedDateRange.start)
      if (selectedDateRange.end) params.append('end_date', selectedDateRange.end)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/company-history?${params}`)
      if (!response.ok) throw new Error('İşletme geçmişi getirilemedi')
      
      const data = await response.json()
      setHistoryData(data.history || [])
      setFilteredData(data.history || [])
    } catch (error) {
      console.error('İşletme geçmişi çekilirken hata:', error)
      alert('İşletme geçmişi yüklenirken bir hata oluştu')
    }
    setLoading(false)
  }

  const handleSearch = () => {
    let filtered = historyData

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.old_value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.new_value?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedChangeType) {
      filtered = filtered.filter(item => item.change_type === selectedChangeType)
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const exportData = () => {
    if (filteredData.length === 0) {
      alert('Dışa aktarılacak veri bulunamadı')
      return
    }

    const csvContent = filteredData.map(item => 
      `"${item.company_name}","${item.change_type}","${item.changed_field}","${item.old_value || ''}","${item.new_value || ''}","${new Date(item.valid_from).toLocaleDateString('tr-TR')}","${item.description || ''}"`
    ).join('\n')

    const header = 'İşletme Adı,Değişiklik Tipi,Değişen Alan,Eski Değer,Yeni Değer,Tarih,Açıklama\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `isletme-gecmisi-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'OTHER_UPDATE': return 'blue'
      case 'CONTACT_INFO_UPDATE': return 'green'
      case 'MASTER_TEACHER_UPDATE': return 'purple'
      case 'EMPLOYEE_COUNT_UPDATE': return 'orange'
      case 'ADDRESS_UPDATE': return 'indigo'
      case 'BANK_ACCOUNT_UPDATE': return 'yellow'
      case 'ACTIVITY_FIELD_UPDATE': return 'teal'
      default: return 'gray'
    }
  }

  const getChangeTypeLabel = (type: string) => {
    const found = changeTypes.find(ct => ct.value === type)
    return found ? found.label : type
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  useEffect(() => {
    fetchCompanyHistory()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [searchQuery, selectedChangeType, historyData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/temporal"
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                İşletme Geçmiş Takibi
              </h1>
              <p className="text-gray-600 mt-2">İşletmelerin bilgi değişikliklerini izleyin</p>
            </div>
          </div>
          <button
            onClick={fetchCompanyHistory}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İşletme adı, açıklama..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Değişiklik Tipi</label>
              <select
                value={selectedChangeType}
                onChange={(e) => setSelectedChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {changeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Toplam <strong>{filteredData.length}</strong> değişiklik kaydı bulundu
            </div>
            
            {filteredData.length > 0 && (
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV İndir
              </button>
            )}
          </div>
        </div>

        {/* History Data */}
        {currentData.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-indigo-600" />
                Değişiklik Geçmişi
              </h3>
              <div className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {currentData.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg bg-${getChangeTypeColor(item.change_type)}-100`}>
                          <Building className={`h-5 w-5 text-${getChangeTypeColor(item.change_type)}-600`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.company_name}</h4>
                          <p className="text-sm text-gray-600">
                            {getChangeTypeLabel(item.change_type)} • {item.changed_field}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(item.valid_from).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(item.valid_from).toLocaleTimeString('tr-TR')}
                          </p>
                        </div>
                        {expandedItems.has(item.id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedItems.has(item.id) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Eski Değer:</h5>
                          <p className="text-sm text-gray-700 bg-red-50 border border-red-200 rounded p-2">
                            {item.old_value || 'Değer yok'}
                          </p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Yeni Değer:</h5>
                          <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded p-2">
                            {item.new_value || 'Değer yok'}
                          </p>
                        </div>
                      </div>

                      {item.description && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Açıklama:</h5>
                          <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded p-2">
                            {item.description}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Geçerlilik: {new Date(item.valid_from).toLocaleDateString('tr-TR')}
                            {item.valid_to && ` - ${new Date(item.valid_to).toLocaleDateString('tr-TR')}`}
                          </span>
                        </div>
                        {item.changed_by && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Değiştiren: {item.changed_by}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-700">
                  {startIndex + 1}-{Math.min(endIndex, filteredData.length)} / {filteredData.length} kayıt
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-gray-200 p-8 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Değişiklik Kaydı Bulunamadı</h3>
            <p className="text-gray-600">
              {loading ? 'Veriler yükleniyor...' : 'Seçilen kriterlere uygun değişiklik kaydı bulunamadı.'}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-start">
            <TrendingUp className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-orange-900 mb-2">İşletme Geçmiş Takibi</h4>
              <div className="text-sm text-orange-800 space-y-1">
                <p>• <strong>Bilgi Güncelleme:</strong> İşletme adı, telefon, email değişiklikleri</p>
                <p>• <strong>Usta Öğretmen:</strong> Usta öğretmen atama ve değişiklikleri</p>
                <p>• <strong>Adres Güncelleme:</strong> İşletme adres bilgisi değişiklikleri</p>
                <p>• <strong>Çalışan Sayısı:</strong> İşletmedeki çalışan sayısı güncellemeleri</p>
                <p>• <strong>Banka Bilgileri:</strong> IBAN ve banka bilgisi değişiklikleri</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}