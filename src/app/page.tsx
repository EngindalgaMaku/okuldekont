'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronDownIcon, MagnifyingGlassIcon, BuildingOfficeIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import { getSchoolName } from '@/lib/settings'
import PinPad from '@/components/ui/PinPad'

interface Isletme {
    id: string
    ad: string
    yetkili_kisi: string
}
  
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

  // School name state
  const [schoolName, setSchoolName] = useState('Hüsniye Özdilek MTAL')

  // Debounced search term - 300ms bekle
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Backend'te arama yap
  const searchInDatabase = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      if (loginType === 'isletme') {
        const { data, error } = await supabase
          .from('isletmeler')
          .select('id, ad, yetkili_kisi, stajlar!inner(id)')
          .eq('stajlar.durum', 'aktif')
          .ilike('ad', `%${term}%`)
          .limit(10)
          .order('ad')

        if (data && !error) {
          const uniqueIsletmeler = Array.from(new Map(data.map(item => [item.id, item])).values());
          setSearchResults(uniqueIsletmeler);
        }
      } else {
        const { data, error } = await supabase
          .from('ogretmenler')
          .select('id, ad, soyad')
          .or(`ad.ilike.%${term}%,soyad.ilike.%${term}%`)
          .limit(10)
          .order('ad')

        if (data && !error) {
          setSearchResults(data)
        }
      }
    } catch (error) {
      console.error('Arama hatası:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [loginType])

  // Load school name on component mount
  useEffect(() => {
    const initializeApp = async () => {
      // Get school name
      const schoolNameFromDb = await getSchoolName()
      setSchoolName(schoolNameFromDb)
    }
    
    initializeApp()
  }, [])

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
    if (isLoggingIn) return
    
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

    const rpcName = isIsletme ? 'check_isletme_pin_giris' : 'check_ogretmen_pin_giris'
    const rpcParams = {
      ...(isIsletme ? { p_isletme_id: selectedEntity.id } : { p_ogretmen_id: selectedEntity.id }),
      p_girilen_pin: pinInput,
      // GÜVENLİK UYARISI: IP adresi sunucu tarafında alınmalıdır.
      // Bu, istemci tarafında güvenli bir şekilde yapılamaz.
      p_ip_adresi: '127.0.0.1',
      p_user_agent: navigator.userAgent
    }

    try {
      // 1. PIN Kontrolü
      const { data: pinResult, error: pinError } = await supabase.rpc(rpcName, rpcParams)

      if (pinError) {
        showToast({
          type: 'error',
          title: 'Sistem Hatası',
          message: `PIN kontrol hatası: ${pinError.message}`,
          duration: 6000
        })
        setIsLoggingIn(false)
        return
      }
      if (!pinResult) {
        showToast({
          type: 'error',
          title: 'Sistem Hatası',
          message: 'PIN kontrol fonksiyonu yanıt vermedi. Lütfen sistemi kontrol edin.',
          duration: 6000
        })
        setIsLoggingIn(false)
        return
      }
      if (!pinResult.basarili) {
        let errorMessage = pinResult.mesaj
        if (pinResult.kilitli && pinResult.kilitlenme_tarihi) {
          errorMessage += ` (${new Date(pinResult.kilitlenme_tarihi).toLocaleString('tr-TR')})`
        }
        showToast({
          type: 'error',
          title: 'Giriş Başarısız',
          message: errorMessage,
          duration: 6000
        })
        setPinError(errorMessage)
        setIsLoggingIn(false)
        return
      }

      // 2. Başarılı Giriş Bildirimi
      const entityName = isIsletme
        ? (selectedEntity as Isletme).ad
        : `${(selectedEntity as Ogretmen).ad} ${(selectedEntity as Ogretmen).soyad}`
      
      showToast({
        type: 'success',
        title: 'Giriş Başarılı',
        message: `Hoşgeldiniz, ${entityName}!`,
        duration: 3000
      })

      // 3. Session bilgilerini kaydet ve yönlendir
      if (isIsletme) {
        // İşletme girişi - sessionStorage'a kaydet
        sessionStorage.setItem('isletme_id', selectedEntity.id)
        
        // Yönlendirmeden önce kısa bir delay
        setTimeout(() => {
          router.push('/isletme')
        }, 1000)
      } else {
        // Öğretmen girişi - önceki gibi
        sessionStorage.setItem('ogretmen_id', selectedEntity.id)
        
        setTimeout(() => {
          router.push('/ogretmen/panel')
        }, 1000)
      }
      
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Beklenmeyen Hata',
        message: `Sistem hatası: ${(error as Error).message}`,
        duration: 6000
      })
      setIsLoggingIn(false)
    }
  }

  // PIN 4 hane olduğunda otomatik giriş yap
  useEffect(() => {
    if (pinInput.length === 4 && step === 2 && !isLoggingIn) {
      handlePinSubmit()
    }
  }, [pinInput, step, isLoggingIn])

  const handleItemSelect = (item: Isletme | Ogretmen) => {
    if (loginType === 'isletme') {
      setSelectedIsletme(item as Isletme)
      setSearchTerm((item as Isletme).ad)
    } else {
      setSelectedOgretmen(item as Ogretmen)
      setSearchTerm(`${(item as Ogretmen).ad} ${(item as Ogretmen).soyad}`)
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
                  ? (item as Isletme).ad 
                  : `${(item as Ogretmen).ad} ${(item as Ogretmen).soyad}`
                
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
                          <div className="text-sm text-gray-500">Yetkili: {(item as Isletme).yetkili_kisi}</div>
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
              {loginType === 'isletme' ? selectedIsletme?.ad : `${selectedOgretmen?.ad} ${selectedOgretmen?.soyad}`}
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
              onClick={() => { setStep(1); setPinInput(''); setPinError(''); }}
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
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <AcademicCapIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Koordinatörlük Yönetimi</h1>
                <p className="text-gray-600 mt-1">{schoolName}</p>
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
        </div>
    </div>
  )
} 