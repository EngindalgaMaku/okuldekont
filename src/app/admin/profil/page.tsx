'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ProfilPage() {
  const router = useRouter()
  const { user, loading, isAdmin, adminRole } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Profil bilgileri
  const [profileData, setProfileData] = useState({
    ad: '',
    soyad: '',
    email: ''
  })
  
  // Şifre değiştirme
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // Auth kontrolü
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/admin/login')
    }
  }, [user, isAdmin, loading, router])

  // Profil bilgilerini yükle
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return
      
      try {
        const { data, error } = await supabase
          .from('admin_kullanicilar')
          .select('ad, soyad, email')
          .eq('id', user.id)
          .single()
        
        if (error) {
          console.error('Profil bilgileri yüklenirken hata:', error)
          setMessage({ type: 'error', text: 'Profil bilgileri yüklenemedi' })
          return
        }
        
        if (data) {
          setProfileData({
            ad: data.ad || '',
            soyad: data.soyad || '',
            email: data.email || user.email || ''
          })
        }
      } catch (error) {
        console.error('Profil bilgileri yüklenirken hata:', error)
        setMessage({ type: 'error', text: 'Profil bilgileri yüklenemedi' })
      }
    }
    
    fetchProfileData()
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('admin_kullanicilar')
        .update({
          ad: profileData.ad,
          soyad: profileData.soyad,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)
      
      if (error) {
        throw error
      }
      
      setMessage({ type: 'success', text: 'Profil bilgileri başarıyla güncellendi' })
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error)
      setMessage({ type: 'error', text: error.message || 'Profil güncellenirken hata oluştu' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    
    // Şifre validasyonu
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor' })
      setIsLoading(false)
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır' })
      setIsLoading(false)
      return
    }
    
    try {
      // Mevcut şifre ile giriş kontrolü
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      })
      
      if (signInError) {
        throw new Error('Mevcut şifre yanlış')
      }
      
      // Şifre güncelleme
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })
      
      if (updateError) {
        throw updateError
      }
      
      setMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi' })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Şifre değiştirme hatası:', error)
      setMessage({ type: 'error', text: error.message || 'Şifre değiştirilirken hata oluştu' })
    } finally {
      setIsLoading(false)
    }
  }

  // Loading durumu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil Ayarları</h1>
          <p className="mt-2 text-gray-600">Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profil Bilgileri */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">Profil Bilgileri</h2>
                <p className="text-sm text-gray-600">Kişisel bilgilerinizi güncelleyin</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad
                </label>
                <input
                  type="text"
                  value={profileData.ad}
                  onChange={(e) => setProfileData(prev => ({ ...prev, ad: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Adınızı girin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soyad
                </label>
                <input
                  type="text"
                  value={profileData.soyad}
                  onChange={(e) => setProfileData(prev => ({ ...prev, soyad: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Soyadınızı girin"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-50 text-gray-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">E-posta adresi değiştirilemez</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Profili Güncelle
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Şifre Değiştirme */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-red-100 rounded-xl">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">Şifre Değiştir</h2>
                <p className="text-sm text-gray-600">Hesap güvenliğinizi koruyun</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Mevcut şifrenizi girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Yeni şifrenizi girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Değiştiriliyor...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Şifreyi Değiştir
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Hesap Bilgileri */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hesap Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600">Yetki Seviyesi</p>
              <p className="text-lg font-semibold text-indigo-600 mt-1">
                {adminRole === 'super_admin' ? 'Süper Admin' :
                 adminRole === 'admin' ? 'Admin' :
                 adminRole === 'operator' ? 'Operatör' : 'Admin'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600">E-posta</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{user?.email}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600">Hesap Durumu</p>
              <p className="text-lg font-semibold text-green-600 mt-1">Aktif</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}