'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronDownIcon, MagnifyingGlassIcon, BuildingOfficeIcon, AcademicCapIcon } from '@heroicons/react/24/outline'

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
          .select('id, ad, yetkili_kisi')
          .ilike('ad', `%${term}%`)
          .limit(10)
          .order('ad')

        if (data && !error) {
          setSearchResults(data)
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

  const handleSelectAndProceed = () => {
    if (loginType === 'isletme' && !selectedIsletme) {
      setPinError('Lütfen bir işletme seçin.')
      return
    }
    if (loginType === 'ogretmen' && !selectedOgretmen) {
        setPinError('Lütfen bir öğretmen seçin.')
        return
    }
    setPinError('')
    setStep(2)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')
    
    try {
      if (loginType === 'isletme' && selectedIsletme) {
        // İşletme pin kontrolü
        const { data: pinResult, error: pinError } = await supabase
          .rpc('check_isletme_pin_giris', {
            p_isletme_id: selectedIsletme.id,
            p_girilen_pin: pinInput,
            p_ip_adresi: '127.0.0.1',
            p_user_agent: navigator.userAgent
          })

        if (pinError) {
          setPinError('Sistem hatası: ' + pinError.message)
          return
        }

        if (!pinResult) {
          setPinError('PIN kontrol fonksiyonu yanıt vermedi. Lütfen sistemi kontrol edin.')
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

        // Başarılı giriş
        try {
          // Önce anonim bir oturum aç
          const { data: { session }, error: sessionError } = await supabase.auth.signInAnonymously()
          if (sessionError) {
            setPinError('Oturum başlatılamadı: ' + sessionError.message)
            return
          }
          if (!session) {
            setPinError('Geçici oturum oluşturulamadı.')
            return
          }
          
          // Metadata'yı güncelle
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              isletme_id: selectedIsletme.id,
              role: 'isletme'
            }
          })

          if (updateError) {
            setPinError('Kullanıcı bilgileri güncellenemedi: ' + updateError.message)
            return
          }
          
          localStorage.setItem('isletme', JSON.stringify(selectedIsletme))
          router.push('/isletme')

        } catch (sessionError) {
            setPinError('Oturum başlatılırken bir hata oluştu.')
            return
        }

      } else if (loginType === 'ogretmen' && selectedOgretmen) {
        // Öğretmen pin kontrolü
        const { data: pinResult, error: pinError } = await supabase
          .rpc('check_ogretmen_pin_giris', {
            p_ogretmen_id: selectedOgretmen.id,
            p_girilen_pin: pinInput,
            p_ip_adresi: '127.0.0.1',
            p_user_agent: navigator.userAgent
          })

        if (pinError) {
          setPinError('Sistem hatası: ' + pinError.message)
          return
        }

        if (!pinResult) {
          setPinError('PIN kontrol fonksiyonu yanıt vermedi. Lütfen sistemi kontrol edin.')
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

        // Başarılı giriş
        try {
          // Önce anonim bir oturum aç
          const { data: { session }, error: sessionError } = await supabase.auth.signInAnonymously()
          if (sessionError) {
            setPinError('Oturum başlatılamadı: ' + sessionError.message)
            return
          }
          if (!session) {
            setPinError('Geçici oturum oluşturulamadı.')
            return
          }

          localStorage.setItem('ogretmen', JSON.stringify(selectedOgretmen))
          router.push('/ogretmen/panel')
        } catch (sessionError) {
          setPinError('Oturum başlatılırken bir hata oluştu.')
          return
        }
      }
    } catch (error) {
      setPinError('Beklenmeyen bir hata oluştu: ' + (error as Error).message)
    }
  }

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
    <form onSubmit={handlePinSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">PIN Girişi</h2>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-700 font-medium">
              {loginType === 'isletme' ? selectedIsletme?.ad : `${selectedOgretmen?.ad} ${selectedOgretmen?.soyad}`}
            </p>
          </div>
        </div>
        
        <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="w-full px-4 py-3 text-center text-lg tracking-widest border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            placeholder="• • • •"
            maxLength={4}
        />
        
        {pinError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{pinError}</p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
            <button 
              type="button" 
              onClick={() => { setStep(1); setPinInput(''); setPinError(''); }} 
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              ← Geri dön
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Giriş Yap
            </button>
        </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <AcademicCapIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Koordinatörlük Yönetimi</h1>
                <p className="text-gray-600 mt-1">Hüsniye Özdilek MTAL</p>
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
                        className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          (selectedIsletme || selectedOgretmen)
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg'
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