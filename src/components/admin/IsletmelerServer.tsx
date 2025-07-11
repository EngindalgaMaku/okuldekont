import { Suspense } from 'react'
import { Building, Search, Filter, Plus, Building2, User, MapPin, Phone, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import IsletmeQuickPinButton from './IsletmeQuickPinButton'

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface Props {
  searchParams: SearchParams
}

interface Isletme {
  id: string
  ad: string
  adres?: string
  telefon?: string
  email?: string
  yetkili_kisi?: string
  pin?: string
  ogretmen_id?: string
  ogretmenler?: {
    id: string
    ad: string
    soyad: string
    alanlar?: {
      ad: string
    } | {
      ad: string
    }[]
  } | null
  aktifOgrenciler?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
  }[]
}

async function getIsletmelerData(searchParams: SearchParams) {
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
  const filterType = searchParams.filter || 'aktif'

  // Calculate offset
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build base query for işletmeler
  let query = supabase
    .from('isletmeler')
    .select(`
      id,
      ad,
      adres,
      telefon,
      email,
      yetkili_kisi,
      pin,
      ogretmen_id,
      ogretmenler (
        id,
        ad,
        soyad,
        alanlar (ad)
      )
    `, { count: 'exact' })

  // Get all işletmeler first (we'll filter aktif ones after getting student data)
  const { data: allIsletmeler, error: isletmelerError, count } = await query
    .order('ad', { ascending: true })

  if (isletmelerError) {
    throw new Error('İşletmeler yüklenirken bir hata oluştu: ' + isletmelerError.message)
  }

  // Get active students for each işletme
  const { data: aktifStajlarData } = await supabase
    .from('stajlar')
    .select(`
      isletme_id,
      ogrenciler!inner (
        id,
        ad,
        soyad,
        no,
        sinif
      )
    `)
    .eq('durum', 'aktif')
    .is('fesih_tarihi', null)

  // Add active students to işletmeler
  const isletmelerWithDetails = (allIsletmeler || []).map(isletme => {
    const aktifOgrenciler = aktifStajlarData?.filter(staj => staj.isletme_id === isletme.id)
      .map(staj => Array.isArray(staj.ogrenciler) ? staj.ogrenciler[0] : staj.ogrenciler)
      .filter(Boolean) || []
    
    // Handle ogretmenler and alanlar arrays
    const ogretmen = Array.isArray(isletme.ogretmenler) ? isletme.ogretmenler[0] : isletme.ogretmenler
    if (ogretmen && ogretmen.alanlar) {
      const alanlar = Array.isArray(ogretmen.alanlar) ? ogretmen.alanlar[0] : ogretmen.alanlar
      ;(ogretmen as any).alanlar = alanlar
    }
    
    return {
      ...isletme,
      ogretmenler: ogretmen,
      aktifOgrenciler
    }
  })

  // Apply aktif filter
  let filteredIsletmeler = isletmelerWithDetails
  if (filterType === 'aktif') {
    filteredIsletmeler = isletmelerWithDetails.filter(isletme =>
      isletme.aktifOgrenciler && isletme.aktifOgrenciler.length > 0
    )
  }

  // Apply search filter
  if (search) {
    const query = search.toLowerCase().trim()
    filteredIsletmeler = filteredIsletmeler.filter(isletme => {
      // Basic isletme fields search
      const basicSearch =
        isletme.ad.toLowerCase().includes(query) ||
        isletme.adres?.toLowerCase().includes(query) ||
        isletme.telefon?.includes(query) ||
        isletme.email?.toLowerCase().includes(query) ||
        isletme.yetkili_kisi?.toLowerCase().includes(query) ||
        isletme.pin?.includes(query)

      // Ogretmen search - handle both array and object cases
      const ogretmenSearch = isletme.ogretmenler && (
        (Array.isArray(isletme.ogretmenler)
          ? isletme.ogretmenler.some(ogr =>
              ogr.ad.toLowerCase().includes(query) ||
              ogr.soyad.toLowerCase().includes(query)
            )
          : (isletme.ogretmenler as any).ad?.toLowerCase().includes(query) ||
            (isletme.ogretmenler as any).soyad?.toLowerCase().includes(query)
        )
      )

      // Active students search
      const ogrenciSearch = isletme.aktifOgrenciler?.some(ogrenci =>
        ogrenci.ad.toLowerCase().includes(query) ||
        ogrenci.soyad.toLowerCase().includes(query) ||
        ogrenci.no.includes(query)
      )

      return basicSearch || ogretmenSearch || ogrenciSearch
    })
  }

  // Apply pagination
  const totalFiltered = filteredIsletmeler.length
  const paginatedIsletmeler = filteredIsletmeler.slice(from, from + perPage)

  return {
    isletmeler: paginatedIsletmeler,
    pagination: {
      page,
      perPage,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / perPage)
    }
  }
}

export default async function IsletmelerServer({ searchParams }: Props) {
  const { isletmeler, pagination } = await getIsletmelerData(searchParams)

  const createSearchURL = (newParams: Partial<SearchParams>) => {
    const params = new URLSearchParams()
    
    // Keep existing params and override with new ones
    const current = {
      page: searchParams.page || '1',
      search: searchParams.search || '',
      filter: searchParams.filter || 'aktif',
      per_page: searchParams.per_page || '10',
      ...newParams
    }

    // Only add non-empty params
    Object.entries(current).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'aktif') {
        params.set(key, value)
      }
    })

    return `/admin/isletmeler?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-[95%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              İşletme Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Staj yapacak işletmeleri yönetin ve bilgilerini güncelleyin.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/admin/isletmeler/yeni"
              className="inline-flex items-center p-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              title="Yeni İşletme Ekle"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          {/* Search and Filters */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search Form */}
              <form action="/admin/isletmeler" method="GET" className="flex items-center gap-2 flex-1 max-w-md">
                {/* Hidden inputs to preserve other params */}
                {searchParams.filter && <input type="hidden" name="filter" value={searchParams.filter} />}
                {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
                
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchParams.search || ''}
                    placeholder="İşletme adı, yetkili, telefon, koordinatör veya aktif öğrenci ara..."
                    className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/70"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Ara
                </button>
              </form>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {pagination.total} işletme gösteriliyor
                </span>
                
                {/* Filter Form */}
                <form action="/admin/isletmeler" method="GET" className="flex items-center gap-2">
                  {/* Preserve other params */}
                  {searchParams.search && <input type="hidden" name="search" value={searchParams.search} />}
                  {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
                  
                  <select
                    name="filter"
                    defaultValue={searchParams.filter || 'aktif'}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="aktif">Aktif İşletmeler</option>
                    <option value="tum">Tüm İşletmeler</option>
                  </select>
                </form>

                {/* Active filters display */}
                {searchParams.search && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                      Arama: "{searchParams.search}"
                    </span>
                    <Link
                      href={createSearchURL({ search: undefined })}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Temizle
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {isletmeler.length > 0 ? (
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  Toplam <span className="font-medium text-gray-900">{pagination.total}</span> kayıttan{' '}
                  <span className="font-medium text-gray-900">
                    {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)}
                  </span> arası gösteriliyor
                </div>
                <div>
                  Sayfa {pagination.page} / {pagination.totalPages}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {!searchParams.search && !searchParams.filter ? 'Henüz işletme eklenmemiş' : 'Arama kriterlerinize uygun işletme bulunamadı'}
              </h3>
              <p className="text-gray-500 mb-4">
                {!searchParams.search && !searchParams.filter
                  ? 'İlk işletmenizi eklemek için yukarıdaki "Yeni İşletme Ekle" butonunu kullanın.'
                  : 'Farklı arama terimleri deneyin.'
                }
              </p>
              {searchParams.search && (
                <Link
                  href={createSearchURL({ search: undefined })}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Aramayı Temizle
                </Link>
              )}
            </div>
          )}
          
          {isletmeler.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        İşletme
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Koordinatör
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Aktif Öğrenciler
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                        PIN
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Detay
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/60 divide-y divide-gray-200">
                    {isletmeler.map((isletme) => (
                      <tr key={isletme.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <Building className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer truncate max-w-[200px]">
                                <Link href={`/admin/isletmeler/${isletme.id}`}>
                                  {isletme.ad}
                                </Link>
                              </div>
                              <div className="space-y-1 mt-1">
                                {isletme.yetkili_kisi && (
                                  <div className="text-xs text-gray-500">
                                    👤 {isletme.yetkili_kisi}
                                  </div>
                                )}
                                {isletme.telefon && (
                                  <div className="text-xs text-gray-600">
                                    📞 {isletme.telefon}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            {isletme.ogretmenler ? (
                              <div>
                                <div className="text-sm text-gray-900">
                                  {isletme.ogretmenler.ad} {isletme.ogretmenler.soyad}
                                </div>
                                {isletme.ogretmenler.alanlar && (
                                  <div className="text-xs text-gray-500">
                                    {(isletme.ogretmenler.alanlar as any).ad}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                Atanmamış
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            {isletme.aktifOgrenciler && isletme.aktifOgrenciler.length > 0 ? (
                              <div className="space-y-1">
                                {isletme.aktifOgrenciler.slice(0, 3).map((ogrenci, index) => (
                                  <div key={index} className="text-xs text-gray-700">
                                    {ogrenci.ad} {ogrenci.soyad} ({ogrenci.no})
                                    <div className="text-xs text-gray-500">{ogrenci.sinif}</div>
                                  </div>
                                ))}
                                {isletme.aktifOgrenciler.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{isletme.aktifOgrenciler.length - 3} diğer
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">
                                Aktif öğrenci yok
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-mono font-medium text-gray-900">
                              {isletme.pin || '-'}
                            </span>
                            {/* Hızlı PIN atama butonu */}
                            <IsletmeQuickPinButton
                              isletme={{
                                id: isletme.id,
                                ad: isletme.ad
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <Link
                              href={`/admin/isletmeler/${isletme.id}`}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="İşletme Detayı"
                            >
                              <Building className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Toplam <span className="font-medium text-gray-900">{pagination.total}</span> kayıttan{' '}
                      <span className="font-medium text-gray-900">
                        {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)}
                      </span> arası gösteriliyor
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* First Page */}
                      {pagination.page > 1 && (
                        <Link
                          href={createSearchURL({ page: '1' })}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="İlk sayfa"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {/* Previous Page */}
                      {pagination.page > 1 && (
                        <Link
                          href={createSearchURL({ page: (pagination.page - 1).toString() })}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Önceki sayfa"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {/* Page Numbers */}
                      <div className="flex space-x-1">
                        {(() => {
                          const startPage = Math.max(1, pagination.page - 2)
                          const endPage = Math.min(pagination.totalPages, pagination.page + 2)
                          const pages = []

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <Link
                                key={i}
                                href={createSearchURL({ page: i.toString() })}
                                className={`inline-flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  i === pagination.page
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </Link>
                            )
                          }

                          return pages
                        })()}
                      </div>
                      
                      {/* Next Page */}
                      {pagination.page < pagination.totalPages && (
                        <Link
                          href={createSearchURL({ page: (pagination.page + 1).toString() })}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Sonraki sayfa"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {/* Last Page */}
                      {pagination.page < pagination.totalPages && (
                        <Link
                          href={createSearchURL({ page: pagination.totalPages.toString() })}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Son sayfa"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}