'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import YeniOgretmenModal from './YeniOgretmenModal'
import { useRouter } from 'next/navigation'

export default function OgretmenlerClient() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleModalSuccess = () => {
    // Refresh the page to show the new teacher
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        title="Öğretmen Ekle"
      >
        <Plus className="w-5 h-5" />
      </button>

      <YeniOgretmenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}