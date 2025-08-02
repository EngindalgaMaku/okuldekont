'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Building2, FileDown, Loader2, Printer, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// Modal imports
import CompanyExportOptionsModal from './CompanyExportOptionsModal'
import IsletmelerPrintClient from './IsletmelerPrintClient'
import TopluIsletmeModal from './TopluIsletmeModal'

// Define interfaces
interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  pin?: string
  _count?: {
    students: number
  }
  teacher?: {
    name: string
    surname: string
  }
  isLocked?: boolean
}

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface Props {
  companies: Company[]
  searchParams: SearchParams
}

export default function IsletmelerActions({ companies, searchParams }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [topluModalOpen, setTopluModalOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Trigger yeni işletme modal from IsletmelerClient
  const handleYeniIsletme = () => {
    setDropdownOpen(false)
    // Dispatch custom event to open create modal in IsletmelerServerPrisma
    window.dispatchEvent(new CustomEvent('openCreateModal'))
  }

  // Handle print modal
  const handlePrint = () => {
    setPrintModalOpen(true)
    setDropdownOpen(false)
  }

  // Handle toplu modal
  const handleTopluIsletme = () => {
    setTopluModalOpen(true)
    setDropdownOpen(false)
  }

  const handleModalSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <span>İşlemler</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {/* Yeni İşletme Ekle */}
              <button
                onClick={handleYeniIsletme}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium">Yeni İşletme Ekle</div>
                  <div className="text-xs text-gray-500">Tek işletme kaydı</div>
                </div>
              </button>

              {/* Toplu İşletme Ekle */}
              <button
                onClick={handleTopluIsletme}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Users className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="font-medium">Toplu İşletme Ekle</div>
                  <div className="text-xs text-gray-500">Excel/CSV ile çoklu ekleme</div>
                </div>
              </button>

              <div className="border-t my-1"></div>

              {/* Yazdır */}
              <button
                onClick={handlePrint}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Printer className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="font-medium">Yazdır</div>
                  <div className="text-xs text-gray-500">İşletme listesini yazdır</div>
                </div>
              </button>

              {/* Dışa Aktar */}
              <button
                onClick={() => { setExportModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <FileDown className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Excel'e Aktar</div>
                  <div className="text-xs text-gray-500">İşletme listesini Excel olarak indir</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <CompanyExportOptionsModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* Print Modal */}
      <IsletmelerPrintClient
        companies={companies}
        searchParams={searchParams}
        externalPrintModalOpen={printModalOpen}
        onExternalClose={() => setPrintModalOpen(false)}
        hideButton={true}
      />

      {/* Toplu İşletme Modal */}
      <TopluIsletmeModal
        isOpen={topluModalOpen}
        onClose={() => setTopluModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}