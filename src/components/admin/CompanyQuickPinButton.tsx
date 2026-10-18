'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key } from 'lucide-react'
import CompanyQuickPinModal from './CompanyQuickPinModal'

interface Company {
  id: string
  name: string
}

interface Props {
  company: Company
}

export default function CompanyQuickPinButton({ company }: Props) {
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
      
      <CompanyQuickPinModal
        companyId={company.id}
        companyName={company.name}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  )
}