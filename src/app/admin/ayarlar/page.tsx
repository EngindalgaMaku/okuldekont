'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Database, Users, Mail, Shield, Save, RefreshCw, HardDrive, Download, Trash2, Plus, RotateCcw, AlertTriangle, UserX, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AdminManagement } from '@/components/ui/AdminManagement'
import JSZip from 'jszip'
import { createProfessionalBackup, type ProfessionalBackupResult } from '@/lib/professional-backup'

export default function AyarlarPage() {
  const router = useRouter()
  const { adminRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'genel' | 'admin' | 'backup' | 'auth'>('genel')

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
  const [showBackupSuccessModal, setShowBackupSuccessModal] = useState(false)
  const [backupSuccessData, setBackupSuccessData] = useState<any>(null)
  const [selectedBackupType, setSelectedBackupType] = useState<'data_only' | 'schema_only' | 'full'>('full')
  const [showBackupTypeModal, setShowBackupTypeModal] = useState(false)

  // Backup state
  const [backupList, setBackupList] = useState([])
  const [backupStats, setBackupStats] = useState({
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    last_backup_date: null,
    total_size_kb: 0
  })
  const [backupLoading, setBackupLoading] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [newBackupName, setNewBackupName] = useState('')
  const [newBackupNotes, setNewBackupNotes] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteBackupData, setDeleteBackupData] = useState({ id: '', name: '' })
  const [deletingBackup, setDeletingBackup] = useState(false)

  // Professional backup state
  const [professionalBackupLoading, setProfessionalBackupLoading] = useState(false)
  const [showProfessionalBackupModal, setShowProfessionalBackupModal] = useState(false)
  const [professionalBackupResult, setProfessionalBackupResult] = useState<ProfessionalBackupResult | null>(null)
  const [showProfessionalResultModal, setShowProfessionalResultModal] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Restore warning state
  const [showRestoreWarningModal, setShowRestoreWarningModal] = useState(false)
  const [selectedBackupForWarning, setSelectedBackupForWarning] = useState<any>(null)
  const [warningConfirmed, setWarningConfirmed] = useState(false)

  // Download state
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [downloadingBackupId, setDownloadingBackupId] = useState('')

  // Restore state
  const [restorableBackups, setRestorableBackups] = useState([])
  const [restoreOperations, setRestoreOperations] = useState([])
  const [restoreStats, setRestoreStats] = useState({
    total_restores: 0,
    successful_restores: 0,
    failed_restores: 0,
    last_restore_date: null
  })
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null)
  const [restoreName, setRestoreName] = useState('')
  const [restoreType, setRestoreType] = useState('full')
  const [createPreBackup, setCreatePreBackup] = useState(true)
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)

  // Auth management state
  const [authStats, setAuthStats] = useState({
    total_users: 0,
    anonymous_users: 0,
    authenticated_users: 0,
    expired_anonymous: 0,
    last_cleanup_date: null
  })
  const [authLoading, setAuthLoading] = useState(false)
  const [cleaningAuth, setCleaningAuth] = useState(false)
  const [showAuthCleanupModal, setShowAuthCleanupModal] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchSettings()
    if (activeTab === 'backup') {
      fetchBackupData()
      fetchRestoreData()
    }
    if (activeTab === 'auth') {
      fetchAuthStats()
    }
  }, [activeTab])

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

  // Auth management functions
  const fetchAuthStats = async () => {
    setAuthLoading(true)
    try {
      console.log('🔍 Auth fonksiyonları kontrol ediliyor...')
      
      // Get auth user statistics
      const { data, error } = await supabase.rpc('get_auth_user_statistics')
      if (error) {
        console.error('❌ Auth RPC fonksiyon hatası:', error)
        throw new Error(`Auth fonksiyonu bulunamadı: ${error.message}\n\nÇözüm: Lütfen AUTH_DEPLOYMENT_INSTRUCTIONS.md dosyasındaki SQL komutlarını Supabase SQL Editor'da çalıştırın.`)
      }
      
      console.log('✅ Auth istatistikleri alındı:', data)
      setAuthStats(data || {
        total_users: 0,
        anonymous_users: 0,
        authenticated_users: 0,
        expired_anonymous: 0,
        last_cleanup_date: null
      })
    } catch (error) {
      console.error('Auth istatistikleri çekilirken hata:', error)
      // Show detailed error to user
      const errorMessage = (error as Error).message
      alert(`❌ Auth Sistemi Hatası:\n\n${errorMessage}\n\nDetaylar console.log'da görülebilir.`)
    }
    setAuthLoading(false)
  }

  const handleAuthCleanup = async () => {
    setCleaningAuth(true)
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_anonymous_users')
      if (error) throw error

      if (data?.success) {
        const cleanedCount = data.deleted_count || 0
        alert(`✅ Auth temizliği tamamlandı!\n\n${cleanedCount} adet süresi geçmiş anonim kullanıcı silindi.`)
        fetchAuthStats() // Refresh statistics
      } else {
        throw new Error(data?.error || 'Auth temizliği başarısız')
      }
    } catch (error) {
      console.error('Auth temizliği hatası:', error)
      alert('Auth temizliği sırasında hata: ' + (error as Error).message)
    }
    setCleaningAuth(false)
    setShowAuthCleanupModal(false)
  }

  const deployAuthFunctions = async () => {
    alert(`🚀 Auth Fonksiyonları Deploy Rehberi

Bu hatayı çözmek için aşağıdaki adımları takip edin:

1️⃣ Supabase Dashboard'ınızı açın
2️⃣ SQL Editor sekmesine gidin
3️⃣ AUTH_DEPLOYMENT_INSTRUCTIONS.md dosyasını açın
4️⃣ İçindeki SQL komutlarını kopyalayıp SQL Editor'da çalıştırın

📄 Dosya Konumu: Proje ana dizininde
📝 İçerik: get_auth_user_statistics ve cleanup_expired_anonymous_users fonksiyonları

✅ Deploy edildikten sonra "Yenile" butonuna basarak test edin.

❓ Sorun devam ederse: mackaengin@gmail.com`)
  }

  // Backup functions
  const fetchBackupData = async () => {
    setBackupLoading(true)
    try {
      // Fetch backup list
      const { data: list, error: listError } = await supabase.rpc('get_backup_list')
      if (listError) throw listError
      setBackupList(list || [])

      // Fetch backup statistics
      const { data: stats, error: statsError } = await supabase.rpc('get_backup_statistics')
      if (statsError) throw statsError
      setBackupStats(stats || {
        total_backups: 0,
        successful_backups: 0,
        failed_backups: 0,
        last_backup_date: null,
        total_size_kb: 0
      })
    } catch (error) {
      console.error('Backup data çekilirken hata:', error)
    }
    setBackupLoading(false)
  }

  const handleCreateBackup = async () => {
    setShowBackupTypeModal(true)
  }

  const handleCreateBackupWithType = async (backupType: 'data_only' | 'schema_only' | 'full') => {
    if (!newBackupName.trim()) {
      alert('Backup adı gereklidir!')
      return
    }

    setCreatingBackup(true)
    setShowBackupTypeModal(false)
    
    try {
      console.log('🔄 Güvenli backup oluşturma başlatılıyor...', {
        name: newBackupName.trim(),
        type: backupType,
        notes: newBackupNotes.trim() || null
      })

      // Create a timeout promise with longer duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Backup oluşturma işlemi 3 dakikada tamamlanmadı. Bu normal değil - sistem yöneticisine başvurun.')), 180000)
      })

      // Create backup promise with new safe function
      const backupPromise = supabase.rpc('create_advanced_backup', {
        p_backup_name: newBackupName.trim(),
        p_backup_type: backupType,
        p_notes: newBackupNotes.trim() || null
      })

      console.log('⏱️ Güvenli RPC çağrısı başlatıldı, 3 dakika timeout ile bekliyor...')
      
      // Race between backup and timeout
      const { data, error } = await Promise.race([backupPromise, timeoutPromise]) as any

      console.log('📊 Backup sonucu:', { data, error })

      if (error) {
        console.error('❌ Backup RPC hatası:', error)
        throw error
      }

      if (data?.success) {
        console.log('✅ Güvenli backup başarıyla oluşturuldu:', data)
        setBackupSuccessData(data)
        setShowBackupSuccessModal(true)
        setShowBackupModal(false)
        setNewBackupName('')
        setNewBackupNotes('')
        fetchBackupData() // Refresh backup list
      } else {
        const errorMsg = data?.error || 'Backup oluşturma başarısız'
        console.error('❌ Backup başarısız:', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('💥 Backup oluşturma hatası:', error)
      const errorMessage = (error as Error).message
      alert('Backup oluşturulurken hata:\n\n' + errorMessage + '\n\nLütfen:\n1. İnternet bağlantınızı kontrol edin\n2. Birkaç dakika bekleyip tekrar deneyin\n3. Sorun devam ederse sistem yöneticisine başvurun')
    }
    setCreatingBackup(false)
  }

  const handleDeleteBackup = (backupId: string, backupName: string) => {
    setDeleteBackupData({ id: backupId, name: backupName })
    setShowDeleteModal(true)
  }

  const confirmDeleteBackup = async () => {
    setDeletingBackup(true)
    try {
      const { data, error } = await supabase.rpc('delete_backup_complete', {
        p_backup_id: deleteBackupData.id
      })

      if (error) throw error

      if (data?.success) {
        const deletedBackup = data.deleted_backup
        const filesToCleanup = data.files_to_cleanup || []
        
        let successMessage = `✅ Backup başarıyla silindi!\n\n`
        successMessage += `📋 Silinen Backup:\n`
        successMessage += `- Ad: ${deletedBackup.backup_name}\n`
        successMessage += `- Tarih: ${new Date(deletedBackup.created_at).toLocaleString('tr-TR')}\n`
        successMessage += `- Tablo: ${deletedBackup.table_count}, Kayıt: ${deletedBackup.record_count}\n\n`
        
        if (filesToCleanup.length > 0) {
          successMessage += `🗂️ Temizlenecek Dosyalar:\n`
          filesToCleanup.forEach((file: string) => {
            successMessage += `- ${file}\n`
          })
          successMessage += `\n⚠️ Bu dosyaları manuel olarak temizlemeyi unutmayın:\n`
          successMessage += `- database_backups/ klasörü\n`
          successMessage += `- backups/ klasörü\n`
          successMessage += `- İndirilen ZIP dosyaları\n`
        }
        
        alert(successMessage)
        setShowDeleteModal(false)
        setDeleteBackupData({ id: '', name: '' })
        fetchBackupData() // Refresh backup list
      } else {
        throw new Error(data?.error || 'Backup silme başarısız')
      }
    } catch (error) {
      console.error('Backup silme hatası:', error)
      alert('Backup silinirken hata: ' + (error as Error).message)
    }
    setDeletingBackup(false)
  }

  // Professional backup functions
  const handleProfessionalBackup = async () => {
    setProfessionalBackupLoading(true)
    try {
      console.log('🚀 Professional Backup System v2.0 başlatılıyor...')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase konfigürasyonu eksik')
      }
      
      const result = await createProfessionalBackup(supabaseUrl, supabaseKey)
      
      if (result.success) {
        console.log('✅ Professional backup başarıyla tamamlandı')
        setProfessionalBackupResult(result)
        setShowProfessionalResultModal(true)
        
        // Refresh regular backup list if needed
        fetchBackupData()
      } else {
        throw new Error(result.error || 'Professional backup failed')
      }
      
    } catch (error) {
      console.error('💥 Professional backup hatası:', error)
      alert('Professional backup hatası:\n\n' + (error as Error).message)
    }
    
    setProfessionalBackupLoading(false)
    setShowProfessionalBackupModal(false)
  }

  const downloadProfessionalBackup = async (backupData: any) => {
    try {
      const zip = new JSZip()
      
      // Create comprehensive backup package
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '_')
      const backupName = `Professional_Backup_${timestamp}`
      
      // Add JSON backup
      zip.file(`${backupName}.json`, JSON.stringify(backupData, null, 2))
      
      // Add SQL backup
      let sqlBackup = `-- Professional PostgreSQL Backup System v2.0
-- Created: ${new Date().toISOString()}
-- Hash: ${backupData.metadata.integrity_hash}
-- Tables: ${backupData.statistics.total_tables}
-- Records: ${backupData.statistics.total_records}
-- Functions: ${backupData.statistics.total_functions}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';

`
      
      // Add table data as SQL INSERTs
      for (const table of backupData.schema.tables) {
        if (table.data && table.data.length > 0) {
          sqlBackup += `\n-- Table: ${table.name} (${table.record_count} records)\n`
          sqlBackup += `TRUNCATE TABLE "${table.name}" CASCADE;\n`
          
          const columns = Object.keys(table.data[0])
          for (const row of table.data) {
            const values = columns.map(col => {
              const val = row[col]
              if (val === null) return 'NULL'
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
              if (val instanceof Date) return `'${val.toISOString()}'`
              return val
            }).join(', ')
            
            sqlBackup += `INSERT INTO "${table.name}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values});\n`
          }
        }
      }
      
      zip.file(`${backupName}.sql`, sqlBackup)
      
      // Add comprehensive report
      const report = `# Professional PostgreSQL Backup Report
## Backup Information
- **Created**: ${backupData.metadata.created_at}
- **Version**: ${backupData.metadata.version}
- **Integrity Hash**: ${backupData.metadata.integrity_hash}
- **Total Objects**: ${backupData.metadata.total_objects}

## Statistics
- **Execution Time**: ${(backupData.statistics.execution_time_ms / 1000).toFixed(2)} seconds
- **Total Tables**: ${backupData.statistics.total_tables}
- **Total Records**: ${backupData.statistics.total_records}
- **Total Functions**: ${backupData.statistics.total_functions}
- **Backup Size**: ${(backupData.statistics.backup_size_bytes / 1024 / 1024).toFixed(2)} MB

## Table Details
${backupData.schema.tables.map((table: any) =>
  `- **${table.name}**: ${table.record_count} records`
).join('\n')}

## Functions
${backupData.schema.functions.map((func: any) =>
  `- **${func.name}** (${func.language}) - ${func.definition_length} chars`
).join('\n')}

## Enum Types
${backupData.schema.enum_types.map((enumType: any) =>
  `- **${enumType.enum_name}**: [${enumType.enum_values.join(', ')}]`
).join('\n')}

---
*Generated by Professional PostgreSQL Backup System v2.0*
`
      
      zip.file(`${backupName}_Report.md`, report)
      
      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${backupName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('📦 Professional backup package downloaded successfully')
      
    } catch (error) {
      console.error('Download error:', error)
      alert('Download hatası: ' + (error as Error).message)
    }
  }

  // Restore functions
  const fetchRestoreData = async () => {
    setRestoreLoading(true)
    try {
      // Fetch restorable backups
      const { data: backups, error: backupsError } = await supabase.rpc('get_restorable_backups')
      if (backupsError) throw backupsError
      setRestorableBackups(backups || [])

      // Fetch restore operations
      const { data: operations, error: operationsError } = await supabase.rpc('get_restore_operations')
      if (operationsError) throw operationsError
      setRestoreOperations(operations || [])

      // Fetch restore statistics
      const { data: stats, error: statsError } = await supabase.rpc('get_restore_statistics')
      if (statsError) throw statsError
      setRestoreStats(stats || {
        total_restores: 0,
        successful_restores: 0,
        failed_restores: 0,
        last_restore_date: null
      })
    } catch (error) {
      console.error('Restore data çekilirken hata:', error)
    }
    setRestoreLoading(false)
  }

  const handleRestoreBackup = (backup: any) => {
    setSelectedBackupForWarning(backup)
    setShowRestoreWarningModal(true)
  }

  const confirmRestoreWarning = () => {
    setWarningConfirmed(true)
    setShowRestoreWarningModal(false)
    setSelectedBackupForRestore(selectedBackupForWarning)
    setRestoreName(`Restore_${selectedBackupForWarning?.backup_name}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '_')}`)
    setShowRestoreModal(true)
  }

  const cancelRestoreWarning = () => {
    setShowRestoreWarningModal(false)
    setSelectedBackupForWarning(null)
    setWarningConfirmed(false)
  }

  const confirmRestore = () => {
    if (!restoreName.trim()) {
      alert('Restore adı gereklidir!')
      return
    }
    setShowRestoreModal(false)
    setShowRestoreConfirmModal(true)
  }

  const executeRestore = async () => {
    if (!selectedBackupForRestore) {
      alert('Restore edilecek backup seçilmedi!')
      return
    }

    setRestoringBackup(true)
    try {
      const { data, error } = await supabase.rpc('initiate_restore_operation', {
        p_backup_id: selectedBackupForRestore.id,
        p_restore_name: restoreName.trim(),
        p_restore_type: restoreType,
        p_tables_to_restore: null,
        p_create_pre_backup: createPreBackup
      })

      if (error) throw error

      if (data?.success) {
        alert('Restore işlemi başarıyla başlatıldı!')
        setShowRestoreConfirmModal(false)
        setSelectedBackupForRestore(null)
        setRestoreName('')
        fetchRestoreData() // Refresh restore operations
      } else {
        throw new Error(data?.error || 'Restore başlatma başarısız')
      }
    } catch (error) {
      console.error('Restore başlatma hatası:', error)
      alert('Restore başlatılırken hata: ' + (error as Error).message)
    }
    setRestoringBackup(false)
  }

  const cancelRestore = () => {
    setShowRestoreModal(false)
    setShowRestoreConfirmModal(false)
    setSelectedBackupForRestore(null)
    setRestoreName('')
    setRestoreType('full')
    setCreatePreBackup(true)
    setWarningConfirmed(false)
  }

  // Pagination functions
  const totalPages = Math.ceil(backupList.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBackups = backupList.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Download functions
  const handleDownloadBackup = async (backup: any) => {
    setDownloadingBackup(true)
    setDownloadingBackupId(backup.id)
    
    try {
      // Get backup export data from RPC
      const { data, error } = await supabase.rpc('get_backup_export_data', {
        p_backup_id: backup.id
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Backup export data alınamadı')
      }

      // Create ZIP file
      const zip = new JSZip()
      
      // Add README file with backup info
      const readme = `# Koordinatörlük Sistemi Backup
      
Backup Bilgileri:
================
Backup Adı: ${data.backup_info.backup_name}
Backup Tarihi: ${new Date(data.backup_info.backup_date).toLocaleString('tr-TR')}
Export Tarihi: ${new Date(data.export_date).toLocaleString('tr-TR')}
Backup Türü: ${data.backup_info.backup_type}
Notlar: ${data.backup_info.notes || 'Yok'}

İstatistikler:
==============
Toplam Tablo: ${data.backup_info.table_count}
Toplam Kayıt: ${data.backup_info.record_count}
Trigger Sayısı: ${data.backup_info.trigger_count}
Index Sayısı: ${data.backup_info.index_count}
Policy Sayısı: ${data.backup_info.policy_count}

Dosya Yapısı:
=============
- README.txt: Bu dosya
- tables/: Tablo verileri (JSON formatında)
- schema/: Veritabanı şema bilgileri
  - triggers.json: Trigger tanımları
  - indexes.json: Index tanımları
  - policies.json: RLS policy tanımları
  - functions.json: Fonksiyon tanımları

Restore İşlemi:
===============
Bu backup'ı restore etmek için admin panelindeki "Veri Yedekleme"
sekmesinden "Restore" butonunu kullanabilirsiniz.

⚠️  UYARI: Restore işlemi mevcut tüm verileri silecektir!
`

      zip.file('README.txt', readme)

      // Add table data
      const tablesFolder = zip.folder('tables')
      if (data.tables && Array.isArray(data.tables)) {
        for (const tableInfo of data.tables) {
          const fileName = `${tableInfo.table_name}.json`
          const content = JSON.stringify({
            table_name: tableInfo.table_name,
            record_count: Array.isArray(tableInfo.data) ? tableInfo.data.length : 0,
            data: tableInfo.data
          }, null, 2)
          tablesFolder?.file(fileName, content)
        }
      }

      // Add schema data
      const schemaFolder = zip.folder('schema')
      if (data.schema) {
        schemaFolder?.file('triggers.json', JSON.stringify(data.schema.triggers || [], null, 2))
        schemaFolder?.file('indexes.json', JSON.stringify(data.schema.indexes || [], null, 2))
        schemaFolder?.file('policies.json', JSON.stringify(data.schema.policies || [], null, 2))
        schemaFolder?.file('functions.json', JSON.stringify(data.schema.functions || [], null, 2))
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${data.backup_info.backup_name}_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      alert('Backup başarıyla indirildi!')

    } catch (error) {
      console.error('Backup download hatası:', error)
      alert('Backup indirilirken hata: ' + (error as Error).message)
    }
    
    setDownloadingBackup(false)
    setDownloadingBackupId('')
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
              <button
                onClick={() => setActiveTab('backup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'backup'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <HardDrive className="h-4 w-4 inline mr-2" />
                Veri Yedekleme
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'auth'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserX className="h-4 w-4 inline mr-2" />
                Auth Yönetimi
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

        {activeTab === 'backup' && (
          <div className="space-y-8">
            {/* Backup Statistics */}
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <HardDrive className="h-6 w-6 text-indigo-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Veri Yedekleme Sistemi</h2>
                </div>
                <button
                  onClick={fetchBackupData}
                  disabled={backupLoading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${backupLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{backupStats.total_backups}</div>
                  <div className="text-sm text-blue-700 mt-1">Toplam Yedek</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{backupStats.successful_backups}</div>
                  <div className="text-sm text-green-700 mt-1">Başarılı</div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{backupStats.failed_backups}</div>
                  <div className="text-sm text-red-700 mt-1">Başarısız</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((backupStats.total_size_kb || 0) / 1024)}MB
                  </div>
                  <div className="text-sm text-purple-700 mt-1">Toplam Boyut</div>
                </div>
              </div>

              {/* Create Backup Buttons */}
              <div className="space-y-6 mb-6">
                {/* Standard Backup */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Standart Yedek</h3>
                    <p className="text-sm text-gray-600">Mevcut RPC sistemini kullanarak yedek alın</p>
                  </div>
                  <button
                    onClick={() => setShowBackupModal(true)}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Standart Yedek Oluştur
                  </button>
                </div>

                {/* Professional Backup */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-purple-900 flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Professional Backup System v2.0
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">Gelişmiş backup sistemi - Tam veri + fonksiyon algılama</p>
                      <div className="flex items-center mt-2 space-x-4 text-xs text-purple-600">
                        <span className="flex items-center">
                          <Database className="h-3 w-3 mr-1" />
                          11 Tablo + 674+ Kayıt
                        </span>
                        <span className="flex items-center">
                          <Settings className="h-3 w-3 mr-1" />
                          49 RPC Fonksiyon
                        </span>
                        <span className="flex items-center">
                          <Shield className="h-3 w-3 mr-1" />
                          Hash Doğrulama
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProfessionalBackupModal(true)}
                      disabled={professionalBackupLoading}
                      className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 border border-transparent rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                    >
                      {professionalBackupLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Professional Backup
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Last Backup Info */}
              {backupStats.last_backup_date && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-700">
                      Son yedek: {new Date(backupStats.last_backup_date).toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Backup List */}
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center mb-6">
                <Database className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Yedek Listesi</h2>
              </div>

              {backupLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-gray-600">Yedek listesi yükleniyor...</p>
                </div>
              ) : backupList.length === 0 ? (
                <div className="text-center py-8">
                  <HardDrive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Henüz yedek bulunmuyor</p>
                  <p className="text-sm text-gray-500 mt-1">İlk yedeğinizi oluşturmak için yukarıdaki butonu kullanın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                          Yedek Adı
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          Tarih
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          İçerik
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                          Durum
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentBackups.map((backup: any) => (
                        <tr key={backup.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                              {backup.backup_name}
                            </div>
                            {backup.notes && (
                              <div className="text-xs text-gray-500 truncate max-w-[180px] mt-1">
                                {backup.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4 text-xs text-gray-900">
                            <div className="whitespace-nowrap">
                              {new Date(backup.backup_date).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="whitespace-nowrap text-gray-500">
                              {new Date(backup.backup_date).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-xs text-gray-900">
                            <div className="space-y-1">
                              <div><strong>{backup.table_count}</strong> Tablo</div>
                              <div><strong>{backup.record_count}</strong> Kayıt</div>
                              <div className="text-blue-600">
                                <strong>{backup.rpc_function_count || 0}</strong> RPC Fonksiyon
                              </div>
                              <div className="text-green-600">
                                <strong>{backup.trigger_count || 0}</strong> Trigger
                              </div>
                              <div className="text-purple-600">
                                <strong>{backup.index_count || 0}</strong> Index
                              </div>
                              <div className="text-orange-600">
                                <strong>{backup.policy_count || 0}</strong> RLS Policy
                              </div>
                              <div className="text-pink-600">
                                <strong>2</strong> Enum Type
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              backup.backup_status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : backup.backup_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {backup.backup_status === 'completed' ? 'Tamam' :
                               backup.backup_status === 'failed' ? 'Hata' : 'Devam'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleDownloadBackup(backup)}
                                disabled={downloadingBackup && downloadingBackupId === backup.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed p-1 hover:bg-green-50 rounded"
                                title="ZIP olarak İndir"
                              >
                                {downloadingBackup && downloadingBackupId === backup.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRestoreBackup(backup)}
                                className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                                title="Restore Et"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(backup.id, backup.backup_name)}
                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {backupList.length > itemsPerPage && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Önceki
                      </button>
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sonraki
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, backupList.length)}</span> arası,{' '}
                          <span className="font-medium">{backupList.length}</span> toplam yedek
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Önceki</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          
                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Sonraki</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="space-y-8">
            {/* Auth Statistics */}
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <UserX className="h-6 w-6 text-indigo-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Authentication Yönetimi</h2>
                </div>
                <button
                  onClick={fetchAuthStats}
                  disabled={authLoading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${authLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{authStats.total_users}</div>
                  <div className="text-sm text-blue-700 mt-1">Toplam Kullanıcı</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">{authStats.anonymous_users}</div>
                  <div className="text-sm text-yellow-700 mt-1">Anonim Kullanıcı</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{authStats.authenticated_users}</div>
                  <div className="text-sm text-green-700 mt-1">Kayıtlı Kullanıcı</div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{authStats.expired_anonymous}</div>
                  <div className="text-sm text-red-700 mt-1">Süresi Geçmiş</div>
                </div>
              </div>

              {/* Deploy Functions Alert - Show if all stats are 0 */}
              {authStats.total_users === 0 && authStats.anonymous_users === 0 && authStats.authenticated_users === 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-red-900 mb-2">⚠️ Auth Fonksiyonları Eksik</h3>
                        <p className="text-sm text-red-700">
                          Auth yönetimi için gerekli fonksiyonlar henüz deploy edilmemiş
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={deployAuthFunctions}
                      className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 transition-all duration-200"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Deploy Rehberi
                    </button>
                  </div>
                  <div className="bg-red-100 rounded-xl p-4 border border-red-300">
                    <div className="flex items-start">
                      <Database className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-red-800 mb-1">📋 Deploy Edilmesi Gereken Fonksiyonlar:</div>
                        <ul className="text-red-700 space-y-1">
                          <li>• get_auth_user_statistics() - Auth istatistiklerini getirir</li>
                          <li>• cleanup_expired_anonymous_users() - Eski anonim kullanıcıları temizler</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cleanup Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">🧹 Otomatik Temizlik</h3>
                    <p className="text-sm text-gray-600">
                      1 günden eski anonim kullanıcıları temizleyin
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAuthCleanupModal(true)}
                    disabled={cleaningAuth || authStats.expired_anonymous === 0}
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Temizlik Başlat
                  </button>
                </div>

                {authStats.expired_anonymous > 0 && (
                  <div className="bg-orange-100 rounded-xl p-4 border border-orange-300">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm text-orange-700">
                        <strong>{authStats.expired_anonymous}</strong> adet süresi geçmiş anonim kullanıcı temizlenmeyi bekliyor
                      </span>
                    </div>
                  </div>
                )}

                {authStats.last_cleanup_date && (
                  <div className="mt-4 text-xs text-gray-500">
                    Son temizlik: {new Date(authStats.last_cleanup_date).toLocaleString('tr-TR')}
                  </div>
                )}
              </div>

              {/* Information Section */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">ℹ️ Auth Yönetimi Hakkında:</div>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Sistem girişlerinde otomatik anonim kullanıcılar oluşur</li>
                      <li>• Bu kullanıcılar geçici olup 7 gün sonra temizlenebilir</li>
                      <li>• Temizlik işlemi yalnızca süresi geçmiş kayıtları siler</li>
                      <li>• Aktif oturumlar korunur ve etkilenmez</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backup Creation Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <HardDrive className="h-6 w-6 text-indigo-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Yeni Yedek Oluştur</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yedek Adı *
                </label>
                <input
                  type="text"
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: Aylık_Yedek_Ocak_2025"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Not (İsteğe bağlı)
                </label>
                <textarea
                  value={newBackupNotes}
                  onChange={(e) => setNewBackupNotes(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Yedek hakkında açıklama..."
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">Yedeklenecek İçerik:</div>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Tüm tablo verileri</li>
                      <li>• Triggers ve fonksiyonlar</li>
                      <li>• Indexes ve kısıtlamalar</li>
                      <li>• RLS politikaları</li>
                      <li>• RPC fonksiyonları</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBackupModal(false)
                  setNewBackupName('')
                  setNewBackupNotes('')
                }}
                disabled={creatingBackup}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup || !newBackupName.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor... (Max 3dk)
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Yedek Oluştur
                  </>
                )}
              </button>
            </div>
            
            {/* Progress indicator when creating backup */}
            {creatingBackup && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 text-blue-600 mr-3 animate-spin" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-800 text-sm">Backup oluşturuluyor...</div>
                    <div className="text-blue-700 text-xs mt-1">
                      Bu işlem 1-2 dakika sürebilir. Lütfen sayfayı kapatmayın ve bekleyin.
                    </div>
                    <div className="text-blue-600 text-xs mt-1">
                      • Tablolar taranıyor • Schema nesneleri belirleniyor • Veri toplanıyor
                    </div>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Yedek Silme Onayı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>"{deleteBackupData.name}"</strong> adlı yedeği silmek istediğinizden emin misiniz?
              </p>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start">
                  <Trash2 className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-red-800 mb-1">⚠️ Dikkat:</div>
                    <ul className="text-red-700 space-y-1">
                      <li>• Bu işlem geri alınamaz</li>
                      <li>• Sadece yedek kaydı silinecek</li>
                      <li>• Fiziksel yedek dosyaları elle silinmelidir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteBackupData({ id: '', name: '' })
                }}
                disabled={deletingBackup}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDeleteBackup}
                disabled={deletingBackup}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Evet, Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Configuration Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <RotateCcw className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Veri Geri Yükleme</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">Seçilen Backup:</div>
                    <div className="text-blue-700">
                      <div><strong>{selectedBackupForRestore?.backup_name}</strong></div>
                      <div>{selectedBackupForRestore && new Date(selectedBackupForRestore.backup_date).toLocaleString('tr-TR')}</div>
                      <div>{selectedBackupForRestore?.table_count} Tablo, {selectedBackupForRestore?.record_count} Kayıt</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restore Adı *
                </label>
                <input
                  type="text"
                  value={restoreName}
                  onChange={(e) => setRestoreName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: Restore_Emergency_2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restore Türü
                </label>
                <select
                  value={restoreType}
                  onChange={(e) => setRestoreType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="full">Tam Restore (Tüm Veriler)</option>
                  <option value="selective" disabled>Seçmeli Restore (Yakında)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  id="create-pre-backup"
                  type="checkbox"
                  checked={createPreBackup}
                  onChange={(e) => setCreatePreBackup(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="create-pre-backup" className="ml-3 text-sm text-gray-700">
                  Restore öncesi otomatik backup oluştur (Önerilen)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelRestore}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmRestore}
                disabled={!restoreName.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Restore Onayı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>"{selectedBackupForRestore?.backup_name}"</strong> yedeğini geri yüklemek istediğinizden emin misiniz?
              </p>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-red-800 mb-1">⚠️ ÖNEMLİ UYARI:</div>
                    <ul className="text-red-700 space-y-1">
                      <li>• Mevcut tüm veriler silinecek</li>
                      <li>• Bu işlem geri alınamaz</li>
                      <li>• Sistem geçici olarak kullanılamaz olabilir</li>
                      {createPreBackup && <li>• Önce otomatik backup alınacak</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRestore}
                disabled={restoringBackup}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İptal
              </button>
              <button
                onClick={executeRestore}
                disabled={restoringBackup}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {restoringBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Restore Ediliyor...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Evet, Restore Et
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Critical Restore Warning Modal */}
      {showRestoreWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all border-4 border-red-500">
            <div className="flex items-center mb-6">
              <div className="bg-red-100 rounded-full p-3 mr-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">⚠️ KRİTİK UYARI ⚠️</h3>
                <p className="text-red-700 font-medium">Tehlikeli İşlem - Veri Geri Yükleme</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-900 mb-3">BU İŞLEM GERİ ALINAMAZ!</h4>
                    <ul className="text-red-800 space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span><strong>Mevcut tüm verileriniz silinecek</strong> ve yerine backup verileri yüklenecek</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span>Backup tarihinden <strong>sonraki tüm veriler kaybolacak</strong> (öğrenci kayıtları, dekontlar, vs.)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span>Sistem restore sırasında <strong>tüm kullanıcılar çıkış yapacak</strong></span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        <span>Bu işlem <strong>10-15 dakika sürebilir</strong> ve sistemde kesinti yaşanacak</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-300">
                <div className="flex items-start">
                  <div className="bg-yellow-400 rounded-full p-1 mr-3 mt-0.5">
                    <span className="text-yellow-900 font-bold text-xs">!</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-yellow-900 mb-2">Seçilen Backup:</h4>
                    <div className="text-yellow-800 text-sm">
                      <div><strong>Ad:</strong> {selectedBackupForWarning?.backup_name}</div>
                      <div><strong>Tarih:</strong> {selectedBackupForWarning && new Date(selectedBackupForWarning.backup_date).toLocaleString('tr-TR')}</div>
                      <div><strong>Veri:</strong> {selectedBackupForWarning?.table_count} Tablo, {selectedBackupForWarning?.record_count} Kayıt</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">Restore işlemi şunları yapacak:</div>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Önce mevcut sistemin otomatik backup'ı alınacak</li>
                      <li>• Tüm tablolar temizlenip backup verileri yüklenecek</li>
                      <li>• RPC fonksiyonları ve politikalar restore edilecek</li>
                      <li>• Sistem yeniden başlatılacak</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 text-white rounded-xl p-4 border-2 border-gray-700">
                <p className="text-center font-bold text-lg mb-2">⚠️ SON UYARI ⚠️</p>
                <p className="text-center text-sm">
                  Bu işlemi yalnızca acil durumlarda (veri bozulması, kritik hata, vs.)
                  ve <strong>tüm sonuçlarını kabul ettiğinizde</strong> gerçekleştirin!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRestoreWarning}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
              >
                ❌ İptal Et (Güvenli Seçenek)
              </button>
              <button
                onClick={confirmRestoreWarning}
                className="inline-flex items-center px-6 py-3 text-sm font-bold text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 transition-colors shadow-lg"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                ⚡ RİSKİ KABUL ET - RESTORE ET
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Bu uyarıyı dikkatlice okumadan devam etmeyiniz.
                Restore işlemi tamamlandıktan sonra veri kaybından sistem sorumlu değildir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backup Success Modal */}
      {showBackupSuccessModal && backupSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <HardDrive className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 Backup Başarıyla Oluşturuldu!</h3>
              <p className="text-gray-600 mb-6">Veritabanı yedeği dinamik algılama ile tamamlandı.</p>
              
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6 border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-3">📊 Backup Detayları:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{backupSuccessData.table_count || 0}</div>
                    <div className="text-gray-600">Tablo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{backupSuccessData.record_count || 0}</div>
                    <div className="text-gray-600">Kayıt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{backupSuccessData.rpc_function_count || 0}</div>
                    <div className="text-gray-600">RPC Fonksiyon</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{backupSuccessData.trigger_count || 0}</div>
                    <div className="text-gray-600">Trigger</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{backupSuccessData.index_count || 0}</div>
                    <div className="text-gray-600">Index</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{backupSuccessData.policy_count || 0}</div>
                    <div className="text-gray-600">Policy</div>
                  </div>
                  {backupSuccessData.enum_type_count > 0 && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">{backupSuccessData.enum_type_count}</div>
                        <div className="text-gray-600">Enum Type</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-600">{backupSuccessData.view_count || 0}</div>
                        <div className="text-gray-600">View</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                <div className="flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600 mr-2" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800">
                      ⚡ Algılama Modu: {backupSuccessData.detection_mode || 'dynamic_auto_discovery'}
                    </div>
                    <div className="text-blue-700">
                      ⏱️ Tamamlanma Süresi: {backupSuccessData.execution_time_seconds || 0} saniye
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Backup ID: {backupSuccessData.backup_id}
              </div>

              <button
                onClick={() => {
                  setShowBackupSuccessModal(false)
                  setBackupSuccessData(null)
                }}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg"
              >
                ✅ Harika! Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Type Selection Modal */}
      {showBackupTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all">
            <div className="flex items-center mb-6">
              <HardDrive className="h-6 w-6 text-indigo-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Backup Türü Seçin</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Data Only */}
              <div
                onClick={() => handleCreateBackupWithType('data_only')}
                className="cursor-pointer p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">📊 Sadece Veri</h4>
                  <p className="text-sm text-gray-600 mb-3">Yalnızca tablo verilerini yedekler</p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• Tüm tablo verileri</div>
                    <div>• Hızlı backup</div>
                    <div>• Küçük dosya boyutu</div>
                  </div>
                </div>
              </div>

              {/* Schema Only */}
              <div
                onClick={() => handleCreateBackupWithType('schema_only')}
                className="cursor-pointer p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">🏗️ Sadece Yapı</h4>
                  <p className="text-sm text-gray-600 mb-3">Yapı + kritik veriler</p>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>• Schema objeler</div>
                    <div>• Admin kullanıcılar</div>
                    <div>• Sistem ayarları</div>
                  </div>
                </div>
              </div>

              {/* Full Backup */}
              <div
                onClick={() => handleCreateBackupWithType('full')}
                className="cursor-pointer p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">🔒 Tam Yedek</h4>
                  <p className="text-sm text-gray-600 mb-3">Komplet sistem yedeği</p>
                  <div className="text-xs text-purple-600 space-y-1">
                    <div>• Tüm veriler</div>
                    <div>• Tüm schema objeler</div>
                    <div>• Maksimum güvenlik</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="flex items-start">
                <Database className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800 mb-1">💡 Hangi Türü Seçmeli?</div>
                  <ul className="text-blue-700 space-y-1">
                    <li><strong>Data Only:</strong> Günlük yedekler için, veri kaybına karşı</li>
                    <li><strong>Schema Only:</strong> Geliştirme sonrası, yapı değişikliklerinde</li>
                    <li><strong>Full:</strong> Kritik durumlar, tam restore gerektiğinde</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 mb-1">🔐 Güvenlik Özellikleri:</div>
                  <ul className="text-yellow-700 space-y-1">
                    <li>• Restore öncesi otomatik emergency backup</li>
                    <li>• Transaction bazlı güvenli işlemler</li>
                    <li>• Rollback desteği hata durumunda</li>
                    <li>• Admin kullanıcı korunması (schema_only'de)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowBackupTypeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Cleanup Confirmation Modal */}
      {showAuthCleanupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <UserX className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Auth Temizlik Onayı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>{authStats.expired_anonymous}</strong> adet süresi geçmiş anonim kullanıcıyı silmek istediğinizden emin misiniz?
              </p>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-orange-800 mb-1">⚠️ Temizlik Kriterleri:</div>
                    <ul className="text-orange-700 space-y-1">
                      <li>• 7 günden eski anonim kullanıcılar silinecek</li>
                      <li>• Aktif oturumlar korunacak</li>
                      <li>• Kayıtlı kullanıcılar etkilenmeyecek</li>
                      <li>• Bu işlem geri alınamaz</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAuthCleanupModal(false)}
                disabled={cleaningAuth}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAuthCleanup}
                disabled={cleaningAuth}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cleaningAuth ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Temizleniyor...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Evet, Temizle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

     {/* Professional Backup Modal */}
     {showProfessionalBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Professional Backup System v2.0</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-purple-800 mb-1">🚀 Gelişmiş Özellikler:</div>
                    <ul className="text-purple-700 space-y-1">
                      <li>• Dinamik tablo ve fonksiyon algılama</li>
                      <li>• 11 tablo + 674+ kayıt + 49 RPC fonksiyon</li>
                      <li>• Integrity hash doğrulama</li>
                      <li>• JSON + SQL + Markdown rapor</li>
                      <li>• ~5 saniyede tamamlanır</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <Settings className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">📋 İçerik:</div>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Tam veri yedeği (tüm tablolar)</li>
                      <li>• PostgreSQL fonksiyon tanımları</li>
                      <li>• Enum type ve schema bilgileri</li>
                      <li>• Performans ve istatistik raporları</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800 mb-1">✅ Avantajları:</div>
                    <ul className="text-green-700 space-y-1">
                      <li>• Standart backup'tan daha kapsamlı</li>
                      <li>• Fonksiyon eksikliği problemi yok</li>
                      <li>• Doğrudan indirilebilir ZIP paketi</li>
                      <li>• Hash ile veri bütünlüğü kontrolü</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowProfessionalBackupModal(false)}
                disabled={professionalBackupLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleProfessionalBackup}
                disabled={professionalBackupLoading}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 border border-transparent rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {professionalBackupLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Professional Backup Başlat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Backup Result Modal */}
      {showProfessionalResultModal && professionalBackupResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Professional Backup Tamamlandı!</h3>
              <p className="text-gray-600 mb-6">Enterprise-grade backup sistemi başarıyla çalıştırıldı.</p>
              
              {professionalBackupResult.backup && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-4">📊 Backup İstatistikleri:</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{professionalBackupResult.backup.statistics.total_tables}</div>
                      <div className="text-gray-600">Tablo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{professionalBackupResult.backup.statistics.total_records}</div>
                      <div className="text-gray-600">Kayıt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{professionalBackupResult.backup.statistics.total_functions}</div>
                      <div className="text-gray-600">Fonksiyon</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{(professionalBackupResult.backup.statistics.execution_time_ms / 1000).toFixed(1)}s</div>
                      <div className="text-gray-600">Süre</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Veri Bütünlüğü:</span>
                      <span className="text-sm font-mono text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        Hash: {professionalBackupResult.backup.metadata.integrity_hash}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Backup Boyutu:</span>
                      <span className="text-sm text-gray-600">
                        {(professionalBackupResult.backup.statistics.backup_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
                <div className="flex items-center justify-center">
                  <Download className="h-5 w-5 text-green-600 mr-2" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800">
                      ✅ Backup hazır! ZIP paketi indirilebilir.
                    </div>
                    <div className="text-green-700">
                      İçerik: JSON + SQL + Markdown rapor
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowProfessionalResultModal(false)
                    setProfessionalBackupResult(null)
                  }}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    if (professionalBackupResult.backup) {
                      downloadProfessionalBackup(professionalBackupResult.backup)
                    }
                  }}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 border border-transparent rounded-xl hover:from-green-700 hover:to-blue-700 transition-colors shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  ZIP Paketini İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
   </div>
 )
}