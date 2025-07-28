'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Search,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer
} from 'lucide-react'
import Link from 'next/link'

interface Operation {
  id: string
  type: string
  title: string
  studentName?: string
  companyName: string
  teacherName?: string
  previousTeacherName?: string
  fieldName: string
  className?: string
  date: string
  startDate?: string
  endDate?: string
  terminationDate?: string
  terminationReason?: string
  reason?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const reportTypes = [
  {
    id: 'staj-fesih',
    title: 'Staj Fesih İşlemleri',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'staj-atama',
    title: 'Staj Atama İşlemleri',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'staj-tamamlama',
    title: 'Staj Tamamlama İşlemleri',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'koordinator-degisiklik',
    title: 'Koordinatör Değişiklik İşlemleri',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  }
]

export default function IslemlerPage() {
  const [selectedType, setSelectedType] = useState('staj-fesih')
  const [operations, setOperations] = useState<Operation[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState<string | null>(null)
  const [alanlar, setAlanlar] = useState<{id: string, name: string}[]>([])
  
  // Filtreleme state'leri
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    fieldId: '',
    studentName: '',
    companyName: ''
  })

  // Alanları yükle
  useEffect(() => {
    const fetchAlanlar = async () => {
      try {
        const response = await fetch('/api/admin/fields')
        if (response.ok) {
          const data = await response.json()
          setAlanlar(data.fields || [])
        }
      } catch (error) {
        console.error('Alanlar yüklenirken hata:', error)
      }
    }
    fetchAlanlar()
  }, [])

  // İşlemleri yükle
  const fetchOperations = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: selectedType,
        page: page.toString(),
        limit: '20'
      })
      
      // Filtreleri ekle
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.fieldId) params.append('fieldId', filters.fieldId)
      if (filters.studentName) params.append('studentName', filters.studentName)
      if (filters.companyName) params.append('companyName', filters.companyName)
      
      const response = await fetch(`/api/admin/reports/operations?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('İşlemler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOperations(1)
  }, [selectedType, filters])

  // Filtreleri temizle
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      fieldId: '',
      studentName: '',
      companyName: ''
    })
  }

  // Rapor görüntüle
  const [reportData, setReportData] = useState<any>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const viewSingleReport = async (operationId: string) => {
    setReportLoading(operationId)
    try {
      const response = await fetch(`/api/admin/reports/generate/single?type=${selectedType}&operationId=${operationId}`)
      
      if (!response.ok) {
        throw new Error('Rapor oluşturulamadı')
      }

      const data = await response.json()
      setReportData(data)
      setShowReportModal(true)
    } catch (error) {
      console.error('Rapor oluşturma hatası:', error)
      alert('Rapor oluşturulurken hata oluştu')
    } finally {
      setReportLoading(null)
    }
  }

  // Yazdır fonksiyonu
  const printReport = () => {
    window.print()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const getTypeInfo = (type: string) => {
    return reportTypes.find(t => t.id === type) || reportTypes[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">İşlem Raporları</h1>
              <p className="text-gray-600">Tek tek işlemlerin raporlarını alın</p>
            </div>
          </div>
          
          <Link 
            href="/admin/araclar/raporlar"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Link>
        </div>
      </div>

      {/* Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Türü Seçin</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === type.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${type.bgColor} rounded-lg`}>
                  <type.icon className={`w-5 h-5 ${type.color}`} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{type.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtrele</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Tarih Aralığı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              min={filters.startDate}
            />
          </div>

          {/* Alan Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline w-4 h-4 mr-1" />
              Alan
            </label>
            <select
              value={filters.fieldId}
              onChange={(e) => setFilters(prev => ({...prev, fieldId: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Tüm Alanlar</option>
              {alanlar.map(alan => (
                <option key={alan.id} value={alan.id}>{alan.name}</option>
              ))}
            </select>
          </div>

          {/* Öğrenci Arama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline w-4 h-4 mr-1" />
              Öğrenci Adı
            </label>
            <input
              type="text"
              placeholder="Öğrenci adı..."
              value={filters.studentName}
              onChange={(e) => setFilters(prev => ({...prev, studentName: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* İşletme Arama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="inline w-4 h-4 mr-1" />
              İşletme Adı
            </label>
            <input
              type="text"
              placeholder="İşletme adı..."
              value={filters.companyName}
              onChange={(e) => setFilters(prev => ({...prev, companyName: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filtre Temizleme */}
        {(filters.startDate || filters.endDate || filters.fieldId || filters.studentName || filters.companyName) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Operations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {getTypeInfo(selectedType).title} ({pagination.total} adet)
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Yükleniyor...</p>
          </div>
        ) : operations.length > 0 ? (
          <div className="space-y-4">
            {operations.map((operation) => (
              <div key={operation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{operation.title}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      {operation.studentName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{operation.studentName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{operation.companyName}</span>
                      </div>
                      
                      {operation.teacherName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Koordinatör: {operation.teacherName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(operation.date)}</span>
                      </div>
                    </div>

                    {selectedType === 'staj-fesih' && operation.terminationReason && (
                      <div className="mt-2 text-sm text-red-600">
                        <span className="font-medium">Fesih Nedeni:</span> {operation.terminationReason}
                      </div>
                    )}

                    {selectedType === 'koordinator-degisiklik' && operation.previousTeacherName && (
                      <div className="mt-2 text-sm text-blue-600">
                        <span className="font-medium">Önceki Koordinatör:</span> {operation.previousTeacherName}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => viewSingleReport(operation.id)}
                    disabled={reportLoading === operation.id}
                    className="ml-4 inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reportLoading === operation.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Görüntüle
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Bu türde işlem bulunamadı</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Toplam {pagination.total} işlemden {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchOperations(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </button>
              
              <span className="text-sm text-gray-600">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => fetchOperations(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{reportData.title}</h2>
                  <p className="text-emerald-100 mt-1">
                    Rapor Tarihi: {new Date(reportData.generatedAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-white hover:text-emerald-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Student Information */}
              {reportData.data.studentName && (
                <div className="mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Öğrenci Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Ad Soyad:</span> {reportData.data.studentName}</div>
                      {reportData.data.studentClass && (
                        <div><span className="font-medium">Sınıf:</span> {reportData.data.studentClass}</div>
                      )}
                      {reportData.data.studentNumber && (
                        <div><span className="font-medium">Okul No:</span> {reportData.data.studentNumber}</div>
                      )}
                      {reportData.data.fieldName && (
                        <div><span className="font-medium">Alan:</span> {reportData.data.fieldName}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Company Information */}
              <div className="mb-6">
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    İşletme Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">İşletme Adı:</span> {reportData.data.companyName}</div>
                    {reportData.data.companyAuthority && (
                      <div><span className="font-medium">İşletme Yetkilisi:</span> {reportData.data.companyAuthority}</div>
                    )}
                    {reportData.data.companyContact && (
                      <div><span className="font-medium">İletişim:</span> {reportData.data.companyContact}</div>
                    )}
                    {reportData.data.companyPhone && (
                      <div><span className="font-medium">Telefon:</span> {reportData.data.companyPhone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coordinator Information */}
              {reportData.data.teacherName && (
                <div className="mb-6">
                  <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                    <h3 className="font-semibold text-orange-900 mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Koordinatör Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Koordinatör:</span> {reportData.data.teacherName}</div>
                      {reportData.data.teacherField && (
                        <div><span className="font-medium">Alan:</span> {reportData.data.teacherField}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Date Information */}
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-500">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {selectedType === 'staj-fesih' ? 'Staj ve Fesih Bilgileri' :
                     selectedType === 'staj-atama' ? 'Atama Bilgileri' :
                     selectedType === 'staj-tamamlama' ? 'Tamamlama Bilgileri' : 'Değişiklik Bilgileri'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {reportData.data.startDate && (
                      <div><span className="font-medium">Başlangıç Tarihi:</span> {new Date(reportData.data.startDate).toLocaleDateString('tr-TR')}</div>
                    )}
                    {reportData.data.endDate && (
                      <div><span className="font-medium">Bitiş Tarihi:</span> {new Date(reportData.data.endDate).toLocaleDateString('tr-TR')}</div>
                    )}
                    {reportData.data.terminatedAt && (
                      <div><span className="font-medium">Fesih Tarihi:</span> {new Date(reportData.data.terminatedAt).toLocaleDateString('tr-TR')}</div>
                    )}
                    {reportData.data.assignedAt && (
                      <div><span className="font-medium">Atama/Değişiklik Tarihi:</span> {new Date(reportData.data.assignedAt).toLocaleDateString('tr-TR')}</div>
                    )}
                    {reportData.data.completedAt && (
                      <div><span className="font-medium">Tamamlanma Tarihi:</span> {new Date(reportData.data.completedAt).toLocaleDateString('tr-TR')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Termination/Change Specific Information */}
              {selectedType === 'staj-fesih' && reportData.data.terminationReason && (
                <div className="mb-6">
                  <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                    <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Fesih Bilgileri
                    </h3>
                    <div className="text-sm">
                      <div className="mb-2"><span className="font-medium">Fesih Nedeni:</span> {reportData.data.terminationReason}</div>
                      {reportData.data.terminationNotes && (
                        <div><span className="font-medium">Notlar:</span> {reportData.data.terminationNotes}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'staj-tamamlama' && reportData.data.completionNotes && (
                <div className="mb-6">
                  <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-500">
                    <h3 className="font-semibold text-emerald-900 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Tamamlanma Bilgileri
                    </h3>
                    <div className="text-sm">
                      <div><span className="font-medium">Notlar:</span> {reportData.data.completionNotes}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'koordinator-degisiklik' && (
                <div className="mb-6">
                  <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Koordinatör Değişiklik Detayları
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {reportData.data.previousTeacherName && (
                        <div><span className="font-medium">Önceki Koordinatör:</span> {reportData.data.previousTeacherName}</div>
                      )}
                      {reportData.data.previousTeacherField && (
                        <div><span className="font-medium">Önceki Koordinatör Alanı:</span> {reportData.data.previousTeacherField}</div>
                      )}
                      {reportData.data.newTeacherName && (
                        <div><span className="font-medium">Yeni Koordinatör:</span> {reportData.data.newTeacherName}</div>
                      )}
                      {reportData.data.newTeacherField && (
                        <div><span className="font-medium">Yeni Koordinatör Alanı:</span> {reportData.data.newTeacherField}</div>
                      )}
                      {reportData.data.assignedBy && (
                        <div><span className="font-medium">Değişiklik Yapan:</span> {reportData.data.assignedBy}</div>
                      )}
                      {reportData.data.reason && (
                        <div><span className="font-medium">Neden:</span> {reportData.data.reason}</div>
                      )}
                      {reportData.data.notes && (
                        <div className="md:col-span-2"><span className="font-medium">Notlar:</span> {reportData.data.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {reportData.schoolName || 'Okul Adı'}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={printReport}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Yazdır
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}