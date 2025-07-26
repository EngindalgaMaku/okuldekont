'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Edit, Check, X, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'

interface Alan {
  id: string;
  ad: string;
  aciklama?: string;
  aktif: boolean;
}

interface Props {
  alan: Alan;
}

export default function AlanDetayHeader({ alan }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    ad: alan.ad,
    aciklama: alan.aciklama || '',
    aktif: alan.aktif
  })
  const [isLoading, setIsLoading] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const handleSave = async () => {
    if (!editData.ad.trim()) {
      toast.error('Alan adı boş olamaz!')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/alanlar?id=${alan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editData.ad.trim(),
          description: editData.aciklama.trim() || null,
          active: editData.aktif
        })
      })

      if (!response.ok) {
        throw new Error('Alan güncellenirken hata oluştu')
      }

      setIsEditing(false)
      setSuccessModalOpen(true)
      setCountdown(3)
      router.refresh()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditData({
      ad: alan.ad,
      aciklama: alan.aciklama || '',
      aktif: alan.aktif
    })
    setIsEditing(false)
  }

  // Success modal countdown effect
  useEffect(() => {
    if (successModalOpen && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (successModalOpen && countdown === 0) {
      setSuccessModalOpen(false)
    }
  }, [successModalOpen, countdown])

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
        {/* Geri Dön Linki */}
        <div className="mb-3 sm:mb-4">
          <Link
            href="/admin/alanlar"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-xs sm:text-sm font-medium"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Tüm Alanlar
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 sm:space-x-3 lg:space-x-4 flex-1">
            {/* Alan İkonu */}
            <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl flex items-center justify-center ${
              alan.aktif
                ? 'bg-gradient-to-br from-indigo-100 to-purple-100'
                : 'bg-gray-100'
            }`}>
              <GraduationCap className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 ${
                alan.aktif ? 'text-indigo-600' : 'text-gray-400'
              }`} />
            </div>

            {/* Alan Bilgileri */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Alan Adı
                    </label>
                    <input
                      type="text"
                      value={editData.ad}
                      onChange={(e) => setEditData({...editData, ad: e.target.value})}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Alan adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Açıklama (Opsiyonel)
                    </label>
                    <textarea
                      value={editData.aciklama}
                      onChange={(e) => setEditData({...editData, aciklama: e.target.value})}
                      rows={2}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Alan açıklamasını girin"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="aktif"
                      checked={editData.aktif}
                      onChange={(e) => setEditData({...editData, aktif: e.target.checked})}
                      className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="aktif" className="ml-2 block text-xs sm:text-sm text-gray-700">
                      Alan aktif
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-0">
                      {alan.ad}
                    </h1>
                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium self-start ${
                      alan.aktif
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {alan.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  
                  {alan.aciklama && (
                    <p className="text-gray-600 mb-2 sm:mb-4 leading-relaxed text-sm sm:text-base">
                      {alan.aciklama}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Düzenle Butonu */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center p-1.5 sm:p-2 border border-transparent rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-2"
              title="Alanı Düzenle"
            >
              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Başarılı">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Alan başarıyla güncellendi!
            </h3>
            <p className="text-sm text-gray-600">
              Bu pencere {countdown} saniye sonra kapanacak
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}