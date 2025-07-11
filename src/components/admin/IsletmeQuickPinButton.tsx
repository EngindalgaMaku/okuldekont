'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key } from 'lucide-react'
import IsletmeQuickPinModal from './IsletmeQuickPinModal'

interface Isletme {
  id: string
  ad: string
}

interface Props {
  isletme: Isletme
}

export default function IsletmeQuickPinButton({ isletme }: Props) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePinSuccess = () => {
    // Refresh the page to show updated PIN
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
        title="PIN Ata/Değiştir"
      >
        <Key className="w-4 h-4" />
      </button>
      
      <IsletmeQuickPinModal
        isletmeId={isletme.id}
        isletmeAd={isletme.ad}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  )
}