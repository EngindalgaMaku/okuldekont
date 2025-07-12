'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Database } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InstallationCheckProps {
  children: React.ReactNode
}

export function InstallationCheck({ children }: InstallationCheckProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)

  // Setup sayfasında kontrol yapma
  const isSetupPage = pathname === '/setup'

  useEffect(() => {
    checkInstallation()
  }, [])

  const checkInstallation = async () => {
    try {
      const { data, error } = await supabase.rpc('check_installation_status')
      
      if (error) {
        console.error('Installation check failed:', error)
        // Hata durumunda (boş veritabanı vs.) kurulu değil varsay
        setIsInstalled(false)
        
        // Setup sayfasında değilsek yönlendir
        if (!isSetupPage) {
          router.push('/setup')
          return
        }
        
        setChecking(false)
        return
      }

      setIsInstalled(data.is_installed && data.system_ready)
      
      // Eğer sistem kurulu değilse ve setup sayfasında değilsek yönlendir
      if (!data.is_installed || !data.system_ready) {
        if (!isSetupPage) {
          router.push('/setup')
          return
        }
      } else {
        // Sistem kuruluysa ve setup sayfasındaysak ana sayfaya yönlendir
        if (isSetupPage) {
          router.push('/')
          return
        }
      }
      
    } catch (error) {
      console.error('Installation check error:', error)
      // Beklenmeyen hata durumunda kurulu değil varsay (güvenli taraf)
      setIsInstalled(false)
      
      // Setup sayfasında değilsek yönlendir
      if (!isSetupPage) {
        router.push('/setup')
        return
      }
    }
    
    setChecking(false)
  }

  // Kontrol devam ediyorsa loading göster
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Database className="h-8 w-8 animate-pulse text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistem Kontrol Ediliyor</h2>
            <p className="text-gray-600">Kurulum durumu belirleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Setup sayfası için özel kontrol yok, direkt göster
  if (isSetupPage) {
    return <>{children}</>
  }

  // Normal sayfalarda kurulum kontrolü
  if (!isInstalled) {
    // Bu duruma hiç gelmemeli çünkü yukarıda yönlendirme var
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
          <div className="text-center">
            <Database className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistem Kurulu Değil</h2>
            <p className="text-gray-600 mb-4">Sistem henüz kurulmamış. Kurulum sayfasına yönlendiriliyorsunuz...</p>
            <button
              onClick={() => router.push('/setup')}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Kurulum Sayfasına Git
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}