'use client'

import { useState, useEffect } from 'react'
import { Building2, Search, Filter, Plus, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  address?: string
  _count?: {
    students: number
  }
  teacher?: {
    name: string
    surname: string
  }
}

interface PaginationInfo {
  page: number
  perPage: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface IsletmelerServerPrismaProps {
  searchParams: SearchParams
}

export default function IsletmelerServerPrisma({ searchParams }: IsletmelerServerPrismaProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filterInput, setFilterInput] = useState('')
  
  const router = useRouter()
  
  const page = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  const filter = searchParams.filter || ''
  const perPage = parseInt(searchParams.per_page || '10')

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        filter,
        per_page: perPage.toString()
      })
      
      const response = await fetch(`/api/admin/companies?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'İşletmeler yüklenirken hata oluştu')
      }
      
      console.log('API Response:', data)
      const companiesData = data.data || []
      setCompanies(companiesData)
      setPagination(data.pagination || null)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [page, search, filter, perPage])

  useEffect(() => {
    setSearchInput(search)
    setFilterInput(filter)
  }, [search, filter])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchInput) params.set('search', searchInput)
    if (filterInput) params.set('filter', filterInput)
    params.set('page', '1')
    params.set('per_page', perPage.toString())
    
    router.push(`/admin/isletmeler?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filter) params.set('filter', filter)
    params.set('page', newPage.toString())
    params.set('per_page', perPage.toString())
    
    router.push(`/admin/isletmeler?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilterInput('')
    router.push('/admin/isletmeler')
  }

  const handleRetry = () => {
    fetchCompanies()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">İşletmeler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Veri Yükleme Hatası</h3>
            <p className="text-red-700 mb-4">{error}</p>
            {retryCount > 0 && (
              <p className="text-sm text-red-600">
                Deneme sayısı: {retryCount}
              </p>
            )}
          </div>
          <button
            onClick={handleRetry}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">İşletme Yönetimi</h1>
          <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-base">Sistemdeki tüm işletmeleri yönetin</p>
        </div>
        <Link
          href="/admin/isletmeler/yeni"
          className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-sm w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni İşletme
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-3">
          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="İşletme adı, yetkili veya telefon ile ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          
          {/* Filtre ve Butonlar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterInput}
                  onChange={(e) => setFilterInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none text-sm"
                >
                  <option value="">Tümü</option>
                  <option value="active">Aktif Stajı Olanlar</option>
                  <option value="empty">Boş İşletmeler</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={handleSearch}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Ara
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block">
        {companies.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşletme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yetkili Kişi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koordinatör
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci Sayısı
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                          <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {company.name}
                          </div>
                          {company.address && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {company.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.contact || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.teacher
                          ? `${company.teacher.name} ${company.teacher.surname}`
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {company._count?.students || 0} öğrenci
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/isletmeler/${company.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">İşletme bulunamadı</h3>
            <p className="text-gray-600 mb-6">
              {companies.length === 0 && !error && !loading
                ? "Sistemde henüz işletme kaydı bulunmuyor."
                : "Arama kriterlerinizle eşleşen işletme bulunmuyor."
              }
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View - Hidden on desktop */}
      <div className="lg:hidden">
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {company.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {company._count?.students || 0} öğrenci
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/isletmeler/${company.id}`}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  {company.contact && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Yetkili:</span>
                      <span className="ml-1 break-words">{company.contact}</span>
                    </p>
                  )}
                  {company.phone && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Tel:</span>
                      <span className="ml-1">{company.phone}</span>
                    </p>
                  )}
                  {company.teacher && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Koordinatör:</span>
                      <span className="ml-1">{company.teacher.name} {company.teacher.surname}</span>
                    </p>
                  )}
                  {company.address && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      <span className="font-medium">Adres:</span>
                      <span className="ml-1 break-words">{company.address}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-2">İşletme bulunamadı</h3>
            <p className="text-sm text-gray-600 mb-4 px-4">
              {companies.length === 0 && !error && !loading
                ? "Sistemde henüz işletme kaydı bulunmuyor."
                : "Arama kriterlerinizle eşleşen işletme bulunmuyor."
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-3 sm:space-y-0">
            {/* Mobil: Basit sayfa bilgisi */}
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              <span className="sm:hidden">
                Sayfa {pagination.page} / {pagination.totalPages} ({pagination.totalCount} kayıt)
              </span>
              <span className="hidden sm:inline">
                Toplam <span className="font-medium">{pagination.totalCount}</span> işletme,
                <span className="font-medium"> {pagination.page}</span> / <span className="font-medium">{pagination.totalPages}</span> sayfa
              </span>
            </div>
            
            {/* Sayfalama butonları */}
            <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className={`inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasPrev
                    ? 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                    : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Önceki</span>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 2) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 1) {
                    pageNum = pagination.totalPages - 2 + i;
                  } else {
                    pageNum = pagination.page - 1 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        pageNum === pagination.page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className={`inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasNext
                    ? 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                    : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="hidden sm:inline">Sonraki</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}