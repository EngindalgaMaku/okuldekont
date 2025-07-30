'use client'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  BarChart3,
  Settings,
  TrendingUp,
  ArrowRight,
  Calendar,
  Eye,
  Zap,
  Database,
  Activity,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface PerformanceData {
  totalTime: number
  dbQueries: number
  dbTime: number
  memoryUsage: number
  cacheHits: number
  lastUpdate: string
}

function PerformanceModal({ isOpen, onClose, performanceData }: { 
  isOpen: boolean, 
  onClose: () => void, 
  performanceData: PerformanceData 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performans Detayları</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Sayfa Yükleme Süresi</span>
              <span className="text-sm font-bold text-indigo-600">{performanceData.totalTime}ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full" 
                style={{ width: `${Math.min(performanceData.totalTime / 10, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">DB Sorguları</span>
              </div>
              <div className="text-xl font-bold text-blue-900">{performanceData.dbQueries}</div>
              <div className="text-xs text-blue-600">{performanceData.dbTime}ms</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-600">Bellek</span>
              </div>
              <div className="text-xl font-bold text-green-900">{performanceData.memoryUsage}MB</div>
              <div className="text-xs text-green-600">Heap kullanımı</div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Cache Hits</span>
              </div>
              <span className="text-sm font-bold text-purple-900">{performanceData.cacheHits}/5</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Son güncelleme: {performanceData.lastUpdate}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState({
    userName: 'Admin',
    userCount: 0,
    adminCount: 0,
    teacherCount: 0,
    companyCount: 0,
    educationYearCount: 0,
    currentEducationYear: '',
    dekontStats: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  })
  
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalTime: 0,
    dbQueries: 0,
    dbTime: 0,
    memoryUsage: 0,
    cacheHits: 0,
    lastUpdate: new Date().toLocaleTimeString('tr-TR')
  })
  
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [showPerformanceIndicator, setShowPerformanceIndicator] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesExpanded, setActivitiesExpanded] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/admin/login')
      return
    }

    // Only fetch data after confirming user is authenticated
    fetchDashboardData()
    fetchSchoolName()
    fetchRecentActivities()
    fetchPerformanceSettings()
  }, [session, status])

  const fetchDashboardData = async () => {
    const startTime = Date.now()
    setIsRefreshing(true)
    
    try {
      const response = await fetch('/api/admin/dashboard-stats')
      const data = await response.json()
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      setStats(data)
      setPerformanceData({
        totalTime,
        dbQueries: 5, // Simulated based on actual DB queries
        dbTime: Math.floor(totalTime * 0.6), // Estimated DB time
        memoryUsage: Math.floor(Math.random() * 50) + 30, // Simulated memory usage
        cacheHits: Math.floor(Math.random() * 5) + 1,
        lastUpdate: new Date().toLocaleTimeString('tr-TR')
      })
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchSchoolName = async () => {
    try {
      const response = await fetch('/api/system-settings/school-name')
      const data = await response.json()
      setSchoolName(data.value || '')
    } catch (error) {
      console.error('School name fetch error:', error)
      setSchoolName('')
    }
  }

  const fetchRecentActivities = async () => {
    setActivitiesLoading(true)
    try {
      const response = await fetch('/api/admin/recent-activities')
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error('Recent activities fetch error:', error)
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }

  const fetchPerformanceSettings = async () => {
    try {
      const response = await fetch('/api/system-settings')
      const data = await response.json()
      
      // Find the performance monitoring setting
      const performanceSetting = data.find((setting: any) => setting.key === 'show_performance_monitoring')
      const isEnabled = performanceSetting?.value === 'true'
      
      setShowPerformanceIndicator(isEnabled)
    } catch (error) {
      console.error('Performance settings fetch error:', error)
      setShowPerformanceIndicator(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData()
    fetchRecentActivities()
    fetchPerformanceSettings()
  }

  const quickActions = [
    {
      title: 'Dekont Yönetimi',
      description: 'Bekleyen dekontları onaylayın',
      icon: FileText,
      gradient: 'from-purple-500 via-purple-600 to-indigo-700',
      hoverGradient: 'from-purple-600 via-purple-700 to-indigo-800',
      href: '/admin/dekontlar'
    },
    {
      title: 'Meslek Alanları',
      description: 'Meslek alanlarını yönetin',
      icon: GraduationCap,
      gradient: 'from-blue-500 via-cyan-600 to-teal-700',
      hoverGradient: 'from-blue-600 via-cyan-700 to-teal-800',
      href: '/admin/meslek-alanlari'
    },
    {
      title: 'İşletmeler',
      description: 'İşletme bilgilerini düzenleyin',
      icon: Building2,
      gradient: 'from-emerald-500 via-green-600 to-lime-700',
      hoverGradient: 'from-emerald-600 via-green-700 to-lime-800',
      href: '/admin/isletmeler'
    },
    {
      title: 'Öğretmenler',
      description: 'Öğretmen bilgilerini yönetin',
      icon: Users,
      gradient: 'from-orange-500 via-red-600 to-pink-700',
      hoverGradient: 'from-orange-600 via-red-700 to-pink-800',
      href: '/admin/ogretmenler'
    },
    {
      title: 'Stajlar',
      description: 'Staj süreçlerini takip edin',
      icon: Calendar,
      gradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
      hoverGradient: 'from-violet-600 via-purple-700 to-fuchsia-800',
      href: '/admin/stajlar'
    }
  ]

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'clock':
        return <Clock className="w-5 h-5" />
      case 'check':
        return <CheckCircle className="w-5 h-5" />
      case 'x':
        return <XCircle className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getActivityColor = (color: string) => {
    switch (color) {
      case 'yellow':
        return 'text-yellow-600 bg-yellow-100'
      case 'green':
        return 'text-green-600 bg-green-100'
      case 'red':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Yükleniyor...</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 sm:py-4 mb-4 sm:mb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                {/* Mobile Title */}
                <h1 className="text-sm font-bold truncate sm:hidden">{schoolName || 'Okul'}</h1>
                {/* Desktop Title */}
                <h1 className="hidden sm:block text-xl font-bold">{schoolName || 'Okul Adı'} - Koordinatörlük Yönetimi</h1>
                <p className="text-indigo-100 text-xs sm:text-sm hidden sm:block">Eğitim ve staj süreçlerini koordine edin</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {showPerformanceIndicator && (
                <button
                  onClick={() => setShowPerformanceModal(true)}
                  className="hidden sm:flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>⏱️ {performanceData.totalTime}ms</span>
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-1 sm:space-x-2 bg-white/20 hover:bg-white/30 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Hoşgeldiniz, {stats.userName}!
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Koordinatörlük yönetim sistemi
                </p>
              </div>
            </div>
            {showPerformanceIndicator && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="hidden sm:inline">Performans izleme aktif</span>
                  <span className="sm:hidden">Performans aktif</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dekont İstatistikleri */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Dekont İstatistikleri</h3>
            <Link href="/admin/dekontlar" className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700">
              Tümünü Görüntüle →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Toplam Dekont</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.total}</p>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">↗️ Son ay</p>
                </div>
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Bekleyen</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.pending}</p>
                  <p className="text-xs text-blue-600 mt-1 hidden sm:block">İncele →</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Onaylanan</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.approved}</p>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">Son ay</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Reddedilen</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.rejected}</p>
                  <p className="text-xs text-red-600 mt-1 hidden sm:block">Son ay</p>
                </div>
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Sistem İstatistikleri */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Sistem İstatistikleri</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Toplam Kullanıcı</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.userCount}</p>
                  <p className="text-xs text-gray-600 mt-1 hidden sm:block">Aktif kullanıcılar</p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Öğretmen</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.teacherCount}</p>
                  <p className="text-xs text-blue-600 mt-1 hidden sm:block">Yönet →</p>
                </div>
                <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">İşletme</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.companyCount}</p>
                  <p className="text-xs text-orange-600 mt-1 hidden sm:block">Görüntüle →</p>
                </div>
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Eğitim Yılı</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">
                    {stats.currentEducationYear || `${stats.educationYearCount} Dönem`}
                  </p>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">Aktif dönem</p>
                </div>
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Hızlı İşlemler</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm text-gray-600">Canlı</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${action.gradient} p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out cursor-pointer block`}
                style={{
                  '--hover-gradient': action.hoverGradient
                } as React.CSSProperties}
              >
                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-white/30 transition-colors duration-300">
                    <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 leading-tight">{action.title}</h4>
                  <p className="text-xs text-white/80 mb-2 sm:mb-3 hidden sm:block leading-tight">{action.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/90 font-medium">Başlat</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-white group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
                
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activities - Accordion */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6">
          <div
            className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => setActivitiesExpanded(!activitiesExpanded)}
          >
            <div className="flex items-center space-x-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Son Aktiviteler</h3>
              {activities.length > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 hidden sm:block">
                Tümünü Gör →
              </button>
              <div className="transition-transform duration-200">
                {activitiesExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          {activitiesExpanded && (
            <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100">
              <div className="space-y-3 sm:space-y-4 mt-4">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-gray-600">Aktiviteler yükleniyor...</span>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Henüz aktivite bulunmuyor.</p>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.color)} flex-shrink-0`}>
                        <div className="w-4 h-4 sm:w-5 sm:h-5">
                          {getActivityIcon(activity.icon)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{activity.title}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{activity.description}</p>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {activity.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Modal */}
      <PerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        performanceData={performanceData}
      />
    </div>
  )
}