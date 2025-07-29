'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Building2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import TopluIsletmeModal from './TopluIsletmeModal'

export default function IsletmelerClient() {
  const [isTopluModalOpen, setIsTopluModalOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleModalSuccess = () => {
    // Refresh the page to show the new companies
    router.refresh()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Function to trigger the existing "Yeni İşletme" modal
  const handleOpenCreateModal = () => {
    // Trigger the event that IsletmelerServerPrisma listens to
    const event = new CustomEvent('openCreateModal')
    window.dispatchEvent(event)
    setDropdownOpen(false)
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">İşletme Ekle</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              <button
                onClick={handleOpenCreateModal}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium">Yeni İşletme Ekle</div>
                  <div className="text-xs text-gray-500">Tek işletme ekleme</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setIsTopluModalOpen(true)
                  setDropdownOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Users className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Toplu İşletme Ekle</div>
                  <div className="text-xs text-gray-500">Excel/CSV ile çoklu ekleme</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <TopluIsletmeModal
        isOpen={isTopluModalOpen}
        onClose={() => setIsTopluModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}