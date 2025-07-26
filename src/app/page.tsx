'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ChevronDownIcon, MagnifyingGlassIcon, BuildingOfficeIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import PinPad from '@/components/ui/PinPad'
import { DatabaseStatusHeader } from '@/components/ui/DatabaseStatus'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'

interface Isletme {
    id: string
    name: string
    contact: string
}
  
interface Ogretmen {
    id: string
    name: string
    surname: string
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

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loginType, setLoginType] = useState<'isletme' | 'ogretmen'>('isletme')
  
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [selectedOgretmen, setSelectedOgretmen] = useState<Ogretmen | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<(Isletme | Ogretmen)[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [step, setStep] = useState(1)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)

  // Use EgitimYiliContext for school name
  const { okulAdi } = useEgitimYili()

  // Debounced search term - 300ms bekle
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Backend'te arama yap
  const searchInDatabase = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    console.log(`🔍 [${loginType}] Arama başlatıldı:`, term)

    try {
      if (loginType === 'isletme') {
        console.log('🏢 İşletme arama query çalıştırılıyor...')
        const response = await fetch(`/api/search/companies?term=${encodeURIComponent(term)}&limit=10`)
        
        if (!response.ok) {
          throw new Error('İşletme arama başarısız')
        }
        
        const data = await response.json()
        console.log('🏢 İşletme arama sonucu:', { data, count: data?.length })
        
        if (data && Array.isArray(data)) {
          console.log('✅ İşletme sonuçları:', data.length, 'adet')
          setSearchResults(data)
        } else {
          console.log('⚠️ İşletme verisi geçersiz')
          setSearchResults([])
        }
      } else {
        console.log('👨‍🏫 Öğretmen arama query çalıştırılıyor...')
        const response = await fetch(`/api/search/teachers?term=${encodeURIComponent(term)}&limit=10`)
        
        if (!response.ok) {
          throw new Error('Öğretmen arama başarısız')
        }
        
        const data = await response.json()
        console.log('👨‍🏫 Öğretmen arama sonucu:', { data, count: data?.length })

        if (data && Array.isArray(data)) {
          console.log('✅ Öğretmen sonuçları:', data.length, 'adet')
          setSearchResults(data)
        } else {
          console.log('⚠️ Öğretmen verisi geçersiz')
          setSearchResults([])
        }
      }
    } catch (error) {
      console.error('💥 Beklenmeyen arama hatası:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
      console.log('🔍 Arama tamamlandı')
    }
  }, [loginType])

  // School name will be loaded from EgitimYiliContext

  // Debounced search term değiştiğinde arama yap
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchInDatabase(debouncedSearchTerm)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearchTerm, searchInDatabase])

  // Login type değiştiğinde temizle
  useEffect(() => {
    resetSelection()
  }, [loginType])

  const handleSelectAndProceed = async () => {
    if (loginType === 'isletme' && !selectedIsletme) {
      showToast({
        type: 'warning',
        title: 'Seçim Yapınız',
        message: 'Lütfen devam etmek için bir işletme seçin.',
        duration: 4000
      })
      return
    }
    if (loginType === 'ogretmen' && !selectedOgretmen) {
      showToast({
        type: 'warning',
        title: 'Seçim Yapınız',
        message: 'Lütfen devam etmek için bir öğretmen seçin.',
        duration: 4000
      })
      return
    }
    setPinError('')
    setStep(2)
    showToast({
      type: 'info',
      title: 'PIN Girişi',
      message: 'Lütfen 4 haneli PIN kodunuzu girin.',
      duration: 3000
    })
  }

  const handlePinSubmit = async () => {
    // Prevent multiple submissions
    const now = Date.now()
    if (isLoggingIn || (now - lastSubmitTime) < 1000) {
      return
    }
    
    setLastSubmitTime(now)
    setPinError('')
    setIsLoggingIn(true)

    const isIsletme = loginType === 'isletme'
    const selectedEntity = isIsletme ? selectedIsletme : selectedOgretmen

    if (!selectedEntity) {
      showToast({
        type: 'error',
        title: 'Seçim Hatası',
        message: 'Bir seçim yapılmamış. Lütfen geri dönüp tekrar deneyin.',
        duration: 5000
      })
      setIsLoggingIn(false)
      return
    }

    if (!pinInput || pinInput.length !== 4) {
      showToast({
        type: 'warning',
        title: 'Geçersiz PIN',
        message: 'Lütfen 4 haneli PIN kodunuzu tam olarak girin.',
        duration: 4000
      })
      setIsLoggingIn(false)
      return
    }

    try {
      // Direct PIN check instead of NextAuth
      const response = await fetch('/api/auth/check-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: isIsletme ? 'isletme' : 'ogretmen',
          entityId: selectedEntity.id,
          pin: pinInput
        })
      })

      const result = await response.json()

      if (result.success) {
        // Store login data in localStorage
        const loginData = {
          ...selectedEntity,
          loginType: isIsletme ? 'isletme' : 'ogretmen'
        }
        
        localStorage.setItem(isIsletme ? 'isletme' : 'ogretmen', JSON.stringify(loginData))
        
        // Also store in sessionStorage for compatibility with existing pages
        if (isIsletme) {
          sessionStorage.setItem('isletme_id', selectedEntity.id)
        } else {
          sessionStorage.setItem('ogretmen_id', selectedEntity.id)
        }
        
        // Başarılı giriş bildirimi
        const entityName = isIsletme
          ? (selectedEntity as Isletme).name
          : `${(selectedEntity as Ogretmen).name} ${(selectedEntity as Ogretmen).surname}`
        
        showToast({
          type: 'success',
          title: 'Giriş Başarılı',
          message: `Hoşgeldiniz, ${entityName}!`,
          duration: 3000
        })

        // Clear PIN and redirect
        setPinInput('')
        setTimeout(() => {
          if (isIsletme) {
            router.push('/isletme')
          } else {
            router.push('/ogretmen/panel')
          }
        }, 1000)
      } else {
        // Handle error
        setPinError(result.error || 'Hatalı PIN kodu')
        showToast({
          type: 'error',
          title: 'Giriş Başarısız',
          message: result.error || 'Hatalı PIN kodu',
          duration: 4000
        })
        setPinInput('') // Clear PIN on error
        setIsLoggingIn(false)
      }
      
    } catch (error) {
      console.error('PIN check error:', error)
      setPinError('Sistem hatası oluştu')
      showToast({
        type: 'error',
        title: 'Sistem Hatası',
        message: 'Bağlantı hatası. Lütfen tekrar deneyin.',
        duration: 4000
      })
      setPinInput('') // Clear PIN on error
      setIsLoggingIn(false)
    }
  }

  // PIN 4 hane olduğunda otomatik giriş yap (debounced)
  useEffect(() => {
    if (pinInput.length === 4 && step === 2 && !isLoggingIn) {
      const timer = setTimeout(() => {
        handlePinSubmit()
      }, 500) // 500ms delay to prevent multiple submissions
      
      return () => clearTimeout(timer)
    }
  }, [pinInput, step, isLoggingIn])

  const handleItemSelect = (item: Isletme | Ogretmen) => {
    if (loginType === 'isletme') {
      setSelectedIsletme(item as Isletme)
      setSearchTerm((item as Isletme).name)
    } else {
      setSelectedOgretmen(item as Ogretmen)
      setSearchTerm(`${(item as Ogretmen).name} ${(item as Ogretmen).surname}`)
    }
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const resetSelection = () => {
    setSelectedIsletme(null)
    setSelectedOgretmen(null)
    setSearchTerm('')
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const renderSmartAutoComplete = () => {
    const placeholder = loginType === 'isletme' 
      ? 'İşletme adı yazın (min. 2 karakter)...' 
      : 'Öğretmen adı yazın (min. 2 karakter)...'
    
    const selected = loginType === 'isletme' ? selectedIsletme : selectedOgretmen
    const showResults = isDropdownOpen && (searchResults.length > 0 || isSearching || (searchTerm.length >= 2 && searchResults.length === 0))
    
    return (
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                searchInDatabase(searchTerm)
              }
            }}
            onBlur={() => {
              // Timeout ile kapat ki item seçimi çalışsın
              setTimeout(() => setIsDropdownOpen(false), 150)
            }}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            placeholder={placeholder}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mr-2"></div>
            )}
            <ChevronDownIcon 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        
        {showResults && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            {isSearching ? (
              <div className="px-4 py-3 text-gray-500 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mr-2"></div>
                  Aranıyor...
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => {
                const displayName = loginType === 'isletme'
                  ? (item as Isletme).name
                  : `${(item as Ogretmen).name} ${(item as Ogretmen).surname}`
                
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => handleItemSelect(item)}
                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                  >
                    <div className="flex items-center">
                      {loginType === 'isletme' ? (
                        <BuildingOfficeIcon className="h-5 w-5 text-indigo-500 mr-3" />
                      ) : (
                        <AcademicCapIcon className="h-5 w-5 text-indigo-500 mr-3" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{displayName}</div>
                        {loginType === 'isletme' && (
                          <div className="text-sm text-gray-500">Yetkili: {(item as Isletme).contact}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : searchTerm.length >= 2 ? (
              <div className="px-4 py-3 text-gray-500 text-center">
                <div className="flex flex-col items-center">
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mb-2" />
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
    )
  }

  const renderPinInput = () => (
    <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">PIN Girişi</h2>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-700 font-medium">
              {loginType === 'isletme' ? selectedIsletme?.name : `${selectedOgretmen?.name} ${selectedOgretmen?.surname}`}
            </p>
          </div>
        </div>
        
        <PinPad
          value={pinInput}
          onChange={setPinInput}
          disabled={isLoggingIn}
          maxLength={4}
        />
        
        {pinError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{pinError}</p>
          </div>
        )}
        
        <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setPinInput('');
                setPinError('');
                setIsLoggingIn(false);
                setLastSubmitTime(0);
              }}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              ← Geri dön
            </button>
            {isLoggingIn && (
              <div className="ml-4 flex items-center space-x-2 text-indigo-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                <span className="text-sm">Giriş yapılıyor...</span>
              </div>
            )}
        </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center">
                <div className="mx-auto w-48 h-36 flex items-center justify-center mb-4">
                  <img
                    src="/images/logo2.png"
                    alt="Logo"
                    className="h-36 w-48 object-contain"
                  />
                </div>
                <p className="text-gray-600 mt-1">{okulAdi}</p>
            </div>
            
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setLoginType('isletme')}
                            className={`flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                              loginType === 'isletme'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                            İşletme
                        </button>
                        <button
                            onClick={() => setLoginType('ogretmen')}
                            className={`flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                              loginType === 'ogretmen'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <AcademicCapIcon className="h-5 w-5 mr-2" />
                            Öğretmen
                        </button>
                    </div>

                    {renderSmartAutoComplete()}
                    
                    {pinError && step === 1 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600 text-center">{pinError}</p>
                      </div>
                    )}
                    
                    <button
                        onClick={handleSelectAndProceed}
                        disabled={!(selectedIsletme || selectedOgretmen)}
                        className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 transform ${
                          (selectedIsletme || selectedOgretmen)
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Devam Et →
                    </button>
                </div>
            )}

            {step === 2 && renderPinInput()}
            
            <DatabaseStatusHeader />
        </div>
    </div>
  )
} 