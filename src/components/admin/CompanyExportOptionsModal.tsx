'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const fieldOptions = [
  { id: 'name', label: 'İşletme Adı' },
  { id: 'contact', label: 'Yetkili Kişi' },
  { id: 'phone', label: 'Telefon' },
  { id: 'email', label: 'E-posta' },
  { id: 'address', label: 'Adres' },
  { id: 'taxNumber', label: 'Vergi Numarası' },
  { id: 'pin', label: 'PIN Kodu' },
  { id: 'teacher', label: 'Koordinatör Öğretmen' },
  { id: 'studentCount', label: 'Öğrenci Sayısı' },
  { id: 'masterTeacherName', label: 'Usta Öğretici' },
  { id: 'masterTeacherPhone', label: 'Usta Öğretici Telefon' },
]

export default function CompanyExportOptionsModal({ isOpen, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [format, setFormat] = useState('default')
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'contact', 'phone', 'teacher'])

  const handleFieldChange = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    )
  }

  const handleExport = async () => {
    setIsLoading(true)
    
    if (format === 'custom' && selectedFields.length === 0) {
      toast.error('Lütfen dışa aktarmak için en az bir alan seçin.')
      setIsLoading(false)
      return
    }

    try {
      const sort = (document.getElementById('sort') as HTMLSelectElement).value
      const filter_active = (document.getElementById('filter_active') as HTMLInputElement).checked
      const filter_empty = (document.getElementById('filter_empty') as HTMLInputElement).checked

      const exportFields = format === 'custom' ? selectedFields : format

      const response = await fetch('/api/admin/companies/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: exportFields,
          sort,
          filters: {
            active: filter_active,
            empty: filter_empty,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Dışa aktarma başarısız oldu')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'isletmeler.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success('İşletmeler başarıyla dışa aktarıldı.')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Dışa aktarma sırasında bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">İşletmeleri Dışa Aktar</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700">
              Dışa Aktarma Formatı
            </label>
            <select
              id="format"
              name="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="default">Varsayılan Alanlar</option>
              <option value="all">Tüm Alanlar</option>
              <option value="custom">Özel Alan Seçimi</option>
            </select>
          </div>

          {format === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Dahil Edilecek Alanlar</label>
              <div className="mt-2 grid grid-cols-1 gap-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                {fieldOptions.map(field => (
                  <label key={field.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldChange(field.id)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
              Sıralama
            </label>
            <select
              id="sort"
              name="sort"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="name_asc">İşletme Adına Göre (A-Z)</option>
              <option value="name_desc">İşletme Adına Göre (Z-A)</option>
              <option value="student_count_desc">Öğrenci Sayısına Göre (Çok-Az)</option>
              <option value="student_count_asc">Öğrenci Sayısına Göre (Az-Çok)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Filtreleme</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input 
                  id="filter_active" 
                  name="filter_active" 
                  type="checkbox" 
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                />
                <label htmlFor="filter_active" className="ml-2 block text-sm text-gray-900">
                  Sadece Aktif Stajı Olan İşletmeler
                </label>
              </div>
              <div className="flex items-center">
                <input 
                  id="filter_empty" 
                  name="filter_empty" 
                  type="checkbox" 
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                />
                <label htmlFor="filter_empty" className="ml-2 block text-sm text-gray-900">
                  Sadece Boş İşletmeler
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            İptal
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dışa Aktarılıyor...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Dışa Aktar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}