'use client'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  RefreshCw
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
  const [showPerformanceIndicator, setShowPerformanceIndicator] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/admin/login')
    }

    fetchDashboardData()
    fetchSchoolName()
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

  const handleRefresh = () => {
    fetchDashboardData()
  }

  const quickActions = [
    {
      title: 'Koordinatörlük Yönetimi',
      description: 'Öğrenci staj süreçlerini koordine edin',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/ogretmenler'
    },
    {
      title: 'Dekont Yönetimi',
      description: 'Bekleyen dekontları onaylayın',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/dekontlar'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Sistem performansı ve istatistikler',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin/analytics'
    },
    {
      title: 'İşletme Yönetimi',
      description: 'İşletme bilgilerini düzenleyin',
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/isletmeler'
    }
  ]

  const activities = [
    {
      id: '1',
      type: 'dekont_pending',
      title: 'Yeni dekont bekleniyor',
      description: 'Ahmet Yılmaz - ABC Teknoloji Ltd.',
      time: '2 saat önce',
      icon: 'clock',
      color: 'yellow'
    },
    {
      id: '2',
      type: 'dekont_approved',
      title: 'Dekont onaylandı',
      description: 'Fatma Demir - XYZ İnşaat A.Ş.',
      time: '1 gün önce',
      icon: 'check',
      color: 'green'
    },
    {
      id: '3',
      type: 'dekont_rejected',
      title: 'Dekont reddedildi',
      description: 'Mehmet Kaya - DEF Makine Ltd.',
      time: '2 gün önce',
      icon: 'x',
      color: 'red'
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
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPerformanceIndicator}
                  onChange={(e) => setShowPerformanceIndicator(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="hidden sm:inline">Performans göstergesi</span>
                <span className="sm:hidden">Performans</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Toplam Dekont</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.total}</p>
                <p className="text-xs text-green-600 mt-1 hidden sm:block">↗️ Bu ay</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Bekleyen</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.pending}</p>
                <p className="text-xs text-blue-600 mt-1 hidden sm:block">İncele →</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Onaylanan</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.approved}</p>
                <p className="text-xs text-green-600 mt-1 hidden sm:block">Bu hafta</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Reddedilen</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.dekontStats.rejected}</p>
                <p className="text-xs text-red-600 mt-1 hidden sm:block">Bu hafta</p>
              </div>
              <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Öğretmen</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.teacherCount}</p>
                <p className="text-xs text-blue-600 mt-1 hidden sm:block">Yönet →</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
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
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Hızlı İşlemler</h3>
            <button className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 hidden sm:block">
              Tümünü Gör →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg ${action.bgColor} flex items-center justify-center mb-3 sm:mb-4`}>
                  <action.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${action.color}`} />
                </div>
                <h4 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 leading-tight">{action.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 hidden sm:block">{action.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-indigo-600">Başlat</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Son Aktiviteler</h3>
            <button className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 hidden sm:block">
              Tümünü Gör →
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {activities.map((activity) => (
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
            ))}
          </div>
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