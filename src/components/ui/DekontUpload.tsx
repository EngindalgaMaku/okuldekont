import { useState, useRef } from 'react'
import { Upload, X, User } from 'lucide-react'
import { DekontFormData } from '@/types/dekont'
import ModernSelect from './ModernSelect'

interface DekontUploadProps {
  onSubmit: (formData: DekontFormData) => Promise<void>
  isLoading?: boolean
  stajId?: string
  isletmeler?: { id: string; ad: string }[]
  selectedIsletmeId?: string
  stajyerler?: { id: string; ad: string; soyad: string; sinif: string }[]
  selectedStajyerId?: string
  onStajyerChange?: (stajyerId: string) => void
  startDate?: string // Staj başlama tarihi (YYYY-MM-DD formatında)
}

const AY_LISTESI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function DekontUpload({
  onSubmit,
  isLoading,
  stajId,
  isletmeler,
  selectedIsletmeId,
  stajyerler,
  selectedStajyerId,
  onStajyerChange,
  startDate
}: DekontUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIsletme, setSelectedIsletme] = useState(selectedIsletmeId || '')
  const [selectedStajyer, setSelectedStajyer] = useState(selectedStajyerId || '')
  const [formData, setFormData] = useState<DekontFormData>({
    staj_id: stajId || '',
    miktar: undefined,
    ay: (new Date().getMonth() === 0 ? 12 : new Date().getMonth()).toString(),
    yil: (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()).toString(),
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
        staj_id: selectedStajyer || stajId || '',
        odeme_tarihi: new Date().toISOString().split('T')[0]
      })
      setFormData({
        staj_id: stajId || '',
        miktar: undefined,
        ay: (new Date().getMonth()).toString(),
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

  const handleStajyerChange = (stajyerId: string | number) => {
    const idStr = stajyerId.toString()
    setSelectedStajyer(idStr)
    if (onStajyerChange) {
      onStajyerChange(idStr)
    }
  }

  const stajyerOptions = stajyerler?.map(stajyer => ({
    id: stajyer.id,
    label: `${stajyer.ad} ${stajyer.soyad}`,
    subtitle: stajyer.sinif
  })) || []

  const isletmeOptions = isletmeler?.map(isletme => ({
    id: isletme.id,
    label: isletme.ad
  })) || []

  const YIL_LISTESI = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Öğrenci Seçimi */}
      {stajyerler && stajyerler.length > 0 && (
        <ModernSelect
          options={stajyerOptions}
          value={selectedStajyer}
          onChange={handleStajyerChange}
          placeholder="Öğrenci Seçiniz..."
          label="Öğrenci Adı"
          required
          icon={<User className="w-4 h-4" />}
          searchable
        />
      )}

      {/* İşletme Seçimi */}
      {isletmeler && isletmeler.length > 0 && (
        <ModernSelect
          options={isletmeOptions}
          value={selectedIsletme}
          onChange={(id) => setSelectedIsletme(id.toString())}
          placeholder="İşletme Seçiniz..."
          label="İşletme"
          required
          searchable
        />
      )}
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
            {AY_LISTESI.map((ay, index) => {
              const today = new Date();
              const currentYear = today.getFullYear();
              const currentMonth = today.getMonth();
              const selectedYear = parseInt(formData.yil, 10);

              // Gelecek ay ve yıl kontrolü
              if (selectedYear > currentYear || (selectedYear === currentYear && index >= currentMonth)) {
                return null;
              }

              // Staj başlama tarihi kontrolü
              if (startDate) {
                const stajBaslangic = new Date(startDate);
                const stajBaslangicYear = stajBaslangic.getFullYear();
                const stajBaslangicMonth = stajBaslangic.getMonth() + 1; // 1-based
                
                // Seçilen yıl staj başlangıç yılından önceyse hiç gösterme
                if (selectedYear < stajBaslangicYear) {
                  return null;
                }
                
                // Aynı yıldaysa ve ay staj başlangıç ayından önceyse gösterme
                if (selectedYear === stajBaslangicYear && (index + 1) < stajBaslangicMonth) {
                  return null;
                }
              }
              
              return <option key={ay} value={index + 1}>{ay}</option>
            })}
          </select>
        </div>
        <div>
          <label htmlFor="yil" className="block text-sm font-medium text-gray-700">
            Yıl
          </label>
          <select
            id="yil"
            value={formData.yil}
            onChange={(e) => setFormData(prev => ({ ...prev, yil: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {YIL_LISTESI.map((yil) => (
              <option key={yil} value={yil}>{yil}</option>
            ))}
          </select>
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
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">veya sürükleyip bırakın</p>
                </div>
                <p className="text-xs text-gray-500">
                  JPG, JPEG, PNG, GIF, WEBP veya PDF (max. 10MB)
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
