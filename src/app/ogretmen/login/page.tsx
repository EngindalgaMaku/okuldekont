'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Lock, Building, ChevronDown, Loader, AlertTriangle, Search } from 'lucide-react'
import PinPad from '@/components/ui/PinPad'
import { checkMaintenanceMode } from '@/lib/maintenance'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function OgretmenLoginPage() {
  const router = useRouter()
  const [selectedOgretmen, setSelectedOgretmen] = useState<Ogretmen | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Ogretmen[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // Maintenance mode state
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceCheckLoading, setMaintenanceCheckLoading] = useState(true)

  // Debounced search term - 300ms bekle
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Server-side arama fonksiyonu
  const searchOgretmenler = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const { data, error } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')
        .or(`ad.ilike.%${term}%,soyad.ilike.%${term}%`)
        .limit(10)
        .order('ad')

      if (data && !error) {
        setSearchResults(data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Öğretmen arama hatası:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Check maintenance mode on component mount
  useEffect(() => {
    const checkMaintenance = async () => {
      setMaintenanceCheckLoading(true)
      const { isMaintenanceMode: maintenanceStatus } = await checkMaintenanceMode()
      setIsMaintenanceMode(maintenanceStatus)
      setMaintenanceCheckLoading(false)
    }
    
    checkMaintenance()
  }, [])

  // Debounced search term değiştiğinde arama yap
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchOgretmenler(debouncedSearchTerm)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearchTerm, searchOgretmenler])

  // PIN 4 hane olduğunda otomatik giriş yap
  useEffect(() => {
    if (pinInput.length === 4 && !isLoggingIn) {
      handlePinSubmit()
    }
  }, [pinInput, isLoggingIn])

  const handleItemSelect = (ogretmen: Ogretmen) => {
    setSelectedOgretmen(ogretmen)
    setSearchTerm(`${ogretmen.ad} ${ogretmen.soyad}`)
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const resetSelection = () => {
    setSelectedOgretmen(null)
    setSearchTerm('')
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const handlePinSubmit = async () => {
    if (isLoggingIn) return
    
    setIsLoggingIn(true)
    
    // Check maintenance mode before login attempt
    const { isMaintenanceMode: currentMaintenanceStatus } = await checkMaintenanceMode()
    if (currentMaintenanceStatus) {
      setPinError('Sistem şu anda bakım modunda. Giriş yapılamaz.')
      setIsLoggingIn(false)
      return
    }
    
    if (!selectedOgretmen) {
      setPinError('Lütfen bir öğretmen seçin')
      setIsLoggingIn(false)
      return
    }

    if (!pinInput.trim() || pinInput.length !== 4) {
      setPinError('PIN kodu 4 haneli olmalıdır')
      setIsLoggingIn(false)
      return
    }

    try {
      setPinError('')
      
      // PIN kontrolü
      const { data: pinResult, error: pinError } = await supabase
        .rpc('check_ogretmen_pin_giris', {
          p_ogretmen_id: selectedOgretmen.id,
          p_girilen_pin: pinInput,
          p_ip_adresi: '127.0.0.1',
          p_user_agent: navigator.userAgent
        })

      if (pinError) {
        setPinError('Sistem hatası: ' + pinError.message)
        setIsLoggingIn(false)
        return
      }

      if (!pinResult) {
        setPinError('PIN kontrol fonksiyonu yanıt vermedi')
        setIsLoggingIn(false)
        return
      }

      if (!pinResult.basarili) {
        if (pinResult.kilitli) {
          setPinError(pinResult.mesaj + (pinResult.kilitlenme_tarihi ? 
            ` (${new Date(pinResult.kilitlenme_tarihi).toLocaleString('tr-TR')})` : ''))
        } else {
          setPinError(pinResult.mesaj)
        }
        return
      }

      // 2. Başarılı giriş - session kaydet ve redirect
      sessionStorage.setItem('ogretmen_id', selectedOgretmen.id)
      
      setTimeout(() => {
        router.push('/ogretmen/panel')
      }, 1000)

    } catch (error) {
      setPinError('Beklenmeyen bir hata oluştu: ' + (error as Error).message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Loading state for maintenance check
  if (maintenanceCheckLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-600 mt-4 text-center">Sistem kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  // Maintenance mode display
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">Sistem Bakımda</h1>
              <p className="text-red-700 mb-4">Öğretmen paneli şu anda bakım modunda olduğu için giriş yapılamaz.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600 mb-2">
                <strong>Bakım nedenleri:</strong>
              </p>
              <ul className="text-xs text-red-600 space-y-1">
                <li>• Sistem güncellemeleri</li>
                <li>• Veritabanı bakımı</li>
                <li>• Güvenlik iyileştirmeleri</li>
              </ul>
            </div>

            <p className="text-sm text-red-600 text-center mb-6">
              Lütfen daha sonra tekrar deneyin. Acil durumlarda sistem yöneticisi ile iletişime geçin.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Öğretmen Girişi</h1>
            <p className="text-gray-600">Öğretmen adınızı arayın ve PIN kodunuzu girin</p>
          </div>

          <div className="space-y-6">
          {/* Öğretmen Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğretmen Seçin
            </label>
            <div className="relative">
              {/* Arama input'u */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setIsDropdownOpen(true)
                    if (e.target.value === '') {
                      resetSelection()
                    }
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true)
                    if (searchTerm.length >= 2) {
                      searchOgretmenler(searchTerm)
                    }
                  }}
                  onBlur={() => {
                    // Timeout ile kapat ki item seçimi çalışsın
                    setTimeout(() => setIsDropdownOpen(false), 150)
                  }}
                  placeholder="Öğretmen adı yazın (min. 2 karakter)..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                  {isSearching && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                  )}
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Seçilen öğretmen gösterimi */}
              {selectedOgretmen && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-blue-700">
                      <User className="h-4 w-4" />
                      {selectedOgretmen.ad} {selectedOgretmen.soyad}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetSelection()
                        setPinError('')
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>
              )}

              {/* Arama sonuçları */}
              {isDropdownOpen && (searchResults.length > 0 || isSearching || (searchTerm.length >= 2 && searchResults.length === 0)) && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                        Aranıyor...
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((ogretmen) => (
                      <button
                        key={ogretmen.id}
                        type="button"
                        onClick={() => handleItemSelect(ogretmen)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{ogretmen.ad} {ogretmen.soyad}</div>
                        </div>
                      </button>
                    ))
                  ) : searchTerm.length >= 2 ? (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      <div className="flex flex-col items-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <span>"{searchTerm}" için sonuç bulunamadı</span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-center text-sm">
                      Arama yapmak için en az 2 karakter yazın
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* PIN Pad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                PIN Kodunuzu Girin
              </label>
              <PinPad
                value={pinInput}
                onChange={(value) => {
                  setPinInput(value)
                  setPinError('')
                }}
                maxLength={4}
                disabled={!selectedOgretmen || isLoggingIn}
              />
            </div>

            {pinError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{pinError}</p>
              </div>
            )}

            {isLoggingIn && (
              <div className="flex items-center justify-center space-x-2 text-blue-600 p-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm">Giriş yapılıyor...</span>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Ana sayfaya dön
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 