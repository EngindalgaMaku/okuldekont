import { useState, useRef } from 'react'
import { Upload, X, Calendar } from 'lucide-react'
import { DekontFormData } from '@/types/dekont'

interface DekontUploadProps {
  onSubmit: (formData: DekontFormData) => Promise<void>
  isLoading?: boolean
  stajId: number
  isletmeler: { id: string; ad: string }[]
  selectedIsletmeId: string
}

const AY_LISTESI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function DekontUpload({ onSubmit, isLoading, stajId, isletmeler, selectedIsletmeId }: DekontUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIsletme, setSelectedIsletme] = useState(selectedIsletmeId)
  const [formData, setFormData] = useState<DekontFormData>({
    staj_id: stajId,
    miktar: undefined,
    ay: AY_LISTESI[new Date().getMonth()],
    yil: new Date().getFullYear().toString(),
    aciklama: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof DekontFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DekontFormData, string>> = {}
    if (!selectedFile) {
      newErrors.dosya = 'Dekont dosyası gereklidir'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      await onSubmit({
        ...formData,
        dosya: selectedFile || undefined,
        isletme_id: selectedIsletme,
        odeme_tarihi: new Date().toISOString().split('T')[0]
      })
      setFormData({
        staj_id: stajId,
        miktar: undefined,
        ay: AY_LISTESI[new Date().getMonth()],
        yil: new Date().getFullYear().toString(),
        aciklama: ''
      })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">İşletme</label>
        <div className="relative">
          <select
            value={selectedIsletme}
            onChange={e => setSelectedIsletme(e.target.value)}
            className="block w-full appearance-none rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-base shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-blue-400"
          >
            {isletmeler.map(isletme => (
              <option key={isletme.id} value={isletme.id}>{isletme.ad}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="miktar" className="block text-sm font-medium text-gray-700">
            Miktar (TL) <span className="text-gray-400">(İsteğe bağlı)</span>
          </label>
          <input
            type="number"
            id="miktar"
            min="0"
            step="0.01"
            value={formData.miktar ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, miktar: e.target.value ? parseFloat(e.target.value) : undefined }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="ay" className="block text-sm font-medium text-gray-700">
            Ay
          </label>
          <select
            id="ay"
            value={formData.ay}
            onChange={(e) => setFormData(prev => ({ ...prev, ay: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {AY_LISTESI.map((ay) => (
              <option key={ay} value={ay}>{ay}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="yil" className="block text-sm font-medium text-gray-700">
            Yıl
          </label>
          <input
            type="text"
            id="yil"
            value={formData.yil}
            onChange={(e) => setFormData(prev => ({ ...prev, yil: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
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
          Dekont Dosyası <span className="text-red-500">*</span>
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
        {errors.dosya && <p className="mt-1 text-sm text-red-600">{errors.dosya}</p>}
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