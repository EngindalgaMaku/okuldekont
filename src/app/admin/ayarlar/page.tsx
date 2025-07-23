'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Database, Users, Mail, Shield, Save, RefreshCw, HardDrive, Download, Trash2, Key, RotateCcw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AdminManagement } from '@/components/ui/AdminManagement'

export default function AyarlarPage() {
  const router = useRouter()
  const { adminRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'genel' | 'admin' | 'backup' | 'pin'>('genel')
  
  // PIN Reset state
  const [pinResetLoading, setPinResetLoading] = useState(false)
  const [teacherPinValue, setTeacherPinValue] = useState('2025')
  const [businessPinValue, setBusinessPinValue] = useState('1234')
  const [showTeacherResetModal, setShowTeacherResetModal] = useState(false)
  const [showBusinessResetModal, setShowBusinessResetModal] = useState(false)

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
    maxFileSize: 5, // MB
    allowedFileTypes: 'pdf,jpg,png',
    systemMaintenance: false,
    showPerformanceMonitoring: false
  })
  
  // Education Years
  const [educationYears, setEducationYears] = useState<any[]>([])
  const [activeEducationYear, setActiveEducationYear] = useState<any>(null)
  const [showEducationYearModal, setShowEducationYearModal] = useState(false)
  const [newEducationYear, setNewEducationYear] = useState({
    year: '',
    startDate: '',
    endDate: '',
    active: false
  })
  const [educationYearLoading, setEducationYearLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successCountdown, setSuccessCountdown] = useState(5)

  // Backup state
  const [backupList, setBackupList] = useState<any[]>([])
  const [backupStats, setBackupStats] = useState({
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    last_backup_date: null as string | null,
    total_size_kb: 0
  })
  const [backupLoading, setBackupLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteBackupData, setDeleteBackupData] = useState({ id: '', name: '' })
  const [deletingBackup, setDeletingBackup] = useState(false)
  const [backupCreationLoading, setBackupCreationLoading] = useState(false)
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [downloadingBackupId, setDownloadingBackupId] = useState('')
  
  // New MariaDB backup options
  const [backupType, setBackupType] = useState<'full' | 'selective'>('full')
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [showTableSelector, setShowTableSelector] = useState(false)
  
  // Available tables for backup
  const availableTables = [
    'users', 'admin_profiles', 'teachers', 'companies', 'education_years',
    'fields', 'classes', 'students', 'internships', 'dekonts',
    'gorev_belgeleri', 'belgeler', 'notifications', 'system_settings'
  ]

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)


  useEffect(() => {
    fetchStats()
    fetchSettings()
    fetchEducationYears()
    if (activeTab === 'backup') {
      fetchBackupData()
    }
  }, [activeTab])

  // Success modal countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (showSuccessModal && successCountdown > 0) {
      timer = setTimeout(() => {
        setSuccessCountdown(prev => {
          const newCount = prev - 1
          if (newCount === 0) {
            setShowSuccessModal(false)
            return 5 // Reset for next time
          }
          return newCount
        })
      }, 1000)
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [showSuccessModal, successCountdown])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/dashboard-stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      
      setStats({
        ogrenciler: 0, // We'll need to create a students count endpoint
        ogretmenler: data.teacherCount || 0,
        isletmeler: data.companyCount || 0,
        dekontlar: data.dekontStats?.total || 0,
        bekleyenDekontlar: data.dekontStats?.pending || 0
      })
    } catch (error) {
      console.error('İstatistikler çekilirken hata:', error)
    }
    setLoading(false)
  }

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true)
      const response = await fetch('/api/system-settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      
      const settingsMap: { [key: string]: any } = {}
      if (data) {
        for (const setting of data) {
          settingsMap[setting.key] = setting.value
        }
      }
      setSettings({
        schoolName: settingsMap.school_name || '',
        coordinator_deputy_head_name: settingsMap.coordinator_deputy_head_name || '',
        maxFileSize: parseInt(settingsMap.max_file_size || '5'),
        allowedFileTypes: settingsMap.allowed_file_types || 'pdf,jpg,png',
        systemMaintenance: settingsMap.maintenance_mode === 'true',
        showPerformanceMonitoring: settingsMap.show_performance_monitoring === 'true'
      })
    } catch (error) {
      console.error('Ayarlar çekilirken hata:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const fetchEducationYears = async () => {
    try {
      const response = await fetch('/api/admin/education-years')
      if (!response.ok) throw new Error('Failed to fetch education years')
      const data = await response.json()
      
      setEducationYears(data)
      const active = data.find((year: any) => year.active)
      setActiveEducationYear(active || null)
    } catch (error) {
      console.error('Eğitim yılları çekilirken hata:', error)
    }
  }

  const handleSaveSettings = async () => {
    setSaveLoading(true)
    try {
      const settingsToUpdate = [
        { key: 'school_name', value: settings.schoolName },
        { key: 'coordinator_deputy_head_name', value: settings.coordinator_deputy_head_name },
        { key: 'max_file_size', value: settings.maxFileSize.toString() },
        { key: 'allowed_file_types', value: settings.allowedFileTypes },
        { key: 'maintenance_mode', value: settings.systemMaintenance.toString() },
        { key: 'show_performance_monitoring', value: settings.showPerformanceMonitoring.toString() }
      ]
      
      for (const setting of settingsToUpdate) {
        const response = await fetch('/api/system-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(setting)
        })
        if (!response.ok) throw new Error(`${setting.key} güncellenirken hata`)
      }
      
      setShowSuccessModal(true)
      setSuccessCountdown(5) // Reset countdown when showing modal
      await fetchSettings()
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu: ' + (error as Error).message)
    }
    setSaveLoading(false)
  }


  const fetchBackupData = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/admin/backups', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok) {
        setBackupList(data);
        const successfulBackups = data.filter((b: any) => b.backup_status === 'completed').length;
        setBackupStats({
          total_backups: data.length,
          successful_backups: successfulBackups,
          failed_backups: data.length - successfulBackups,
          last_backup_date: data.length > 0 ? data[0].backup_date : null,
          total_size_kb: data.reduce((acc: number, b: any) => acc + (parseFloat(b.size_mb) * 1024), 0)
        });
      } else {
        throw new Error(data.message || 'Failed to fetch backups');
      }
    } catch (error) {
      console.error('Yedek verileri çekilirken hata:', error);
      setBackupList([]);
    }
    setBackupLoading(false);
  };

  const handleDeleteBackup = (backupId: string, backupName: string) => {
    setDeleteBackupData({ id: backupId, name: backupName })
    setShowDeleteModal(true)
  }

  const confirmDeleteBackup = async () => {
    setDeletingBackup(true);
    try {
      const response = await fetch('/api/admin/backups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: deleteBackupData.id }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        alert('Yedek başarıyla silindi.');
        setShowDeleteModal(false);
        setDeleteBackupData({ id: '', name: '' });
        fetchBackupData();
      } else {
        throw new Error(result.message || 'Yedek silme başarısız oldu.');
      }
    } catch (error) {
      console.error('Yedek silme hatası:', error);
      alert(`Yedek silinirken hata: ${(error as Error).message}`);
    }
    setDeletingBackup(false);
  };

  const handleCreateBackup = async (type: 'full' | 'selective' = 'full') => {
    if (type === 'selective' && selectedTables.length === 0) {
      alert('Lütfen en az bir tablo seçin.');
      return;
    }
    
    setBackupCreationLoading(true);
    try {
      const backupRequest = type === 'full' ? 'full' : selectedTables.join(',');
      
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: backupRequest
        })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        const message = type === 'full'
          ? `Tam veri yedeği başarıyla oluşturuldu!

📁 Oluşturulan Dosyalar:
• JSON: ${result.backupFile}
• SQL: ${result.sqlFile}
• Rapor: ${result.reportFile}

📊 İstatistikler:
• Kayıt Sayısı: ${result.statistics.total_records}
• JSON Boyut: ${result.statistics.json_size_mb} MB
• SQL Boyut: ${result.statistics.sql_size_mb} MB
${result.statistics.files_size_mb > 0 ? `• Dosyalar Boyut: ${result.statistics.files_size_mb} MB` : ''}

💡 SQL dosyası MariaDB'ye geri yüklenebilir.${result.statistics.files_size_mb > 0 ? '\n📁 ZIP dosyası fiziksel dosyaları içerir (dekontlar + belgeler).' : ''}`
          : `Seçili tablolar yedeği başarıyla oluşturuldu!

📋 Yedeklenen Tablolar: ${selectedTables.join(', ')}

📁 Oluşturulan Dosyalar:
• JSON: ${result.backupFile}
• SQL: ${result.sqlFile}
• Rapor: ${result.reportFile}
${result.filesFile ? `• Dosyalar: ${result.filesFile}` : ''}

📊 İstatistikler:
• Kayıt Sayısı: ${result.statistics.total_records}
• JSON Boyut: ${result.statistics.json_size_mb} MB
• SQL Boyut: ${result.statistics.sql_size_mb} MB
${result.statistics.files_size_mb > 0 ? `• Dosyalar Boyut: ${result.statistics.files_size_mb} MB` : ''}

💡 SQL dosyası MariaDB'ye geri yüklenebilir.${result.statistics.files_size_mb > 0 ? '\n📁 ZIP dosyası fiziksel dosyaları içerir (dekontlar + belgeler).' : ''}`;

        alert(message);
        fetchBackupData();
        setShowTableSelector(false);
        setSelectedTables([]);
      } else {
        const errorMessage = result.error || result.message || 'Veri yedekleme başarısız oldu.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Veri yedekleme hatası:', error);
      alert(`Veri yedekleme hatası:\n\n${(error as Error).message}`);
    } finally {
      setBackupCreationLoading(false);
    }
  };

  const handleFullBackup = () => handleCreateBackup('full');
  const handleSelectiveBackup = () => handleCreateBackup('selective');

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(availableTables);
  };

  const clearTableSelection = () => {
    setSelectedTables([]);
  };

  const handleDownloadBackup = async (backup: any) => {
    setDownloadingBackup(true);
    setDownloadingBackupId(backup.id);
    try {
      const response = await fetch(`/api/admin/backups?download=${backup.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'İndirme başarısız oldu.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.id);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Yedek indirme hatası:', error);
      alert(`Yedek indirilirken hata: ${(error as Error).message}`);
    }
    setDownloadingBackup(false);
    setDownloadingBackupId('');
  };

  const handleDownloadZip = async (backup: any) => {
    setDownloadingBackup(true);
    setDownloadingBackupId(backup.id);
    try {
      const response = await fetch(`/api/admin/backups/zip?filename=${backup.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ZIP indirme başarısız oldu.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.id.replace('.json', '.zip'));
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('ZIP indirme hatası:', error);
      alert(`ZIP indirilirken hata: ${(error as Error).message}`);
    }
    setDownloadingBackup(false);
    setDownloadingBackupId('');
  };

  const totalPages = Math.ceil(backupList.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBackups = backupList.slice(startIndex, endIndex)

  const goToPage = (page: number) => setCurrentPage(page)
  const goToPreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1) }
  const goToNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }

  // PIN Reset Functions
  const handleTeacherResetClick = () => {
    if (!teacherPinValue || teacherPinValue.length !== 4) {
      alert('PIN 4 haneli olmalıdır')
      return
    }
    setShowTeacherResetModal(true)
  }

  const confirmTeacherReset = async () => {
    try {
      setPinResetLoading(true)
      
      const response = await fetch('/api/admin/pin-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'teacher',
          pin: teacherPinValue
        })
      })
      
      if (!response.ok) throw new Error('PIN reset failed')
      const result = await response.json()
      
      setShowTeacherResetModal(false)
      alert(`${result.count || 0} öğretmenin PINi "${teacherPinValue}" olarak güncellendi. İlk girişlerinde PIN değiştirmeleri istenecek.`)
      
    } catch (error: any) {
      console.error('Öğretmen PIN resetleme hatası:', error)
      alert('Öğretmen PINleri resetlenirken bir hata oluştu')
    } finally {
      setPinResetLoading(false)
    }
  }

  const handleBusinessResetClick = () => {
    if (!businessPinValue || businessPinValue.length !== 4) {
      alert('PIN 4 haneli olmalıdır')
      return
    }
    setShowBusinessResetModal(true)
  }

  const confirmBusinessReset = async () => {
    try {
      setPinResetLoading(true)
      
      const response = await fetch('/api/admin/pin-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'company',
          pin: businessPinValue
        })
      })
      
      if (!response.ok) throw new Error('PIN reset failed')
      const result = await response.json()
      
      setShowBusinessResetModal(false)
      alert(`${result.count || 0} işletmenin PINi "${businessPinValue}" olarak güncellendi. İlk girişlerinde PIN değiştirmeleri istenecek.`)
      
    } catch (error: any) {
      console.error('İşletme PIN resetleme hatası:', error)
      alert('İşletme PINleri resetlenirken bir hata oluştu')
    } finally {
      setPinResetLoading(false)
    }
  }

  // Education Year Management Functions
  const handleCreateEducationYear = async () => {
    if (!newEducationYear.year.trim()) {
      alert('Eğitim yılı adı gerekli')
      return
    }

    setEducationYearLoading(true)
    try {
      const response = await fetch('/api/admin/education-years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEducationYear)
      })

      if (!response.ok) throw new Error('Failed to create education year')
      
      await fetchEducationYears()
      setShowEducationYearModal(false)
      setNewEducationYear({
        year: '',
        startDate: '',
        endDate: '',
        active: false
      })
      alert('Eğitim yılı başarıyla oluşturuldu')
    } catch (error) {
      console.error('Eğitim yılı oluşturulurken hata:', error)
      alert('Eğitim yılı oluşturulamadı')
    }
    setEducationYearLoading(false)
  }

  const handleSetActiveEducationYear = async (yearId: string) => {
    setEducationYearLoading(true)
    try {
      const year = educationYears.find(y => y.id === yearId)
      if (!year) return

      const response = await fetch('/api/admin/education-years', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...year,
          active: true
        })
      })

      if (!response.ok) throw new Error('Failed to set active education year')
      
      await fetchEducationYears()
      alert('Aktif dönem başarıyla güncellendi')
    } catch (error) {
      console.error('Aktif dönem ayarlanırken hata:', error)
      alert('Aktif dönem ayarlanamadı')
    }
    setEducationYearLoading(false)
  }

  const handleDeleteEducationYear = async (yearId: string) => {
    if (!confirm('Bu eğitim yılını silmek istediğinizden emin misiniz?')) return

    setEducationYearLoading(true)
    try {
      const response = await fetch(`/api/admin/education-years?id=${yearId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete education year')
      }
      
      await fetchEducationYears()
      alert('Eğitim yılı başarıyla silindi')
    } catch (error) {
      console.error('Eğitim yılı silinirken hata:', error)
      alert((error as Error).message || 'Eğitim yılı silinemedi')
    }
    setEducationYearLoading(false)
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sistem Ayarları
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Sistem genelinde geçerli ayarları yönetin.</p>
          </div>
          {activeTab !== 'backup' && (
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          )}
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
              <button onClick={() => setActiveTab('genel')} className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'genel' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} text-left sm:text-center`}>
                <Settings className="h-4 w-4 inline mr-2" /> Genel Ayarlar
              </button>
              <button onClick={() => setActiveTab('admin')} className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'admin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} text-left sm:text-center`}>
                <Users className="h-4 w-4 inline mr-2" /> Admin Yönetimi
              </button>
              <button onClick={() => setActiveTab('backup')} className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'backup' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} text-left sm:text-center`}>
                <HardDrive className="h-4 w-4 inline mr-2" /> Veri Yedekleme
              </button>
              <button onClick={() => setActiveTab('pin')} className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'pin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} text-left sm:text-center`}>
                <Key className="h-4 w-4 inline mr-2" /> PIN Yönetimi
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'genel' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <Database className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Sistem İstatistikleri</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                  <div className="text-center"><div className="text-xl sm:text-3xl font-bold text-blue-600">{stats.ogrenciler}</div><div className="text-xs sm:text-sm text-gray-600 mt-1">Öğrenci</div></div>
                  <div className="text-center"><div className="text-xl sm:text-3xl font-bold text-green-600">{stats.ogretmenler}</div><div className="text-xs sm:text-sm text-gray-600 mt-1">Öğretmen</div></div>
                  <div className="text-center"><div className="text-xl sm:text-3xl font-bold text-orange-600">{stats.isletmeler}</div><div className="text-xs sm:text-sm text-gray-600 mt-1">İşletme</div></div>
                  <div className="text-center"><div className="text-xl sm:text-3xl font-bold text-purple-600">{stats.dekontlar}</div><div className="text-xs sm:text-sm text-gray-600 mt-1">Toplam Dekont</div></div>
                  <div className="text-center"><div className="text-xl sm:text-3xl font-bold text-yellow-600">{stats.bekleyenDekontlar}</div><div className="text-xs sm:text-sm text-gray-600 mt-1">Bekleyen</div></div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
                <div className="flex items-center mb-4 sm:mb-6"><Settings className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" /><h2 className="text-lg sm:text-xl font-semibold text-gray-900">Genel Ayarlar</h2></div>
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Okul Bilgileri</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Okul Adı</label>
                      <input type="text" value={settings.schoolName} onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })} className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" placeholder="Okul adını giriniz" />
                      <p className="text-xs text-gray-500 mt-1">Bu isim sistem genelinde görüntülenecektir</p>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Koordinatör Müdür Yardımcısı Adı Soyadı</label>
                      <input type="text" value={settings.coordinator_deputy_head_name} onChange={(e) => setSettings({ ...settings, coordinator_deputy_head_name: e.target.value })} className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" placeholder="Örn: Ali Veli" />
                      <p className="text-xs text-gray-500 mt-1">Bu isim, görev belgelerindeki "Koordinatör Müdür Yardımcısı" imza alanında görünecektir.</p>
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                        <h3 className="text-sm font-medium text-gray-900">Aktif Eğitim Dönemi</h3>
                        <button
                          onClick={() => setShowEducationYearModal(true)}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full sm:w-auto text-center"
                        >
                          Yeni Dönem Ekle
                        </button>
                      </div>
                      
                      {activeEducationYear ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-green-900">{activeEducationYear.year}</div>
                              {activeEducationYear.startDate && activeEducationYear.endDate && (
                                <div className="text-sm text-green-700 mt-1">
                                  {new Date(activeEducationYear.startDate).toLocaleDateString('tr-TR')} - {new Date(activeEducationYear.endDate).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span className="text-xs text-green-700 font-medium">Aktif</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                            <span className="text-sm text-amber-800">Aktif eğitim dönemi seçilmemiş</span>
                          </div>
                        </div>
                      )}
                      
                      {educationYears.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tüm Dönemler</label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {educationYears.map((year) => (
                              <div key={year.id} className={`flex items-center justify-between p-3 rounded-lg border-2 ${year.active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{year.year}</div>
                                  {year.startDate && year.endDate && (
                                    <div className="text-xs text-gray-600">
                                      {new Date(year.startDate).toLocaleDateString('tr-TR')} - {new Date(year.endDate).toLocaleDateString('tr-TR')}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!year.active && (
                                    <button
                                      onClick={() => handleSetActiveEducationYear(year.id)}
                                      disabled={educationYearLoading}
                                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      Aktif Yap
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteEducationYear(year.id)}
                                    disabled={educationYearLoading || year.active}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                    title={year.active ? "Aktif dönem silinemez" : "Dönemi sil"}
                                  >
                                    Sil
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Dosya Ayarları</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Maksimum Dosya Boyutu (MB)</label><input type="number" min="1" max="50" value={settings.maxFileSize} onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })} className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">İzin Verilen Dosya Türleri</label><input type="text" value={settings.allowedFileTypes} onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })} className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base" placeholder="pdf,jpg,png" /></div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div><h3 className="text-sm font-medium text-gray-900">Bakım Modu</h3><p className="text-sm text-gray-500">Sistemi geçici olarak kullanıma kapat</p></div>
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.systemMaintenance} onChange={(e) => setSettings({ ...settings, systemMaintenance: e.target.checked })} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div></label>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div><h3 className="text-sm font-medium text-gray-900">Performans İzleme</h3><p className="text-sm text-gray-500">Sayfalarda performans butonu göster</p></div>
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.showPerformanceMonitoring} onChange={(e) => setSettings({ ...settings, showPerformanceMonitoring: e.target.checked })} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div></label>
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                  <button onClick={handleSaveSettings} disabled={saveLoading} className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto justify-center">{saveLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{saveLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</button>
                </div>
              </div>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
                <div className="flex items-center mb-4"><Shield className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" /><h2 className="text-base sm:text-lg font-semibold text-gray-900">Lisans</h2></div>
                <div className="space-y-4"><div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 sm:p-4 border border-indigo-100"><h3 className="text-sm font-medium text-gray-900 mb-2 sm:mb-3">Geliştirme Bilgileri</h3><p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-2 sm:mb-3">Okulun bilişim teknolojileri alan öğretmenleri tarafından yapılmıştır.</p><div className="flex items-center"><Mail className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 mr-2" /><span className="text-xs sm:text-sm text-indigo-600 font-medium">İletişim: mackaengin@gmail.com</span></div></div></div>
              </div>
              <div className={`rounded-2xl p-4 sm:p-6 text-white ${settings.systemMaintenance ? 'bg-gradient-to-r from-red-500 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                <h3 className="text-base sm:text-lg font-semibold mb-2">Sistem Durumu</h3>
                <p className={`text-xs sm:text-sm mb-3 sm:mb-4 ${settings.systemMaintenance ? 'text-red-100' : 'text-indigo-100'}`}>{settings.systemMaintenance ? 'Sistem bakım modunda. Kullanıcı girişleri engellendi.' : `Sistem normal çalışıyor. Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}`}</p>
                <div className="flex items-center"><div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 ${settings.systemMaintenance ? 'bg-orange-400' : 'bg-green-400'}`}></div><span className="text-xs sm:text-sm">{settings.systemMaintenance ? 'Bakım Modunda' : 'Çevrimiçi'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (<AdminManagement currentUserRole={adminRole} />)}

        {activeTab === 'backup' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center"><HardDrive className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" /><h2 className="text-lg sm:text-xl font-semibold text-gray-900">Veri Yedekleme Sistemi</h2></div>
                <button onClick={fetchBackupData} disabled={backupLoading} className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50 w-full sm:w-auto justify-center"><RefreshCw className={`h-4 w-4 mr-2 ${backupLoading ? 'animate-spin' : ''}`} />Yenile</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200"><div className="text-lg sm:text-2xl font-bold text-blue-600">{backupStats.total_backups}</div><div className="text-xs sm:text-sm text-blue-700 mt-1">Toplam Yedek</div></div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200"><div className="text-lg sm:text-2xl font-bold text-green-600">{backupStats.successful_backups}</div><div className="text-xs sm:text-sm text-green-700 mt-1">Başarılı</div></div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 sm:p-4 border border-red-200"><div className="text-lg sm:text-2xl font-bold text-red-600">{backupStats.failed_backups}</div><div className="text-xs sm:text-sm text-red-700 mt-1">Başarısız</div></div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 border border-purple-200"><div className="text-lg sm:text-2xl font-bold text-purple-600">{Math.round((backupStats.total_size_kb || 0) / 1024)}MB</div><div className="text-xs sm:text-sm text-purple-700 mt-1">Toplam Boyut</div></div>
              </div>
              <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
                {/* Tam Yedek */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-medium text-blue-900 flex items-center">
                        <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Tam Veri Yedeği
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-700 mt-1">
                        Tüm tabloları JSON ve SQL formatında yedekler. SQL dosyası MariaDB'ye geri yüklenebilir.
                      </p>
                    </div>
                    <button
                      onClick={handleFullBackup}
                      disabled={backupCreationLoading}
                      className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg w-full sm:w-auto justify-center"
                    >
                      {backupCreationLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Tam Yedek Al
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Seçmeli Yedek */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-medium text-green-900 flex items-center">
                        <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Seçmeli Veri Yedeği
                      </h3>
                      <p className="text-xs sm:text-sm text-green-700 mt-1">
                        İstediğiniz tabloları seçerek JSON ve SQL formatında yedekleyin.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowTableSelector(true)}
                      disabled={backupCreationLoading}
                      className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 shadow-lg w-full sm:w-auto justify-center"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Tablo Seç
                    </button>
                  </div>
                </div>
              </div>
              {backupStats.last_backup_date && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center"><Database className="h-5 w-5 text-gray-600 mr-2" /><span className="text-sm text-gray-700">Son yedek: {new Date(backupStats.last_backup_date).toLocaleString('tr-TR')}</span></div>
                </div>
              )}
            </div>
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6"><Database className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" /><h2 className="text-lg sm:text-xl font-semibold text-gray-900">Yedek Listesi</h2></div>
              {backupLoading ? (
                <div className="text-center py-6 sm:py-8"><RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-indigo-600 mx-auto mb-3 sm:mb-4" /><p className="text-sm sm:text-base text-gray-600">Yedek listesi yükleniyor...</p></div>
              ) : backupList.length === 0 ? (
                <div className="text-center py-6 sm:py-8"><HardDrive className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" /><p className="text-sm sm:text-base text-gray-600">Henüz yedek bulunmuyor</p><p className="text-xs sm:text-sm text-gray-500 mt-1">İlk yedeğinizi oluşturmak için yukarıdaki butonu kullanın</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yedek Dosyası</th>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JSON</th>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SQL</th>
                        <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosyalar</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentBackups.map((backup: any) => (
                        <tr key={backup.id} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-xs">{backup.backup_name}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            <div className="whitespace-nowrap">{new Date(backup.backup_date).toLocaleString('tr-TR')}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-3 sm:py-4">
                            <span className={`inline-flex px-1 sm:px-2 py-1 text-xs font-semibold rounded-full ${
                              backup.backup_type === 'MariaDB'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {backup.backup_type || 'Legacy'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{backup.size_mb} MB</td>
                          <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {backup.has_sql ? (
                              <span className="text-green-600 font-medium">{backup.sql_size_mb} MB</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {backup.has_files ? (
                              <span className="text-blue-600 font-medium">{backup.files_size_mb} MB</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <button
                                onClick={() => handleDownloadBackup(backup)}
                                disabled={downloadingBackup && downloadingBackupId === backup.id}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 p-1 hover:bg-blue-50 rounded"
                                title="JSON İndir"
                              >
                                {downloadingBackup && downloadingBackupId === backup.id ?
                                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> :
                                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                }
                              </button>
                              {backup.has_sql && (
                                <button
                                  onClick={() => handleDownloadBackup({...backup, id: backup.sql_file})}
                                  disabled={downloadingBackup}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1 hover:bg-green-50 rounded"
                                  title="SQL İndir"
                                >
                                  <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              )}
                              {backup.has_files && (
                                <button
                                  onClick={() => handleDownloadBackup({...backup, id: backup.files_zip_file})}
                                  disabled={downloadingBackup}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50 p-1 hover:bg-blue-50 rounded"
                                  title="Fiziksel Dosyalar İndir (Dekontlar + Belgeler)"
                                >
                                  <HardDrive className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              )}
                              {backup.backup_type === 'MariaDB' && (
                                <button
                                  onClick={() => handleDownloadZip(backup)}
                                  disabled={downloadingBackup}
                                  className="text-purple-600 hover:text-purple-900 disabled:opacity-50 p-1 hover:bg-purple-50 rounded"
                                  title="ZIP İndir (JSON + SQL + Rapor)"
                                >
                                  <HardDrive className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteBackup(backup.id, backup.backup_name)}
                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                title="Sil"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {backupList.length > itemsPerPage && (
                <div className="bg-white px-3 sm:px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button onClick={goToPreviousPage} disabled={currentPage === 1} className="relative inline-flex items-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Önceki</button>
                      <button onClick={goToNextPage} disabled={currentPage === totalPages} className="relative ml-2 inline-flex items-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Sonraki</button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div><p className="text-sm text-gray-700"><span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, backupList.length)}</span> arası, <span className="font-medium">{backupList.length}</span> toplam yedek</p></div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button onClick={goToPreviousPage} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><span className="sr-only">Önceki</span><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg></button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button key={page} onClick={() => goToPage(page)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>{page}</button>
                          ))}
                          <button onClick={goToNextPage} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><span className="sr-only">Sonraki</span><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg></button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pin' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center">
                  <Key className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-2 sm:mr-3" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">PIN Yönetimi</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  <span className="text-xs sm:text-sm font-medium text-red-600">Güvenlik</span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                Öğretmen ve işletme PIN kodlarını toplu olarak resetleyin. Bu işlem sonrasında tüm kullanıcılar ilk girişlerinde yeni PIN belirlemek zorunda kalacaklar.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Teacher PIN Reset */}
                <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900">Öğretmen PIN Reset</h3>
                      <p className="text-xs sm:text-sm text-blue-700">Tüm öğretmenlerin PIN kodlarını resetle</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2 sm:mb-3">
                        Yeni PIN Değeri (4 haneli)
                      </label>
                      <input
                        type="text"
                        value={teacherPinValue}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setTeacherPinValue(value)
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-base sm:text-lg text-center font-mono tracking-widest"
                        placeholder="2025"
                        maxLength={4}
                        disabled={pinResetLoading}
                      />
                    </div>
                    
                    <button
                      onClick={handleTeacherResetClick}
                      disabled={pinResetLoading || !teacherPinValue || teacherPinValue.length !== 4}
                      className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                    >
                      {pinResetLoading ? (
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                      {pinResetLoading ? 'Resetleniyor...' : 'Öğretmen PINleri Resetle'}
                    </button>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-100 rounded-xl">
                    <p className="text-xs text-blue-800">
                      <strong>⚠️ Uyarı:</strong> Bu işlem tüm öğretmenlerin PIN kodlarını değiştirir. İlk girişlerinde yeni PIN belirlemeye zorlanacaklar.
                    </p>
                  </div>
                </div>

                {/* Business PIN Reset */}
                <div className="bg-green-50 rounded-2xl p-4 sm:p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-green-900">İşletme PIN Reset</h3>
                      <p className="text-xs sm:text-sm text-green-700">Tüm işletmelerin PIN kodlarını resetle</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2 sm:mb-3">
                        Yeni PIN Değeri (4 haneli)
                      </label>
                      <input
                        type="text"
                        value={businessPinValue}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setBusinessPinValue(value)
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-base sm:text-lg text-center font-mono tracking-widest"
                        placeholder="1234"
                        maxLength={4}
                        disabled={pinResetLoading}
                      />
                    </div>
                    
                    <button
                      onClick={handleBusinessResetClick}
                      disabled={pinResetLoading || !businessPinValue || businessPinValue.length !== 4}
                      className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                    >
                      {pinResetLoading ? (
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                      {pinResetLoading ? 'Resetleniyor...' : 'İşletme PINleri Resetle'}
                    </button>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-100 rounded-xl">
                    <p className="text-xs text-green-800">
                      <strong>⚠️ Uyarı:</strong> Bu işlem tüm işletmelerin PIN kodlarını değiştirir. İlk girişlerinde yeni PIN belirlemeye zorlanacaklar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 text-red-600 text-2xl">
                    🚨
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-900 text-lg mb-2">Kritik Güvenlik Uyarısı!</h4>
                    <ul className="text-sm text-red-800 space-y-2">
                      <li>• PIN resetleme işlemi <strong>geri alınamaz</strong></li>
                      <li>• Tüm kullanıcılar bir sonraki girişlerinde <strong>zorunlu olarak PIN değiştirmek</strong> zorunda kalacaklar</li>
                      <li>• Bu işlemi yapmadan önce kullanıcıları <strong>bilgilendirmeniz önerilir</strong></li>
                      <li>• Sistem geçici olarak erişilemez hale gelebilir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Teacher PIN Reset Modal */}
      {showTeacherResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Öğretmen PIN Reset Onayı</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>Tüm öğretmenlerin PIN kodlarını "{teacherPinValue}" olarak resetlemek</strong> istediğinizden emin misiniz?
              </p>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-2">📋 Bu işlem sonucunda:</div>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Sistemdeki <strong>tüm öğretmenlerin</strong> PIN kodu resetlenecek</li>
                      <li>• Her öğretmen <strong>ilk girişinde yeni PIN oluşturmaya zorlanacak</strong></li>
                      <li>• Eski PIN kodları <strong>geçersiz hale gelecek</strong></li>
                      <li>• Bu işlem <strong>geri alınamaz</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTeacherResetModal(false)}
                disabled={pinResetLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={confirmTeacherReset}
                disabled={pinResetLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {pinResetLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetleniyor...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Evet, Resetle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business PIN Reset Modal */}
      {showBusinessResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">İşletme PIN Reset Onayı</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>Tüm işletmelerin PIN kodlarını "{businessPinValue}" olarak resetlemek</strong> istediğinizden emin misiniz?
              </p>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800 mb-2">🏢 Bu işlem sonucunda:</div>
                    <ul className="text-green-700 space-y-1">
                      <li>• Sistemdeki <strong>tüm işletmelerin</strong> PIN kodu resetlenecek</li>
                      <li>• Her işletme <strong>ilk girişinde yeni PIN oluşturmaya zorlanacak</strong></li>
                      <li>• Eski PIN kodları <strong>geçersiz hale gelecek</strong></li>
                      <li>• Bu işlem <strong>geri alınamaz</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBusinessResetModal(false)}
                disabled={pinResetLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={confirmBusinessReset}
                disabled={pinResetLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {pinResetLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetleniyor...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Evet, Resetle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center mb-4"><Trash2 className="h-6 w-6 text-red-600 mr-3" /><h3 className="text-xl font-semibold text-gray-900">Yedek Silme Onayı</h3></div>
            <div className="mb-6">
              <p className="text-gray-700 mb-4"><strong>"{deleteBackupData.name}"</strong> adlı yedeği silmek istediğinizden emin misiniz?</p>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start">
                  <Trash2 className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-red-800 mb-1">⚠️ Dikkat:</div>
                    <ul className="text-red-700 space-y-1">
                      <li>• Bu işlem geri alınamaz</li>
                      <li>• Fiziksel yedek dosyası sunucudan silinecektir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteBackupData({ id: '', name: '' }); }} disabled={deletingBackup} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50">İptal</button>
              <button onClick={confirmDeleteBackup} disabled={deletingBackup} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deletingBackup ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Siliniyor...</>) : (<><Trash2 className="h-4 w-4 mr-2" />Evet, Sil</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><Save className="h-8 w-8 text-green-600" /></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Başarılı!</h3>
              <p className="text-gray-600 mb-4">Sistem ayarları başarıyla kaydedildi.</p>
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    {successCountdown} saniye sonra otomatik kapanacak
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
              >
                Şimdi Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tablo Seçici Modal */}
      {showTableSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Yedeklenecek Tabloları Seçin</h3>
              </div>
              <button
                onClick={() => setShowTableSelector(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  Yedeklemek istediğiniz tabloları seçin. Seçilen tablolar hem JSON hem de SQL formatında yedeklenecek.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllTables}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={clearTableSelection}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Temizle
                  </button>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Seçilen: {selectedTables.length} / {availableTables.length} tablo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {availableTables.map((tableName) => (
                  <label
                    key={tableName}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedTables.includes(tableName)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(tableName)}
                      onChange={() => toggleTableSelection(tableName)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{tableName}</div>
                      <div className="text-xs text-gray-500">
                        {tableName === 'users' && 'Kullanıcı hesapları'}
                        {tableName === 'teachers' && 'Öğretmen bilgileri'}
                        {tableName === 'companies' && 'İşletme bilgileri'}
                        {tableName === 'students' && 'Öğrenci bilgileri'}
                        {tableName === 'internships' && 'Staj kayıtları'}
                        {tableName === 'dekonts' && 'Dekont kayıtları'}
                        {tableName === 'system_settings' && 'Sistem ayarları'}
                        {tableName === 'notifications' && 'Bildirimler'}
                        {tableName === 'belgeler' && 'Belgeler'}
                        {tableName === 'gorev_belgeleri' && 'Görev belgeleri'}
                        {tableName === 'fields' && 'Alan bilgileri'}
                        {tableName === 'classes' && 'Sınıf bilgileri'}
                        {tableName === 'education_years' && 'Eğitim yılları'}
                        {tableName === 'admin_profiles' && 'Admin profilleri'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTableSelector(false);
                  setSelectedTables([]);
                }}
                disabled={backupCreationLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleSelectiveBackup}
                disabled={backupCreationLoading || selectedTables.length === 0}
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {backupCreationLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Yedekleniyor...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Seçili Tabloları Yedekle ({selectedTables.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Eğitim Yılı Ekleme Modal'ı */}
      {showEducationYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Yeni Eğitim Dönemi</h3>
              <button
                onClick={() => setShowEducationYearModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dönem Adı *
                </label>
                <input
                  type="text"
                  value={newEducationYear.year}
                  onChange={(e) => setNewEducationYear({ ...newEducationYear, year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Örn: 2024-2025"
                  disabled={educationYearLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={newEducationYear.startDate}
                  onChange={(e) => setNewEducationYear({ ...newEducationYear, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={educationYearLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={newEducationYear.endDate}
                  onChange={(e) => setNewEducationYear({ ...newEducationYear, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={educationYearLoading}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="setActive"
                  type="checkbox"
                  checked={newEducationYear.active}
                  onChange={(e) => setNewEducationYear({ ...newEducationYear, active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={educationYearLoading}
                />
                <label htmlFor="setActive" className="ml-2 text-sm text-gray-700">
                  Bu dönemi aktif dönem olarak ayarla
                </label>
              </div>
              
              {newEducationYear.active && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-800">
                    ⚠️ Bu dönem aktif olarak ayarlanırsa, mevcut aktif dönem pasif hale getirilecektir.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowEducationYearModal(false)}
                disabled={educationYearLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleCreateEducationYear}
                disabled={educationYearLoading || !newEducationYear.year.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {educationYearLoading ? 'Oluşturuluyor...' : 'Dönem Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}