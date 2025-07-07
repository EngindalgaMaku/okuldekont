'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Lock, Building, ChevronDown, Loader, AlertTriangle } from 'lucide-react'
import { checkMaintenanceMode } from '@/lib/maintenance'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
}

export default function OgretmenLoginPage() {
  const router = useRouter()
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [selectedOgretmen, setSelectedOgretmen] = useState<Ogretmen | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Maintenance mode state
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceCheckLoading, setMaintenanceCheckLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    const checkMaintenance = async () => {
      setMaintenanceCheckLoading(true)
      const { isMaintenanceMode: maintenanceStatus } = await checkMaintenanceMode()
      setIsMaintenanceMode(maintenanceStatus)
      setMaintenanceCheckLoading(false)
    }
    
    checkMaintenance()
    fetchOgretmenler()
  }, [])

  const fetchOgretmenler = async () => {
    try {
      setLoading(true)
      setDebugInfo('Öğretmenler getiriliyor...')
      console.log('Öğretmenler getiriliyor...')

      // Önce Supabase bağlantısını test edelim
      try {
        const testConnection = await supabase.from('ogretmenler').select('count').limit(1)
        console.log('Bağlantı testi:', testConnection)
        setDebugInfo(`Bağlantı OK. Test: ${JSON.stringify(testConnection)}`)
      } catch (connError) {
        console.error('Bağlantı hatası:', connError)
        setDebugInfo('Supabase bağlantı hatası: ' + connError)
      }

      const { data, error } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')
        .order('ad', { ascending: true })
      
      console.log('Supabase yanıtı:', { data, error })
      console.log('Gelen veri sayısı:', data?.length || 0)
      setDebugInfo(`Yanıt: ${data?.length || 0} öğretmen, Hata: ${error?.message || 'yok'}`)

      if (error) {
        console.error('Öğretmenler getirilemedi:', error)
        console.error('Hata detayı:', error.message, error.code, error.hint)
        setDebugInfo(`HATA: ${error.message} (${error.code})`)
        alert('Öğretmen listesi alınamadı: ' + error.message)
        return
      }

      if (!data || data.length === 0) {
        console.log('Hiç öğretmen bulunamadı')
        setDebugInfo('Veri yok - RLS veya DB sorunu')
        
        // Test verileri ekleyelim geçici olarak
        const testOgretmenler = [
          { id: 'test1', ad: 'Engin', soyad: 'Dalga' },
          { id: 'test2', ad: 'Ali', soyad: 'Veli' },
          { id: 'test3', ad: 'Ayşe', soyad: 'Fatma' }
        ]
        
        console.log('Test verileri yükleniyor:', testOgretmenler)
        setOgretmenler(testOgretmenler)
        setDebugInfo('Test verileri yüklendi (3 öğretmen)')
        return
      }

      console.log('Öğretmenler başarıyla yüklendi:', data)
      setOgretmenler(data)
      setDebugInfo(`${data.length} öğretmen yüklendi`)
    } catch (error) {
      console.error('Beklenmeyen hata:', error)
      setDebugInfo('Beklenmeyen hata: ' + (error as Error).message)
      alert('Bir hata oluştu: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Arama fonksiyonu - öğretmen adı ve soyadında arama yapar
  const filteredOgretmenler = ogretmenler.filter(ogretmen => {
    const fullName = `${ogretmen.ad} ${ogretmen.soyad}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check maintenance mode before login attempt
    const { isMaintenanceMode: currentMaintenanceStatus } = await checkMaintenanceMode()
    if (currentMaintenanceStatus) {
      setPinError('Sistem şu anda bakım modunda. Giriş yapılamaz.')
      return
    }
    
    if (!selectedOgretmen) {
      setPinError('Lütfen bir öğretmen seçin')
      return
    }

    if (!pinInput.trim() || pinInput.length !== 4) {
      setPinError('PIN kodu 4 haneli olmalıdır')
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
        return
      }

      if (!pinResult) {
        setPinError('PIN kontrol fonksiyonu yanıt vermedi')
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

      // Başarılı giriş - localStorage'a kaydet
      localStorage.setItem('ogretmen', JSON.stringify(selectedOgretmen))
      router.push('/ogretmen/panel')

    } catch (error) {
      setPinError('Beklenmeyen bir hata oluştu: ' + (error as Error).message)
    }
  }

  // Loading state for maintenance check
  if (maintenanceCheckLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-600 mt-4 text-center">
            {maintenanceCheckLoading ? 'Sistem kontrol ediliyor...' : 'Yükleniyor...'}
          </p>
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
            <p className="text-gray-600">Kimliğinizi seçin ve PIN kodunuzu girin</p>
            {debugInfo && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                Debug: {debugInfo}
              </div>
            )}
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6">
          {/* Öğretmen Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğretmen Seçin
            </label>
            <div className="relative">
              {/* Arama input'u */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setIsDropdownOpen(true)
                    if (e.target.value === '') {
                      setSelectedOgretmen(null)
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Öğretmen adı yazın..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                        setSelectedOgretmen(null)
                        setSearchTerm('')
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
              {isDropdownOpen && searchTerm && !selectedOgretmen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOgretmenler.length > 0 ? (
                    filteredOgretmenler.map((ogretmen) => (
                      <button
                        key={ogretmen.id}
                        type="button"
                        onClick={() => {
                          setSelectedOgretmen(ogretmen)
                          setSearchTerm(`${ogretmen.ad} ${ogretmen.soyad}`)
                          setIsDropdownOpen(false)
                          setPinError('')
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        {ogretmen.ad} {ogretmen.soyad}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      Arama sonucu bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* PIN Girişi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Kodu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value)
                    setPinError('')
                  }}
                  maxLength={4}
                  placeholder="PIN kodunuzu girin"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                  disabled={!selectedOgretmen}
                />
              </div>
            </div>

            {pinError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{pinError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedOgretmen || !pinInput}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Giriş Yap
            </button>
          </form>

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