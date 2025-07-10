'use client'

import Modal from './Modal'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmText?: string
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} titleIcon={AlertTriangle}>
      <div className="space-y-4">
        <div className="text-gray-600">{description}</div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            İptal
          </button>
          <button
            onClick={() => {
              onConfirm()
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
                <AlertTriangle className="h-4 w-4" />
            )}
            {isLoading ? 'İşleniyor...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}