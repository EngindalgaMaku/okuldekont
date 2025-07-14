'use client'

import { useState, useEffect } from 'react'
import { Settings, Database, Shield, Bell, Users, Save, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import DataIntegrityChecker from '@/components/admin/DataIntegrityChecker'

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    school_name: 'Hüsniye Özdilek Ticaret MTAL',
    auto_approve_dekont: false,
    email_notifications: true,
    performance_monitoring: true,
    max_dekont_amount: 1000,
    backup_frequency: 'daily'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
      
      if (error) throw error
      
      if (data) {
        const settingsMap = data.reduce((acc, setting) => {
          acc[setting.key] = setting.value
          return acc
        }, {} as any)
        
        setSettings({
          school_name: settingsMap.school_name || 'Hüsniye Özdilek Ticaret MTAL',
          auto_approve_dekont: settingsMap.auto_approve_dekont === 'true',
          email_notifications: settingsMap.email_notifications !== 'false',
          performance_monitoring: settingsMap.performance_monitoring !== 'false',
          max_dekont_amount: parseInt(settingsMap.max_dekont_amount || '1000'),
          backup_frequency: settingsMap.backup_frequency || 'daily'
        })
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error)
      showToast({
        type: 'error',
        title: 'Ayarlar yüklenemedi',
        message: 'Sistem ayarları yüklenirken bir hata oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      const settingsToSave = [
        { key: 'school_name', value: settings.school_name },
        { key: 'auto_approve_dekont', value: settings.auto_approve_dekont.toString() },
        { key: 'email_notifications', value: settings.email_notifications.toString() },
        { key: 'performance_monitoring', value: settings.performance_monitoring.toString() },
        { key: 'max_dekont_amount', value: settings.max_dekont_amount.toString() },
        { key: 'backup_frequency', value: settings.backup_frequency }
      ]
      
      for (const setting of settingsToSave) {
        await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'key' })
      }
      
      showToast({
        type: 'success',
        title: 'Ayarlar kaydedildi',
        message: 'Sistem ayarları başarıyla güncellendi'
      })
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error)
      showToast({
        type: 'error',
        title: 'Kaydetme hatası',
        message: 'Ayarlar kaydedilirken bir hata oluştu'
      })
    } finally {
      setSaving(false)
    }
  }

  const runDataIntegrityCheck = async () => {
    try {
      showToast({
        type: 'info',
        title: 'Veri bütünlüğü kontrolü',
        message: 'Kontrol başlatılıyor...'
      })
      
      // Bu otomatik olarak component içinde çalışacak
      const event = new CustomEvent('refreshDataIntegrity')
      window.dispatchEvent(event)
      
    } catch (error) {
      console.error('Veri bütünlüğü kontrolü hatası:', error)
      showToast({
        type: 'error',
        title: 'Kontrol hatası',
        message: 'Veri bütünlüğü kontrolü sırasında hata oluştu'
      })
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sistem Ayarları</h1>
            <p className="text-purple-100">Sistem yapılandırması ve veri bütünlüğü yönetimi</p>
          </div>
          <Settings className="h-12 w-12 text-purple-200" />
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Genel Ayarlar</h2>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <div className="space-y-6">
          {/* School Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Okul Adı
            </label>
            <input
              type="text"
              value={settings.school_name}
              onChange={(e) => setSettings({...settings, school_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Okul adını giriniz"
            />
          </div>

          {/* Max Dekont Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maksimum Dekont Tutarı (TL)
            </label>
            <input
              type="number"
              value={settings.max_dekont_amount}
              onChange={(e) => setSettings({...settings, max_dekont_amount: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              min="0"
              max="10000"
            />
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Otomatik Dekont Onayı</h3>
                <p className="text-sm text-gray-500">Belirli tutarın altındaki dekontları otomatik onayla</p>
              </div>
              <button
                onClick={() => setSettings({...settings, auto_approve_dekont: !settings.auto_approve_dekont})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.auto_approve_dekont ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_approve_dekont ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">E-posta Bildirimleri</h3>
                <p className="text-sm text-gray-500">Sistem bildirimlerini e-posta ile gönder</p>
              </div>
              <button
                onClick={() => setSettings({...settings, email_notifications: !settings.email_notifications})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.email_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Performans İzleme</h3>
                <p className="text-sm text-gray-500">Sistem performansını sürekli izle</p>
              </div>
              <button
                onClick={() => setSettings({...settings, performance_monitoring: !settings.performance_monitoring})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.performance_monitoring ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.performance_monitoring ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Backup Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yedekleme Sıklığı
            </label>
            <select
              value={settings.backup_frequency}
              onChange={(e) => setSettings({...settings, backup_frequency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Integrity Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Veri Bütünlüğü Yönetimi</h2>
            <p className="text-sm text-gray-500 mt-1">Sistem verilerinin tutarlılığını kontrol edin</p>
          </div>
          <button
            onClick={runDataIntegrityCheck}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Database className="w-4 h-4" />
            Manuel Kontrol
          </button>
        </div>

        <DataIntegrityChecker />
      </div>
    </div>
  )
}