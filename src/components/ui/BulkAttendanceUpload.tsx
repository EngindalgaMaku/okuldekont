'use client'

import { useState, useRef } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle, FileText } from 'lucide-react'

interface BulkAttendanceUploadProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
  month: number
  year: number
}

interface AttendanceRecord {
  studentNumber: string
  workingDays: number
  absentDays: number
}

export default function BulkAttendanceUpload({ 
  isOpen, 
  onClose, 
  onUploadComplete,
  month,
  year 
}: BulkAttendanceUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop()
      if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
        setError('Sadece CSV veya Excel (.xlsx) dosyaları kabul edilir')
        return
      }
      setFile(selectedFile)
      setError('')
      setResults(null)
    }
  }

  const parseCSV = (text: string): AttendanceRecord[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const records: AttendanceRecord[] = []
    
    // İlk satırı başlık olarak atla
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/['"]/g, ''))
      
      if (columns.length >= 3) {
        const studentNumber = columns[0]
        const workingDays = parseInt(columns[1]) || 0
        const absentDays = parseInt(columns[2]) || 0
        
        if (studentNumber) {
          records.push({
            studentNumber,
            workingDays,
            absentDays
          })
        }
      }
    }
    
    return records
  }

  const parseExcel = async (file: File): Promise<AttendanceRecord[]> => {
    // Excel parsing için xlsx kütüphanesi kullanılabilir
    // Şimdilik CSV formatına çevir mesajı veriyoruz
    throw new Error('Excel desteği için dosyayı CSV formatında kaydedin')
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError('')
    setResults(null)

    try {
      let attendanceData: AttendanceRecord[] = []

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text()
        attendanceData = parseCSV(text)
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        attendanceData = await parseExcel(file)
      }

      if (attendanceData.length === 0) {
        throw new Error('Dosyada geçerli veri bulunamadı')
      }

      // API'ye gönder
      const response = await fetch('/api/admin/araclar/ogrenci-ucret-dokum', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceData,
          month,
          year
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Yükleme başarısız')
      }

      const result = await response.json()
      setResults(result.data)
      
      if (result.data.processed > 0) {
        // Sayfa verilerini yenile
        setTimeout(() => {
          onUploadComplete()
        }, 2000)
      }

    } catch (error) {
      console.error('Yükleme hatası:', error)
      setError(error instanceof Error ? error.message : 'Bilinmeyen hata oluştu')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = `Öğrenci No,Devam Günü,Devamsızlık Günü
1001,18,0
1002,15,3
1003,20,0`

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'ornek_devamsizlik_verisi.csv'
    link.click()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Toplu Devamsızlık Yükleme
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm">Dosya Formatı</h4>
                <p className="text-blue-800 text-xs mt-1">
                  CSV dosyasında şu sütunlar olmalıdır:<br/>
                  <strong>Öğrenci No, Devam Günü, Devamsızlık Günü</strong>
                </p>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-700 text-xs"
                >
                  <Download className="w-3 h-3" />
                  Örnek dosya indir
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosya Seçin
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {file ? file.name : 'CSV veya Excel dosyası seçin'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-green-700 font-medium">
                    Yükleme tamamlandı!
                  </p>
                  <p className="text-green-600 text-xs mt-1">
                    {results.processed} / {results.total} kayıt işlendi
                  </p>
                  {results.errors && results.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-600 text-xs font-medium">Hatalar:</p>
                      <ul className="text-red-600 text-xs mt-1 space-y-1">
                        {results.errors.slice(0, 3).map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {results.errors.length > 3 && (
                          <li>• ... ve {results.errors.length - 3} hata daha</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Yükle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}