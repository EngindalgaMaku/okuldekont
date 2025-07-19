'use client'

import { useState } from 'react'
import { Key, Eye, EyeOff, X, AlertTriangle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teacherId: string
  teacherName: string
}

export default function PinChangeModal({ isOpen, onClose, onSuccess, teacherId, teacherName }: Props) {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    setError('')
    
    if (!newPin || newPin.length !== 4) {
      setError('PIN 4 haneli olmalıdır')
      return
    }
    
    if (newPin !== confirmPin) {
      setError('PIN\'ler eşleşmiyor')
      return
    }
    
    if (newPin === '2025') {
      setError('Varsayılan PIN olan 2025 kullanılamaz. Lütfen farklı bir PIN seçin.')
      return
    }
    
    try {
      setLoading(true)
      
      // Update PIN using API
      const response = await fetch(`/api/admin/teachers/${teacherId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: newPin }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'PIN güncellenirken hata oluştu')
      }
      
      setNewPin('')
      setConfirmPin('')
      onSuccess()
      
    } catch (error: any) {
      console.error('PIN değiştirme hatası:', error)
      setError('PIN değiştirilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
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
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    PIN Değiştirme Zorunlu
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Merhaba <strong>{teacherName}</strong>,
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Güvenlik nedeniyle varsayılan PIN kodunuzu değiştirmeniz gerekmektedir. 
                      Lütfen yeni bir 4 haneli PIN kodu belirleyin.
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yeni PIN (4 haneli)
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          value={newPin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setNewPin(value)
                            setError('')
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
                          setError('')
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="1234"
                        maxLength={4}
                        required
                      />
                    </div>
                    
                    {newPin && confirmPin && newPin !== confirmPin && (
                      <p className="text-sm text-red-600">PIN'ler eşleşmiyor</p>
                    )}
                    
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !newPin || !confirmPin || newPin !== confirmPin}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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