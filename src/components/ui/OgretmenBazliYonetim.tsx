'use client'

import { useState } from 'react'
import { User, Building2, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'

// Define types based on page.tsx
interface Staj {
  id: number
  ogrenciler?: {
    ad: string
    soyad: string
    sinif: string
  } | null
  isletmeler?: {
    ad: string
  } | null
}

export interface OgretmenStajData {
  id: string
  ad: string
  soyad: string
  stajlar: Staj[]
}

interface OgretmenBazliYonetimProps {
  data: OgretmenStajData[]
}

export default function OgretmenBazliYonetim({ data }: OgretmenBazliYonetimProps) {
  const [expandedOgretmen, setExpandedOgretmen] = useState<string | null>(null)

  const toggleOgretmen = (ogretmenId: string) => {
    setExpandedOgretmen(prev => (prev === ogretmenId ? null : ogretmenId))
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Öğretmen bulunamadı</h3>
        <p className="mt-1 text-sm text-gray-500">Sistemde kayıtlı koordinatör öğretmen yok.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map(ogretmen => (
        <div key={ogretmen.id} className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleOgretmen(ogretmen.id)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{ogretmen.ad} {ogretmen.soyad}</h3>
                <p className="text-sm text-gray-600">{ogretmen.stajlar.length} öğrenci/staj sorumluluğu</p>
              </div>
            </div>
            {expandedOgretmen === ogretmen.id ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </button>

          {expandedOgretmen === ogretmen.id && (
            <div className="px-4 pb-4">
              <div className="border-t border-gray-200 pt-4">
                {ogretmen.stajlar.length > 0 ? (
                  <ul className="space-y-3">
                    {ogretmen.stajlar.map(staj => (
                      <li key={staj.id} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          <GraduationCap className="h-5 w-5 text-gray-500" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{staj.ogrenciler?.ad} {staj.ogrenciler?.soyad} ({staj.ogrenciler?.sinif})</p>
                            <div className="flex items-center text-sm text-gray-500">
                              <Building2 className="h-4 w-4 mr-1.5" />
                              <span>{staj.isletmeler?.ad}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Bu öğretmenin sorumlu olduğu aktif staj bulunmuyor.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}