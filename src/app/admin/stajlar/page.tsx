'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Building2, Users, FileText, Search, Filter, Download, Upload, UserCheck, Calendar, GraduationCap, User, AlertTriangle, ChevronDown, X, ChevronLeft, ChevronRight, CheckCircle, Wrench, Settings } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useInternshipAssignmentRules } from '@/hooks/useInternshipAssignmentRules'

interface Staj {
  id: string
  studentId: string
  companyId: string
  teacherId: string
  educationYearId: string
  startDate: string
  endDate: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED'
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

interface TutarsizlikRaporu {
  id: string
  type: 'COKLU_KOORDINATOR' | 'EKSIK_KOORDINATOR' | 'HATALI_ATAMA' | 'SURESI_GECMIS_AKTIF' | 'USTA_OGRETICI_EKSIK'
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  affectedItems: any[]
  canAutoFix: boolean
  solution?: string
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
  const [bostOgrencilerTotal, setBostOgrencilerTotal] = useState(0)
  const [bostOgrencilerTotalPages, setBostOgrencilerTotalPages] = useState(0)
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'aktif' | 'bost' | 'tamamlandi' | 'feshedildi' | 'suresi-gecmis'>('aktif')
  
  // Modal states
  const [newOgretmenModalOpen, setNewOgretmenModalOpen] = useState(false)
  const [fesihModalOpen, setFesihModalOpen] = useState(false)
  const [koordinatorModalOpen, setKoordinatorModalOpen] = useState(false)
  const [tutarsizlikModalOpen, setTutarsizlikModalOpen] = useState(false)

  const [selectedStaj, setSelectedStaj] = useState<Staj | null>(null)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)

  
  // Form states
  

  

  

  const [submitLoading, setSubmitLoading] = useState(false)

  // New teacher form data
  const [newOgretmenFormData, setNewOgretmenFormData] = useState({
    ad: '',
    soyad: '',
    email: '',
    telefon: '',
    alanId: '',
    pin: '1234'
  })

  // Fesih form data
  const [fesihFormData, setFesihFormData] = useState({
    reason: '',
    notes: '',
    terminationDate: new Date().toISOString().split('T')[0]
  })

  // Koordinator degistir form data
  const [yeniKoordinator, setYeniKoordinator] = useState('')
  
  // Tutarsızlık kontrolü
  const [tutarsizlikRaporlari, setTutarsizlikRaporlari] = useState<TutarsizlikRaporu[]>([])
  const [tutarsizlikLoading, setTutarsizlikLoading] = useState(false)
  const [selectedTutarsizlik, setSelectedTutarsizlik] = useState<TutarsizlikRaporu | null>(null)
  const [tutarsizlikCurrentPage, setTutarsizlikCurrentPage] = useState(1)
  const tutarsizlikItemsPerPage = 10
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterIsletme, setFilterIsletme] = useState('')
  const [filterOgretmen, setFilterOgretmen] = useState('')
  const [filterAlan, setFilterAlan] = useState('')
  const [filterSinif, setFilterSinif] = useState('')

  
  // Pagination states
  const [currentPageStajlar, setCurrentPageStajlar] = useState(1)
  const [currentPageBost, setCurrentPageBost] = useState(1)
  const itemsPerPage = 10
  
  // Lazy loading states
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  const { showToast } = useToast()
  const assignmentRules = useInternshipAssignmentRules()

  useEffect(() => {
    // İlk render'da loading false yap ki sayfa yapısı gelsin
    setLoading(false)
    // Sonra data fetch işlemini başlat
    setDataLoading(true)
    fetchData()
  }, [])

  // Tab değiştiğinde veya filtreler değiştiğinde boşta olan öğrencileri fetch et
  useEffect(() => {
    if (activeTab === 'bost') {
      setCurrentPageBost(1) // Reset page
      fetchBostOgrenciler(1)
    }
  }, [activeTab, filterAlan, filterSinif, searchTerm])

  // Boşta olan öğrenciler pagination
  useEffect(() => {
    if (activeTab === 'bost') {
      fetchBostOgrenciler(currentPageBost)
    }
  }, [currentPageBost])

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

  const fetchBostOgrenciler = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        status: 'unassigned',
        page: page.toString(),
        limit: '10'
      })
      
      if (filterAlan) params.append('alanId', filterAlan)
      if (filterSinif) params.append('sinif', filterSinif)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/admin/students?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        // Map API response to component interface
        const mappedStudents = (data.students || []).map((student: any) => ({
          id: student.id,
          name: student.ad || student.name,
          surname: student.soyad || student.surname,
          number: student.no || student.number,
          className: student.sinif || student.className,
          alan: student.alan || null
        }))
        setBostOgrenciler(mappedStudents)
        setBostOgrencilerTotal(data.totalCount || 0)
        setBostOgrencilerTotalPages(data.totalPages || 0)
        return data
      }
      return { students: [], totalCount: 0, totalPages: 0 }
    } catch (error) {
      console.error('Boşta olan öğrenciler getirme hatası:', error)
      setBostOgrenciler([])
      setBostOgrencilerTotal(0)
      setBostOgrencilerTotalPages(0)
      return { students: [], totalCount: 0, totalPages: 0 }
    }
  }

  const fetchData = async () => {
    try {
      setDataLoading(true)
      
      // Fetch all data with individual error handling
      const fetchWithFallback = async (url: string, fallback: any[] = []) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            return await response.json()
          }
          console.warn(`API request failed: ${url}`)
          return fallback
        } catch (error) {
          console.warn(`API request error: ${url}`, error)
          return fallback
        }
      }

      const [
        stajData,
        companiesData,
        teachersData,
        fieldsData
      ] = await Promise.all([
        fetchWithFallback('/api/admin/internships', []),
        fetchWithFallback('/api/admin/companies', []),
        fetchWithFallback('/api/admin/teachers', []),
        fetchWithFallback('/api/admin/fields', [])
      ])

      // Safely set data with array checks
      const actualStajData = stajData?.data || stajData
      setStajlar(Array.isArray(actualStajData) ? actualStajData : [])
      
      const safeStajData = Array.isArray(actualStajData) ? actualStajData : []
      setIsletmeler(Array.isArray(companiesData) ? companiesData : [])
      setOgretmenler(Array.isArray(teachersData) ? teachersData : [])
      
      // Transform fields data safely
      const safeFieldsData = Array.isArray(fieldsData) ? fieldsData : []
      const transformedFields = safeFieldsData.map((field: any) => ({
        id: field?.id || '',
        name: field?.ad || field?.name || ''
      })).filter(field => field.id && field.name)
      
      setAlanlar(transformedFields)
      
      
    } catch (error) {
      console.error('Veri yükleme hatası:', error)
      // Set empty arrays as fallback
      setStajlar([])
      setBostOgrenciler([])
      setIsletmeler([])
      setOgretmenler([])
      setAlanlar([])
      
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Veriler yüklenirken bir hata oluştu. Sayfa boş veriyle yüklendi.'
      })
    } finally {
      setDataLoading(false)
    }
  }

  const handleTutarsizlikKontrol = async () => {
    setTutarsizlikLoading(true)
    try {
      const response = await fetch('/api/admin/internships/consistency-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Tutarsızlık kontrolü yapılırken hata oluştu')
      }

      const data = await response.json()
      setTutarsizlikRaporlari(data.issues || [])
      setTutarsizlikModalOpen(true)

      showToast({
        type: 'success',
        title: 'Tutarlılık Kontrolü Tamamlandı',
        message: `${data.issues?.length || 0} adet tutarsızlık tespit edildi.`
      })
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Hata',
        message: `Tutarsızlık kontrolü hatası: ${error.message}`
      })
    } finally {
      setTutarsizlikLoading(false)
    }
  }

  const handleTutarsizlikDuzelt = async (tutarsizlik: TutarsizlikRaporu) => {
    if (!tutarsizlik.canAutoFix) {
      showToast({
        type: 'warning',
        title: 'Manuel Düzeltme Gerekli',
        message: 'Bu tutarsızlık otomatik düzeltilemez. Lütfen manuel olarak düzeltiniz.'
      })
      return
    }

    try {
      const response = await fetch('/api/admin/internships/fix-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueId: tutarsizlik.id,
          issueType: tutarsizlik.type
        })
      })

      if (!response.ok) {
        throw new Error('Tutarsızlık düzeltilirken hata oluştu')
      }

      showToast({
        type: 'success',
        title: 'Düzeltme Başarılı',
        message: 'Tutarsızlık başarıyla düzeltildi.'
      })

      // Tutarsızlık raporlarını güncelle
      setTutarsizlikRaporlari(prev => prev.filter(t => t.id !== tutarsizlik.id))
      
      // Ana veriyi yenile
      fetchData()
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Hata',
        message: `Düzeltme hatası: ${error.message}`
      })
    }
  }

  const handleNewOgretmen = async () => {
    if (!newOgretmenFormData.ad.trim() || !newOgretmenFormData.soyad.trim() || !newOgretmenFormData.email.trim() || !newOgretmenFormData.alanId) {
      showToast({
        type: 'error',
        title: 'Eksik Bilgi',
        message: 'Ad, soyad, email ve alan alanları zorunludur!'
      })
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOgretmenFormData.ad.trim(),
          surname: newOgretmenFormData.soyad.trim(),
          email: newOgretmenFormData.email.trim(),
          phone: newOgretmenFormData.telefon.trim() || null,
          alanId: newOgretmenFormData.alanId,
          pin: newOgretmenFormData.pin
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğretmen eklenirken hata oluştu')
      }

      const newTeacher = await response.json()

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Yeni öğretmen başarıyla eklendi!'
      })

      // Update teachers list
      setOgretmenler(prev => [...prev, {
        id: newTeacher.id,
        name: newTeacher.name,
        surname: newTeacher.surname,
        alanId: newTeacher.alanId,
        alan: alanlar.find(a => a.id === newTeacher.alanId) || null
      }])



      setNewOgretmenModalOpen(false)
      setNewOgretmenFormData({
        ad: '',
        soyad: '',
        email: '',
        telefon: '',
        alanId: '',
        pin: '1234'
      })

    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Hata',
        message: `Öğretmen eklenirken hata: ${error.message}`
      })
    } finally {
      setSubmitLoading(false)
    }
  }



  const handleTamamlandiOlarakKaydet = async (stajId: string) => {
    try {
      const response = await fetch(`/api/admin/internships/${stajId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED'
        })
      })

      if (!response.ok) throw new Error('Staj tamamlama işlemi başarısız')

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

  const handleFesihEt = (staj: Staj) => {
    setSelectedStaj(staj)
    setFesihModalOpen(true)
    setFesihFormData({
      reason: '',
      notes: '',
      terminationDate: new Date().toISOString().split('T')[0]
    })
  }

  const handleFesihOnayla = async () => {
    if (!selectedStaj || !fesihFormData.reason.trim()) return

    try {
      setSubmitLoading(true)
      
      const response = await fetch(`/api/admin/internships/${selectedStaj.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'TERMINATED',
          terminationDate: fesihFormData.terminationDate,
          terminationReason: fesihFormData.reason,
          terminationNotes: fesihFormData.notes
        })
      })

      if (!response.ok) throw new Error('Staj fesih işlemi başarısız')

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj başarıyla feshedildi'
      })

      setFesihModalOpen(false)
      setSelectedStaj(null)
      fetchData()
    } catch (error) {
      console.error('Staj fesih hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj fesih edilirken bir hata oluştu'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleKoordinatorDegistir = async (staj: Staj) => {
    setSelectedStaj(staj)
    setKoordinatorModalOpen(true)

    // Mevcut durumu kontrol et
    if (staj.studentId && staj.companyId) {
      await assignmentRules.checkAssignmentRules(
        staj.studentId,
        staj.companyId,
        staj.teacherId || undefined
      )
      
      // Önerilen koordinatör varsa onu seç, yoksa mevcut koordinatörü seç
      if (assignmentRules.lastResult?.existingCoordinator) {
        setYeniKoordinator(assignmentRules.lastResult.existingCoordinator.id)
      } else {
        setYeniKoordinator(staj.teacherId || '')
      }
    } else {
      setYeniKoordinator(staj.teacherId || '')
    }
  }

  const koordinatorDegistir = async () => {
    if (!selectedStaj || !yeniKoordinator) {
      showToast({
        type: 'error',
        title: 'Eksik Bilgi',
        message: 'Koordinatör seçimi yapılmadı'
      })
      return
    }

    try {
      setSubmitLoading(true)

      // Önce kuralları kontrol et
      if (selectedStaj.studentId && selectedStaj.companyId) {
        await assignmentRules.checkAssignmentRules(
          selectedStaj.studentId,
          selectedStaj.companyId,
          yeniKoordinator
        )

        // Hata varsa kullanıcıya sor
        const hasErrors = assignmentRules.lastResult?.rules.some(rule => rule.severity === 'ERROR')
        if (hasErrors) {
          const confirmProceed = window.confirm(
            'Kural ihlalleri tespit edildi. Yine de devam etmek istiyor musunuz?\n\n' +
            assignmentRules.lastResult?.rules
              .filter(rule => rule.severity === 'ERROR')
              .map(rule => `• ${rule.message}`)
              .join('\n')
          )
          if (!confirmProceed) {
            setSubmitLoading(false)
            return
          }
        }
      }

      const response = await fetch(`/api/admin/internships/${selectedStaj.id}/coordinator`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: yeniKoordinator })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Koordinatör güncellenemedi')
      }

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Koordinatör başarıyla güncellendi'
      })
      setKoordinatorModalOpen(false)
      setSelectedStaj(null)
      setYeniKoordinator('')
      await fetchData()
    } catch (error: any) {
      console.error('Koordinatör güncelleme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: error.message || 'Koordinatör güncellenirken hata oluştu'
      })
    } finally {
      setSubmitLoading(false)
    }
  }



  // Memoized filtreleme mantığı - performans optimizasyonu
  const filteredStajlar = useMemo(() => {
    if (!Array.isArray(stajlar)) {
      return []
    }
    return stajlar.filter(staj => {
      const today = new Date().toISOString().split('T')[0]
      const isExpired = staj.status === 'ACTIVE' && staj.endDate && staj.endDate < today
      const isActive = staj.status === 'ACTIVE' && (!staj.endDate || staj.endDate >= today)
      
      // Tab bazlı filtreleme
      if (activeTab === 'aktif' && !isActive) return false
      if (activeTab === 'suresi-gecmis' && !isExpired) return false
      if (activeTab === 'tamamlandi' && staj.status !== 'COMPLETED') return false
      if (activeTab === 'feshedildi' && staj.status !== 'TERMINATED') return false
      
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



  // Sayfa değişikliklerinde filtreleri sıfırla ve lazy loading reset
  useEffect(() => {
    setCurrentPageStajlar(1)
    setVisibleItems(new Set())
  }, [searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif, activeTab])

  useEffect(() => {
    setCurrentPageBost(1)
    setVisibleItems(new Set())
  }, [searchTerm, filterAlan, filterSinif, activeTab])


  // Memoized pagination hesaplamaları - sadece stajlar için
  const paginationData = useMemo(() => {
    const totalStajlar = filteredStajlar.length
    const totalPagesStajlar = Math.ceil(totalStajlar / itemsPerPage)

    const startIndexStajlar = (currentPageStajlar - 1) * itemsPerPage
    const endIndexStajlar = startIndexStajlar + itemsPerPage
    const paginatedStajlar = filteredStajlar.slice(startIndexStajlar, endIndexStajlar)

    return {
      totalStajlar,
      totalPagesStajlar,
      startIndexStajlar,
      endIndexStajlar,
      paginatedStajlar
    }
  }, [filteredStajlar, currentPageStajlar, itemsPerPage])



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
              onClick={handleTutarsizlikKontrol}
              disabled={tutarsizlikLoading}
              title={tutarsizlikLoading ? 'Kontrol Ediliyor...' : 'Tutarlılık Kontrolü'}
              className="flex items-center justify-center bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tutarsizlikLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Settings className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto space-x-2 md:space-x-8 px-3 md:px-6">
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const safeStajlar = Array.isArray(stajlar) ? stajlar : []
              const aktifStajlar = safeStajlar.filter(s =>
                s.status === 'ACTIVE' && (!s.endDate || s.endDate >= today)
              )
              const suresiGecmisStajlar = safeStajlar.filter(s =>
                s.status === 'ACTIVE' && s.endDate && s.endDate < today
              )
              const tamamlananStajlar = safeStajlar.filter(s => s.status === 'COMPLETED')
              const feshedilenStajlar = safeStajlar.filter(s => s.status === 'TERMINATED')
              
              return [
                { id: 'aktif', label: 'Aktif', shortLabel: 'Aktif', count: aktifStajlar.length },
                { id: 'suresi-gecmis', label: 'Süresi Geçmiş', shortLabel: 'S.Geçmiş', count: suresiGecmisStajlar.length },
                { id: 'bost', label: 'Boşta Olan Öğrenciler', shortLabel: 'Boşta', count: bostOgrencilerTotal },
                { id: 'tamamlandi', label: 'Tamamlanan', shortLabel: 'Tamam', count: tamamlananStajlar.length },
                { id: 'feshedildi', label: 'Feshedilen', shortLabel: 'Fesih', count: feshedilenStajlar.length }
              ]
            })().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block md:hidden">{tab.shortLabel} ({tab.count})</span>
                <span className="hidden md:block">{tab.label} ({tab.count})</span>
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
                    'Öğrenci veya işletme ara...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {/* Filtreler */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Alan Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alan
                  </label>
                  <select
                    value={filterAlan}
                    onChange={(e) => setFilterAlan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sınıf
                  </label>
                  <select
                    value={filterSinif}
                    onChange={(e) => setFilterSinif(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              </div>

              {/* İşletme ve Öğretmen Filtreleri - Sadece stajlar için */}
              {activeTab !== 'bost' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* İşletme Filtresi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İşletme
                    </label>
                    <select
                      value={filterIsletme}
                      onChange={(e) => setFilterIsletme(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tüm İşletmeler</option>
                      {getUniqueById(isletmeler).map((isletme) => (
                        <option key={isletme.id} value={isletme.id}>
                          {isletme.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Öğretmen Filtresi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Koordinatör
                    </label>
                    <select
                      value={filterOgretmen}
                      onChange={(e) => setFilterOgretmen(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Tüm Koordinatörler</option>
                      {getUniqueById(ogretmenler).map((ogretmen) => (
                        <option key={ogretmen.id} value={ogretmen.id}>
                          {ogretmen.name} {ogretmen.surname}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

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
          ) : activeTab === 'bost' ? (
            // Boşta olan öğrenciler
            <div className="space-y-4">
              {bostOgrenciler.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Boşta öğrenci yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Tüm öğrencilerin aktif stajları bulunuyor.</p>
                </div>
              ) : (
                <>
                  {bostOgrenciler.map((ogrenci) => (
                    <div
                      key={ogrenci.id}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4"
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-medium text-gray-900">
                            {ogrenci.name} {ogrenci.surname}
                          </h3>
                          <div className="text-xs md:text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <GraduationCap className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                              <span>{ogrenci.className} - No: {ogrenci.number}</span>
                            </div>
                            <div className="ml-4">{ogrenci.alan?.name || 'Alan belirtilmemiş'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination for Boşta Öğrenciler */}
                  {bostOgrencilerTotalPages > 1 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 space-y-3 md:space-y-0">
                      <div className="text-xs md:text-sm text-gray-700 text-center md:text-left">
                        Toplam {bostOgrencilerTotal} öğrenci, sayfa {currentPageBost} / {bostOgrencilerTotalPages}
                      </div>
                      <div className="flex items-center justify-center space-x-1 md:space-x-2">
                        <button
                          onClick={() => setCurrentPageBost(Math.max(1, currentPageBost - 1))}
                          disabled={currentPageBost === 1}
                          className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                        
                        {/* Sayfa numaraları - mobile'da daha az göster */}
                        {Array.from({ length: Math.min(3, bostOgrencilerTotalPages) }, (_, i) => {
                          const startPage = Math.max(1, currentPageBost - 1)
                          const pageNum = startPage + i
                          if (pageNum > bostOgrencilerTotalPages) return null
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPageBost(pageNum)}
                              className={`px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium rounded-md ${
                                currentPageBost === pageNum
                                  ? 'text-indigo-600 bg-indigo-50 border border-indigo-500'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        
                        <button
                          onClick={() => setCurrentPageBost(Math.min(bostOgrencilerTotalPages, currentPageBost + 1))}
                          disabled={currentPageBost === bostOgrencilerTotalPages}
                          className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
                      className={`border rounded-lg p-3 md:p-6 ${
                        isExpired ? 'bg-orange-50 border-orange-200' :
                        staj.status === 'ACTIVE' ? 'bg-green-50 border-green-200' :
                        staj.status === 'TERMINATED' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {isVisible ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Sol taraf - Bilgiler */}
                          <div className="flex-1 min-w-0">
                            <div className="space-y-2">
                              <div className="space-y-2">
                                <h3 className="text-base md:text-lg font-medium text-gray-900 break-words">
                                  {staj.student?.name || 'Bilinmiyor'} {staj.student?.surname || ''}
                                </h3>
                                {isExpired && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Süresi Geçmiş
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-xs md:text-sm text-gray-600">
                                  <div className="flex items-center gap-1 mb-1">
                                    <GraduationCap className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                                    <span className="break-words">{staj.student?.className || 'Bilinmiyor'} - No: {staj.student?.number || 'Bilinmiyor'}</span>
                                  </div>
                                  <div className="pl-4 break-words">{staj.student?.alan?.name || 'Alan belirtilmemiş'}</div>
                                </div>
                                
                                <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                                  <Building2 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                                  <span className="break-words">{staj.company?.name || 'İşletme bilgisi yok'}</span>
                                </div>
                                
                                <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                                  <UserCheck className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <span className="font-medium">Koordinatör: </span>
                                    {staj.teacher ? (
                                      <span className="break-words">
                                        {`${staj.teacher.name} ${staj.teacher.surname}`}
                                        {staj.status === 'TERMINATED' && (
                                          <span className="text-xs text-gray-500 ml-1">(Fesih zamanında)</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-orange-600 font-medium">Koordinatör Öğretmen atanmadı</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-1 text-xs md:text-sm text-gray-600">
                                  <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 mt-0.5" />
                                  <span className="break-words leading-relaxed">
                                    {staj.startDate ? new Date(staj.startDate).toLocaleDateString('tr-TR') : 'Tarih yok'} - {
                                      staj.status === 'TERMINATED' && staj.terminationDate
                                        ? new Date(staj.terminationDate).toLocaleDateString('tr-TR') + ' (Fesih)'
                                        : staj.endDate
                                          ? new Date(staj.endDate).toLocaleDateString('tr-TR')
                                          : 'Devam ediyor'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sağ taraf - Action Buttons */}
                          <div className="flex flex-col gap-2 md:min-w-[200px]">
                            {(staj.status === 'ACTIVE' || isExpired) && (
                              <>
                                {/* Tamamla Button */}
                                <button
                                  onClick={() => handleTamamlandiOlarakKaydet(staj.id)}
                                  className="flex items-center justify-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm w-full"
                                >
                                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                                  <span>Tamamla</span>
                                </button>
                                
                                {/* Fesih Et Button */}
                                <button
                                  onClick={() => handleFesihEt(staj)}
                                  className="flex items-center justify-center space-x-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm w-full"
                                >
                                  <X className="h-3 w-3 md:h-4 md:w-4" />
                                  <span>Fesih Et</span>
                                </button>
                                
                                {/* Koordinatör Değiştir Button */}
                                <button
                                  onClick={() => handleKoordinatorDegistir(staj)}
                                  className="flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm w-full"
                                >
                                  <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                                  <span>Koordinatör Değiştir</span>
                                </button>
                              </>
                            )}
                            
                            {/* Sadece koordinatör değiştirme - completed/terminated stajlar için */}
                            {(staj.status === 'COMPLETED' || staj.status === 'TERMINATED') && (
                              <button
                                onClick={() => handleKoordinatorDegistir(staj)}
                                className="flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm w-full"
                              >
                                <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                                <span>Koordinatör Değiştir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                  )
                })
              )}
              
              {/* Pagination for Stajlar */}
              {(activeTab === 'aktif' || activeTab === 'tamamlandi' || activeTab === 'feshedildi' || activeTab === 'suresi-gecmis') && paginationData.totalPagesStajlar > 1 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 space-y-3 md:space-y-0">
                  <div className="text-xs md:text-sm text-gray-700 text-center md:text-left">
                    Toplam {paginationData.totalStajlar} staj, sayfa {currentPageStajlar} / {paginationData.totalPagesStajlar}
                  </div>
                  <div className="flex items-center justify-center space-x-1 md:space-x-2">
                    <button
                      onClick={() => setCurrentPageStajlar(Math.max(1, currentPageStajlar - 1))}
                      disabled={currentPageStajlar === 1}
                      className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                    
                    {/* Sayfa numaraları - mobile'da daha az göster */}
                    {Array.from({ length: Math.min(3, paginationData.totalPagesStajlar) }, (_, i) => {
                      const startPage = Math.max(1, currentPageStajlar - 1)
                      const pageNum = startPage + i
                      if (pageNum > paginationData.totalPagesStajlar) return null
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPageStajlar(pageNum)}
                          className={`px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium rounded-md ${
                            currentPageStajlar === pageNum
                              ? 'text-indigo-600 bg-indigo-50 border border-indigo-500'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPageStajlar(Math.min(paginationData.totalPagesStajlar, currentPageStajlar + 1))}
                      disabled={currentPageStajlar === paginationData.totalPagesStajlar}
                      className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}

      {/* Fesih Modal */}
      <Modal
        isOpen={fesihModalOpen}
        onClose={() => {
          setFesihModalOpen(false)
          setSelectedStaj(null)
          setFesihFormData({
            reason: '',
            notes: '',
            terminationDate: new Date().toISOString().split('T')[0]
          })
        }}
        title="Stajı Fesih Et"
      >
        <div className="space-y-4">
          {selectedStaj && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900">Feshedilecek Staj:</h4>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{selectedStaj.student?.name} {selectedStaj.student?.surname}</strong> - {selectedStaj.company?.name}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fesih Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fesihFormData.terminationDate}
              onChange={(e) => setFesihFormData({ ...fesihFormData, terminationDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fesih Nedeni <span className="text-red-500">*</span>
            </label>
            <select
              value={fesihFormData.reason}
              onChange={(e) => setFesihFormData({ ...fesihFormData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Neden Seçin</option>
              <option value="Öğrenci İsteği">Öğrenci İsteği</option>
              <option value="İşletme İsteği">İşletme İsteği</option>
              <option value="Disiplin Problemi">Disiplin Problemi</option>
              <option value="Devamsızlık">Devamsızlık</option>
              <option value="İş Güvenliği">İş Güvenliği</option>
              <option value="Sağlık Problemi">Sağlık Problemi</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama/Notlar
            </label>
            <textarea
              value={fesihFormData.notes}
              onChange={(e) => setFesihFormData({ ...fesihFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Fesih ile ilgili ek bilgiler..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setFesihModalOpen(false)
                setSelectedStaj(null)
                setFesihFormData({
                  reason: '',
                  notes: '',
                  terminationDate: new Date().toISOString().split('T')[0]
                })
              }}
              disabled={submitLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleFesihOnayla}
              disabled={submitLoading || !fesihFormData.reason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Fesih Ediliyor...</span>
                </div>
              ) : (
                'Stajı Fesih Et'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Koordinatör Değiştir Modal */}
      <Modal
        isOpen={koordinatorModalOpen}
        onClose={() => {
          setKoordinatorModalOpen(false)
          setSelectedStaj(null)
          setYeniKoordinator('')
        }}
        title="Koordinatör Öğretmen Değiştir"
      >
        <div className="space-y-4">
          {selectedStaj && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Staj Bilgileri:</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{selectedStaj.student?.name} {selectedStaj.student?.surname}</strong> - {selectedStaj.company?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Mevcut Koordinatör: {selectedStaj.teacher ? `${selectedStaj.teacher.name} ${selectedStaj.teacher.surname}` : 'Atanmamış'}
                </p>
              </div>

              {/* Kural Bilgileri */}
              {assignmentRules.lastResult && assignmentRules.lastResult.rules.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-900">Koordinatör Ataması Kuralları:</h5>
                  {assignmentRules.lastResult.rules.map((rule, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border text-sm ${
                        rule.severity === 'ERROR' ? 'bg-red-50 border-red-200 text-red-800' :
                        rule.severity === 'WARNING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-green-50 border-green-200 text-green-800'
                      }`}
                    >
                      <div className="font-medium mb-1">
                        {rule.severity === 'ERROR' ? '🚫 HATA' :
                         rule.severity === 'WARNING' ? '⚠️ UYARI' : '✅ BİLGİ'}
                      </div>
                      <div>{rule.message}</div>
                      {rule.suggestedAction && (
                        <div className="mt-2 text-xs opacity-90">
                          <strong>Önerilen:</strong> {rule.suggestedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Önerilen Koordinatör */}
              {assignmentRules.lastResult?.existingCoordinator && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-indigo-900">
                      💡 Önerilen Koordinatör
                    </div>
                    <button
                      type="button"
                      onClick={() => setYeniKoordinator(assignmentRules.lastResult?.existingCoordinator?.id || '')}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors"
                    >
                      Seç
                    </button>
                  </div>
                  <div className="text-sm text-indigo-800">
                    {assignmentRules.lastResult.existingCoordinator.name} {assignmentRules.lastResult.existingCoordinator.surname}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    Bu işletmede zaten bu koordinatör görev yapıyor
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yeni Koordinatör Öğretmen <span className="text-red-500">*</span>
            </label>
            <select
              value={yeniKoordinator}
              onChange={(e) => setYeniKoordinator(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Koordinatör Seçin</option>
              {ogretmenler.map((ogretmen) => (
                <option key={ogretmen.id} value={ogretmen.id}>
                  {ogretmen.name} {ogretmen.surname} - {ogretmen.alan?.name || 'Alan bilgisi yok'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Sadece öğrencinin alanındaki öğretmenler gösterilmektedir.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setKoordinatorModalOpen(false)
                setSelectedStaj(null)
                setYeniKoordinator('')
              }}
              disabled={submitLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={koordinatorDegistir}
              disabled={submitLoading || !yeniKoordinator}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Güncelleniyor...</span>
                </div>
              ) : (
                'Koordinatörü Güncelle'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Teacher Modal */}
      {newOgretmenModalOpen && (
        <Modal
          title="Yeni Öğretmen Ekle"
          isOpen={newOgretmenModalOpen}
          onClose={() => {
            setNewOgretmenModalOpen(false)
            setNewOgretmenFormData({
              ad: '',
              soyad: '',
              email: '',
              telefon: '',
              alanId: '',
              pin: '1234'
            })
          }}
          onConfirm={handleNewOgretmen}
          confirmText={submitLoading ? 'Ekleniyor...' : 'Ekle'}
          confirmButtonColor="bg-indigo-600 hover:bg-indigo-700"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-blue-800 text-sm">
                <div className="font-medium">🔒 Güvenlik Bilgisi:</div>
                <div className="mt-1">Varsayılan PIN: <strong>1234</strong> (Admin tarafından görünür)</div>
                <div className="text-xs mt-1 text-blue-600">Öğretmen ilk girişte PIN'ini değiştirmelidir.</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
              <input
                type="text"
                value={newOgretmenFormData.ad}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, ad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Öğretmen adı"
                disabled={submitLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
              <input
                type="text"
                value={newOgretmenFormData.soyad}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, soyad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Öğretmen soyadı"
                disabled={submitLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
              <input
                type="email"
                value={newOgretmenFormData.email}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ornek@email.com"
                disabled={submitLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={newOgretmenFormData.telefon}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, telefon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="05XX XXX XX XX"
                disabled={submitLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alan *</label>
              <select
                value={newOgretmenFormData.alanId}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, alanId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={submitLoading}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="text"
                value={newOgretmenFormData.pin}
                onChange={(e) => setNewOgretmenFormData({ ...newOgretmenFormData, pin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="1234"
                disabled={submitLoading}
              />
              <div className="text-xs text-gray-500 mt-1">
                Admin görünümü için metin olarak gösteriliyor
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Tutarsızlık Kontrolü Modal */}
      <Modal
        isOpen={tutarsizlikModalOpen}
        onClose={() => {
          setTutarsizlikModalOpen(false)
          setTutarsizlikRaporlari([])
        }}
        title="Veri Tutarlılığı Kontrolü"
      >
        <div className="space-y-6">
          {tutarsizlikRaporlari.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Tebrikler!</h3>
              <p className="mt-2 text-sm text-gray-600">
                Hiçbir tutarsızlık tespit edilmedi. Tüm veriler tutarlı durumda.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">
                      {tutarsizlikRaporlari.length} adet tutarsızlık tespit edildi
                    </h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Lütfen aşağıdaki sorunları inceleyin ve gerekli düzeltmeleri yapın.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {tutarsizlikRaporlari.map((tutarsizlik, index) => (
                  <div
                    key={tutarsizlik.id}
                    className={`border rounded-lg p-4 ${
                      tutarsizlik.severity === 'HIGH' ? 'border-red-200 bg-red-50' :
                      tutarsizlik.severity === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tutarsizlik.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                            tutarsizlik.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {tutarsizlik.severity === 'HIGH' ? 'Yüksek' :
                             tutarsizlik.severity === 'MEDIUM' ? 'Orta' : 'Düşük'} Öncelik
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tutarsizlik.canAutoFix ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tutarsizlik.canAutoFix ? 'Otomatik Düzeltilebilir' : 'Manuel Düzeltme'}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-1">
                          {tutarsizlik.type === 'COKLU_KOORDINATOR' ? 'Çoklu Koordinatör Ataması' :
                           tutarsizlik.type === 'EKSIK_KOORDINATOR' ? 'Eksik Koordinatör Ataması' :
                           tutarsizlik.type === 'HATALI_ATAMA' ? '🚨 Öğrenci-Koordinatör Alan Uyumsuzluğu' :
                           tutarsizlik.type === 'SURESI_GECMIS_AKTIF' ? 'Süresi Geçmiş Aktif Staj' :
                           tutarsizlik.type === 'USTA_OGRETICI_EKSIK' ? '🚫 Usta Öğreticisi Eksik' :
                           'Bilinmeyen Tutarsızlık'}
                        </h4>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {tutarsizlik.description}
                        </p>

                        {tutarsizlik.solution && (
                          <div className="bg-white/50 border border-gray-200 rounded p-3 mb-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">Önerilen Çözüm:</div>
                            <div className="text-xs text-gray-600">{tutarsizlik.solution}</div>
                          </div>
                        )}

                        {tutarsizlik.affectedItems && tutarsizlik.affectedItems.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">Etkilenen Öğeler ({tutarsizlik.affectedItems.length} adet):</div>
                              {tutarsizlik.affectedItems.length > 5 && (
                                <button
                                  onClick={() => setSelectedTutarsizlik(tutarsizlik)}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                                >
                                  Tümünü Görüntüle
                                </button>
                              )}
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {tutarsizlik.affectedItems.slice(0, 5).map((item, idx) => (
                                <li key={idx} className="break-words">
                                  {typeof item === 'string' ? item : JSON.stringify(item)}
                                </li>
                              ))}
                              {tutarsizlik.affectedItems.length > 5 && (
                                <li className="text-gray-400 font-medium">
                                  ve {tutarsizlik.affectedItems.length - 5} adet daha...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        {tutarsizlik.canAutoFix && (
                          <button
                            onClick={() => handleTutarsizlikDuzelt(tutarsizlik)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition-colors"
                          >
                            Düzelt
                          </button>
                        )}
                        {tutarsizlik.affectedItems && tutarsizlik.affectedItems.length > 5 && (
                          <button
                            onClick={() => setSelectedTutarsizlik(tutarsizlik)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs hover:bg-indigo-700 transition-colors"
                          >
                            Detay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setTutarsizlikModalOpen(false)
                setTutarsizlikRaporlari([])
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
            <button
              onClick={() => {
                setTutarsizlikModalOpen(false)
                setTutarsizlikRaporlari([])
                handleTutarsizlikKontrol()
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Yeniden Kontrol Et
            </button>
          </div>
        </div>
      </Modal>

      {/* Detaylı Tutarsızlık Görüntüleme Modal */}
      {selectedTutarsizlik && (
        <Modal
          isOpen={!!selectedTutarsizlik}
          onClose={() => {
            setSelectedTutarsizlik(null)
            setTutarsizlikCurrentPage(1)
          }}
          title={`Detaylı Görüntüleme: ${
            selectedTutarsizlik.type === 'COKLU_KOORDINATOR' ? 'Çoklu Koordinatör' :
            selectedTutarsizlik.type === 'EKSIK_KOORDINATOR' ? 'Eksik Koordinatör' :
            selectedTutarsizlik.type === 'HATALI_ATAMA' ? 'Alan Uyumsuzluğu' :
            selectedTutarsizlik.type === 'SURESI_GECMIS_AKTIF' ? 'Süresi Geçmiş' :
            selectedTutarsizlik.type === 'USTA_OGRETICI_EKSIK' ? 'Usta Öğreticisi Eksik' : 'Tutarsızlık'
          }`}
        >
          <div className="space-y-4">
            <div className={`border rounded-lg p-4 ${
              selectedTutarsizlik.severity === 'HIGH' ? 'border-red-200 bg-red-50' :
              selectedTutarsizlik.severity === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <h4 className="font-medium text-gray-900 mb-2">
                {selectedTutarsizlik.description}
              </h4>
              {selectedTutarsizlik.solution && (
                <div className="bg-white/50 border border-gray-200 rounded p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Önerilen Çözüm:</div>
                  <div className="text-sm text-gray-600">{selectedTutarsizlik.solution}</div>
                </div>
              )}
            </div>

            {selectedTutarsizlik.affectedItems && selectedTutarsizlik.affectedItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">
                    Etkilenen Öğeler ({selectedTutarsizlik.affectedItems.length} adet)
                  </h5>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedTutarsizlik.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                    selectedTutarsizlik.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedTutarsizlik.severity === 'HIGH' ? 'Yüksek' :
                     selectedTutarsizlik.severity === 'MEDIUM' ? 'Orta' : 'Düşük'} Öncelik
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(() => {
                    const startIndex = (tutarsizlikCurrentPage - 1) * tutarsizlikItemsPerPage
                    const endIndex = startIndex + tutarsizlikItemsPerPage
                    const paginatedItems = selectedTutarsizlik.affectedItems.slice(startIndex, endIndex)
                    
                    return paginatedItems.map((item, idx) => (
                      <div key={startIndex + idx} className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 mr-2">
                              #{startIndex + idx + 1}
                            </span>
                            <span className="text-sm text-gray-900 break-words">
                              {typeof item === 'string' ? item : JSON.stringify(item)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {/* Pagination for Detail Modal */}
                {selectedTutarsizlik.affectedItems.length > tutarsizlikItemsPerPage && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-700">
                      {((tutarsizlikCurrentPage - 1) * tutarsizlikItemsPerPage) + 1} - {Math.min(tutarsizlikCurrentPage * tutarsizlikItemsPerPage, selectedTutarsizlik.affectedItems.length)} / {selectedTutarsizlik.affectedItems.length} öğe
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTutarsizlikCurrentPage(Math.max(1, tutarsizlikCurrentPage - 1))}
                        disabled={tutarsizlikCurrentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      <span className="text-sm text-gray-700">
                        Sayfa {tutarsizlikCurrentPage} / {Math.ceil(selectedTutarsizlik.affectedItems.length / tutarsizlikItemsPerPage)}
                      </span>
                      
                      <button
                        onClick={() => setTutarsizlikCurrentPage(Math.min(Math.ceil(selectedTutarsizlik.affectedItems.length / tutarsizlikItemsPerPage), tutarsizlikCurrentPage + 1))}
                        disabled={tutarsizlikCurrentPage === Math.ceil(selectedTutarsizlik.affectedItems.length / tutarsizlikItemsPerPage)}
                        className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {selectedTutarsizlik.canAutoFix && (
                <button
                  onClick={() => {
                    handleTutarsizlikDuzelt(selectedTutarsizlik)
                    setSelectedTutarsizlik(null)
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Otomatik Düzelt
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedTutarsizlik(null)
                  setTutarsizlikCurrentPage(1)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}