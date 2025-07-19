'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Building2, Users, FileText, Plus, Search, Filter, Download, Upload, Trash2, Eye, UserCheck, UserX, Calendar, GraduationCap, User, AlertTriangle, ChevronDown, X, MoreVertical, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import OgretmenBazliYonetim, { OgretmenStajData } from '@/components/ui/OgretmenBazliYonetim'

interface Staj {
  id: string
  studentId: string
  companyId: string
  teacherId: string
  educationYearId: string
  startDate: string
  endDate: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  terminationDate: string | null
  createdAt: string
  student?: {
    id: string
    name: string
    surname: string
    number: string
    className: string
    alan?: {
      name: string
    } | null
  } | null
  company?: {
    id: string
    name: string
    contact: string
  } | null
  teacher?: {
    id: string
    name: string
    surname: string
  } | null
}

interface Ogrenci {
  id: string
  name: string
  surname: string
  number: string
  className: string
  alan?: {
    name: string
  } | null
}

interface Isletme {
  id: string
  name: string
  contact: string
}

interface Ogretmen {
  id: string
  name: string
  surname: string
  alanId?: string
  alan?: {
    name: string
  } | null
}

interface Alan {
  id: string
  name: string
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
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'aktif' | 'bost' | 'tamamlandi' | 'feshedildi' | 'suresi-gecmis' | 'ogretmen'>('aktif')
  
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
    // İlk render'da loading false yap ki sayfa yapısı gelsin
    setLoading(false)
    // Sonra data fetch işlemini başlat
    setDataLoading(true)
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
      setDataLoading(true)
      
      // Fetch all data in parallel
      const [
        stajResponse,
        studentsResponse,
        companiesResponse,
        teachersResponse,
        fieldsResponse
      ] = await Promise.all([
        fetch('/api/admin/internships'),
        fetch('/api/admin/students'),
        fetch('/api/admin/companies'),
        fetch('/api/admin/teachers'),
        fetch('/api/admin/fields')
      ])

      if (!stajResponse.ok) throw new Error('Staj verileri alınamadı')
      if (!studentsResponse.ok) throw new Error('Öğrenci verileri alınamadı')
      if (!companiesResponse.ok) throw new Error('İşletme verileri alınamadı')
      if (!teachersResponse.ok) throw new Error('Öğretmen verileri alınamadı')
      if (!fieldsResponse.ok) throw new Error('Alan verileri alınamadı')

      const stajData = await stajResponse.json()
      const allStudents = await studentsResponse.json()
      const companiesData = await companiesResponse.json()
      const teachersData = await teachersResponse.json()
      const fieldsData = await fieldsResponse.json()

      setStajlar(stajData)
      
      // Filter students without active internships
      const activeStudentIds = stajData
        .filter((staj: any) => staj.status === 'ACTIVE')
        .map((staj: any) => staj.studentId)
      
      const availableStudents = allStudents.filter((student: any) =>
        !activeStudentIds.includes(student.id)
      )
      
      setBostOgrenciler(availableStudents)
      setIsletmeler(companiesData)
      setOgretmenler(teachersData)
      
      // Transform fields data
      const transformedFields = fieldsData.map((field: any) => ({
        id: field.id,
        name: field.ad
      }))
      setAlanlar(transformedFields)
      
      // Create teacher-based data structure
      const ogretmenStajMap: Record<string, OgretmenStajData> = {}
      teachersData.forEach((teacher: any) => {
        ogretmenStajMap[teacher.id] = {
          id: teacher.id,
          ad: teacher.name,
          soyad: teacher.surname,
          stajlar: []
        }
      })

      stajData.forEach((staj: any) => {
        if (staj.teacherId && ogretmenStajMap[staj.teacherId]) {
          ogretmenStajMap[staj.teacherId].stajlar.push(staj)
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
      setDataLoading(false)
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
      setDataLoading(true)
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
      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj tamamlandı olarak kaydedildi'
      })

      setDataLoading(true)
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
      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj tarihleri güncellendi'
      })

      setTarihDuzenleModalOpen(false)
      setSelectedStaj(null)
      setDataLoading(true)
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
      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj feshedildi'
      })

      setFesihModalOpen(false)
      setSelectedStaj(null)
      setDataLoading(true)
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
      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj kaydı silindi'
      })

      setSilmeModalOpen(false)
      setSelectedStaj(null)
      setDataLoading(true)
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
      const isExpired = staj.status === 'ACTIVE' && staj.endDate && staj.endDate < today
      const isActive = staj.status === 'ACTIVE' && (!staj.endDate || staj.endDate >= today)
      
      // Tab bazlı filtreleme
      if (activeTab === 'aktif' && !isActive) return false
      if (activeTab === 'suresi-gecmis' && !isExpired) return false
      if (activeTab === 'tamamlandi' && staj.status !== 'COMPLETED') return false
      if (activeTab === 'feshedildi' && staj.status !== 'CANCELLED') return false
      
      const searchMatch = searchTerm === '' ||
        staj.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staj.student?.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staj.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const isletmeMatch = filterIsletme === '' || staj.companyId === filterIsletme
      const ogretmenMatch = filterOgretmen === '' || staj.teacherId === filterOgretmen
      
      const alanMatch = filterAlan === '' ||
        (staj.student?.alan?.name &&
         alanlar.find(alan => alan.id === filterAlan)?.name === staj.student.alan.name)
      
      const sinifMatch = filterSinif === '' || staj.student?.className === filterSinif
      
      return searchMatch && isletmeMatch && ogretmenMatch && alanMatch && sinifMatch
    })
  }, [stajlar, activeTab, searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif, alanlar])

  const filteredBostOgrenciler = useMemo(() => {
    return bostOgrenciler.filter(ogrenci => {
      const searchMatch = searchTerm === '' ||
        ogrenci.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ogrenci.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ogrenci.className.toLowerCase().includes(searchTerm.toLowerCase())
      
      const alanMatch = filterAlan === '' ||
        (ogrenci.alan?.name &&
         alanlar.find(alan => alan.id === filterAlan)?.name === ogrenci.alan.name)
      
      const sinifMatch = filterSinif === '' || ogrenci.className === filterSinif
      
      return searchMatch && alanMatch && sinifMatch
    })
  }, [bostOgrenciler, searchTerm, filterAlan, filterSinif, alanlar])

  // Sayfa değişikliklerinde filtreleri sıfırla ve lazy loading reset
  useEffect(() => {
    setCurrentPageStajlar(1)
    setVisibleItems(new Set())
  }, [searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif, activeTab])

  useEffect(() => {
    setCurrentPageBost(1)
    setVisibleItems(new Set())
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
        .filter(o => o.alanId === filterAlan)
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
          ogrenci.alan?.name &&
          alanlar.find(alan => alan.id === newStajForm.alan_id)?.name === ogrenci.alan.name
        )
  }, [newStajForm.alan_id, bostOgrenciler, alanlar])

  // Memoized modal için alan bazlı öğretmen filtreleme
  const modalOgretmenler = useMemo(() => {
    return newStajForm.alan_id === ''
      ? ogretmenler
      : ogretmenler.filter(ogretmen =>
          ogretmen.alan?.name &&
          alanlar.find(alan => alan.id === newStajForm.alan_id)?.name === ogretmen.alan.name
        )
  }, [newStajForm.alan_id, ogretmenler, alanlar])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Staj Yönetimi</h1>
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
                s.status === 'ACTIVE' && (!s.endDate || s.endDate >= today)
              )
              const suresiGecmisStajlar = stajlar.filter(s =>
                s.status === 'ACTIVE' && s.endDate && s.endDate < today
              )
              const tamamlananStajlar = stajlar.filter(s => s.status === 'COMPLETED')
              const feshedilenStajlar = stajlar.filter(s => s.status === 'CANCELLED')
              
              return [
                { id: 'aktif', label: 'Aktif Stajlar', count: aktifStajlar.length },
                { id: 'suresi-gecmis', label: 'Süresi Geçmiş', count: suresiGecmisStajlar.length },
                { id: 'bost', label: 'Boşta Olan Öğrenciler', count: bostOgrenciler.length },
                { id: 'tamamlandi', label: 'Tamamlanan', count: tamamlananStajlar.length },
                { id: 'feshedildi', label: 'Feshedilen', count: feshedilenStajlar.length },
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
                        {alan.name}
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
                      (activeTab === 'bost' ? bostOgrenciler : stajlar.map(s => s.student).filter(Boolean))
                        .map(o => o!.className)
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
                          {isletme.name}
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
                          {ogretmen.name} {ogretmen.surname}
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
                        {alan.name}
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
                      Alan: {alanlar.find(a => a.id === filterAlan)?.name}
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
                      İşletme: {isletmeler.find(i => i.id === filterIsletme)?.name}
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
                      Koordinatör: {ogretmenler.find(o => o.id === filterOgretmen)?.name} {ogretmenler.find(o => o.id === filterOgretmen)?.surname}
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
          {dataLoading ? (
            <div className="space-y-4">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Veriler yükleniyor...</p>
              </div>
            </div>
          ) : activeTab === 'ogretmen' ? (
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
                            {ogrenci.name} {ogrenci.surname}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {ogrenci.className} - No: {ogrenci.number}
                            </span>
                            <span>{ogrenci.alan?.name || 'Alan belirtilmemiş'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const ogrenciAlani = ogrenci.alan?.name ?
                              alanlar.find(alan => alan.name === ogrenci.alan?.name)?.id || '' : ''
                            
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
                    {activeTab === 'aktif' ? 'Henüz aktif staj bulunmuyor.' :
                     activeTab === 'tamamlandi' ? 'Tamamlanan staj bulunmuyor.' :
                     activeTab === 'feshedildi' ? 'Feshedilen staj bulunmuyor.' :
                     activeTab === 'suresi-gecmis' ? 'Süresi geçmiş staj bulunmuyor.' :
                     'Staj bulunmuyor.'}
                  </p>
                </div>
              ) : (
                paginationData.paginatedStajlar.map((staj) => {
                  const today = new Date().toISOString().split('T')[0]
                  const isExpired = staj.status === 'ACTIVE' && staj.endDate && staj.endDate < today
                  const isVisible = visibleItems.has(staj.id)
                  
                  return (
                    <div
                      key={staj.id}
                      ref={(el) => setItemRef(el, staj.id)}
                      className={`border rounded-lg p-6 ${
                        isExpired ? 'bg-orange-50 border-orange-200' :
                        staj.status === 'ACTIVE' ? 'bg-green-50 border-green-200' :
                        staj.status === 'CANCELLED' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {isVisible ? (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                              staj.status === 'ACTIVE' ? 'bg-green-100' :
                              staj.status === 'CANCELLED' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <Users className={`h-6 w-6 ${
                                staj.status === 'ACTIVE' ? 'text-green-600' :
                                staj.status === 'CANCELLED' ? 'text-red-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {staj.student?.name || 'Bilinmiyor'} {staj.student?.surname || ''}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isExpired ? 'bg-orange-100 text-orange-800' :
                                  staj.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                  staj.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isExpired ? 'Süresi Geçmiş' :
                                   staj.status === 'ACTIVE' ? 'Aktif' :
                                   staj.status === 'CANCELLED' ? 'Feshedildi' :
                                   'Tamamlandı'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <GraduationCap className="h-4 w-4 mr-1" />
                                  {staj.student?.className || 'Bilinmiyor'} - No: {staj.student?.number || 'Bilinmiyor'}
                                </span>
                                <span>{staj.student?.alan?.name || 'Alan belirtilmemiş'}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Building2 className="h-4 w-4 mr-1" />
                                  {staj.company?.name || 'İşletme bilgisi yok'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  <span className="font-medium">Koordinatör:</span>
                                  {staj.teacher ?
                                    `${staj.teacher.name} ${staj.teacher.surname}` :
                                    <span className="text-orange-600 font-medium">Atanmamış</span>
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {staj.startDate ? new Date(staj.startDate).toLocaleDateString('tr-TR') : 'Tarih yok'} - {staj.endDate ? new Date(staj.endDate).toLocaleDateString('tr-TR') : 'Devam ediyor'}
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
                                          baslangic_tarihi: staj.startDate,
                                          bitis_tarihi: staj.endDate || ''
                                        })
                                        setTarihDuzenleModalOpen(true)
                                        setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Tarih Düzenle
                                    </button>
                                    
                                    {staj.status === 'ACTIVE' && (
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
        </div>
      </div>

      {/* Modals */}
      {newStajModalOpen && (
        <Modal
          title="Yeni Staj Kaydı"
          isOpen={newStajModalOpen}
          onClose={() => setNewStajModalOpen(false)}
          onConfirm={handleNewStaj}
          confirmText="Kaydet"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alan *
              </label>
              <select
                value={newStajForm.alan_id}
                onChange={(e) => setNewStajForm({...newStajForm, alan_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Alan Seçin</option>
                {alanlar.map((alan) => (
                  <option key={alan.id} value={alan.id}>
                    {alan.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öğrenci *
              </label>
              <select
                value={newStajForm.ogrenci_id}
                onChange={(e) => setNewStajForm({...newStajForm, ogrenci_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!newStajForm.alan_id}
              >
                <option value="">Öğrenci Seçin</option>
                {modalOgrenciler.map((ogrenci) => (
                  <option key={ogrenci.id} value={ogrenci.id}>
                    {ogrenci.name} {ogrenci.surname} - {ogrenci.className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşletme *
              </label>
              <select
                value={newStajForm.isletme_id}
                onChange={(e) => setNewStajForm({...newStajForm, isletme_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">İşletme Seçin</option>
                {isletmeler.map((isletme) => (
                  <option key={isletme.id} value={isletme.id}>
                    {isletme.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koordinatör Öğretmen *
              </label>
              <select
                value={newStajForm.ogretmen_id}
                onChange={(e) => setNewStajForm({...newStajForm, ogretmen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!newStajForm.alan_id}
              >
                <option value="">Koordinatör Seçin</option>
                {modalOgretmenler.map((ogretmen) => (
                  <option key={ogretmen.id} value={ogretmen.id}>
                    {ogretmen.name} {ogretmen.surname}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                value={newStajForm.baslangic_tarihi}
                onChange={(e) => setNewStajForm({...newStajForm, baslangic_tarihi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={newStajForm.bitis_tarihi}
                onChange={(e) => setNewStajForm({...newStajForm, bitis_tarihi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Tarih Düzenleme Modal */}
      {tarihDuzenleModalOpen && selectedStaj && (
        <Modal
          title="Staj Tarihlerini Düzenle"
          isOpen={tarihDuzenleModalOpen}
          onClose={() => setTarihDuzenleModalOpen(false)}
          onConfirm={handleTarihDuzenle}
          confirmText="Güncelle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                value={tarihDuzenleForm.baslangic_tarihi}
                onChange={(e) => setTarihDuzenleForm({...tarihDuzenleForm, baslangic_tarihi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={tarihDuzenleForm.bitis_tarihi}
                onChange={(e) => setTarihDuzenleForm({...tarihDuzenleForm, bitis_tarihi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Fesih Modal */}
      {fesihModalOpen && selectedStaj && (
        <Modal
          title="Staj Feshi"
          isOpen={fesihModalOpen}
          onClose={() => setFesihModalOpen(false)}
          onConfirm={handleFeshet}
          confirmText="Feshet"
          confirmButtonColor="bg-red-600 hover:bg-red-700"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Tarihi *
              </label>
              <input
                type="date"
                value={fesihForm.fesih_tarihi}
                onChange={(e) => setFesihForm({...fesihForm, fesih_tarihi: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Nedeni *
              </label>
              <textarea
                value={fesihForm.fesih_nedeni}
                onChange={(e) => setFesihForm({...fesihForm, fesih_nedeni: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Fesih nedenini açıklayın..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Silme Modal */}
      {silmeModalOpen && selectedStaj && (
        <Modal
          title="Staj Kaydını Sil"
          isOpen={silmeModalOpen}
          onClose={() => setSilmeModalOpen(false)}
          onConfirm={handleSilme}
          confirmText="Sil"
          confirmButtonColor="bg-red-600 hover:bg-red-700"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Bu staj kaydını silmek istediğinizden emin misiniz?
                </h3>
                <p className="text-sm text-gray-600">
                  Bu işlem geri alınamaz. Tüm staj verileri kalıcı olarak silinecektir.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}