'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Key, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  isletmeId: string
  isletmeAd: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function IsletmePinChangeModal({ isletmeId, isletmeAd, isOpen, onClose, onSuccess }: Props) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPins, setShowPins] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setError('')
      setShowPins(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (loading) return

    // PIN validation
    if (!currentPin || currentPin.length !== 4) {
      setError('Mevcut PIN 4 haneli olmalıdır')
      return
    }

    if (!newPin || newPin.length !== 4) {
      setError('Yeni PIN 4 haneli olmalıdır')
      return
    }

    if (newPin !== confirmPin) {
      setError('Yeni PIN\'ler eşleşmiyor')
      return
    }

    if (currentPin === newPin) {
      setError('Yeni PIN mevcut PIN\'den farklı olmalıdır')
      return
    }

    try {
      setLoading(true)

      // Verify current PIN
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('check_isletme_pin_giris', {
          p_isletme_id: isletmeId,
          p_girilen_pin: currentPin
        })

      if (verifyError) {
        console.error('PIN doğrulama hatası:', verifyError)
        setError('PIN doğrulama sırasında hata oluştu')
        return
      }

      if (!verifyData || !verifyData.giris_basarili) {
        setError('Mevcut PIN yanlış')
        return
      }

      // Update PIN
      const { error: updateError } = await supabase
        .from('isletmeler')
        .update({ pin: newPin })
        .eq('id', isletmeId)

      if (updateError) {
        console.error('PIN güncelleme hatası:', updateError)
        setError('PIN güncellenirken bir hata oluştu')
        return
      }

      // Success
      onSuccess()
      onClose()
      
    } catch (error: any) {
      console.error('PIN değiştirme hatası:', error)
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Key className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      PIN Değiştirme Zorunlu
                    </h3>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      <strong>{isletmeAd}</strong> için güvenlik nedeniyle PIN değiştirmeniz gerekiyor.
                    </p>
                  </div>
                  
                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mevcut PIN <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPins ? "text" : "password"}
                          value={currentPin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setCurrentPin(value)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="1234"
                          maxLength={4}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPins(!showPins)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          disabled={loading}
                        >
                          {showPins ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yeni PIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPins ? "text" : "password"}
                        value={newPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setNewPin(value)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Yeni PIN"
                        maxLength={4}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yeni PIN Tekrar <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPins ? "text" : "password"}
                        value={confirmPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setConfirmPin(value)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Yeni PIN Tekrar"
                        maxLength={4}
                        required
                        disabled={loading}
                      />
                    </div>

                    {newPin && confirmPin && newPin !== confirmPin && (
                      <p className="text-sm text-red-600">PIN'ler eşleşmiyor</p>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Güvenlik:</strong> PIN'inizi güvende tutun ve kimseyle paylaşmayın.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !currentPin || !newPin || !confirmPin || newPin !== confirmPin}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Değiştiriliyor...' : 'PIN Değiştir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}