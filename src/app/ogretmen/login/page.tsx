'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Lock, Building, ChevronDown, Loader } from 'lucide-react'

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

  useEffect(() => {
    fetchOgretmenler()
  }, [])

  const fetchOgretmenler = async () => {
    try {
      setLoading(true)
      console.log('Öğretmenler getiriliyor...')

      const { data, error } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')
        .order('ad', { ascending: true })
      
      console.log('Gelen veri:', data)

      if (error) {
        console.error('Öğretmenler getirilemedi:', error)
        alert('Öğretmen listesi alınamadı: ' + error.message)
        return
      }

      if (!data || data.length === 0) {
        console.log('Hiç öğretmen bulunamadı')
        alert('Sistemde öğretmen bulunamadı.')
        return
      }

      setOgretmenler(data)
    } catch (error) {
      console.error('Beklenmeyen hata:', error)
      alert('Bir hata oluştu: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
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
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6">
            {/* Öğretmen Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öğretmen Seçin
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                >
                  {selectedOgretmen ? (
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      {selectedOgretmen.ad} {selectedOgretmen.soyad}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-400">
                      <User className="h-5 w-5" />
                      Öğretmen seçin...
                    </span>
                  )}
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {ogretmenler.map((ogretmen) => (
                      <button
                        key={ogretmen.id}
                        type="button"
                        onClick={() => {
                          setSelectedOgretmen(ogretmen)
                          setIsDropdownOpen(false)
                          setPinError('')
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        {ogretmen.ad} {ogretmen.soyad}
                      </button>
                    ))}
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