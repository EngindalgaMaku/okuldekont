import { Suspense } from 'react'
import { Users, Search, Filter, Plus, Info, Trash2, Building2, User, Mail, Phone, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Link from 'next/link'
import QuickPinButton from './QuickPinButton'
import OgretmenlerClient from './OgretmenlerClient'
import OgretmenlerTableClient from './OgretmenlerTableClient'
import OgretmenlerFilterClient from './OgretmenlerFilterClient'
import { fetchOgretmenlerOptimized } from '@/lib/optimized-queries'

interface SearchParams {
  page?: string
  search?: string
  alan?: string
  per_page?: string
}

interface Props {
  searchParams: SearchParams
}

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email?: string
  telefon?: string
  pin?: string
  alan_id?: number
  alanlar?: any
  stajlarCount?: number
  koordinatorlukCount?: number
}

interface Alan {
  id: number
  ad: string
}

async function getOgretmenlerData(searchParams: SearchParams) {
  try {
    // Use optimized function that eliminates N+1 query problem
    return await fetchOgretmenlerOptimized(searchParams)
  } catch (error) {
    console.error('Teacher data fetch error:', error)
    // Fallback to basic structure
    return {
      ogretmenler: [],
      alanlar: [],
      pagination: {
        page: parseInt(searchParams.page || '1'),
        perPage: parseInt(searchParams.per_page || '10'),
        total: 0,
        totalPages: 0
      }
    }
  }
}

export default async function OgretmenlerServer({ searchParams }: Props) {
  const { ogretmenler, alanlar, pagination } = await getOgretmenlerData(searchParams)

  const createSearchURL = (newParams: Partial<SearchParams>) => {
    const params = new URLSearchParams()
    
    // Keep existing params and override with new ones
    const current = {
      page: searchParams.page || '1',
      search: searchParams.search || '',
      alan: searchParams.alan || '',
      per_page: searchParams.per_page || '10',
      ...newParams
    }

    // Only add non-empty params
    Object.entries(current).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value)
      }
    })

    return `/admin/ogretmenler?${params.toString()}`
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
            <Users className="hidden sm:block h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            Öğretmen Yönetimi
          </h1>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 w-fit">
            <span className="text-xs sm:text-sm text-gray-600">Toplam: {pagination.total}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Search Form */}
          <form action="/admin/ogretmenler" method="GET" className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Hidden inputs to preserve other params */}
            {searchParams.alan && <input type="hidden" name="alan" value={searchParams.alan} />}
            {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search || ''}
                placeholder="Öğretmen ara..."
                className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              Ara
            </button>
          </form>

          <OgretmenlerClient />
        </div>
      </div>

      {/* Filters */}
      <OgretmenlerFilterClient
        alanlar={alanlar}
        currentAlan={searchParams.alan}
        currentSearch={searchParams.search}
        currentPerPage={searchParams.per_page}
      />

      {/* Table */}
      {ogretmenler.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Öğretmen bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchParams.search || searchParams.alan ? (
                'Arama kriterlerinize uygun öğretmen bulunamadı.'
              ) : (
                'Henüz hiç öğretmen kaydı yok.'
              )}
            </p>
            <div className="mt-6">
              <OgretmenlerClient />
            </div>
          </div>
        </div>
      ) : (
        <OgretmenlerTableClient ogretmenler={ogretmenler} />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              <span className="font-medium">{((pagination.page - 1) * pagination.perPage) + 1}</span>
              {' '}-{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.perPage, pagination.total)}
              </span>
              {' '}arasında, toplam{' '}
              <span className="font-medium">{pagination.total}</span> kayıt
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {/* First page */}
              {pagination.page > 1 && (
                <Link
                  href={createSearchURL({ page: '1' })}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="İlk sayfa"
                >
                  <ChevronsLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              )}

              {/* Previous page */}
              {pagination.page > 1 && (
                <Link
                  href={createSearchURL({ page: (pagination.page - 1).toString() })}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Önceki sayfa"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              )}

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  const isCurrentPage = pageNum === pagination.page;

                  return (
                    <Link
                      key={pageNum}
                      href={createSearchURL({ page: pageNum.toString() })}
                      className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>

              {/* Next page */}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={createSearchURL({ page: (pagination.page + 1).toString() })}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Sonraki sayfa"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              )}

              {/* Last page */}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={createSearchURL({ page: pagination.totalPages.toString() })}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Son sayfa"
                >
                  <ChevronsRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}