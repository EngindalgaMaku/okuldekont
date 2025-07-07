'use client'

import { createContext, useState, useContext, ReactNode, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getSchoolName } from '@/lib/settings'

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

  // Gerçek eğitim yılı ve okul adı verilerini yükle
  useEffect(() => {
    const loadSystemData = async () => {
      setLoading(true)
      
      try {
        // Eğitim yılını yükle
        const { data, error } = await supabase
          .from('egitim_yillari')
          .select('yil')
          .eq('aktif', true)
          .single()
        
        if (data && !error) {
          setEgitimYili(data.yil)
        }
        
        // Okul adını yükle
        const schoolNameFromDb = await getSchoolName()
        setOkulAdi(schoolNameFromDb)
        
      } catch (error) {
        // Sessizce hata geç, sabit değerler kullan
        console.log('Sistem verileri yüklenemedi, sabit değerler kullanılıyor')
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