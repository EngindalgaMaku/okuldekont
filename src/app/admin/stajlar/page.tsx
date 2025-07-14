'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Building2, Users, FileText, Plus, Search, Filter, Download, Upload, Trash2, Eye, UserCheck, UserX, Calendar, GraduationCap, User, AlertTriangle, ChevronDown, X, MoreVertical, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import OgretmenBazliYonetim, { OgretmenStajData } from '@/components/ui/OgretmenBazliYonetim'

interface Staj {
  id: string
  ogrenci_id: string
  isletme_id: string
  ogretmen_id: string
  baslangic_tarihi: string
  bitis_tarihi: string | null
  durum: 'aktif' | 'tamamlandi' | 'feshedildi'
  created_at: string
  sozlesme_url?: string
  fesih_nedeni?: string
  fesih_belgesi_url?: string
  ogrenciler?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
    alanlar?: {
      ad: string
    } | null
  } | null
  isletmeler?: {
    id: string
    ad: string
    yetkili_kisi: string
  } | null
  ogretmenler?: {
    id: string
    ad: string
    soyad: string
  } | null
  koordinator_ogretmen?: {
    id: string
    ad: string
    soyad: string
  } | null
}

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanlar?: {
    ad: string
  } | null
}

interface Isletme {
  id: string
  ad: string
  yetkili_kisi: string
}

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  alan_id?: string
  alanlar?: {
    ad: string
  } | null
}

interface Alan {
  id: string
  ad: string
}

// Utility function to ensure unique data
const getUniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

export default function StajYonetimiPage() {
  const [stajlar, setStajlar] = useState<Staj[]>([])
  const [bostOgrenciler, setBostOgrenciler] = useState<Ogrenci[]>([])
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [ogretmenBazliData, setOgretmenBazliData] = useState<OgretmenStajData[]>([])
  const [filteredOgretmenBazliData, setFilteredOgretmenBazliData] = useState<OgretmenStajData[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'aktif' | 'bost' | 'tamamlandi' | 'suresi-gecmis' | 'ogretmen'>('aktif')
  
  // Modal states
  const [newStajModalOpen, setNewStajModalOpen] = useState(false)
  const [fesihModalOpen, setFesihModalOpen] = useState(false)
  const [silmeModalOpen, setSilmeModalOpen] = useState(false)
  const [koordinatorModalOpen, setKoordinatorModalOpen] = useState(false)
  const [tarihDuzenleModalOpen, setTarihDuzenleModalOpen] = useState(false)
  const [selectedStaj, setSelectedStaj] = useState<Staj | null>(null)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [belgeModalOpen, setBelgeModalOpen] = useState(false)
  const [belgeType, setBelgeType] = useState<'sozlesme' | 'fesih'>('sozlesme')
  
  // Form states
  const [newStajForm, setNewStajForm] = useState({
    alan_id: '',
    ogrenci_id: '',
    isletme_id: '',
    ogretmen_id: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    sozlesme_dosya: null as File | null
  })
  
  const [tarihDuzenleForm, setTarihDuzenleForm] = useState({
    baslangic_tarihi: '',
    bitis_tarihi: ''
  })
  
  const [fesihForm, setFesihForm] = useState({
    fesih_tarihi: '',
    fesih_nedeni: '',
    fesih_belgesi: null as File | null
  })
  
  const [koordinatorForm, setKoordinatorForm] = useState({
    ogretmen_id: '',
    baslangic_tarihi: '',
    notlar: ''
  })
  
  const [koordinatorAtaLoading, setKoordinatorAtaLoading] = useState(false)
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterIsletme, setFilterIsletme] = useState('')
  const [filterOgretmen, setFilterOgretmen] = useState('')
  const [filterAlan, setFilterAlan] = useState('')
  const [filterSinif, setFilterSinif] = useState('')
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
  
  // Pagination states
  const [currentPageStajlar, setCurrentPageStajlar] = useState(1)
  const [currentPageBost, setCurrentPageBost] = useState(1)
  const itemsPerPage = 10
  
  // Lazy loading states
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  const { showToast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  // Intersection Observer setup for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-item-id')
            if (itemId) {
              setVisibleItems(prev => new Set(Array.from(prev).concat(itemId)))
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Lazy loading ref callback
  const setItemRef = useCallback((element: HTMLDivElement | null, itemId: string) => {
    if (element && observerRef.current) {
      element.setAttribute('data-item-id', itemId)
      observerRef.current.observe(element)
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Stajları basit şekilde getir
      const { data: stajData, error: stajError } = await supabase
        .from('stajlar')
        .select(`
          *,
          ogrenciler (
            id, ad, soyad, no, sinif,
            alanlar (ad)
          ),
          isletmeler (
            id, ad, yetkili_kisi
          )
        `)
        .order('created_at', { ascending: false })
      
      if (stajError) throw stajError

      // Öğretmen bilgilerini ayrı getir
      const { data: ogretmenData, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')

      if (ogretmenError) throw ogretmenError

      // Stajlar ile öğretmen bilgilerini manuel birleştir
      const stajlarWithDetails = stajData?.map(staj => {
        const stajOgretmeni = ogretmenData?.find(og => og.id === staj.ogretmen_id)
        
        return {
          ...staj,
          ogretmenler: stajOgretmeni || null,
          koordinator_ogretmen: stajOgretmeni || null
        }
      }) || []

      setStajlar(stajlarWithDetails)
      
      // Boşta olan öğrencileri getir
      const { data: tumOgrenciler, error: ogrenciError } = await supabase
        .from('ogrenciler')
        .select(`
          id, ad, soyad, no, sinif,
          alanlar (ad)
        `)
      
      if (ogrenciError) throw ogrenciError
      
      // Aktif stajı olan öğrenci ID'lerini bul
      const aktifStajliOgrenciler = stajData?.filter(s => s.durum === 'aktif').map(s => s.ogrenci_id) || []
      
      // Boşta olan öğrencileri filtrele ve format düzelt
      const bostalar = tumOgrenciler?.filter(o => !aktifStajliOgrenciler.includes(o.id)).map(o => ({
        ...o,
        alanlar: Array.isArray(o.alanlar) ? o.alanlar[0] : o.alanlar
      })) || []
      setBostOgrenciler(bostalar)
      
      // İşletmeleri getir
      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, yetkili_kisi')
        .order('ad')
      
      if (isletmeError) throw isletmeError
      setIsletmeler(getUniqueById(isletmeData || []))
      
      // Öğretmenleri getir
      const { data: ogretmenListData, error: ogretmenListError } = await supabase
        .from('ogretmenler')
        .select(`
          id, ad, soyad, alan_id,
          alanlar (ad)
        `)
        .order('ad')
      
      if (ogretmenListError) throw ogretmenListError
      
      const formattedOgretmenler = ogretmenListData?.map(ogretmen => ({
        ...ogretmen,
        alanlar: Array.isArray(ogretmen.alanlar) ? ogretmen.alanlar[0] : ogretmen.alanlar
      })) || []
      
      setOgretmenler(getUniqueById(formattedOgretmenler))
      
      // Alanları getir
      const { data: alanData, error: alanError } = await supabase
        .from('alanlar')
        .select('id, ad')
        .order('ad')
      
      if (alanError) throw alanError
      
      setAlanlar(getUniqueById(alanData || []))
      
      // Öğretmen bazlı veri yapısını oluştur
      const ogretmenStajMap: Record<string, OgretmenStajData> = {}
      ogretmenListData?.forEach(ogretmen => {
        ogretmenStajMap[ogretmen.id] = {
          id: ogretmen.id,
          ad: ogretmen.ad,
          soyad: ogretmen.soyad,
          stajlar: []
        }
      })

      stajlarWithDetails.forEach(staj => {
        if (staj.ogretmen_id && ogretmenStajMap[staj.ogretmen_id]) {
          ogretmenStajMap[staj.ogretmen_id].stajlar.push(staj)
        }
      })

      setOgretmenBazliData(Object.values(ogretmenStajMap))

    } catch (error) {
      console.error('Veri yükleme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Veriler yüklenirken bir hata oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewStaj = async () => {
    try {
      if (!newStajForm.alan_id || !newStajForm.ogrenci_id || !newStajForm.isletme_id || !newStajForm.ogretmen_id || !newStajForm.baslangic_tarihi) {
        showToast({
          type: 'error',
          title: 'Eksik Bilgi',
          message: 'Lütfen tüm gerekli alanları doldurun'
        })
        return
      }

      // Öğrencinin zaten aktif stajı var mı kontrol et
      const aktifStaj = stajlar.find(staj =>
        staj.ogrenci_id === newStajForm.ogrenci_id && staj.durum === 'aktif'
      )

      if (aktifStaj) {
        showToast({
          type: 'error',
          title: 'Aktif Staj Mevcut',
          message: 'Bu öğrenci zaten aktif bir staja sahip'
        })
        return
      }

      let sozlesme_url = null

      // Sözleşme dosyası varsa yükle
      if (newStajForm.sozlesme_dosya) {
        const file = newStajForm.sozlesme_dosya
        const fileName = `sozlesme_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const filePath = `sozlesmeler/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('belgeler')
          .getPublicUrl(filePath)

        sozlesme_url = urlData.publicUrl
      }

      // Staj kaydını oluştur
      const { error: insertError } = await supabase
        .from('stajlar')
        .insert({
          ogrenci_id: newStajForm.ogrenci_id,
          isletme_id: newStajForm.isletme_id,
          ogretmen_id: newStajForm.ogretmen_id,
          baslangic_tarihi: newStajForm.baslangic_tarihi,
          bitis_tarihi: newStajForm.bitis_tarihi || null,
          durum: 'aktif',
          sozlesme_url
        })

      if (insertError) throw insertError

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Yeni staj kaydı oluşturuldu'
      })

      setNewStajModalOpen(false)
      setNewStajForm({
        alan_id: '',
        ogrenci_id: '',
        isletme_id: '',
        ogretmen_id: '',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        sozlesme_dosya: null
      })
      fetchData()

    } catch (error) {
      console.error('Staj oluşturma hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj kaydı oluşturulurken bir hata oluştu'
      })
    }
  }

  const handleTamamlandiOlarakKaydet = async (stajId: string) => {
    try {
      const { error } = await supabase
        .from('stajlar')
        .update({
          durum: 'tamamlandi',
          bitis_tarihi: new Date().toISOString().split('T')[0]
        })
        .eq('id', stajId)

      if (error) throw error

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj tamamlandı olarak kaydedildi'
      })

      fetchData()
    } catch (error) {
      console.error('Staj tamamlama hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj tamamlanırken bir hata oluştu'
      })
    }
  }

  const handleTarihDuzenle = async () => {
    if (!selectedStaj || !tarihDuzenleForm.baslangic_tarihi) return

    try {
      const { error } = await supabase
        .from('stajlar')
        .update({
          baslangic_tarihi: tarihDuzenleForm.baslangic_tarihi,
          bitis_tarihi: tarihDuzenleForm.bitis_tarihi || null
        })
        .eq('id', selectedStaj.id)

      if (error) throw error

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj tarihleri güncellendi'
      })

      setTarihDuzenleModalOpen(false)
      setSelectedStaj(null)
      fetchData()
    } catch (error) {
      console.error('Tarih düzenleme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Tarihi güncellerken bir hata oluştu'
      })
    }
  }

  const handleFeshet = async () => {
    if (!selectedStaj || !fesihForm.fesih_tarihi || !fesihForm.fesih_nedeni) return

    try {
      let fesih_belgesi_url = null

      if (fesihForm.fesih_belgesi) {
        const file = fesihForm.fesih_belgesi
        const fileName = `fesih_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const filePath = `fesih_belgeleri/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('belgeler')
          .getPublicUrl(filePath)

        fesih_belgesi_url = urlData.publicUrl
      }

      const { error } = await supabase
        .from('stajlar')
        .update({
          durum: 'feshedildi',
          bitis_tarihi: fesihForm.fesih_tarihi,
          fesih_nedeni: fesihForm.fesih_nedeni,
          fesih_belgesi_url
        })
        .eq('id', selectedStaj.id)

      if (error) throw error

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj feshedildi'
      })

      setFesihModalOpen(false)
      setSelectedStaj(null)
      fetchData()
    } catch (error) {
      console.error('Fesih hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj feshedilirken bir hata oluştu'
      })
    }
  }

  const handleSilme = async () => {
    if (!selectedStaj) return

    try {
      const { error } = await supabase
        .from('stajlar')
        .delete()
        .eq('id', selectedStaj.id)

      if (error) throw error

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj kaydı silindi'
      })

      setSilmeModalOpen(false)
      setSelectedStaj(null)
      fetchData()
    } catch (error) {
      console.error('Silme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj kaydı silinirken bir hata oluştu'
      })
    }
  }

  // Memoized filtreleme mantığı - performans optimizasyonu
  const filteredStajlar = useMemo(() => {
    return stajlar.filter(staj => {
      const today = new Date().toISOString().split('T')[0]
      const isExpired = staj.durum === 'aktif' && staj.bitis_tarihi && staj.bitis_tarihi < today
      const isActive = staj.durum === 'aktif' && (!staj.bitis_tarihi || staj.bitis_tarihi >= today)
      
      // Tab bazlı filtreleme
      if (activeTab === 'aktif' && !isActive) return false
      if (activeTab === 'suresi-gecmis' && !isExpired) return false
      if (activeTab === 'tamamlandi' && staj.durum === 'aktif') return false
      
      const searchMatch = searchTerm === '' ||
        staj.ogrenciler?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staj.ogrenciler?.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staj.isletmeler?.ad?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const isletmeMatch = filterIsletme === '' || staj.isletme_id === filterIsletme
      const ogretmenMatch = filterOgretmen === '' || staj.ogretmen_id === filterOgretmen
      
      const alanMatch = filterAlan === '' ||
        (staj.ogrenciler?.alanlar?.ad &&
         alanlar.find(alan => alan.id === filterAlan)?.ad === staj.ogrenciler.alanlar.ad)
      
      const sinifMatch = filterSinif === '' || staj.ogrenciler?.sinif === filterSinif
      
      return searchMatch && isletmeMatch && ogretmenMatch && alanMatch && sinifMatch
    })
  }, [stajlar, activeTab, searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif, alanlar])

  const filteredBostOgrenciler = useMemo(() => {
    return bostOgrenciler.filter(ogrenci => {
      const searchMatch = searchTerm === '' ||
        ogrenci.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ogrenci.soyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ogrenci.sinif.toLowerCase().includes(searchTerm.toLowerCase())
      
      const alanMatch = filterAlan === '' ||
        (ogrenci.alanlar?.ad &&
         alanlar.find(alan => alan.id === filterAlan)?.ad === ogrenci.alanlar.ad)
      
      const sinifMatch = filterSinif === '' || ogrenci.sinif === filterSinif
      
      return searchMatch && alanMatch && sinifMatch
    })
  }, [bostOgrenciler, searchTerm, filterAlan, filterSinif, alanlar])


  // Sayfa değişikliklerinde filtreleri sıfırla ve lazy loading reset
  useEffect(() => {
    setCurrentPageStajlar(1)
    setVisibleItems(new Set()) // Reset lazy loading when filters change
  }, [searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif, activeTab])

  useEffect(() => {
    setCurrentPageBost(1)
    setVisibleItems(new Set()) // Reset lazy loading when filters change
  }, [searchTerm, filterAlan, filterSinif, activeTab])

  // Öğretmen bazlı veri için filtreleme
  useEffect(() => {
    let filtered = ogretmenBazliData

    if (searchTerm) {
      filtered = filtered.filter(ogretmen =>
        `${ogretmen.ad} ${ogretmen.soyad}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterAlan) {
      const alanOgretmenIds = ogretmenler
        .filter(o => o.alan_id === filterAlan)
        .map(o => o.id)
      filtered = filtered.filter(ogretmen => alanOgretmenIds.includes(ogretmen.id))
    }

    setFilteredOgretmenBazliData(filtered)
  }, [ogretmenBazliData, searchTerm, filterAlan, ogretmenler])

  // Memoized pagination hesaplamaları
  const paginationData = useMemo(() => {
    const totalStajlar = filteredStajlar.length
    const totalBostOgrenciler = filteredBostOgrenciler.length
    const totalPagesStajlar = Math.ceil(totalStajlar / itemsPerPage)
    const totalPagesBost = Math.ceil(totalBostOgrenciler / itemsPerPage)

    // Sayfalanmış veriler
    const startIndexStajlar = (currentPageStajlar - 1) * itemsPerPage
    const endIndexStajlar = startIndexStajlar + itemsPerPage
    const paginatedStajlar = filteredStajlar.slice(startIndexStajlar, endIndexStajlar)

    const startIndexBost = (currentPageBost - 1) * itemsPerPage
    const endIndexBost = startIndexBost + itemsPerPage
    const paginatedBostOgrenciler = filteredBostOgrenciler.slice(startIndexBost, endIndexBost)

    return {
      totalStajlar,
      totalBostOgrenciler,
      totalPagesStajlar,
      totalPagesBost,
      startIndexStajlar,
      endIndexStajlar,
      paginatedStajlar,
      startIndexBost,
      endIndexBost,
      paginatedBostOgrenciler
    }
  }, [filteredStajlar, filteredBostOgrenciler, currentPageStajlar, currentPageBost, itemsPerPage])

  // Memoized modal için alan bazlı öğrenci filtreleme
  const modalOgrenciler = useMemo(() => {
    return newStajForm.alan_id === ''
      ? bostOgrenciler
      : bostOgrenciler.filter(ogrenci =>
          ogrenci.alanlar?.ad &&
          alanlar.find(alan => alan.id === newStajForm.alan_id)?.ad === ogrenci.alanlar.ad
        )
  }, [newStajForm.alan_id, bostOgrenciler, alanlar])

  // Memoized modal için alan bazlı öğretmen filtreleme
  const modalOgretmenler = useMemo(() => {
    return newStajForm.alan_id === ''
      ? ogretmenler
      : ogretmenler.filter(ogretmen =>
          ogretmen.alanlar?.ad &&
          alanlar.find(alan => alan.id === newStajForm.alan_id)?.ad === ogretmen.alanlar.ad
        )
  }, [newStajForm.alan_id, ogretmenler, alanlar])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Koordinatörlük Yönetimi</h1>
            <p className="text-indigo-100">Öğrenci staj süreçlerini koordine edin</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setNewStajModalOpen(true)}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Staj Kaydı</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const aktifStajlar = stajlar.filter(s =>
                s.durum === 'aktif' && (!s.bitis_tarihi || s.bitis_tarihi >= today)
              )
              const suresiGecmisStajlar = stajlar.filter(s =>
                s.durum === 'aktif' && s.bitis_tarihi && s.bitis_tarihi < today
              )
              const tamamlananStajlar = stajlar.filter(s => s.durum === 'tamamlandi' || s.durum === 'feshedildi')
              
              return [
                { id: 'aktif', label: 'Aktif Stajlar', count: aktifStajlar.length },
                { id: 'suresi-gecmis', label: 'Süresi Geçmiş', count: suresiGecmisStajlar.length },
                { id: 'bost', label: 'Boşta Olan Öğrenciler', count: bostOgrenciler.length },
                { id: 'tamamlandi', label: 'Tamamlanan/Feshedilen', count: tamamlananStajlar.length },
                { id: 'ogretmen', label: 'Öğretmen Bazlı', count: ogretmenler.length }
              ]
            })().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-4">
            {/* Arama */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'bost' ? 'Öğrenci ara...' :
                    activeTab === 'ogretmen' ? 'Öğretmen ara...' :
                    'Öğrenci veya işletme ara...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {/* Filtreler */}
            {activeTab !== 'ogretmen' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Alan Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alan
                  </label>
                  <select
                    value={filterAlan}
                    onChange={(e) => setFilterAlan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tüm Alanlar</option>
                    {getUniqueById(alanlar).map((alan) => (
                      <option key={alan.id} value={alan.id}>
                        {alan.ad}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sınıf Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sınıf
                  </label>
                  <select
                    value={filterSinif}
                    onChange={(e) => setFilterSinif(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tüm Sınıflar</option>
                    {Array.from(new Set(
                      (activeTab === 'bost' ? bostOgrenciler : stajlar.map(s => s.ogrenciler).filter(Boolean))
                        .map(o => o!.sinif)
                        .filter(Boolean)
                    )).sort().map((sinif) => (
                      <option key={sinif} value={sinif}>
                        {sinif}
                      </option>
                    ))}
                  </select>
                </div>

                {/* İşletme Filtresi - Sadece stajlar için */}
                {activeTab !== 'bost' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İşletme
                    </label>
                    <select
                      value={filterIsletme}
                      onChange={(e) => setFilterIsletme(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tüm İşletmeler</option>
                      {getUniqueById(isletmeler).map((isletme) => (
                        <option key={isletme.id} value={isletme.id}>
                          {isletme.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Öğretmen Filtresi - Sadece stajlar için */}
                {activeTab !== 'bost' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Koordinatör
                    </label>
                    <select
                      value={filterOgretmen}
                      onChange={(e) => setFilterOgretmen(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tüm Koordinatörler</option>
                      {getUniqueById(ogretmenler).map((ogretmen) => (
                        <option key={ogretmen.id} value={ogretmen.id}>
                          {ogretmen.ad} {ogretmen.soyad}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Öğretmen sekmesi için alan filtresi */}
            {activeTab === 'ogretmen' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alan
                  </label>
                  <select
                    value={filterAlan}
                    onChange={(e) => setFilterAlan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tüm Alanlar</option>
                    {getUniqueById(alanlar).map((alan) => (
                      <option key={alan.id} value={alan.id}>
                        {alan.ad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Aktif filtreleri temizle */}
            {(searchTerm || filterAlan || filterSinif || filterIsletme || filterOgretmen) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Aktif filtreler:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Arama: {searchTerm}
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterAlan && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Alan: {alanlar.find(a => a.id === filterAlan)?.ad}
                      <button
                        onClick={() => setFilterAlan('')}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterSinif && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Sınıf: {filterSinif}
                      <button
                        onClick={() => setFilterSinif('')}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterIsletme && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      İşletme: {isletmeler.find(i => i.id === filterIsletme)?.ad}
                      <button
                        onClick={() => setFilterIsletme('')}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterOgretmen && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Koordinatör: {ogretmenler.find(o => o.id === filterOgretmen)?.ad} {ogretmenler.find(o => o.id === filterOgretmen)?.soyad}
                      <button
                        onClick={() => setFilterOgretmen('')}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterAlan('')
                    setFilterSinif('')
                    setFilterIsletme('')
                    setFilterOgretmen('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Tüm Filtreleri Temizle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'ogretmen' ? (
            <OgretmenBazliYonetim data={filteredOgretmenBazliData} />
          ) : activeTab === 'bost' ? (
            // Boşta olan öğrenciler
            <div className="space-y-4">
              {filteredBostOgrenciler.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Boşta öğrenci yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Tüm öğrencilerin aktif stajları bulunuyor.</p>
                </div>
              ) : (
                paginationData.paginatedBostOgrenciler.map((ogrenci) => (
                  <div
                    key={ogrenci.id}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <User className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {ogrenci.sinif} - No: {ogrenci.no}
                            </span>
                            <span>{ogrenci.alanlar?.ad || 'Alan belirtilmemiş'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const ogrenciAlani = ogrenci.alanlar?.ad ?
                              alanlar.find(alan => alan.ad === ogrenci.alanlar?.ad)?.id || '' : ''
                            
                            setNewStajForm({
                              ...newStajForm,
                              alan_id: ogrenciAlani,
                              ogrenci_id: ogrenci.id,
                              ogretmen_id: ''
                            })
                            setNewStajModalOpen(true)
                          }}
                          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>İşletme Girişi Yap</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Staj listesi
            <div className="space-y-4">
              {filteredStajlar.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Staj bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'aktif' ? 'Henüz aktif staj bulunmuyor.' : 'Tamamlanan veya feshedilen staj bulunmuyor.'}
                  </p>
                </div>
              ) : (
                paginationData.paginatedStajlar.map((staj) => {
                  const today = new Date().toISOString().split('T')[0]
                  const isExpired = staj.durum === 'aktif' && staj.bitis_tarihi && staj.bitis_tarihi < today
                  const isVisible = visibleItems.has(staj.id)
                  
                  return (
                    <div
                      key={staj.id}
                      ref={(el) => setItemRef(el, staj.id)}
                      className={`border rounded-lg p-6 ${
                        isExpired ? 'bg-orange-50 border-orange-200' :
                        staj.durum === 'aktif' ? 'bg-green-50 border-green-200' :
                        staj.durum === 'feshedildi' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {isVisible ? (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                              staj.durum === 'aktif' ? 'bg-green-100' :
                              staj.durum === 'feshedildi' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <Users className={`h-6 w-6 ${
                                staj.durum === 'aktif' ? 'text-green-600' :
                                staj.durum === 'feshedildi' ? 'text-red-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {staj.ogrenciler?.ad || 'Bilinmiyor'} {staj.ogrenciler?.soyad || ''}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isExpired ? 'bg-orange-100 text-orange-800' :
                                  staj.durum === 'aktif' ? 'bg-green-100 text-green-800' :
                                  staj.durum === 'feshedildi' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isExpired ? 'Süresi Geçmiş' :
                                   staj.durum === 'aktif' ? 'Aktif' :
                                   staj.durum === 'feshedildi' ? 'Feshedildi' :
                                   'Tamamlandı'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <GraduationCap className="h-4 w-4 mr-1" />
                                  {staj.ogrenciler?.sinif || 'Bilinmiyor'} - No: {staj.ogrenciler?.no || 'Bilinmiyor'}
                                </span>
                                <span>{staj.ogrenciler?.alanlar?.ad || 'Alan belirtilmemiş'}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Building2 className="h-4 w-4 mr-1" />
                                  {staj.isletmeler?.ad || 'İşletme bilgisi yok'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  <span className="font-medium">Koordinatör:</span>
                                  {staj.ogretmenler ?
                                    `${staj.ogretmenler.ad} ${staj.ogretmenler.soyad}` :
                                    <span className="text-orange-600 font-medium">Atanmamış</span>
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')} - {staj.bitis_tarihi ? new Date(staj.bitis_tarihi).toLocaleDateString('tr-TR') : 'Devam ediyor'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            {/* Expired internships - Show complete button */}
                            {isExpired && (
                              <button
                                onClick={() => handleTamamlandiOlarakKaydet(staj.id)}
                                className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Tamamlandı Olarak Kaydet</span>
                              </button>
                            )}
                            
                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdowns(prev => ({ ...prev, [staj.id]: !prev[staj.id] }))}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              
                              {openDropdowns[staj.id] && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        setSelectedStaj(staj)
                                        setTarihDuzenleForm({
                                          baslangic_tarihi: staj.baslangic_tarihi,
                                          bitis_tarihi: staj.bitis_tarihi || ''
                                        })
                                        setTarihDuzenleModalOpen(true)
                                        setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Tarih Düzenle
                                    </button>
                                    
                                    {staj.durum === 'aktif' && (
                                      <button
                                        onClick={() => {
                                          setSelectedStaj(staj)
                                          setFesihForm({
                                            fesih_tarihi: new Date().toISOString().split('T')[0],
                                            fesih_nedeni: '',
                                            fesih_belgesi: null
                                          })
                                          setFesihModalOpen(true)
                                          setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Feshet
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => {
                                        setSelectedStaj(staj)
                                        setBelgeType('sozlesme')
                                        setBelgeModalOpen(true)
                                        setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Belgeleri Görüntüle
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setSelectedStaj(staj)
                                        setSilmeModalOpen(true)
                                        setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Sil
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
          
          {/* Pagination */}
          {activeTab === 'bost' ? (
            // Boşta olan öğrenciler için sayfalama
            paginationData.totalPagesBost > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPageBost(Math.max(1, currentPageBost - 1))}
                    disabled={currentPageBost === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPageBost(Math.min(paginationData.totalPagesBost, currentPageBost + 1))}
                    disabled={currentPageBost === paginationData.totalPagesBost}
                    className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Toplam <span className="font-medium">{paginationData.totalBostOgrenciler}</span> öğrenciden{' '}
                      <span className="font-medium">{paginationData.startIndexBost + 1}</span> ile{' '}
                      <span className="font-medium">{Math.min(paginationData.endIndexBost, paginationData.totalBostOgrenciler)}</span> arası gösteriliyor
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPageBost(Math.max(1, currentPageBost - 1))}
                        disabled={currentPageBost === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {(() => {
                        const totalPages = paginationData.totalPagesBost
                        const current = currentPageBost
                        const pages = []
                        
                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i)
                          }
                        } else {
                          // Smart pagination with ellipsis
                          if (current <= 4) {
                            // Show first 5 pages, then ellipsis, then last page
                            for (let i = 1; i <= 5; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          } else if (current >= totalPages - 3) {
                            // Show first page, ellipsis, then last 5 pages
                            pages.push(1)
                            pages.push('...')
                            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                          } else {
                            // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
                            pages.push(1)
                            pages.push('...')
                            for (let i = current - 1; i <= current + 1; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          }
                        }
                        
                        return pages.map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          ) : (
                            <button
                              key={`page-${page}`}
                              onClick={() => setCurrentPageBost(page as number)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === current
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ))
                      })()}
                      <button
                        onClick={() => setCurrentPageBost(Math.min(paginationData.totalPagesBost, currentPageBost + 1))}
                        disabled={currentPageBost === paginationData.totalPagesBost}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Stajlar için sayfalama
            paginationData.totalPagesStajlar > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPageStajlar(Math.max(1, currentPageStajlar - 1))}
                    disabled={currentPageStajlar === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setCurrentPageStajlar(Math.min(paginationData.totalPagesStajlar, currentPageStajlar + 1))}
                    disabled={currentPageStajlar === paginationData.totalPagesStajlar}
                    className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Toplam <span className="font-medium">{paginationData.totalStajlar}</span> stajdan{' '}
                      <span className="font-medium">{paginationData.startIndexStajlar + 1}</span> ile{' '}
                      <span className="font-medium">{Math.min(paginationData.endIndexStajlar, paginationData.totalStajlar)}</span> arası gösteriliyor
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPageStajlar(Math.max(1, currentPageStajlar - 1))}
                        disabled={currentPageStajlar === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {(() => {
                        const totalPages = paginationData.totalPagesStajlar
                        const current = currentPageStajlar
                        const pages = []
                        
                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i)
                          }
                        } else {
                          // Smart pagination with ellipsis
                          if (current <= 4) {
                            // Show first 5 pages, then ellipsis, then last page
                            for (let i = 1; i <= 5; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          } else if (current >= totalPages - 3) {
                            // Show first page, ellipsis, then last 5 pages
                            pages.push(1)
                            pages.push('...')
                            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                          } else {
                            // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
                            pages.push(1)
                            pages.push('...')
                            for (let i = current - 1; i <= current + 1; i++) pages.push(i)
                            pages.push('...')
                            pages.push(totalPages)
                          }
                        }
                        
                        return pages.map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          ) : (
                            <button
                              key={`page-${page}`}
                              onClick={() => setCurrentPageStajlar(page as number)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === current
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ))
                      })()}
                      <button
                        onClick={() => setCurrentPageStajlar(Math.min(paginationData.totalPagesStajlar, currentPageStajlar + 1))}
                        disabled={currentPageStajlar === paginationData.totalPagesStajlar}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Yeni Staj Modal */}
      <Modal isOpen={newStajModalOpen} onClose={() => setNewStajModalOpen(false)} title="Yeni Staj Kaydı">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alan <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.alan_id}
              onChange={(e) => setNewStajForm({
                ...newStajForm,
                alan_id: e.target.value,
                ogrenci_id: '',
                ogretmen_id: ''
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Alan Seçin</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.ogrenci_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, ogrenci_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={newStajForm.alan_id === ''}
            >
              <option value="">
                {newStajForm.alan_id === '' ? 'Önce alan seçin' : 'Öğrenci Seçin'}
              </option>
              {modalOgrenciler.map((ogrenci) => (
                <option key={ogrenci.id} value={ogrenci.id}>
                  {ogrenci.ad} {ogrenci.soyad} - {ogrenci.sinif} (No: {ogrenci.no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.isletme_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, isletme_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">İşletme Seçin</option>
              {isletmeler.map((isletme) => (
                <option key={isletme.id} value={isletme.id}>
                  {isletme.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinatör Öğretmen <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.ogretmen_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, ogretmen_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={newStajForm.alan_id === ''}
            >
              <option value="">
                {newStajForm.alan_id === '' ? 'Önce alan seçin' : 'Koordinatör Seçin'}
              </option>
              {modalOgretmenler.map((ogretmen) => (
                <option key={ogretmen.id} value={ogretmen.id}>
                  {ogretmen.ad} {ogretmen.soyad}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newStajForm.baslangic_tarihi}
                onChange={(e) => setNewStajForm({ ...newStajForm, baslangic_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi <span className="text-gray-500">(opsiyonel)</span>
              </label>
              <input
                type="date"
                value={newStajForm.bitis_tarihi}
                onChange={(e) => setNewStajForm({ ...newStajForm, bitis_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setNewStajModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleNewStaj}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Staj Kaydı Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* Tarih Düzenle Modal */}
      <Modal isOpen={tarihDuzenleModalOpen} onClose={() => setTarihDuzenleModalOpen(false)} title="Staj Tarihi Düzenle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={tarihDuzenleForm.baslangic_tarihi}
              onChange={(e) => setTarihDuzenleForm({ ...tarihDuzenleForm, baslangic_tarihi: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={tarihDuzenleForm.bitis_tarihi}
              onChange={(e) => setTarihDuzenleForm({ ...tarihDuzenleForm, bitis_tarihi: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setTarihDuzenleModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleTarihDuzenle}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      {/* Fesih Modal */}
      <Modal isOpen={fesihModalOpen} onClose={() => setFesihModalOpen(false)} title="Stajı Feshet">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Tarihi
            </label>
            <input
              type="date"
              value={fesihForm.fesih_tarihi}
              onChange={(e) => setFesihForm({ ...fesihForm, fesih_tarihi: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Nedeni
            </label>
            <textarea
              value={fesihForm.fesih_nedeni}
              onChange={(e) => setFesihForm({ ...fesihForm, fesih_nedeni: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Fesih nedenini açıklayın..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Belgesi (opsiyonel)
            </label>
            <input
              type="file"
              onChange={(e) => setFesihForm({ ...fesihForm, fesih_belgesi: e.target.files?.[0] || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setFesihModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleFeshet}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Feshet
            </button>
          </div>
        </div>
      </Modal>

      {/* Silme Modal */}
      <Modal isOpen={silmeModalOpen} onClose={() => setSilmeModalOpen(false)} title="Staj Kaydını Sil">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Dikkat!</h3>
              <p className="text-sm text-red-700">
                Bu işlem geri alınamaz. Staj kaydı kalıcı olarak silinecektir.
              </p>
            </div>
          </div>
          {selectedStaj && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Öğrenci:</strong> {selectedStaj.ogrenciler?.ad} {selectedStaj.ogrenciler?.soyad}
              </p>
              <p className="text-sm text-gray-600">
                <strong>İşletme:</strong> {selectedStaj.isletmeler?.ad}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Durum:</strong> {selectedStaj.durum}
              </p>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setSilmeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSilme}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Görüntüleme Modal */}
      <Modal isOpen={belgeModalOpen} onClose={() => setBelgeModalOpen(false)} title="Belgeler">
        <div className="space-y-4">
          {selectedStaj && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Sözleşme Belgesi</h4>
                {selectedStaj.sozlesme_url ? (
                  <a
                    href={selectedStaj.sozlesme_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Sözleşmeyi Görüntüle
                  </a>
                ) : (
                  <p className="text-gray-500">Sözleşme belgesi yüklenmemiş</p>
                )}
              </div>
              
              {selectedStaj.durum === 'feshedildi' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Fesih Belgesi</h4>
                  {selectedStaj.fesih_belgesi_url ? (
                    <a
                      href={selectedStaj.fesih_belgesi_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Fesih Belgesini Görüntüle
                    </a>
                  ) : (
                    <p className="text-gray-500">Fesih belgesi yüklenmemiş</p>
                  )}
                  
                  {selectedStaj.fesih_nedeni && (
                    <div className="mt-2">
                      <h5 className="font-medium text-gray-700">Fesih Nedeni:</h5>
                      <p className="text-gray-600">{selectedStaj.fesih_nedeni}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setBelgeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}