'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Upload, Lock, CheckCircle, AlertTriangle, Shield, Settings, HardDrive } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'

interface InstallationStatus {
  is_installed: boolean
  installation_status: string
  installation_date?: string
  environment_type?: string
  system_ready: boolean
  table_count: number
  admin_count: number
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [environmentType, setEnvironmentType] = useState<'development' | 'staging' | 'production'>('production')
  const [hostname, setHostname] = useState('')
  const [installationNotes, setInstallationNotes] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  useEffect(() => {
    checkInstallationStatus()
    setHostname(window.location.hostname)
  }, [])

  const checkInstallationStatus = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('check_installation_status')
      
      if (error) {
        console.error('Installation status check failed:', error)
        // Hata durumunda sistem kurulu değil varsay (güvenli başlangıç)
        setInstallationStatus({
          is_installed: false,
          installation_status: 'not_installed',
          system_ready: false,
          table_count: 0,
          admin_count: 0
        })
        return
      }

      setInstallationStatus(data)
      
      // Eğer sistem kuruluysa ana sayfaya yönlendir
      if (data.is_installed && data.system_ready) {
        router.push('/')
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      // Beklenmeyen hata durumunda da sistem kurulu değil varsay
      setInstallationStatus({
        is_installed: false,
        installation_status: 'not_installed',
        system_ready: false,
        table_count: 0,
        admin_count: 0
      })
    }
    setLoading(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const isJSON = file.type === 'application/json' || file.name.endsWith('.json')
      const isZIP = file.type === 'application/zip' || file.name.endsWith('.zip')
      
      if (isJSON || isZIP) {
        setBackupFile(file)
        setError('')
      } else {
        setError('Lütfen geçerli bir backup dosyası seçin (ZIP veya JSON).')
      }
    }
  }

  const handleInstallation = async () => {
    if (!backupFile) {
      setError('Lütfen bir backup dosyası seçin.')
      return
    }

    setInstalling(true)
    setError('')
    setProgress('Backup dosyası okunuyor...')

    try {
      let backupData: any

      // ZIP veya JSON dosyasına göre işlem yap
      if (backupFile.name.endsWith('.zip')) {
        setProgress('ZIP dosyası açılıyor...')
        
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(backupFile)
        
        // ZIP içinden gerekli dosyaları bul
        const tableFiles: { [key: string]: any } = {}
        let schemaData: any = {}
        
        // Tables klasöründeki JSON dosyalarını oku
        for (const fileName in zipContent.files) {
          const file = zipContent.files[fileName]
          
          if (fileName.startsWith('tables/') && fileName.endsWith('.json')) {
            const tableName = fileName.replace('tables/', '').replace('.json', '')
            const content = await file.async('text')
            const tableData = JSON.parse(content)
            tableFiles[tableName] = tableData.data || []
          }
          
          // Schema dosyalarını oku
          if (fileName.startsWith('schema/')) {
            const content = await file.async('text')
            const data = JSON.parse(content)
            
            if (fileName.includes('functions.json')) {
              schemaData.functions = data
            } else if (fileName.includes('triggers.json')) {
              schemaData.triggers = data
            } else if (fileName.includes('indexes.json')) {
              schemaData.indexes = data
            } else if (fileName.includes('policies.json')) {
              schemaData.policies = data
            }
          }
        }
        
        // Backup data formatını oluştur
        const tables = Object.keys(tableFiles).map(tableName => ({
          table_name: tableName,
          data: tableFiles[tableName]
        }))
        
        backupData = {
          tables: tables,
          schema: schemaData
        }
        
        setProgress('ZIP dosyası başarıyla açıldı...')
        
      } else {
        // JSON dosyası için
        const fileContent = await backupFile.text()
        backupData = JSON.parse(fileContent)
      }

      setProgress('Kurulum başlatılıyor...')

      // Kurulumu başlat
      const { data: installResult, error: installError } = await supabase.rpc('install_from_backup', {
        p_backup_data: backupData,
        p_environment_type: environmentType,
        p_hostname: hostname,
        p_notes: installationNotes || `Backup'tan kurulum: ${backupFile.name}`
      })

      if (installError) {
        throw new Error(`Kurulum hatası: ${installError.message}`)
      }

      if (!installResult.success) {
        throw new Error(installResult.error || 'Kurulum başarısız')
      }

      setProgress('Kurulum tamamlandı! Yönlendiriliyor...')
      
      // Başarılı kurulum sonrası ana sayfaya yönlendir
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error) {
      console.error('Installation failed:', error)
      setError((error as Error).message)
      setProgress('')
    }
    
    setInstalling(false)
  }

  // Loading durumu
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Database className="h-8 w-8 animate-pulse text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistem Kontrol Ediliyor</h2>
            <p className="text-gray-600">Kurulum durumu belirleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Sistem zaten kuruluysa
  if (installationStatus?.is_installed && installationStatus?.system_ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 border-2 border-green-200">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔒 Sistem Kurulu</h2>
            <p className="text-gray-600 mb-4">Bu sistem zaten kurulmuş ve aktif durumda.</p>
            
            <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
              <div className="text-sm text-green-800">
                <div><strong>Kurulum Tarihi:</strong> {installationStatus.installation_date && new Date(installationStatus.installation_date).toLocaleString('tr-TR')}</div>
                <div><strong>Ortam:</strong> {installationStatus.environment_type}</div>
                <div><strong>Tablo Sayısı:</strong> {installationStatus.table_count}</div>
                <div><strong>Admin Sayısı:</strong> {installationStatus.admin_count}</div>
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              ✅ Ana Sayfaya Git
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Kurulum arayüzü
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Database className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Koordinatörlük Sistemi Kurulumu
          </h1>
          <p className="text-gray-600 mt-2">Backup dosyanızdan sisteminizi kurmaya başlayın</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Panel - Bilgilendirme */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center mb-4">
                <HardDrive className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Kurulum Hakkında</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 mb-1">📦 Desteklenen Backup Formatları:</div>
                      <ul className="text-blue-700 space-y-1">
                        <li>• <strong>ZIP:</strong> Admin panelden indirilen backup dosyası</li>
                        <li>• <strong>JSON:</strong> Tek dosya backup formatı</li>
                        <li>• Tablo verileri ve şema bilgileri</li>
                        <li>• Admin kullanıcılar ve sistem ayarları</li>
                        <li>• RPC fonksiyonları ve politikalar</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-green-800 mb-1">🔒 Güvenlik Özellikleri:</div>
                      <ul className="text-green-700 space-y-1">
                        <li>• Atomik kurulum işlemi</li>
                        <li>• Hata durumunda rollback</li>
                        <li>• Kurulum sonrası sistem kilidi</li>
                        <li>• Multi-environment desteği</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800 mb-1">⚠️ Önemli Notlar:</div>
                      <ul className="text-yellow-700 space-y-1">
                        <li>• Bu işlem sadece bir kez yapılabilir</li>
                        <li>• Backup dosyası güvenilir kaynaktan olmalı</li>
                        <li>• Kurulum sırasında sayfa kapatılmamalı</li>
                        <li>• İşlem 2-5 dakika sürebilir</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Panel - Kurulum Formu */}
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center mb-6">
              <Upload className="h-6 w-6 text-indigo-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Sistem Kurulumu</h2>
            </div>

            <div className="space-y-6">
              {/* Backup Dosyası Yükleme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Dosyası *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="backup-file"
                    disabled={installing}
                  />
                  <label htmlFor="backup-file" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">
                      {backupFile ? (
                        <div className="text-green-600 font-medium">
                          ✅ {backupFile.name}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">Backup dosyası seçin</div>
                          <div className="text-xs mt-1">ZIP veya JSON • Maksimum 50MB</div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Ortam Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ortam Türü
                </label>
                <select
                  value={environmentType}
                  onChange={(e) => setEnvironmentType(e.target.value as any)}
                  disabled={installing}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="production">🚀 Production (Canlı)</option>
                  <option value="staging">🧪 Staging (Test)</option>
                  <option value="development">💻 Development (Geliştirme)</option>
                </select>
              </div>

              {/* Hostname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hostname
                </label>
                <input
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  disabled={installing}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="example.com"
                />
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kurulum Notları (İsteğe bağlı)
                </label>
                <textarea
                  value={installationNotes}
                  onChange={(e) => setInstallationNotes(e.target.value)}
                  disabled={installing}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Kurulum hakkında notlar..."
                />
              </div>

              {/* Hata Mesajı */}
              {error && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {progress && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
                    <div className="text-sm text-blue-700">{progress}</div>
                  </div>
                </div>
              )}

              {/* Kurulum Butonu */}
              <button
                onClick={handleInstallation}
                disabled={!backupFile || installing}
                className="w-full inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {installing ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-spin" />
                    Kurulum Yapılıyor...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Sistemi Kur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}