'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, User, Users, Printer, FileDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// Import the new modal and print client
import StudentExportOptionsModal from './StudentExportOptionsModal'
import OgrencilerPrintClient from './OgrencilerPrintClient'

// Define interfaces
interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanId: string
  alan?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
    contact: string
    teacher?: {
      id: string
      name: string
      surname: string
      alanId?: string
      alan?: {
        id: string
        name: string
      }
    } | null
  } | null
}

interface SearchParams {
  page?: string
  search?: string
  alanId?: string
  sinif?: string
  status?: string
  per_page?: string
}

interface Props {
  ogrenciler: Ogrenci[]
  searchParams: SearchParams
  onNewStudent: () => void
  onBulkStudent: () => void
  onCsvUpload: () => void
}

export default function OgrencilerActions({
  ogrenciler,
  searchParams,
  onNewStudent,
  onBulkStudent,
  onCsvUpload
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  // Convert Ogrenci to Student format for print client
  const convertOgrenciToStudent = (ogrenci: Ogrenci) => ({
    id: ogrenci.id,
    name: ogrenci.ad,
    surname: ogrenci.soyad,
    number: ogrenci.no,
    className: ogrenci.sinif,
    alanId: ogrenci.alanId,
    alan: ogrenci.alan,
    company: ogrenci.company ? {
      ...ogrenci.company,
      teacher: ogrenci.company.teacher || undefined
    } : undefined
  })

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
        >
          <span>İşlemler</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
            <div className="py-2">
              {/* Yazdır */}
              <div className="px-2">
                <OgrencilerPrintClient
                  students={ogrenciler.map(convertOgrenciToStudent)}
                  searchParams={searchParams}
                  isDropdownItem={true}
                  onClose={() => setDropdownOpen(false)}
                />
              </div>

              {/* Dışa Aktar */}
              <button
                onClick={() => { setExportModalOpen(true); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-3"
              >
                <FileDown className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Excel'e Aktar</div>
                  <div className="text-xs text-gray-500">Listeyi Excel olarak indir</div>
                </div>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-100 my-2"></div>

              {/* Yeni Öğrenci Ekle */}
              <button
                onClick={() => { onNewStudent(); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-3"
              >
                <Plus className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="font-medium">Yeni Öğrenci Ekle</div>
                  <div className="text-xs text-gray-500">Tek öğrenci kayıt formu</div>
                </div>
              </button>

              {/* Toplu Öğrenci Ekle */}
              <button
                onClick={() => { onBulkStudent(); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-3"
              >
                <Users className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Toplu Öğrenci Ekle</div>
                  <div className="text-xs text-gray-500">Manuel form ile birden fazla öğrenci</div>
                </div>
              </button>

              {/* CSV/Excel Yükleme */}
              <button
                onClick={() => { onCsvUpload(); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div>
                  <div className="font-medium">CSV/Excel Yükleme</div>
                  <div className="text-xs text-gray-500">Dosyadan toplu öğrenci yükleme</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <StudentExportOptionsModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </>
  )
}