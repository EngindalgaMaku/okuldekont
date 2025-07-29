'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Building, Lock, ChevronDown, Loader, AlertTriangle, Search } from 'lucide-react'
import PinPad from '@/components/ui/PinPad'

interface Isletme {
  id: string;
  name: string;
  contact: string;
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

export default function IsletmeLoginPage() {
  const router = useRouter()
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Isletme[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // Maintenance mode state
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceCheckLoading, setMaintenanceCheckLoading] = useState(true)

  // Debounced search term - 300ms bekle
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Server-side arama fonksiyonu
  const searchIsletmeler = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search/companies?term=${encodeURIComponent(term)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        // API'den gelen veriyi Isletme arayüzüne uygun hale getir
        const formattedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          contact: item.contact,
        }));
        setSearchResults(formattedData);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('İşletme arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Check maintenance mode on component mount
  useEffect(() => {
    const checkMaintenance = async () => {
      setMaintenanceCheckLoading(true)
      try {
        // Use API route to check maintenance mode with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch('/api/maintenance', {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const result = await response.json()
          setIsMaintenanceMode(result.isMaintenanceMode)
        } else {
          // If API fails, assume system is not in maintenance mode
          setIsMaintenanceMode(false)
        }
      } catch (error) {
        console.error('Maintenance check failed:', error)
        // If maintenance check fails, assume system is not in maintenance mode
        setIsMaintenanceMode(false)
      } finally {
        setMaintenanceCheckLoading(false)
      }
    }
    
    checkMaintenance()
  }, [])

  // Debounced search term değiştiğinde arama yap
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchIsletmeler(debouncedSearchTerm)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearchTerm, searchIsletmeler])

  // PIN 4 hane olduğunda otomatik giriş yap
  useEffect(() => {
    if (pinInput.length === 4 && !isLoggingIn) {
      handlePinSubmit()
    }
  }, [pinInput, isLoggingIn])

  const handleItemSelect = (isletme: Isletme) => {
    setSelectedIsletme(isletme);
    setSearchTerm(`${isletme.name}`);
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const resetSelection = () => {
    setSelectedIsletme(null)
    setSearchTerm('')
    setIsDropdownOpen(false)
    setSearchResults([])
  }

  const handlePinSubmit = async () => {
    console.log('🚀 LOGIN: handlePinSubmit başladı', {
      isLoggingIn,
      selectedIsletme: selectedIsletme?.id,
      pinLength: pinInput.length
    });
    
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setPinError('');

    console.log('🔧 LOGIN: Maintenance check başlıyor...');

    // Check maintenance mode before login attempt
    try {
      const response = await fetch('/api/maintenance')
      if (response.ok) {
        const { isMaintenanceMode: currentMaintenanceStatus } = await response.json()
        if (currentMaintenanceStatus) {
          console.log('⚠️ LOGIN: Maintenance mode aktif');
          setPinError('Sistem şu anda bakım modunda. Giriş yapılamaz.');
          setIsLoggingIn(false);
          return;
        }
      }
    } catch (error) {
      console.error('Maintenance check failed during login:', error)
      // Continue with login if maintenance check fails
    }
    
    console.log('✅ LOGIN: Maintenance check tamamlandı');
    
    if (!selectedIsletme) {
      console.log('❌ LOGIN: İşletme seçilmemiş');
      setPinError('Lütfen bir işletme seçin');
      setIsLoggingIn(false);
      return;
    }

    if (!pinInput.trim() || pinInput.length !== 4) {
      console.log('❌ LOGIN: PIN geçersiz', { pinLength: pinInput.length });
      setPinError('PIN kodu 4 haneli olmalıdır');
      setIsLoggingIn(false);
      return;
    }

    console.log('🔒 LOGIN: PIN güvenlik kontrolü başlıyor...', {
      entityType: 'company',
      entityId: selectedIsletme.id
    });

    // PIN güvenlik kontrolü
    try {
      const securityResponse = await fetch('/api/auth/pin-security/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'company',
          entityId: selectedIsletme.id,
        }),
      });

      console.log('🔒 LOGIN: PIN güvenlik response:', securityResponse.status);

      if (securityResponse.ok) {
        const { securityStatus } = await securityResponse.json();
        if (securityStatus.isLocked) {
          const lockEndTime = new Date(securityStatus.lockEndTime);
          const now = new Date();
          const remainingMinutes = Math.ceil((lockEndTime.getTime() - now.getTime()) / (1000 * 60));
          console.log('🔒 LOGIN: Hesap bloke edilmiş', { remainingMinutes });
          setPinError(`Hesabınız güvenlik nedeniyle bloke edilmiştir. ${remainingMinutes} dakika sonra tekrar deneyebilirsiniz.`);
          setIsLoggingIn(false);
          return;
        }
      }
    } catch (error) {
      console.error('Security check failed:', error);
      // Continue with login if security check fails
    }

    console.log('🔑 LOGIN: NextAuth signIn başlıyor...', {
      provider: 'pin',
      type: 'isletme',
      entityId: selectedIsletme.id,
      pinLength: pinInput.length
    });

    try {
      const result = await signIn('pin', {
        type: 'isletme',
        entityId: selectedIsletme.id,
        pin: pinInput,
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent,
        redirect: false,
      });

      console.log('🔑 LOGIN: NextAuth signIn tamamlandı', {
        result: {
          ok: result?.ok,
          error: result?.error,
          status: result?.status,
          url: result?.url
        }
      });

      if (result?.error) {
        console.log('❌ LOGIN: SignIn hatası', result.error);
        setPinError('Hatalı PIN kodu girdiniz veya hesabınız bloke edilmiştir.');
        setIsLoggingIn(false);
      } else if (result?.ok) {
        console.log('✅ LOGIN: SignIn başarılı, yönlendiriliyor...');
        router.push('/isletme');
      } else {
        console.log('❌ LOGIN: Bilinmeyen sonuç', result);
        setPinError('Bilinmeyen bir hata oluştu.');
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('🔥 LOGIN: SignIn exception:', error);
      setPinError('Giriş sırasında beklenmeyen bir hata oluştu.');
      setIsLoggingIn(false);
    }
  };

  // Loading state for maintenance check
  if (maintenanceCheckLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
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
              <p className="text-red-700 mb-4">İşletme paneli şu anda bakım modunda olduğu için giriş yapılamaz.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">İşletme Girişi</h1>
            <p className="text-gray-600">İşletme adınızı arayın ve PIN kodunuzu girin</p>
          </div>
          
          <div className="space-y-6">
          {/* İşletme Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme Seçin
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
                      searchIsletmeler(searchTerm)
                    }
                  }}
                  onBlur={() => {
                    // Timeout ile kapat ki item seçimi çalışsın
                    setTimeout(() => setIsDropdownOpen(false), 150)
                  }}
                  placeholder="İşletme adı yazın (min. 2 karakter)..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                  {isSearching && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent mr-2"></div>
                  )}
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Seçilen işletme gösterimi */}
              {selectedIsletme && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-orange-700">
                      <Building className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{selectedIsletme.name}</div>
                        {selectedIsletme.contact && (
                          <div className="text-xs text-orange-600">{selectedIsletme.contact}</div>
                        )}
                      </div>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetSelection()
                        setPinError('')
                      }}
                      className="text-orange-600 hover:text-orange-800 text-sm"
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
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent mr-2"></div>
                        Aranıyor...
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((isletme) => (
                      <button
                        key={isletme.id}
                        type="button"
                        onClick={() => handleItemSelect(isletme)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <Building className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{isletme.name}</div>
                          {isletme.contact && (
                            <div className="text-sm text-gray-500">{isletme.contact}</div>
                          )}
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
                disabled={!selectedIsletme || isLoggingIn}
              />
            </div>

            {pinError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{pinError}</p>
              </div>
            )}

            {isLoggingIn && (
              <div className="flex items-center justify-center space-x-2 text-orange-600 p-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
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