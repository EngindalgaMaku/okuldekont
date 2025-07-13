import { supabase } from './supabase'

// Optimized dekont fetching with proper pagination
export async function fetchDekontlarOptimized(page: number = 1, itemsPerPage: number = 20, filters: any = {}) {
  const start = (page - 1) * itemsPerPage
  const end = start + itemsPerPage - 1
  
  // Build query with minimal data selection
  let query = supabase
    .from('dekontlar')
    .select(`
      id,
      miktar,
      odeme_tarihi,
      dosya_url,
      onay_durumu,
      created_at,
      ay,
      yil,
      staj_id,
      stajlar!inner (
        id,
        baslangic_tarihi,
        bitis_tarihi,
        ogrenci_id,
        isletme_id,
        ogretmen_id
      )
    `)
    .order('created_at', { ascending: false })
    .range(start, end)

  // Apply filters at database level
  if (filters.status && filters.status !== 'all') {
    query = query.eq('onay_durumu', filters.status)
  }
  
  if (filters.alan_id) {
    query = query.eq('stajlar.ogrenciler.alan_id', filters.alan_id)
  }

  const { data, error, count } = await query

  // Fetch related data separately and efficiently
  if (data && data.length > 0) {
    // Extract staj info (handle both single object and array cases)
    const stajInfo = data.map(d => {
      const staj = Array.isArray(d.stajlar) ? d.stajlar[0] : d.stajlar
      return {
        dekont_id: d.id,
        staj_id: staj.id,
        ogrenci_id: staj.ogrenci_id,
        isletme_id: staj.isletme_id,
        ogretmen_id: staj.ogretmen_id
      }
    })
    
    // Get unique IDs for batch fetching
    const ogrenciIds = Array.from(new Set(stajInfo.map(s => s.ogrenci_id)))
    const isletmeIds = Array.from(new Set(stajInfo.map(s => s.isletme_id)))
    const ogretmenIds = Array.from(new Set(stajInfo.map(s => s.ogretmen_id)))
    
    // Fetch related data in parallel
    const [ogrencilerData, isletmelerData, ogretmenlerData] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, ad, soyad, sinif, no, alan_id, alanlar!inner(ad)')
        .in('id', ogrenciIds),
      
      supabase
        .from('isletmeler')
        .select('id, ad, yetkili_kisi')
        .in('id', isletmeIds),
        
      supabase
        .from('ogretmenler')
        .select('id, ad, soyad')
        .in('id', ogretmenIds)
    ])

    // Create lookup maps for efficient joining
    const ogrencilerMap = new Map(ogrencilerData.data?.map(o => [o.id, o]) || [])
    const isletmelerMap = new Map(isletmelerData.data?.map(i => [i.id, i]) || [])
    const ogretmenlerMap = new Map(ogretmenlerData.data?.map(og => [og.id, og]) || [])

    // Join data efficiently
    const enrichedData = data.map(dekont => {
      const staj = Array.isArray(dekont.stajlar) ? dekont.stajlar[0] : dekont.stajlar
      return {
        ...dekont,
        stajlar: {
          ...staj,
          ogrenciler: ogrencilerMap.get(staj.ogrenci_id),
          isletmeler: isletmelerMap.get(staj.isletme_id),
          ogretmenler: ogretmenlerMap.get(staj.ogretmen_id)
        }
      }
    })

    return { data: enrichedData, error, count }
  }

  return { data, error, count }
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