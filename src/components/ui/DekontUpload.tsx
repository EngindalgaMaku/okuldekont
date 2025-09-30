import { useState, useRef } from 'react'
import { Upload, X, User, CheckCircle, XCircle } from 'lucide-react'
import { DekontFormData } from '@/types/dekont'
import ModernSelect from './ModernSelect'

interface DekontUploadProps {
  onSubmit: (formData: DekontFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  stajId?: string
  isletmeler?: { id: string; ad: string }[]
  selectedIsletmeId?: string
  stajyerler?: { id: string; ad: string; soyad: string; sinif: string }[]
  selectedStajyerId?: string
  onStajyerChange?: (stajyerId: string) => void
  startDate?: string // Staj başlama tarihi (YYYY-MM-DD formatında)
  existingDekontlar?: Array<{ ay: number; yil: number; onay_durumu: string }> // Mevcut dekontlar
}

const AY_LISTESI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function DekontUpload({
  onSubmit,
  onCancel,
  isLoading,
  stajId,
  isletmeler,
  selectedIsletmeId,
  stajyerler,
  selectedStajyerId,
  onStajyerChange,
  startDate,
  existingDekontlar = []
}: DekontUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIsletme, setSelectedIsletme] = useState(selectedIsletmeId || '')
  const [selectedStajyer, setSelectedStajyer] = useState(selectedStajyerId || '')
  const [formData, setFormData] = useState<DekontFormData>({
    staj_id: stajId || '',
    miktar: undefined,
    // Mevcut ayı seç (1-12 arası)
    ay: (new Date().getMonth() + 1).toString(),
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
    e.preventDefault()
    e.stopPropagation()
    const file = e.target.files?.[0]
    console.log('File selected:', file)
    if (file) {
      setSelectedFile(file)
      setErrors(prev => ({ ...prev, dosya: undefined }))
      console.log('File state updated:', file.name)
    } else {
      console.log('No file selected')
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

  // Yıl listesini dinamik oluştur
  const getEgitimYillari = () => {
    const currentYear = new Date().getFullYear();
    const baseYears = [currentYear - 1, currentYear];
    
    // Staj başlangıç tarihi kontrolü
    if (startDate) {
      const startYear = new Date(startDate).getFullYear();
      
      // Staj başlangıç yılından önceki yılları filtrele
      // Örnek: Eylül 2025 başlamışsa -> 2024 gösterme, sadece 2025
      return baseYears.filter(year => year >= startYear);
    }
    
    return baseYears;
  };
  
  const YIL_LISTESI = getEgitimYillari();

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
      <div className="space-y-6">
        <div>
          <label htmlFor="miktar" className="block text-sm font-medium text-gray-700 mb-2">
            Miktar (TL) <span className="text-gray-400">(İsteğe bağlı)</span>
          </label>
          <input
            type="number"
            id="miktar"
            min="0"
            step="0.01"
            value={formData.miktar ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, miktar: e.target.value ? parseFloat(e.target.value) : undefined }))}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm"
            placeholder="0.00"
          />
        </div>
        
        {/* Ay ve Yıl Seçimi */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ay" className="block text-sm font-medium text-gray-700 mb-1">
              Ay <span className="text-red-500">*</span>
            </label>
            <select
              id="ay"
              value={formData.ay}
              onChange={(e) => setFormData(prev => ({ ...prev, ay: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm"
            >
              {AY_LISTESI.map((ay, index) => {
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth(); // 0-based (0=Ocak, 8=Eylül)
                const currentDay = today.getDate();
                const selectedYear = parseInt(formData.yil, 10);
                const ayIndex = index; // 0-based (0=Ocak, 8=Eylül)

                // Ayın son gününü hesapla
                const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                // Gelecek yıl kontrolü
                if (selectedYear > currentYear) {
                  return null;
                }
                
                // Mevcut yıl için ay kontrolü
                if (selectedYear === currentYear) {
                  // Gelecek aylar hiçbir zaman görünmez
                  if (ayIndex > currentMonth) {
                    return null;
                  }
                  
                  // Mevcut ay: Sadece ayın son günü veya sonrasında görünür
                  // ANCAK: Eğer bu ay için dekont yoksa her zaman görünür (geçmiş eksik dekontlar için)
                  if (ayIndex === currentMonth && currentDay < lastDayOfMonth) {
                    // Bu ay için dekont var mı kontrol et
                    const hasApprovedDekont = existingDekontlar.some(
                      d => d.yil === selectedYear && d.ay === (ayIndex + 1) && d.onay_durumu === 'onaylandi'
                    );
                    
                    // Eğer onaylanan dekont yoksa göster (eksik dekont yüklenebilsin)
                    if (hasApprovedDekont) {
                      return null;
                    }
                  }
                }

                // Staj başlama tarihi kontrolü
                if (startDate) {
                  const stajBaslangic = new Date(startDate);
                  const stajBaslangicYear = stajBaslangic.getFullYear();
                  const stajBaslangicMonth = stajBaslangic.getMonth() + 1;
                  
                  if (selectedYear < stajBaslangicYear) {
                    return null;
                  }
                  
                  // Staj başlangıç ayından ÖNCEki ayları engelle (başlangıç ayı dahil yüklenebilir)
                  if (selectedYear === stajBaslangicYear && (index + 1) < stajBaslangicMonth) {
                    return null;
                  }
                }
                
                return (
                  <option key={index + 1} value={index + 1}>
                    {ay}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label htmlFor="yil" className="block text-sm font-medium text-gray-700 mb-1">
              Yıl <span className="text-red-500">*</span>
            </label>
            <select
              id="yil"
              value={formData.yil}
              onChange={(e) => setFormData(prev => ({ ...prev, yil: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm"
            >
              {YIL_LISTESI.map((yil) => (
                <option key={yil} value={yil}>{yil}</option>
              ))}
            </select>
          </div>
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
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Dekont Dosyası <span className="text-red-500">*</span>
        </label>
        
        {!selectedFile ? (
          <div className="space-y-3">
            {/* Mobil için Büyük Butonlar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fotoğraf Çek Butonu - Mobil */}
              <label
                htmlFor="camera-upload"
                className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fotoğraf Çek
              </label>
              <input
                id="camera-upload"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Galeriden Seç Butonu */}
              <label
                htmlFor="gallery-upload"
                className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg font-medium cursor-pointer hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Upload className="w-6 h-6" />
                Galeriden Seç
              </label>
              <input
                id="gallery-upload"
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <p className="text-xs text-center text-gray-500">
              JPG, PNG, PDF (max. 10MB)
            </p>
          </div>
        ) : (
          <div className="border-2 border-gray-300 border-dashed rounded-md p-4">
            <div className="space-y-3">
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
            </div>
          </div>
        )}
        {errors.dosya && <p className="mt-1 text-sm text-red-600">{errors.dosya}</p>}
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="h-4 w-4 mr-2" />
            İptal
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isLoading ? 'Yükleniyor...' : 'Dekont Yükle'}
        </button>
      </div>
    </form>
  )
}
