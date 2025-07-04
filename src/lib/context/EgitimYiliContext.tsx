'use client'

import { createContext, useState, useContext, ReactNode, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface EgitimYiliContextType {
  okulAdi: string
  egitimYili: string
  setOkulAdi: (ad: string) => void
  setEgitimYili: (yil: string) => void
  loading: boolean
}

const EgitimYiliContext = createContext<EgitimYiliContextType | undefined>(undefined)

export function EgitimYiliProvider({ children }: { children: ReactNode }) {
  const [okulAdi, setOkulAdi] = useState('Hüsniye Özdilek MTAL')
  const [egitimYili, setEgitimYili] = useState('2024-2025')
  const [loading, setLoading] = useState(false)

  // Gerçek eğitim yılı verilerini yükle (isteğe bağlı)
  useEffect(() => {
    const loadEgitimYili = async () => {
      try {
        const { data, error } = await supabase
          .from('egitim_yillari')
          .select('yil')
          .eq('aktif', true)
          .single()
        
        if (data && !error) {
          setEgitimYili(data.yil)
        }
        // Hata varsa da sabit değer kullanmaya devam et
      } catch (error) {
        // Sessizce hata geç, sabit değerler kullan
        console.log('Eğitim yılı yüklenemedi, sabit değer kullanılıyor')
      }
    }

    loadEgitimYili()
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