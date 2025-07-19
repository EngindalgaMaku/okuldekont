'use client'

import { AlertTriangle } from 'lucide-react'

// IsletmelerTab component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface IsletmeListItem {
  id: string
  ad: string
  telefon?: string
}

interface Props {
  alanId: string
  initialIsletmeListesi: IsletmeListItem[]
}

export default function IsletmelerTab({ alanId, initialIsletmeListesi }: Props) {
  return (
    <div className="min-h-[400px] bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center rounded-lg">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">🚧 Geçici Devre Dışı</h2>
          <p className="text-gray-600 mb-4">İşletmeler tab bileşeni şu anda Prisma migration nedeniyle devre dışıdır.</p>
          <p className="text-sm text-gray-500">Alan ID: {alanId} | İşletme Sayısı: {initialIsletmeListesi.length}</p>
        </div>
      </div>
    </div>
  )
}