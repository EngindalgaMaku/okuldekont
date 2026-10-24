'use client'

import { AlertTriangle } from 'lucide-react'

// IsletmeQuickPinModal component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface Props {
  isOpen: boolean
  onClose: () => void
  isletme: any
  onPinUpdate: () => void
}

export default function IsletmeQuickPinModal({ isOpen, onClose, isletme, onPinUpdate }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-red-200">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">🚧 Geçici Devre Dışı</h2>
          <p className="text-gray-600 mb-4">İşletme PIN modal bileşeni şu anda Prisma migration nedeniyle devre dışıdır.</p>
          <p className="text-sm text-gray-500 mb-4">İşletme: {isletme?.ad || 'Bilinmeyen'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}