'use client'

import { AlertTriangle } from 'lucide-react'

// OgrencilerTab component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface Props {
  alanId: string
  siniflar: any[]
  initialOgrenciler: any[]
  initialTotalOgrenciler: number
  initialTotalPages: number
  initialCurrentPage: number
}

export default function OgrencilerTab({ alanId, siniflar, initialOgrenciler, initialTotalOgrenciler, initialTotalPages, initialCurrentPage }: Props) {
  return (
    <div className="min-h-[400px] bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center rounded-lg">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">🚧 Geçici Devre Dışı</h2>
          <p className="text-gray-600 mb-4">Öğrenciler tab bileşeni şu anda Prisma migration nedeniyle devre dışıdır.</p>
          <p className="text-sm text-gray-500">Alan ID: {alanId} | Öğrenci Sayısı: {initialOgrenciler.length}</p>
        </div>
      </div>
    </div>
  )
}