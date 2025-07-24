'use client'

import { useState, useEffect } from 'react'
import { Key, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Props {
  companyId: string
  companyName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CompanyQuickPinModal({ companyId, companyName, isOpen, onClose, onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [showCurrentPin, setShowCurrentPin] = useState(false)

  // Fetch current PIN when modal opens
  useEffect(() => {
    const fetchCurrentPin = async () => {
      if (isOpen && companyId) {
        try {
          const response = await fetch(`/api/admin/companies/${companyId}`)
          if (response.ok) {
            const data = await response.json()
            setCurrentPin(data?.pin || '')
          } else {
            setCurrentPin('')
          }
        } catch (error) {
          console.error('PIN getirme hatası:', error)
          setCurrentPin('')
        }
      }
    }
    
    fetchCurrentPin()
  }, [isOpen, companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    if (!pin || pin.length !== 4) {
      toast.error('PIN 4 haneli olmalıdır')
      return
    }
    
    if (pin !== confirmPin) {
      toast.error('PIN\'ler eşleşmiyor')
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/companies/${companyId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin })
      })
      
      if (!response.ok) {
        throw new Error('PIN atama başarısız')
      }
      
      toast.success('PIN başarıyla atandı')
      setPin('')
      setConfirmPin('')
      onClose()
      onSuccess()
      
    } catch (error: any) {
      console.error('PIN atama hatası:', error)
      toast.error('PIN atanırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPin('')
    setConfirmPin('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Key className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Hızlı PIN Atama
                    </h3>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>{companyName}</strong> için PIN oluşturun
                  </p>
                  
                  {/* Current PIN Display */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Mevcut PIN:</span>
                      <button
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                        title={showCurrentPin ? 'PIN\'i gizle' : 'PIN\'i göster'}
                      >
                        {showCurrentPin ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2 text-lg font-mono text-gray-900">
                      {showCurrentPin ? (currentPin || 'PIN bulunamadı') : '****'}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yeni PIN (4 haneli)
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          value={pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setPin(value)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="1234"
                          maxLength={4}
                          required
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PIN Tekrar
                      </label>
                      <input
                        type={showPin ? "text" : "password"}
                        value={confirmPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setConfirmPin(value)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="1234"
                        maxLength={4}
                        required
                      />
                    </div>
                    {pin && confirmPin && pin !== confirmPin && (
                      <p className="text-sm text-red-600">PIN'ler eşleşmiyor</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !pin || !confirmPin || pin !== confirmPin}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Atanıyor...' : 'PIN Ata'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}