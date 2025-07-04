import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { DekontFormData } from '@/types/dekont'

interface DekontUploadProps {
  onSubmit: (formData: DekontFormData) => Promise<void>
  isLoading?: boolean
  stajId: number
}

export default function DekontUpload({ onSubmit, isLoading, stajId }: DekontUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<DekontFormData>({
    staj_id: stajId,
    tutar: 0,
    ay: new Date().getMonth() + 1,
    yil: new Date().getFullYear(),
    aciklama: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof DekontFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DekontFormData, string>> = {}

    if (!formData.tutar || formData.tutar <= 0) {
      newErrors.tutar = 'Geçerli bir tutar giriniz'
    }

    if (!formData.ay || formData.ay < 1 || formData.ay > 12) {
      newErrors.ay = 'Geçerli bir ay seçiniz'
    }

    if (!formData.yil || formData.yil < 2000 || formData.yil > new Date().getFullYear()) {
      newErrors.yil = 'Geçerli bir yıl giriniz'
    }

    if (!selectedFile) {
      newErrors.dosya = 'Dekont dosyası gereklidir'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit({
        ...formData,
        dosya: selectedFile || undefined
      })

      // Reset form after successful submission
      setFormData({
        staj_id: stajId,
        tutar: 0,
        ay: new Date().getMonth() + 1,
        yil: new Date().getFullYear(),
        aciklama: ''
      })
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Dekont yükleme hatası:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setErrors(prev => ({ ...prev, dosya: undefined }))
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="tutar" className="block text-sm font-medium text-gray-700">
            Tutar (TL)
          </label>
          <input
            type="number"
            id="tutar"
            min="0"
            step="0.01"
            value={formData.tutar}
            onChange={(e) => setFormData(prev => ({ ...prev, tutar: parseFloat(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.tutar && (
            <p className="mt-1 text-sm text-red-600">{errors.tutar}</p>
          )}
        </div>

        <div>
          <label htmlFor="ay" className="block text-sm font-medium text-gray-700">
            Ay
          </label>
          <select
            id="ay"
            value={formData.ay}
            onChange={(e) => setFormData(prev => ({ ...prev, ay: parseInt(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          {errors.ay && (
            <p className="mt-1 text-sm text-red-600">{errors.ay}</p>
          )}
        </div>

        <div>
          <label htmlFor="yil" className="block text-sm font-medium text-gray-700">
            Yıl
          </label>
          <input
            type="number"
            id="yil"
            min="2000"
            max={new Date().getFullYear()}
            value={formData.yil}
            onChange={(e) => setFormData(prev => ({ ...prev, yil: parseInt(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.yil && (
            <p className="mt-1 text-sm text-red-600">{errors.yil}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700">
          Açıklama (İsteğe bağlı)
        </label>
        <textarea
          id="aciklama"
          rows={3}
          value={formData.aciklama}
          onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dekont Dosyası
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            {!selectedFile ? (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Dosya Seç</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      ref={fileInputRef}
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">veya sürükleyip bırakın</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, JPG veya PNG (max. 10MB)
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Upload className="h-6 w-6 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        {errors.dosya && (
          <p className="mt-1 text-sm text-red-600">{errors.dosya}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Yükleniyor...' : 'Dekont Yükle'}
        </button>
      </div>
    </form>
  )
} 