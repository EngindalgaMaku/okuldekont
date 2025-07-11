'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Database, Users, Mail, Shield, Save, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AdminManagement } from '@/components/ui/AdminManagement'

export default function AyarlarPage() {
  const router = useRouter()
  const { adminRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('genel')

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
    schoolName: '',
    coordinator_deputy_head_name: '',
    emailNotifications: true,
    autoApproval: false,
    maxFileSize: 5, // MB
    allowedFileTypes: 'pdf,jpg,png',
    systemMaintenance: false
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

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
    try {
      setSettingsLoading(true)
      console.log('Ayarlar çekiliyor...')
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')

      if (error) {
        throw error
      }

      const settingsMap: { [key: string]: any } = {}
      if (data) {
        for (const setting of data) {
          settingsMap[setting.key] = setting.value
        }
      }

      console.log('Alınan ayarlar:', settingsMap)

      setSettings({
        schoolName: settingsMap.school_name || 'Hüsniye Özdilek MTAL',
        coordinator_deputy_head_name: settingsMap.coordinator_deputy_head_name || '',
        emailNotifications: settingsMap.email_notifications === 'true',
        autoApproval: settingsMap.auto_approval === 'true',
        maxFileSize: parseInt(settingsMap.max_file_size || '5'),
        allowedFileTypes: settingsMap.allowed_file_types || 'pdf,jpg,png',
        systemMaintenance: settingsMap.maintenance_mode === 'true'
      })
    } catch (error) {
      console.error('Ayarlar çekilirken hata:', error)
      // Hata durumunda default değerleri ayarla
      setSettings({
        schoolName: 'Hüsniye Özdilek MTAL',
        coordinator_deputy_head_name: '',
        emailNotifications: true,
        autoApproval: false,
        maxFileSize: 5,
        allowedFileTypes: 'pdf,jpg,png',
        systemMaintenance: false
      })
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaveLoading(true)
    
    try {
      console.log('Ayarlar kaydediliyor...', settings)
      
      // Her ayarı update_system_setting fonksiyonu ile güncelle
      const settingsToUpdate = [
        { key: 'school_name', value: settings.schoolName },
        { key: 'coordinator_deputy_head_name', value: settings.coordinator_deputy_head_name },
        { key: 'email_notifications', value: settings.emailNotifications.toString() },
        { key: 'auto_approval', value: settings.autoApproval.toString() },
        { key: 'max_file_size', value: settings.maxFileSize.toString() },
        { key: 'allowed_file_types', value: settings.allowedFileTypes },
        { key: 'maintenance_mode', value: settings.systemMaintenance.toString() }
      ]

      let successCount = 0
      
      for (const setting of settingsToUpdate) {
        console.log(`${setting.key} kaydediliyor:`, setting.value)
        
        const { data, error } = await supabase.rpc('update_system_setting', {
          p_setting_key: setting.key,
          p_setting_value: setting.value
        })

        if (error) {
          console.error(`${setting.key} güncellenemedi:`, error)
          throw new Error(`${setting.key} güncellenirken hata: ${error.message}`)
        }
        
        if (data === true) {
          successCount++
          console.log(`✅ ${setting.key} başarıyla güncellendi`)
        } else {
          console.warn(`⚠️ ${setting.key} güncellenme durumu belirsiz:`, data)
        }
      }
      
      console.log(`${successCount}/${settingsToUpdate.length} ayar başarıyla güncellendi`)
      setShowSuccessModal(true)
      
      // Ayarları yeniden yükle
      await fetchSettings()
      
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu: ' + (error as Error).message)
    }

    setSaveLoading(false)
  }

  // Loading state için render
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistem Ayarları Yükleniyor</h2>
            <p className="text-gray-600">Ayarlar veritabanından alınıyor...</p>
          </div>
        </div>
      </div>
    )
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

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('genel')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'genel'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Genel Ayarlar
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admin'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Admin Yönetimi
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'genel' && (
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
                {/* School Name */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Okul Bilgileri</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Okul Adı
                    </label>
                    <input
                      type="text"
                      value={settings.schoolName}
                      onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Okul adını giriniz"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bu isim sistem genelinde görüntülenecektir</p>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Koordinatör Müdür Yardımcısı Adı Soyadı
                    </label>
                    <input
                      type="text"
                      value={settings.coordinator_deputy_head_name}
                      onChange={(e) => setSettings({...settings, coordinator_deputy_head_name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Örn: Ali Veli"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bu isim, görev belgelerindeki "Koordinatör Müdür Yardımcısı" imza alanında görünecektir.</p>
                  </div>
                </div>

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

          {/* License Information */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Lisans</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Geliştirme Bilgileri</h3>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    Hüsniye Özdilek Ticaret MTAL için okulun bilişim teknolojileri alan öğretmenleri tarafından yapılmıştır.
                  </p>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-indigo-600 mr-2" />
                    <span className="text-sm text-indigo-600 font-medium">
                      İletişim: mackaengin@gmail.com
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-6 text-white ${
              settings.systemMaintenance
                ? 'bg-gradient-to-r from-red-500 to-orange-600'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600'
            }`}>
              <h3 className="text-lg font-semibold mb-2">Sistem Durumu</h3>
              <p className={`text-sm mb-4 ${
                settings.systemMaintenance ? 'text-red-100' : 'text-indigo-100'
              }`}>
                {settings.systemMaintenance
                  ? 'Sistem bakım modunda. Kullanıcı girişleri engellendi.'
                  : `Sistem normal çalışıyor. Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}`
                }
              </p>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  settings.systemMaintenance ? 'bg-orange-400' : 'bg-green-400'
                }`}></div>
                <span className="text-sm">
                  {settings.systemMaintenance ? 'Bakım Modunda' : 'Çevrimiçi'}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'admin' && (
          <AdminManagement currentUserRole={adminRole} />
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Save className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Başarılı!</h3>
              <p className="text-gray-600 mb-6">Sistem ayarları başarıyla kaydedildi.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}