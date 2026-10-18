'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, User, Users, Printer, FileDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// Modals will be imported from their own files to keep this clean
import YeniOgretmenModal from './YeniOgretmenModal'
import TopluOgretmenModal from './TopluOgretmenModal'
import PrintOptionsModal from './PrintOptionsModal' // Assuming we refactor print modal
import ExportOptionsModal from './ExportOptionsModal' // Assuming we refactor export modal

// Define interfaces directly here
interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email?: string
  telefon?: string
  pin?: string
  alan_id?: number
  alanlar?: any
  stajlarCount?: number
  koordinatorlukCount?: number
  koordinatorluklar?: any[]
  stajlar?: any[]
}

interface SearchParams {
  page?: string
  search?: string
  alan?: string
  per_page?: string
}

interface Props {
  ogretmenler: Ogretmen[]
  searchParams: SearchParams
}

export default function OgretmenlerActions({ ogretmenler, searchParams }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [yeniModalOpen, setYeniModalOpen] = useState(false)
  const [topluModalOpen, setTopluModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  
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
              {/* Yeni Öğretmen Ekle */}
              <button
                onClick={() => { setYeniModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <User className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-medium">Yeni Öğretmen Ekle</div>
                  <div className="text-xs text-gray-500">Tek öğretmen kaydı</div>
                </div>
              </button>
              
              {/* Toplu Öğretmen Ekle */}
              <button
                onClick={() => { setTopluModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Users className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Toplu Öğretmen Ekle</div>
                  <div className="text-xs text-gray-500">Excel/CSV ile ekleme</div>
                </div>
              </button>

              <div className="border-t my-1"></div>

              {/* Yazdır */}
              <button
                onClick={() => { setPrintModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Printer className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="font-medium">Listeyi Yazdır</div>
                  <div className="text-xs text-gray-500">Öğretmen listesini yazdır</div>
                </div>
              </button>

              {/* Dışa Aktar */}
              <button
                onClick={() => { setExportModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <FileDown className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="font-medium">Excel'e Aktar</div>
                  <div className="text-xs text-gray-500">Listeyi Excel olarak indir</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <YeniOgretmenModal
        isOpen={yeniModalOpen}
        onClose={() => setYeniModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <TopluOgretmenModal
        isOpen={topluModalOpen}
        onClose={() => setTopluModalOpen(false)}
        onSuccess={handleSuccess}
      />
      
      {/* We need to create these modular modals */}
      {printModalOpen && (
        <PrintOptionsModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          ogretmenler={ogretmenler}
          searchParams={searchParams}
        />
      )}

      {exportModalOpen && (
        <ExportOptionsModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </>
  )
}
