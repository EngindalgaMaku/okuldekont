'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Connection status states
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [latency, setLatency] = useState<number | null>(null)

  // Check database connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health/database')
        const data = await response.json()
        
        if (response.ok && data.status === 'connected') {
          setConnectionStatus('connected')
          setLatency(data.latency)
        } else {
          setConnectionStatus('disconnected')
          setLatency(null)
        }
      } catch (error) {
        console.error('Connection check failed:', error)
        setConnectionStatus('disconnected')
        setLatency(null)
      }
    }

    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Veritabanı bağlantısını kontrol et
    if (connectionStatus !== 'connected') {
      setError('Veritabanı bağlantısı başarısız. Lütfen daha sonra tekrar deneyin.')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('E-posta veya şifre hatalı.')
        setIsSubmitting(false)
        return
      }

      // Get the session to check user role
      const session = await getSession()
      
      if (session?.user?.role !== 'ADMIN') {
        setError('Bu hesap admin paneline erişim yetkisine sahip değil.')
        setIsSubmitting(false)
        return
      }

      // Redirect to admin dashboard
      router.push('/admin')
    } catch (error) {
      console.error('Login error:', error)
      setError('Giriş sırasında bir hata oluştu.')
      setIsSubmitting(false)
    }
  }

  // Veritabanı bağlantısı kopuksa sistem kilit ekranını göster
  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-red-200">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-red-200">
              <WifiOff className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Sistem Bakımda
            </h1>
            <p className="text-red-700 mb-6">
              Teknik sorunlardan dolayı uygulamaya şu anda ulaşılamıyor.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-600">
                  Veritabanı bağlantısı başarısız
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Lütfen daha sonra tekrar deneyin veya sistem yöneticisi ile iletişime geçin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-gray-100">
            <img
              src="/images/logo_kucuk.png"
              alt="Hüsniye Özdilek Ticaret MTAL Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            K-Panel
          </h1>
          <p className="text-gray-600 mt-1">Hüsniye Özdilek Ticaret MTAL</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || connectionStatus !== 'connected'}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || connectionStatus !== 'connected'}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Güvenli şifrenizi girin"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={connectionStatus !== 'connected'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || !email || !password || connectionStatus !== 'connected'}
            className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Giriş Yapılıyor...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Güvenli Giriş
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}