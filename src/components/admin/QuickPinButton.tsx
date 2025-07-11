'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key } from 'lucide-react'
import QuickPinModal from './QuickPinModal'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
}

interface Props {
  ogretmen: Ogretmen
}

export default function QuickPinButton({ ogretmen }: Props) {
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
      
      <QuickPinModal
        ogretmenId={ogretmen.id}
        ogretmenAd={ogretmen.ad}
        ogretmenSoyad={ogretmen.soyad}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  )
}