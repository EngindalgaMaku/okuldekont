'use client'

import { useState } from 'react'
import { Eye, Upload } from 'lucide-react'
import DekontModal from './DekontModal'
import Modal from './Modal'
import type { Dekont } from '@/types/dekont'

interface Ogrenci {
  id: string
  staj_id: number
  ad: string
  soyad: string
  sinif: string
  no: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

interface OgrenciTablosuProps {
  ogrenciler: Ogrenci[]
  isletmeId?: number
  dekontlar?: Dekont[]
  onDekontSuccess?: () => void
}

export default function OgrenciTablosu({
  ogrenciler,
  isletmeId,
  dekontlar = [],
  onDekontSuccess
}: OgrenciTablosuProps) {
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [dekontViewModalOpen, setDekontViewModalOpen] = useState(false)
  const [selectedOgrenciDekontlar, setSelectedOgrenciDekontlar] = useState<Dekont[]>([])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  // Dekont işlemlerinin aktif olup olmadığını kontrol et
  const isDekontEnabled = isletmeId !== undefined && onDekontSuccess !== undefined

  return (
    <div className="space-y-4">
      {ogrenciler.map((ogrenci, index) => (
        <div
          key={ogrenci.id}
          className={`rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
            index % 2 === 0
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:from-blue-100 hover:to-indigo-100'
              : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:from-purple-100 hover:to-pink-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {ogrenci.ad} {ogrenci.soyad}
              </h3>
              <div className="flex items-center space-x-2 mt-2">
                <p className={`text-sm font-medium px-2 py-1 rounded-lg ${
                  index % 2 === 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {ogrenci.sinif}
                </p>
                <p className={`text-sm font-medium px-2 py-1 rounded-lg ${
                  index % 2 === 0
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-pink-100 text-pink-700'
                }`}>
                  No: {ogrenci.no}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatDate(ogrenci.baslangic_tarihi)} - {formatDate(ogrenci.bitis_tarihi)}
              </p>
            </div>
            {isDekontEnabled && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedOgrenci(ogrenci)
                    setDekontModalOpen(true)
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                    index % 2 === 0
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Dekont Yükle
                </button>
                <button
                  onClick={() => {
                    const ogrenciDekontlari = dekontlar.filter(
                      (d) => String(d.staj_id) === String(ogrenci.staj_id)
                    )
                    setSelectedOgrenciDekontlar(ogrenciDekontlari)
                    setDekontViewModalOpen(true)
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                    index % 2 === 0
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Dekontları Gör
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {ogrenciler.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">Henüz öğrenci bulunmuyor.</p>
        </div>
      )}

      {/* Dekont Yükleme Modal */}
      {isDekontEnabled && dekontModalOpen && selectedOgrenci && isletmeId && onDekontSuccess && (
        <DekontModal
          isOpen={dekontModalOpen}
          onClose={() => {
            setDekontModalOpen(false)
            setSelectedOgrenci(null)
          }}
          ogrenci={{
            id: selectedOgrenci.id,
            staj_id: selectedOgrenci.staj_id,
            ad: selectedOgrenci.ad,
            soyad: selectedOgrenci.soyad,
            sinif: selectedOgrenci.sinif
          }}
          isletmeId={isletmeId}
          onSuccess={() => {
            setDekontModalOpen(false)
            setSelectedOgrenci(null)
            onDekontSuccess()
          }}
        />
      )}

      {/* Dekont Görüntüleme Modal */}
      {dekontViewModalOpen && (
        <Modal
          isOpen={dekontViewModalOpen}
          onClose={() => {
            setDekontViewModalOpen(false)
            setSelectedOgrenciDekontlar([])
          }}
          title="Öğrenci Dekontları"
        >
          <div className="space-y-4">
            {selectedOgrenciDekontlar.map((dekont) => (
              <div
                key={dekont.id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Ödeme Tarihi: {dekont.odeme_tarihi ? formatDate(dekont.odeme_tarihi) : '-'}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {dekont.miktar != null ? dekont.miktar.toLocaleString('tr-TR') + ' ₺' : '-'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dekont.aciklama || 'Açıklama yok'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        dekont.onay_durumu === 'onaylandi'
                          ? 'bg-green-100 text-green-800'
                          : dekont.onay_durumu === 'reddedildi'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {dekont.onay_durumu === 'onaylandi'
                        ? 'Onaylandı'
                        : dekont.onay_durumu === 'reddedildi'
                        ? 'Reddedildi'
                        : 'Bekliyor'}
                    </span>
                    {dekont.dosya_url && (
                      <a
                        href={dekont.dosya_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        İndir
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {selectedOgrenciDekontlar.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Henüz dekont bulunmuyor.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
} 