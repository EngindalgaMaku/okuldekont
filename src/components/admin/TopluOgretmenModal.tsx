'use client'

import { useState } from 'react'
import { Users, Upload, Download, X, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import SuccessModal from '@/components/ui/SuccessModal'

interface TopluOgretmenModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function TopluOgretmenModal({ isOpen, onClose, onSuccess }: TopluOgretmenModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    successful: number
    failed: number
    errors: string[]
  } | null>(null)

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Sadece Excel (.xlsx, .xls) veya CSV dosyaları desteklenir')
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const downloadTemplate = () => {
    // CSV template oluştur
    const csvContent = [
      'ad,soyad,tcNo,telefon,email,pin,alan,position',
      'Ahmet,Yılmaz,12345678901,05551234567,ahmet@example.com,1234,Bilgisayar,alan_sefi',
      'Fatma,Öztürk,,05559876543,fatma@example.com,1234,Elektronik,atolye_sefi',
      'Mehmet,Kaya,98765432101,05555555555,,1234,Makine,'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'ogretmen_sablonu.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Lütfen bir dosya seçin')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/admin/teachers/bulk', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResults(result)
        setShowSuccessModal(true)
      } else {
        toast.error(result.error || 'Toplu yükleme sırasında hata oluştu')
      }
    } catch (error) {
      console.error('Bulk upload error:', error)
      toast.error('Dosya yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    setSelectedFile(null)
    setUploadResults(null)
    onSuccess()
    onClose()
  }

  const resetForm = () => {
    setSelectedFile(null)
    setUploadResults(null)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose()
          resetForm()
        }}
        title="Toplu Öğretmen Ekle"
        titleIcon={Users}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-900 mb-2">Dosya Formatı:</h4>
                <ul className="text-blue-800 space-y-1 list-disc list-inside">
                  <li>Excel (.xlsx, .xls) veya CSV formatında olmalıdır</li>
                  <li>İlk satır başlık satırı olmalıdır</li>
                  <li>Gerekli sütunlar: ad, soyad (diğerleri opsiyonel)</li>
                  <li>position: alan_sefi, atolye_sefi veya boş bırakın</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Şablon İndir
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosya Seçin
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-blue-400 bg-blue-50' 
                  : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="h-12 w-12 text-green-600 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Dosyayı Kaldır
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        Dosya seçmek için tıklayın
                      </span>
                      <span className="text-sm text-gray-500"> veya sürükleyip bırakın</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Excel (.xlsx, .xls) veya CSV dosyaları
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                onClose()
                resetForm()
              }}
              className="flex items-center justify-center w-10 h-10 text-red-600 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="İptal"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="flex items-center justify-center gap-2 px-6 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Öğretmenleri Ekle
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Toplu Ekleme Tamamlandı!"
        message={uploadResults ? 
          `${uploadResults.successful} öğretmen başarıyla eklendi.${uploadResults.failed > 0 ? ` ${uploadResults.failed} kayıt başarısız oldu.` : ''}` :
          'Öğretmenler başarıyla eklendi!'
        }
        countdown={5}
      />
    </>
  )
}