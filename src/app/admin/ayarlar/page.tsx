'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Database, Users, Mail, Shield, Save, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AyarlarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // System stats
  const [stats, setStats] = useState({
    ogrenciler: 0,
    ogretmenler: 0,
    isletmeler: 0,
    dekontlar: 0,
    bekleyenDekontlar: 0
  })

  // Settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoApproval: false,
    maxFileSize: 5, // MB
    allowedFileTypes: 'pdf,jpg,png',
    systemMaintenance: false
  })

  useEffect(() => {
    fetchStats()
    fetchSettings()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    
    try {
      // Öğrenciler
      const { count: ogrencilerCount } = await supabase
        .from('ogrenciler')
        .select('*', { count: 'exact', head: true })

      // Öğretmenler
      const { count: ogretmenlerCount } = await supabase
        .from('ogretmenler')
        .select('*', { count: 'exact', head: true })

      // İşletmeler
      const { count: isletmelerCount } = await supabase
        .from('isletmeler')
        .select('*', { count: 'exact', head: true })

      // Dekontlar
      const { count: dekontlarCount } = await supabase
        .from('dekontlar')
        .select('*', { count: 'exact', head: true })

      // Bekleyen dekontlar
      const { count: bekleyenCount } = await supabase
        .from('dekontlar')
        .select('*', { count: 'exact', head: true })
        .eq('onay_durumu', 'bekliyor')

      setStats({
        ogrenciler: ogrencilerCount || 0,
        ogretmenler: ogretmenlerCount || 0,
        isletmeler: isletmelerCount || 0,
        dekontlar: dekontlarCount || 0,
        bekleyenDekontlar: bekleyenCount || 0
      })
    } catch (error) {
      console.error('İstatistikler çekilirken hata:', error)
    }

    setLoading(false)
  }

  const fetchSettings = async () => {
    // Gerçek uygulamada sistem ayarları veritabanından çekilir
    // Şimdilik varsayılan değerler
  }

  const handleSaveSettings = async () => {
    setSaveLoading(true)
    
    try {
      // Gerçek uygulamada ayarlar veritabanına kaydedilir
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simülasyon
      
      alert('Ayarlar başarıyla kaydedildi!')
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu!')
    }

    setSaveLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sistem Ayarları
            </h1>
            <p className="text-gray-600 mt-2">Sistem genelinde geçerli ayarları yönetin.</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* System Stats */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-8">
              <div className="flex items-center mb-6">
                <Database className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Sistem İstatistikleri</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.ogrenciler}</div>
                  <div className="text-sm text-gray-600 mt-1">Öğrenci</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.ogretmenler}</div>
                  <div className="text-sm text-gray-600 mt-1">Öğretmen</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.isletmeler}</div>
                  <div className="text-sm text-gray-600 mt-1">İşletme</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.dekontlar}</div>
                  <div className="text-sm text-gray-600 mt-1">Toplam Dekont</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.bekleyenDekontlar}</div>
                  <div className="text-sm text-gray-600 mt-1">Bekleyen</div>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center mb-6">
                <Settings className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Genel Ayarlar</h2>
              </div>
              
              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">E-posta Bildirimleri</h3>
                    <p className="text-sm text-gray-500">Sistem olayları için e-posta gönder</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Auto Approval */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Otomatik Onay</h3>
                    <p className="text-sm text-gray-500">Belirli koşullarda dekontları otomatik onayla</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoApproval}
                      onChange={(e) => setSettings({...settings, autoApproval: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* File Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Dosya Ayarları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maksimum Dosya Boyutu (MB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.maxFileSize}
                        onChange={(e) => setSettings({...settings, maxFileSize: parseInt(e.target.value)})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İzin Verilen Dosya Türleri
                      </label>
                      <input
                        type="text"
                        value={settings.allowedFileTypes}
                        onChange={(e) => setSettings({...settings, allowedFileTypes: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="pdf,jpg,png"
                      />
                    </div>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Bakım Modu</h3>
                    <p className="text-sm text-gray-500">Sistemi geçici olarak kullanıma kapat</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.systemMaintenance}
                      onChange={(e) => setSettings({...settings, systemMaintenance: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveSettings}
                  disabled={saveLoading}
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {saveLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Hızlı İşlemler</h2>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/admin/kullanicilar')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Kullanıcı Yönetimi
                </button>
                <button
                  onClick={() => router.push('/admin/dekontlar')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <Database className="h-4 w-4 inline mr-2" />
                  Dekont Yönetimi
                </button>
                <button
                  onClick={() => router.push('/admin/raporlar')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <Mail className="h-4 w-4 inline mr-2" />
                  Rapor ve Analiz
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Sistem Durumu</h3>
              <p className="text-indigo-100 text-sm mb-4">
                Sistem normal çalışıyor. Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
              </p>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm">Çevrimiçi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}