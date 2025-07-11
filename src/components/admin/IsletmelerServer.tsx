import { Suspense } from 'react'
import { Building, Search, Filter, Plus, Building2, User, MapPin, Phone, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square } from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import IsletmeQuickPinButton from './IsletmeQuickPinButton'
import IsletmelerClient from './IsletmelerClient'
import IsletmeRow from './IsletmeRow'

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
    <IsletmelerClient
      isletmeler={isletmeler.map(i => ({
        id: i.id,
        ad: i.ad,
        yetkili_kisi: i.yetkili_kisi,
        telefon: i.telefon,
        email: i.email
      }))}
      fullIsletmeler={isletmeler}
      searchParams={searchParams}
      pagination={pagination}
    />
  )
}