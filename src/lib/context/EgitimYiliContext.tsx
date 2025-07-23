'use client'

import { createContext, useState, useContext, ReactNode, useEffect } from 'react'
interface EgitimYiliContextType {
  okulAdi: string
  egitimYili: string
  setOkulAdi: (ad: string) => void
  setEgitimYili: (yil: string) => void
  loading: boolean
}

const EgitimYiliContext = createContext<EgitimYiliContextType | undefined>(undefined)

export function EgitimYiliProvider({ children }: { children: ReactNode }) {
  const [okulAdi, setOkulAdi] = useState('')
  const [egitimYili, setEgitimYili] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSystemData = async () => {
      setLoading(true)
      try {
        // Cache-busting için timestamp ekliyoruz
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/public/system-settings?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`API isteği başarısız: ${response.status}`)
        }

        const data = await response.json()

        const settings: { [key: string]: string } = {}
        if (data && Array.isArray(data)) {
          data.forEach((setting: { key: string; value: string }) => {
            settings[setting.key] = setting.value
          })
        }

        setEgitimYili(settings.aktif_egitim_yili || '2023-2024')
        setOkulAdi(settings.school_name || 'Hüsniye Özdilek Ticaret MTAL')

      } catch (error) {
        console.error('Sistem verileri yüklenemedi, varsayılan değerler kullanılıyor:', error)
        setEgitimYili('2023-2024')
        setOkulAdi('Hüsniye Özdilek Ticaret MTAL') // Mobilde de varsayılan okul adı
      } finally {
        setLoading(false)
      }
    }

    loadSystemData()
  }, [])

  const value = { okulAdi, egitimYili, setOkulAdi, setEgitimYili, loading }

  return (
    <EgitimYiliContext.Provider value={value}>
      {children}
    </EgitimYiliContext.Provider>
  )
}

export function useEgitimYili() {
  const context = useContext(EgitimYiliContext)
  if (context === undefined) {
    throw new Error('useEgitimYili must be used within a EgitimYiliProvider')
  }
  return context
} 