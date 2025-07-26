'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Database, Users, Mail, Shield, Save, RefreshCw, HardDrive, Download, Trash2, Key, RotateCcw, DollarSign, Edit, X, Eraser, AlertTriangle, FileX } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AdminManagement } from '@/components/ui/AdminManagement'

export default function AyarlarPage() {
  const router = useRouter()
  const { adminRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'genel' | 'admin' | 'backup' | 'pin' | 'cleaning'>('genel')
  
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

  // Daily Rate Settings
  const [dailyRate, setDailyRate] = useState<number>(221.0466)
  const [isEditingDailyRate, setIsEditingDailyRate] = useState(false)
  const [newDailyRate, setNewDailyRate] = useState<string>('')
  const [dailyRateLoading, setDailyRateLoading] = useState(false)
  const [dailyRateMessage, setDailyRateMessage] = useState('')
  
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

  // Data cleaning states
  const [testDataCounts, setTestDataCounts] = useState({
    ogrenciler: 0,
    ogretmenler: 0,
    isletmeler: 0,
    dekontlar: 0,
    belgeler: 0,
    stajlar: 0
  })
  const [cleaningLoading, setCleaningLoading] = useState(false)
  const [showCleaningModal, setShowCleaningModal] = useState(false)
  const [cleaningType, setCleaningType] = useState<'demo' | 'students' | 'companies' | 'teachers' | 'files'>('demo')
  const [cleaningConfirmation, setCleaningConfirmation] = useState('')

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
  const [showBackupDeleteSuccess, setShowBackupDeleteSuccess] = useState(false)
  const [backupDeleteCountdown, setBackupDeleteCountdown] = useState(3)
  
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
    fetchDailyRate()
    if (activeTab === 'backup') {
      fetchBackupData()
    }
    if (activeTab === 'cleaning') {
      fetchTestDataCounts()
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

  // Backup delete success modal countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (showBackupDeleteSuccess && backupDeleteCountdown > 0) {
      timer = setTimeout(() => {
        setBackupDeleteCountdown(prev => {
          const newCount = prev - 1
          if (newCount === 0) {
            setShowBackupDeleteSuccess(false)
            return 3 // Reset for next time
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
  }, [showBackupDeleteSuccess, backupDeleteCountdown])

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

  const fetchDailyRate = async () => {
    try {
      const response = await fetch('/api/admin/system-settings/daily-rate')
      if (!response.ok) throw new Error('Failed to fetch daily rate')
      const data = await response.json()
      
      setDailyRate(data.daily_rate || 221.0466)
    } catch (error) {
      console.error('Günlük ücret oranı çekilirken hata:', error)
      setDailyRate(221.0466) // Default değer
    }
  }

  const handleEditDailyRate = () => {
    setNewDailyRate(dailyRate.toString())
    setIsEditingDailyRate(true)
    setDailyRateMessage('')
  }

  const handleCancelEditDailyRate = () => {
    setIsEditingDailyRate(false)
    setNewDailyRate('')
    setDailyRateMessage('')
  }

  const handleSaveDailyRate = async () => {
    const rate = parseFloat(newDailyRate)
    
    if (isNaN(rate) || rate <= 0) {
      setDailyRateMessage('Geçerli bir pozitif sayı giriniz')
      return
    }

    setDailyRateLoading(true)
    try {
      const response = await fetch('/api/admin/system-settings/daily-rate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daily_rate: rate })
      })

      if (!response.ok) throw new Error('Failed to update daily rate')
      
      const data = await response.json()
      setDailyRate(data.daily_rate)
      setIsEditingDailyRate(false)
      setNewDailyRate('')
      setDailyRateMessage('Günlük ücret oranı başarıyla güncellendi')
      
      setTimeout(() => setDailyRateMessage(''), 3000)
    } catch (error) {
      console.error('Günlük ücret oranı güncellenirken hata:', error)
      setDailyRateMessage('Güncellenirken bir hata oluştu')
    }
    setDailyRateLoading(false)
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
        setShowDeleteModal(false);
        setDeleteBackupData({ id: '', name: '' });
        fetchBackupData();
        setShowBackupDeleteSuccess(true);
        setBackupDeleteCountdown(3);
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

  // Data cleaning functions
  const fetchTestDataCounts = async () => {
    setCleaningLoading(true)
    try {
      const response = await fetch('/api/admin/data-cleaning')
      if (!response.ok) throw new Error('Test verisi sayıları getirilemedi')
      
      const data = await response.json()
      setTestDataCounts(data.testDataCounts || {})
    } catch (error: any) {
      console.error('Test verisi sayıları çekilirken hata:', error)
      alert('Test verisi sayıları alınırken hata oluştu')
    }
    setCleaningLoading(false)
  }

  const handleDataCleaning = async (type: 'demo' | 'students' | 'companies' | 'teachers' | 'files') => {
    setCleaningType(type)
    setCleaningConfirmation('')
    setShowCleaningModal(true)
  }

  const confirmDataCleaning = async () => {
    if (cleaningConfirmation !== 'TEMIZLE') {
      alert('Lütfen "TEMIZLE" yazın')
      return
    }

    setCleaningLoading(true)
    try {
      const response = await fetch(`/api/admin/data-cleaning?type=${cleaningType}&confirm=CONFIRM_DATA_CLEANING_2025`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Veri temizleme başarısız')
      }
      
      const result = await response.json()
      setShowCleaningModal(false)
      
      let message = `${getCleaningTypeName(cleaningType)} başarıyla temizlendi!\n\n`
      Object.entries(result.deletedCounts).forEach(([key, count]) => {
        message += `${getDataTypeName(key)}: ${count} adet\n`
      })
      
      alert(message)
      fetchTestDataCounts() // Refresh counts
    } catch (error: any) {
      console.error('Veri temizleme hatası:', error)
      alert(`Veri temizlenirken hata: ${error.message}`)
    }
    setCleaningLoading(false)
  }

  const getCleaningTypeName = (type: string) => {
    switch (type) {
      case 'demo': return 'Demo veriler'
      case 'students': return 'Test öğrenci verileri'
      case 'companies': return 'Test işletme verileri'
      case 'teachers': return 'Test öğretmen verileri'
      case 'files': return 'Test dosyalar'
      default: return 'Veriler'
    }
  }

  const getDataTypeName = (type: string) => {
    switch (type) {
      case 'ogrenciler': return 'Öğrenciler'
      case 'ogretmenler': return 'Öğretmenler'
      case 'isletmeler': return 'İşletmeler'
      case 'dekontlar': return 'Dekontlar'
      case 'belgeler': return 'Belgeler'
      case 'stajlar': return 'Stajlar'
      case 'kullanicilar': return 'Kullanıcılar'
      case 'gorevBelgeleri': return 'Görev Belgeleri'
      default: return type
    }
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
              <button onClick={() => setActiveTab('cleaning')} className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'cleaning' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} text-left sm:text-center`}>
                <Eraser className="h-4 w-4 inline mr-2" /> Veri Temizleme
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
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Günlük Ücret Ayarları</h3>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-900">Öğrenci Günlük Ücret Oranı</span>
                        </div>
                        {!isEditingDailyRate && (
                          <button
                            onClick={handleEditDailyRate}
                            className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Düzenle
                          </button>
                        )}
                      </div>
                      {isEditingDailyRate ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={newDailyRate}
                              onChange={(e) => setNewDailyRate(e.target.value)}
                              step="0.0001"
                              min="0"
                              className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                              placeholder="Günlük ücret oranı"
                              disabled={dailyRateLoading}
                            />
                            <span className="text-sm text-green-700 font-medium">₺</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleSaveDailyRate}
                              disabled={dailyRateLoading}
                              className="flex items-center px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {dailyRateLoading ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              {dailyRateLoading ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                            <button
                              onClick={handleCancelEditDailyRate}
                              disabled={dailyRateLoading}
                              className="flex items-center px-3 py-2 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                            >
                              <X className="h-3 w-3 mr-1" />
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-green-700">
                              {dailyRate.toFixed(4)} ₺
                            </div>
                            <div className="text-xs text-green-600">
                              Günlük ücret hesaplamalarında kullanılır
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {dailyRateMessage && (
                        <div className={`mt-3 p-2 rounded-lg text-xs ${
                          dailyRateMessage.includes('hata') || dailyRateMessage.includes('Geçerli')
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {dailyRateMessage}
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
                      <p className="text-sm text-blue-700 mt-2">Tüm veritabanını ve dosyaları yedekle (JSON + SQL + Fiziksel Dosyalar)</p>
                    </div>
                    <button
                      onClick={handleFullBackup}
                      disabled={backupCreationLoading}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {backupCreationLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <HardDrive className="h-4 w-4 mr-2" />
                      )}
                      {backupCreationLoading ? 'Oluşturuluyor...' : 'Tam Yedek Oluştur'}
                    </button>
                  </div>
                </div>

                {/* Seçili Tablo Yedeği */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-medium text-green-900 flex items-center">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Seçili Tablo Yedeği
                      </h3>
                      <p className="text-sm text-green-700 mt-2">Sadece seçilen tabloları yedekle</p>
                    </div>
                    <button
                      onClick={() => setShowTableSelector(true)}
                      disabled={backupCreationLoading}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Tablo Seç ve Yedekle
                    </button>
                  </div>
                </div>
              </div>

              {/* Yedek Listesi */}
              {backupList.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Mevcut Yedekler</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosya</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyut</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentBackups.map((backup) => (
                          <tr key={backup.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{backup.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(backup.backup_date).toLocaleString('tr-TR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{backup.size_mb} MB</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                backup.backup_status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {backup.backup_status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleDownloadBackup(backup)}
                                disabled={downloadingBackup && downloadingBackupId === backup.id}
                                className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {backup.has_files && (
                                <button
                                  onClick={() => handleDownloadZip(backup)}
                                  disabled={downloadingBackup && downloadingBackupId === backup.id}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                  title="ZIP İndir"
                                >
                                  <FileX className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteBackup(backup.id, backup.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-700">
                        Toplam {backupList.length} yedek, sayfa {currentPage} / {totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          Önceki
                        </button>
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          Sonraki
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Selector Modal */}
        {showTableSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yedeklenecek Tabloları Seçin</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllTables}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={clearTableSelection}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Temizle
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {availableTables.map((table) => (
                    <label key={table} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table)}
                        onChange={() => toggleTableSelection(table)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{table}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleSelectiveBackup}
                  disabled={selectedTables.length === 0 || backupCreationLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {backupCreationLoading ? 'Oluşturuluyor...' : `Yedek Oluştur (${selectedTables.length} tablo)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pin' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <Key className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">PIN Yönetimi</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Öğretmen PIN Sıfırlama */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-blue-900">Öğretmen PIN Sıfırlama</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">Tüm öğretmenlerin PIN'lerini aynı değere sıfırlayın.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Yeni PIN (4 hane)</label>
                      <input
                        type="text"
                        value={teacherPinValue}
                        onChange={(e) => setTeacherPinValue(e.target.value.slice(0, 4))}
                        maxLength={4}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                        placeholder="0000"
                      />
                    </div>
                    
                    <button
                      onClick={handleTeacherResetClick}
                      disabled={pinResetLoading}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Öğretmen PIN'lerini Sıfırla
                    </button>
                  </div>
                </div>

                {/* İşletme PIN Sıfırlama */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-6 border border-orange-200">
                  <div className="flex items-center mb-4">
                    <Database className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-orange-900">İşletme PIN Sıfırlama</h3>
                  </div>
                  <p className="text-sm text-orange-700 mb-4">Tüm işletmelerin PIN'lerini aynı değere sıfırlayın.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-2">Yeni PIN (4 hane)</label>
                      <input
                        type="text"
                        value={businessPinValue}
                        onChange={(e) => setBusinessPinValue(e.target.value.slice(0, 4))}
                        maxLength={4}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center text-lg font-mono"
                        placeholder="0000"
                      />
                    </div>
                    
                    <button
                      onClick={handleBusinessResetClick}
                      disabled={pinResetLoading}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      İşletme PIN'lerini Sıfırla
                    </button>
                  </div>
                </div>
              </div>

              {/* Uyarı Mesajı */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">DİKKAT:</p>
                    <p>PIN sıfırlama işlemi geri alınamaz. Kullanıcılar ilk girişlerinde PIN değiştirmeleri istenecektir.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cleaning' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <Eraser className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-2 sm:mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Veri Temizleme</h2>
              </div>
              
              {/* Test Data Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{testDataCounts.ogrenciler || 0}</div>
                  <div className="text-xs sm:text-sm text-blue-700 mt-1">Test Öğrenciler</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{testDataCounts.ogretmenler || 0}</div>
                  <div className="text-xs sm:text-sm text-green-700 mt-1">Test Öğretmenler</div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-3 sm:p-4 border border-orange-200">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">{testDataCounts.isletmeler || 0}</div>
                  <div className="text-xs sm:text-sm text-orange-700 mt-1">Test İşletmeler</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 border border-purple-200">
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">{testDataCounts.dekontlar || 0}</div>
                  <div className="text-xs sm:text-sm text-purple-700 mt-1">Test Dekontlar</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-3 sm:p-4 border border-yellow-200">
                  <div className="text-lg sm:text-2xl font-bold text-yellow-600">{testDataCounts.belgeler || 0}</div>
                  <div className="text-xs sm:text-sm text-yellow-700 mt-1">Test Belgeler</div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 sm:p-4 border border-red-200">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">{testDataCounts.stajlar || 0}</div>
                  <div className="text-xs sm:text-sm text-red-700 mt-1">Test Stajlar</div>
                </div>
              </div>

              {/* Data Cleaning Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Demo Data Cleaning */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-red-200">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-red-900">Demo Veriler</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-4">Tüm demo/test verilerini temizle (öğrenci, öğretmen, işletme, dekont, belge)</p>
                  
                  <button
                    onClick={() => handleDataCleaning('demo')}
                    disabled={cleaningLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Demo Verileri Temizle
                  </button>
                </div>

                {/* Student Data Cleaning */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-blue-900">Test Öğrenciler</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">Sadece test öğrenci verilerini ve ilgili dekontları temizle</p>
                  
                  <button
                    onClick={() => handleDataCleaning('students')}
                    disabled={cleaningLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Test Öğrencileri Temizle
                  </button>
                </div>

                {/* Company Data Cleaning */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-6 border border-orange-200">
                  <div className="flex items-center mb-4">
                    <Database className="h-5 w-5 text-orange-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-orange-900">Test İşletmeler</h3>
                  </div>
                  <p className="text-sm text-orange-700 mb-4">Sadece test işletme verilerini ve ilgili dekontları temizle</p>
                  
                  <button
                    onClick={() => handleDataCleaning('companies')}
                    disabled={cleaningLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Test İşletmeleri Temizle
                  </button>
                </div>

                {/* Teacher Data Cleaning */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                  <div className="flex items-center mb-4">
                    <Users className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-green-900">Test Öğretmenler</h3>
                  </div>
                  <p className="text-sm text-green-700 mb-4">Sadece test öğretmen verilerini temizle</p>
                  
                  <button
                    onClick={() => handleDataCleaning('teachers')}
                    disabled={cleaningLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Test Öğretmenleri Temizle
                  </button>
                </div>

                {/* File Cleaning */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 sm:p-6 border border-purple-200">
                  <div className="flex items-center mb-4">
                    <FileX className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-base sm:text-lg font-medium text-purple-900">Test Dosyalar</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-4">Fiziksel test dosyalarını temizle (dekont ve belge dosyaları)</p>
                  
                  <button
                    onClick={() => handleDataCleaning('files')}
                    disabled={cleaningLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Test Dosyaları Temizle
                  </button>
                </div>
              </div>

              {/* Warning Message */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">DİKKAT:</p>
                    <p>Veri temizleme işlemleri geri alınamaz. İşlemden önce veri yedekleme yapmanız önerilir.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Education Year Modal */}
        {showEducationYearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Eğitim Yılı Ekle</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Eğitim Yılı</label>
                  <input
                    type="text"
                    value={newEducationYear.year}
                    onChange={(e) => setNewEducationYear({ ...newEducationYear, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Örn: 2024-2025"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={newEducationYear.startDate}
                    onChange={(e) => setNewEducationYear({ ...newEducationYear, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={newEducationYear.endDate}
                    onChange={(e) => setNewEducationYear({ ...newEducationYear, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={newEducationYear.active}
                    onChange={(e) => setNewEducationYear({ ...newEducationYear, active: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">Aktif dönem olarak ayarla</label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEducationYearModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateEducationYear}
                  disabled={educationYearLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {educationYearLoading ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ayarlar Başarıyla Kaydedildi!</h3>
              <p className="text-sm text-gray-600 mb-4">Değişiklikler sisteme uygulandı.</p>
              <p className="text-xs text-gray-500">Bu pencere {successCountdown} saniye sonra kapanacak</p>
            </div>
          </div>
        )}

        {/* Teacher PIN Reset Modal */}
        {showTeacherResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Öğretmen PIN Sıfırlama Onayı</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tüm öğretmenlerin PIN'i "{teacherPinValue}" olarak sıfırlanacak. Bu işlem geri alınamaz.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Öğretmenler ilk girişlerinde PIN değiştirmeleri istenecektir.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTeacherResetModal(false)}
                  disabled={pinResetLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={confirmTeacherReset}
                  disabled={pinResetLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {pinResetLoading ? 'Sıfırlanıyor...' : 'Onayla ve Sıfırla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Business PIN Reset Modal */}
        {showBusinessResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">İşletme PIN Sıfırlama Onayı</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tüm işletmelerin PIN'i "{businessPinValue}" olarak sıfırlanacak. Bu işlem geri alınamaz.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                İşletmeler ilk girişlerinde PIN değiştirmeleri istenecektir.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBusinessResetModal(false)}
                  disabled={pinResetLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={confirmBusinessReset}
                  disabled={pinResetLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {pinResetLoading ? 'Sıfırlanıyor...' : 'Onayla ve Sıfırla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Cleaning Confirmation Modal */}
        {showCleaningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Veri Temizleme Onayı</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>{getCleaningTypeName(cleaningType)}</strong> temizlenecek. Bu işlem geri alınamaz!
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 font-medium">⚠️ DİKKAT:</p>
                  <p className="text-sm text-red-700">Bu işlem tüm ilgili verileri kalıcı olarak silecektir.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Onaylamak için "TEMIZLE" yazın:
                  </label>
                  <input
                    type="text"
                    value={cleaningConfirmation}
                    onChange={(e) => setCleaningConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="TEMIZLE"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCleaningModal(false)}
                  disabled={cleaningLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDataCleaning}
                  disabled={cleaningLoading || cleaningConfirmation !== 'TEMIZLE'}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {cleaningLoading ? 'Temizleniyor...' : 'Onayla ve Temizle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yedek Silme Onayı</h3>
              <p className="text-sm text-gray-600 mb-6">
                "{deleteBackupData.name}" yedeğini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingBackup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteBackup}
                  disabled={deletingBackup}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingBackup ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Delete Success Modal */}
        {showBackupDeleteSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Yedek Başarıyla Silindi!</h3>
              <p className="text-sm text-gray-600 mb-4">Yedek dosyası sistemden kaldırıldı.</p>
              <p className="text-xs text-gray-500">Bu pencere {backupDeleteCountdown} saniye sonra kapanacak</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}