import { useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [tutar, setTutar] = useState('')
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

    if (!tutar || isNaN(Number(tutar))) {
      setError('Lütfen geçerli bir tutar girin')
      return
    }

    try {
      setLoading(true)

      // Dosyayı yükle
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `dekontlar/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Dosya URL'ini al
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      // Dekont kaydını oluştur
      const { error: insertError } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: ogrenci.staj_id,
          isletme_id: isletmeId,
          tutar: Number(tutar),
          aciklama,
          dosya_url: publicUrl,
          odeme_tarihi: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
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
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">
              {ogrenci.ad} {ogrenci.soyad}
            </span>{' '}
            isimli öğrenci için dekont yüklüyorsunuz.
          </p>
          <p className="text-xs text-gray-400">{ogrenci.sinif}</p>
        </div>

        <div>
          <label
            htmlFor="tutar"
            className="block text-sm font-medium text-gray-700"
          >
            Tutar (₺)
          </label>
          <input
            type="number"
            id="tutar"
            value={tutar}
            onChange={(e) => setTutar(e.target.value)}
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