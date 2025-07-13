import { supabase } from './supabase'

// Simplified dekont fetching - start with basic working version
export async function fetchDekontlarOptimized(page: number = 1, itemsPerPage: number = 20, filters: any = {}) {
  try {
    console.log('fetchDekontlarOptimized called with:', { page, itemsPerPage, filters })
    
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage - 1
    
    // Start with a simple query to ensure it works
    let query = supabase
      .from('dekontlar')
      .select(`
        *,
        stajlar!inner (
          id,
          baslangic_tarihi,
          bitis_tarihi,
          ogrenci_id,
          isletme_id,
          ogretmen_id,
          ogrenciler (
            id,
            ad,
            soyad,
            alanlar (
              ad
            )
          ),
          isletmeler (
            id,
            ad
          ),
          ogretmenler (
            id,
            ad,
            soyad
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end)

    // Apply filters at database level
    if (filters.status && filters.status !== 'all') {
      query = query.eq('onay_durumu', filters.status)
    }

    const { data, error, count } = await query
    
    console.log('Query result:', { data: data?.length, error, count })
    
    if (error) {
      console.error('Dekont query error:', error)
      return { data: null, error, count: 0 }
    }

    return { data, error, count }
    
  } catch (error) {
    console.error('fetchDekontlarOptimized error:', error)
    return { data: null, error, count: 0 }
  }
}

// Optimized staj fetching
export async function fetchStajlarOptimized(filters: any = {}) {
  let query = supabase
    .from('stajlar')
    .select(`
      id,
      ogrenci_id,
      isletme_id,
      ogretmen_id,
      baslangic_tarihi,
      bitis_tarihi,
      durum,
      created_at
    `)
    .order('created_at', { ascending: false })

  // Apply filters at database level
  if (filters.durum) {
    query = query.eq('durum', filters.durum)
  }
  
  if (filters.ogretmen_id) {
    query = query.eq('ogretmen_id', filters.ogretmen_id)
  }

  return query
}

// Optimized teacher detail fetching
export async function fetchOgretmenDetayOptimized(ogretmenId: string) {
  try {
    // 1. Get teacher basic info
    const { data: ogretmenData, error: ogretmenError } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, email, telefon, alan_id, alanlar(ad)')
      .eq('id', ogretmenId)
      .single()

    if (ogretmenError) throw ogretmenError

    // 2. Get stajlar with minimal data first
    const { data: stajlarData, error: stajlarError } = await supabase
      .from('stajlar')
      .select('id, baslangic_tarihi, ogrenci_id, isletme_id')
      .eq('ogretmen_id', ogretmenId)

    if (stajlarError) throw stajlarError

    if (!stajlarData || stajlarData.length === 0) {
      return {
        ...ogretmenData,
        stajlar: [],
        koordinatorluk_programi: []
      }
    }

    // 3. Get related data in parallel using IN queries
    const ogrenciIds = stajlarData.map(s => s.ogrenci_id)
    const isletmeIds = stajlarData.map(s => s.isletme_id)
    const stajIds = stajlarData.map(s => s.id)

    const [ogrencilerResult, isletmelerResult, dekontlarResult] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, ad, soyad, sinif, no')
        .in('id', ogrenciIds),
      
      supabase
        .from('isletmeler')
        .select('id, ad')
        .in('id', isletmeIds),
        
      supabase
        .from('dekontlar')
        .select('id, ay, yil, onay_durumu, staj_id')
        .in('staj_id', stajIds)
    ])

    // 4. Create efficient lookup maps
    const ogrencilerMap = new Map(ogrencilerResult.data?.map(o => [o.id, o]) || [])
    const isletmelerMap = new Map(isletmelerResult.data?.map(i => [i.id, i]) || [])
    
    // Group dekontlar by staj_id
    const dekontlarByStajId = (dekontlarResult.data || []).reduce((acc, dekont) => {
      if (!acc[dekont.staj_id]) acc[dekont.staj_id] = []
      acc[dekont.staj_id].push(dekont)
      return acc
    }, {} as Record<string, any[]>)

    // 5. Combine data efficiently
    const enrichedStajlar = stajlarData.map(staj => ({
      ...staj,
      ogrenciler: ogrencilerMap.get(staj.ogrenci_id),
      isletmeler: isletmelerMap.get(staj.isletme_id),
      dekontlar: dekontlarByStajId[staj.id] || []
    }))

    return {
      ...ogretmenData,
      stajlar: enrichedStajlar,
      koordinatorluk_programi: [] // Add separately if needed
    }

  } catch (error) {
    console.error('Optimized teacher detail fetch error:', error)
    throw error
  }
}

// Optimized count queries using estimated counts for large tables
export async function getEstimatedCount(tableName: string, filters: any = {}) {
  // For large tables, use estimated counts instead of exact counts
  const { data, error } = await supabase
    .rpc('get_estimated_count', { table_name: tableName })
  
  if (error) {
    // Fallback to exact count for smaller result sets
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    return count
  }
  
  return data
}