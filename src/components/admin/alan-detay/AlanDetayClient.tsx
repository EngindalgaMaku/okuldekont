'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, Users, GraduationCap, Building2, Loader } from 'lucide-react'
import AlanDetayHeader from './AlanDetayHeader'
import OgretmenlerTab from './OgretmenlerTab'
import SiniflarTab from './SiniflarTab'
import OgrencilerTab from './OgrencilerTab'
import IsletmelerTab from './IsletmelerTab'

interface Alan {
  id: string;
  ad: string;
  aciklama?: string;
  aktif: boolean;
}

interface Counts {
  ogretmenler: number;
  siniflar: number;
  ogrenciler: number;
  isletmeler: number;
}

interface OgrencilerData {
  data: any[];
  totalPages: number;
  currentPage: number;
  total: number;
}

interface AlanDetayClientProps {
  alan: Alan;
  counts: Counts;
  initialActiveTab: string;
  alanId: string;
}

export default function AlanDetayClient({ 
  alan, 
  counts, 
  initialActiveTab, 
  alanId 
}: AlanDetayClientProps) {
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [tabData, setTabData] = useState<{
    ogretmenler?: any[];
    siniflar?: any[];
    ogrenciler?: OgrencilerData;
    isletmeler?: any[];
  }>({})
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({})
  const [dynamicCounts, setDynamicCounts] = useState(counts)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  const loadedTabsRef = useRef<Set<string>>(new Set())
  const loadingTabsRef = useRef<Record<string, boolean>>({})

  // Tab verisini lazy load et
  const loadTabData = useCallback(async (tabName: string, page: number = 1) => {
    // Eğer zaten yüklendiyse ve öğrenciler sekmesi değilse skip et
    if (loadedTabsRef.current.has(tabName) && tabName !== 'ogrenciler') {
      return
    }

    // Eğer zaten yükleniyorsa, çift yükleme engelle
    if (loadingTabsRef.current[tabName]) {
      return
    }

    loadingTabsRef.current = { ...loadingTabsRef.current, [tabName]: true }
    setLoadingTabs(prev => ({ ...prev, [tabName]: true }))

    try {
      let url = `/api/admin/alanlar/${alanId}/${tabName}`
      if (tabName === 'ogrenciler') {
        url += `?page=${page}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Veri yüklenemedi')
      
      const data = await response.json()
      
      setTabData(prev => ({
        ...prev,
        [tabName]: data
      }))
      
      loadedTabsRef.current = new Set([...Array.from(loadedTabsRef.current), tabName])
      setLoadedTabs(prev => new Set([...Array.from(prev), tabName]))
    } catch (error) {
      console.error(`${tabName} verisi yüklenirken hata:`, error)
    } finally {
      loadingTabsRef.current = { ...loadingTabsRef.current, [tabName]: false }
      setLoadingTabs(prev => ({ ...prev, [tabName]: false }))
    }
  }, [alanId])

  // Tab verilerini yenileme fonksiyonu
  const refreshTabData = useCallback((tabName?: string) => {
    if (tabName) {
      // Belirli bir tab'ı yenile
      setTabData(prev => {
        const newData = { ...prev }
        delete newData[tabName as keyof typeof newData]
        return newData
      })
      loadedTabsRef.current.delete(tabName)
      setLoadedTabs(prev => {
        const newSet = new Set(Array.from(prev))
        newSet.delete(tabName)
        return newSet
      })
      loadTabData(tabName)
    } else {
      // Tüm tab verilerini temizle ve aktif tab'ı yenile
      setTabData({})
      loadedTabsRef.current = new Set()
      setLoadedTabs(new Set())
      loadTabData(activeTab)
    }
  }, [loadTabData, activeTab])

  // Count güncelleme fonksiyonu - useCallback ile optimize
  const updateCount = useCallback((tabName: string, count: number) => {
    setDynamicCounts(prev => ({
      ...prev,
      [tabName]: count
    }))
  }, [])

  // İşletmeler count handler - sabit referans
  const handleIsletmelerCountChange = useCallback((count: number) => {
    updateCount('isletmeler', count)
  }, [updateCount])

  // Tab değiştiğinde veriyi yükle
  useEffect(() => {
    loadTabData(activeTab)
    // Öğrenciler tabı açıldığında sınıfları da yükle
    if (activeTab === 'ogrenciler' && !loadedTabsRef.current.has('siniflar')) {
      loadTabData('siniflar')
    }
  }, [activeTab, loadTabData])

  // Initial tab'ı sadece bir kez yükle
  useEffect(() => {
    loadTabData(initialActiveTab)
    // İlk tab öğrenciler ise sınıfları da yükle
    if (initialActiveTab === 'ogrenciler' && !loadedTabsRef.current.has('siniflar')) {
      loadTabData('siniflar')
    }
  }, [loadTabData, initialActiveTab])

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)
    // URL'i güncelle (shallow navigation)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabName)
    window.history.pushState({}, '', url.toString())
  }

  const handleOgrencilerPageChange = useCallback((page: number) => {
    loadTabData('ogrenciler', page)
  }, [loadTabData])

  const renderTabContent = () => {
    const isLoading = loadingTabs[activeTab]
    const data = tabData[activeTab as keyof typeof tabData]

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <Loader className="animate-spin h-5 w-5 text-indigo-600" />
            <span className="text-gray-600">Veriler yükleniyor...</span>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'ogretmenler':
        return data ? (
          <OgretmenlerTab 
            ogretmenler={data as any[]} 
            alanId={alanId} 
            alanAd={alan.ad} 
          />
        ) : null

      case 'siniflar':
        return data ? (
          <SiniflarTab 
            initialSiniflar={data as any[]} 
            alanId={alanId} 
          />
        ) : null

      case 'ogrenciler':
        const ogrencilerData = data as OgrencilerData
        return ogrencilerData ? (
          <OgrencilerTab
            initialOgrenciler={ogrencilerData.data}
            initialTotalOgrenciler={ogrencilerData.total}
            initialTotalPages={ogrencilerData.totalPages}
            initialCurrentPage={ogrencilerData.currentPage}
            siniflar={tabData.siniflar || []}
            alanId={alanId}
            onDataChange={refreshTabData}
          />
        ) : null

      case 'isletmeler':
        return data ? (
          <IsletmelerTab
            alanId={alanId}
            initialIsletmeListesi={data as any[]}
            onCountChange={handleIsletmelerCountChange}
          />
        ) : null

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <AlanDetayHeader alan={alan} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => handleTabChange('ogretmenler')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'ogretmenler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Öğretmenler</span>
                <span className="sm:hidden">Öğrt.</span>
                <span>({dynamicCounts.ogretmenler})</span>
                {loadingTabs.ogretmenler && <Loader className="animate-spin h-3 w-3 sm:h-4 sm:w-4" />}
              </button>

              <button
                onClick={() => handleTabChange('siniflar')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'siniflar'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Sınıflar</span>
                <span className="sm:hidden">Sınıf</span>
                <span>({dynamicCounts.siniflar})</span>
                {loadingTabs.siniflar && <Loader className="animate-spin h-3 w-3 sm:h-4 sm:w-4" />}
              </button>

              <button
                onClick={() => handleTabChange('ogrenciler')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'ogrenciler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Öğrenciler</span>
                <span className="sm:hidden">Öğrn.</span>
                <span>({dynamicCounts.ogrenciler})</span>
                {loadingTabs.ogrenciler && <Loader className="animate-spin h-3 w-3 sm:h-4 sm:w-4" />}
              </button>

              <button
                onClick={() => handleTabChange('isletmeler')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'isletmeler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">İşletmeler</span>
                <span className="sm:hidden">İşltm.</span>
                <span>({dynamicCounts.isletmeler})</span>
                {loadingTabs.isletmeler && <Loader className="animate-spin h-3 w-3 sm:h-4 sm:w-4" />}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-4 lg:p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}