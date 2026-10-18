'use client'

import { useState, useEffect } from 'react'
import { Key, Eye, EyeOff, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  isletmeId: string
  isletmeAd: string
  pin: string
}

export default function IsletmePinDisplay({ isletmeId, isletmeAd, pin }: Props) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isModalOpen) {
      setShowPin(false)
      setIsEditing(false)
      setNewPin('')
      setConfirmPin('')
      setError('')
    }
  }, [isModalOpen])

  const handleKeyClick = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setShowPin(false)
    setIsEditing(false)
    setNewPin('')
    setConfirmPin('')
    setError('')
  }

  const handlePinUpdate = async () => {
    setError('')
    
    if (!newPin || newPin.length !== 4) {
      setError('PIN 4 haneli olmalıdır')
      return
    }

    if (newPin !== confirmPin) {
      setError('PIN\'ler eşleşmiyor')
      return
    }

    if (newPin === pin) {
      setError('Yeni PIN mevcut PIN\'den farklı olmalıdır')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/companies/${isletmeId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: newPin })
      })
      
      if (!response.ok) {
        setError('PIN güncellenirken bir hata oluştu')
        return
      }
      
      // Refresh the page to show updated PIN
      router.refresh()
      setIsModalOpen(false)
      
    } catch (error: any) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleKeyClick}
        className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-200"
        title="PIN Kodunu Görüntüle/Değiştir"
      >
        <Key className="h-4 w-4" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCloseModal}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Key className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        İşletme PIN Kodu
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        <strong>{isletmeAd}</strong>
                      </p>
                    </div>
                    
                    {error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <div className="mt-4 space-y-4">
                      {!isEditing ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mevcut PIN Kodu
                            </label>
                            <div className="relative">
                              <input
                                type={showPin ? "text" : "password"}
                                value={pin}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-mono text-lg tracking-widest"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPin ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm text-amber-800">
                              <strong>Güvenlik:</strong> PIN kodunu sadece işletme yetkilisi ile paylaşın.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Yeni PIN (4 haneli)
                            </label>
                            <input
                              type="password"
                              value={newPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                setNewPin(value)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="1234"
                              maxLength={4}
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              PIN Tekrar
                            </label>
                            <input
                              type="password"
                              value={confirmPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                setConfirmPin(value)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="1234"
                              maxLength={4}
                              disabled={loading}
                            />
                          </div>
                          {newPin && confirmPin && newPin !== confirmPin && (
                            <p className="text-sm text-red-600">PIN'ler eşleşmiyor</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      PIN Değiştir
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Kapat
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handlePinUpdate}
                      disabled={loading || !newPin || !confirmPin || newPin !== confirmPin}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      {loading ? 'Güncelleniyor...' : 'PIN Güncelle'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      İptal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}