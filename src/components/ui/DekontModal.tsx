import { useState } from 'react'
import Modal from './Modal'
import { Upload } from 'lucide-react'

interface DekontModalProps {
  isOpen: boolean
  onClose: () => void
  ogrenci: {
    id: string
    staj_id: number
    ad: string
    soyad: string
    sinif: string
  }
  isletmeId: number
  onSuccess: () => void
}

export default function DekontModal({
  isOpen,
  onClose,
  ogrenci,
  isletmeId,
  onSuccess
}: DekontModalProps) {
  const [loading, setLoading] = useState(false)
  const [miktar, setMiktar] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Lütfen bir dekont dosyası seçin')
      return
    }

    if (!miktar || isNaN(Number(miktar))) {
      setError('Lütfen geçerli bir miktar girin')
      return
    }

    try {
      setLoading(true)

      // FormData oluştur
      const formData = new FormData()
      formData.append('file', file)
      formData.append('staj_id', ogrenci.staj_id.toString())
      formData.append('isletme_id', isletmeId.toString())
      formData.append('miktar', miktar)
      formData.append('aciklama', aciklama)

      // API'ye gönder
      const response = await fetch('/api/admin/dekontlar', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Dekont yüklenirken bir hata oluştu')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Dekont yüklenirken hata:', error)
      setError(error.message || 'Dekont yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dekont Yükle"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="ogrenci"
            className="block text-sm font-medium text-gray-700"
          >
            Öğrenci Adı
          </label>
          <input
            type="text"
            id="ogrenci"
            value={`${ogrenci.ad} ${ogrenci.soyad} - ${ogrenci.sinif}`}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm text-gray-900 font-medium"
          />
        </div>

        <div>
          <label
            htmlFor="miktar"
            className="block text-sm font-medium text-gray-700"
          >
            Miktar (₺)
          </label>
          <input
            type="number"
            id="miktar"
            value={miktar}
            onChange={(e) => setMiktar(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.00"
            step="0.01"
            required
          />
        </div>

        <div>
          <label
            htmlFor="aciklama"
            className="block text-sm font-medium text-gray-700"
          >
            Açıklama
          </label>
          <textarea
            id="aciklama"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Ödeme hakkında açıklama..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dekont Dosyası
          </label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                >
                  <span>Dosya seç</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="pl-1">veya sürükle bırak</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, PNG, JPG veya JPEG (max. 10MB)
              </p>
              {file && (
                <p className="text-sm text-gray-500">{file.name}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      </form>
    </Modal>
  )
} 