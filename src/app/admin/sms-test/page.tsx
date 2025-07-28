'use client'

import { useState } from 'react'
import { Send, Phone, MessageCircle, Settings, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function SMSTestPage() {
  const [formData, setFormData] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    phone: '',
    message: 'Merhaba! Bu Okul Dekont Sistemi\'nden gönderilen test mesajıdır.'
  })
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null)
  const { showToast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: 'SMS başarıyla gönderildi!',
          messageId: data.messageId
        })
        showToast({
          type: 'success',
          title: 'Başarılı',
          message: 'SMS başarıyla gönderildi!'
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'SMS gönderilemedi'
        })
        showToast({
          type: 'error',
          title: 'Hata',
          message: data.error || 'SMS gönderilemedi'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Bağlantı hatası: ' + error.message
      })
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Bağlantı hatası oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">SMS Test Sistemi</h1>
            <p className="text-blue-100 mt-2">Twilio SMS entegrasyonunu test edin</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Test Formu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            SMS Test Formu
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Twilio Konfigürasyonu */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Twilio Konfigürasyonu</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account SID
                </label>
                <input
                  type="text"
                  name="twilioAccountSid"
                  value={formData.twilioAccountSid}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auth Token
                </label>
                <input
                  type="password"
                  name="twilioAuthToken"
                  value={formData.twilioAuthToken}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Number (Twilio Phone Number)
                </label>
                <input
                  type="text"
                  name="twilioFromNumber"
                  value={formData.twilioFromNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                  required
                />
              </div>
            </div>

            {/* Mesaj Bilgileri */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Mesaj Bilgileri</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Alıcı Telefon Numarası
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="05551234567"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Türkiye formatında (05551234567, +905551234567)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle className="h-4 w-4 inline mr-1" />
                  Mesaj İçeriği
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Test mesajınızı buraya yazın..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maksimum 160 karakter önerilir
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>SMS Gönder</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sonuç ve Bilgilendirme */}
        <div className="space-y-6">
          {/* Sonuç */}
          {result && (
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Başarılı!' : 'Hata!'}
                </h3>
              </div>
              <p className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              {result.messageId && (
                <p className="mt-1 text-xs text-green-600">
                  Message ID: {result.messageId}
                </p>
              )}
            </div>
          )}

          {/* Bilgilendirme */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-4">📋 Twilio Kurulum Rehberi</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>1. Twilio Hesabı:</strong>
                <p>twilio.com'dan ücretsiz hesap oluşturun ($15-20 başlangıç kredisi)</p>
              </div>
              <div>
                <strong>2. Account SID & Auth Token:</strong>
                <p>Twilio Console {'>'} Account {'>'} API credentials</p>
              </div>
              <div>
                <strong>3. Phone Number:</strong>
                <p>Twilio Console {'>'} Phone Numbers {'>'} Manage {'>'} Buy a number</p>
              </div>
              <div>
                <strong>4. Test:</strong>
                <p>Önce kendi telefon numaranızla test edin</p>
              </div>
            </div>
          </div>

          {/* Güvenlik Uyarısı */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900">⚠️ Güvenlik Uyarısı</h4>
            <p className="text-sm text-yellow-800 mt-1">
              Twilio bilgilerinizi güvenli bir şekilde saklayın. Bu test sayfası sadece geliştirme amaçlıdır.
              Üretim ortamında bu bilgileri environment variables olarak saklayın.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}