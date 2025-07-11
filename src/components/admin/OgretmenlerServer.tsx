import { Suspense } from 'react'
import { Users, Search, Filter, Plus, Info, Trash2, Building2, User, Mail, Phone, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import QuickPinButton from './QuickPinButton'

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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore cookie setting errors in server components
          }
        },
      },
    }
  )

  const page = parseInt(searchParams.page || '1')
  const perPage = parseInt(searchParams.per_page || '10')
  const search = searchParams.search || ''
  const alanFilter = searchParams.alan || ''

  // Calculate offset
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build query
  let query = supabase
    .from('ogretmenler')
    .select(`
      id,
      ad,
      soyad,
      email,
      telefon,
      pin,
      alan_id,
      alanlar (
        id,
        ad
      )
    `, { count: 'exact' })

  // Add search filter
  if (search) {
    query = query.or(`ad.ilike.%${search}%,soyad.ilike.%${search}%,email.ilike.%${search}%,telefon.ilike.%${search}%`)
  }

  // Add alan filter
  if (alanFilter && alanFilter !== 'all') {
    query = query.eq('alan_id', parseInt(alanFilter))
  }

  // Add pagination and ordering
  query = query
    .order('ad', { ascending: true })
    .range(from, to)

  const { data: ogretmenler, error, count } = await query

  if (error) {
    throw new Error('Öğretmenler yüklenirken bir hata oluştu: ' + error.message)
  }

  // Get additional statistics for each teacher (matching detail page logic)
  const ogretmenlerWithStats = await Promise.all(
    (ogretmenler || []).map(async (ogretmen) => {
      // Get stajlar with their isletmeler and baslangic_tarihi (same as detail page)
      const { data: stajlarData } = await supabase
        .from('stajlar')
        .select(`
          id,
          isletme_id,
          baslangic_tarihi,
          isletmeler ( id )
        `)
        .eq('ogretmen_id', ogretmen.id)

      // Calculate unique companies (same logic as detail page)
      const isletmeIdleri = new Set<string>()
      if (stajlarData) {
        stajlarData.forEach(staj => {
          if (staj.isletmeler) {
            const isletmeId = Array.isArray(staj.isletmeler)
              ? staj.isletmeler[0]?.id
              : (staj.isletmeler as any).id
            if (isletmeId) isletmeIdleri.add(isletmeId)
          }
        })
      }

      return {
        ...ogretmen,
        stajlarCount: stajlarData?.length || 0,
        koordinatorlukCount: isletmeIdleri.size
      }
    })
  )

  // Get all alanlar for filter dropdown
  const { data: alanlar } = await supabase
    .from('alanlar')
    .select('id, ad')
    .order('ad', { ascending: true })

  return {
    ogretmenler: ogretmenlerWithStats,
    alanlar: alanlar || [],
    pagination: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Öğretmen Yönetimi
          </h1>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <span className="text-sm text-gray-600">Toplam: {pagination.total}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Form */}
          <form action="/admin/ogretmenler" method="GET" className="flex items-center gap-2">
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
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ara
            </button>
          </form>

          <Link
            href="/admin/ogretmenler/yeni"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Öğretmen
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtreler:</span>
          </div>

          {/* Alan Filter */}
          <form action="/admin/ogretmenler" method="GET" className="flex items-center gap-2">
            {/* Preserve other params */}
            {searchParams.search && <input type="hidden" name="search" value={searchParams.search} />}
            {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
            
            <select
              name="alan"
              defaultValue={searchParams.alan || 'all'}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Alanlar</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </form>

          {/* Active filters display */}
          <div className="flex items-center gap-2">
            {searchParams.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                Arama: "{searchParams.search}"
                <Link
                  href={createSearchURL({ search: undefined })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </Link>
              </span>
            )}
            {searchParams.alan && searchParams.alan !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                Alan: {alanlar.find(a => a.id.toString() === searchParams.alan)?.ad}
                <Link
                  href={createSearchURL({ alan: undefined })}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </Link>
              </span>
            )}
          </div>

          {/* Clear all filters */}
          {(searchParams.search || (searchParams.alan && searchParams.alan !== 'all')) && (
            <Link
              href="/admin/ogretmenler"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Tüm filtreleri temizle
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
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
                  PIN
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İstatistikler
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ogretmenler.map((ogretmen) => (
                <tr key={ogretmen.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <Link
                            href={`/admin/ogretmenler/${ogretmen.id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {ogretmen.ad} {ogretmen.soyad}
                          </Link>
                        </div>
                        {/* İletişim bilgileri öğretmen isminin altında */}
                        <div className="space-y-1 mt-1">
                          {ogretmen.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {ogretmen.email}
                            </div>
                          )}
                          {ogretmen.telefon && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {ogretmen.telefon}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ogretmen.alanlar ? (
                      <div className="text-sm text-gray-900">
                        {Array.isArray(ogretmen.alanlar)
                          ? ogretmen.alanlar[0]?.ad || 'Bilinmiyor'
                          : (ogretmen.alanlar as any)?.ad || 'Bilinmiyor'
                        }
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Atanmamış</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-sm font-mono font-medium text-gray-900">
                        {ogretmen.pin || '-'}
                      </div>
                      {/* Hızlı PIN atama butonu */}
                      <QuickPinButton
                        ogretmen={{
                          id: ogretmen.id,
                          ad: ogretmen.ad,
                          soyad: ogretmen.soyad
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-center space-y-1">
                      <div className="text-xs text-gray-600">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {ogretmen.koordinatorlukCount} işletme
                      </div>
                      <div className="text-xs text-gray-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {ogretmen.stajlarCount} öğrenci
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/admin/ogretmenler/${ogretmen.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Detayları Görüntüle"
                      >
                        <Info className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ogretmenler.length === 0 && (
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
              <Link
                href="/admin/ogretmenler/yeni"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                İlk Öğretmeni Ekle
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{((pagination.page - 1) * pagination.perPage) + 1}</span>
              {' '}-{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.perPage, pagination.total)}
              </span>
              {' '}arasında, toplam{' '}
              <span className="font-medium">{pagination.total}</span> kayıt
            </div>

            <div className="flex items-center gap-2">
              {/* First page */}
              {pagination.page > 1 && (
                <Link
                  href={createSearchURL({ page: '1' })}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="İlk sayfa"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Link>
              )}

              {/* Previous page */}
              {pagination.page > 1 && (
                <Link
                  href={createSearchURL({ page: (pagination.page - 1).toString() })}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Önceki sayfa"
                >
                  <ChevronLeft className="w-4 h-4" />
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
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
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
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Sonraki sayfa"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}

              {/* Last page */}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={createSearchURL({ page: pagination.totalPages.toString() })}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Son sayfa"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}