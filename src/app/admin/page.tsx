'use client'

import { useState, useEffect } from 'react'
import { FileText, Users, Building, TrendingUp, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchDashboardStatsOptimized } from '@/lib/optimized-queries'
import { isPerformanceMonitoringEnabled } from '@/lib/admin-settings'
import { StatCardSkeleton, ListSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDekontlar: 0,
    bekleyenDekontlar: 0,
    onaylananDekontlar: 0,
    rededilenDekontlar: 0,
    totalIsletmeler: 0,
    totalOgretmenler: 0,
    totalOgrenciler: 0
  })
  const [schoolName, setSchoolName] = useState('Hüsniye Özdilek Ticaret MTAL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [queryTime, setQueryTime] = useState<number>(0)
  const [showPerformanceButton, setShowPerformanceButton] = useState(false)
  const { showToast } = useToast()

  // Okul ismini ayarlardan çek
  const fetchSchoolName = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'school_name')
      if (!error && data && data.length > 0) {
        setSchoolName(data[0].value as string)
      }
    } catch (error) {
      console.error('Okul ismi çekilirken hata:', error)
    }
  }

  // Veritabanından istatistikleri çek - OPTIMIZED VERSION with timeout protection
  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Create timeout promise for the entire operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Dashboard loading timeout after 15 seconds')), 15000)
      })
      
      // Execute school name and stats fetching in parallel with timeout protection
      const dataPromise = Promise.all([
        !isRefresh ? fetchSchoolName() : Promise.resolve(),
        fetchDashboardStatsOptimized()
      ])
      
      // Race between data fetching and timeout
      const [_, optimizedStats] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as [void, any]
      
      setStats({
        totalDekontlar: optimizedStats.totalDekontlar,
        bekleyenDekontlar: optimizedStats.bekleyenDekontlar,
        onaylananDekontlar: optimizedStats.onaylananDekontlar,
        rededilenDekontlar: optimizedStats.rededilenDekontlar,
        totalIsletmeler: optimizedStats.totalIsletmeler,
        totalOgretmenler: optimizedStats.totalOgretmenler,
        totalOgrenciler: optimizedStats.totalOgrenciler
      })
      
      setQueryTime(optimizedStats.queryTime)

      if (isRefresh) {
        showToast({
          type: 'success',
          title: 'İstatistikler güncellendi',
          message: 'Veriler başarıyla yenilendi',
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error)
      
      // Enhanced error handling with specific timeout messaging
      let errorMessage = 'İstatistikler yüklenirken bir hata oluştu'
      let errorTitle = 'Veri yükleme hatası'
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorTitle = 'Bağlantı zaman aşımı'
          errorMessage = 'Dashboard verileri yüklenirken zaman aşımı oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.'
        } else if (error.message.includes('CORS')) {
          errorTitle = 'Bağlantı hatası'
          errorMessage = 'Sunucuya bağlanırken bir hata oluştu. Lütfen tekrar deneyin.'
        } else if (error.message.includes('network')) {
          errorTitle = 'Ağ hatası'
          errorMessage = 'İnternet bağlantısı sorunu. Lütfen bağlantınızı kontrol edin.'
        } else {
          errorMessage = `Veritabanı hatası: ${error.message}`
        }
      }
      
      showToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration: 8000
      })
      
      // Set default empty stats on error to prevent skeleton loading state
      setStats({
        totalDekontlar: 0,
        bekleyenDekontlar: 0,
        onaylananDekontlar: 0,
        rededilenDekontlar: 0,
        totalIsletmeler: 0,
        totalOgretmenler: 0,
        totalOgrenciler: 0
      })
      
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Check if performance monitoring is enabled
    const checkPerformanceSettings = async () => {
      const enabled = await isPerformanceMonitoringEnabled()
      setShowPerformanceButton(enabled)
    }
    checkPerformanceSettings()
  }, [])

  const quickActions = [
    {
      title: 'Koordinatörlük Yönetimi',
      description: 'Öğrenci staj süreçlerini koordine edin',
      href: '/admin/stajlar',
      icon: Users,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Dekont Yönetimi',
      description: 'Bekleyen dekontları onaylayın',
      href: '/admin/dekontlar',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Sistem performansı ve istatistikler',
      href: '/admin/analytics',
      icon: TrendingUp,
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: 'İşletme Yönetimi',
      description: 'İşletme bilgilerini düzenleyin',
      href: '/admin/isletmeler',
      icon: Building,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-indigo-100">{schoolName} - Koordinatörlük Yönetimi</p>
          </div>
          <div className="flex items-center space-x-3">
            {showPerformanceButton && (
              <button
                onClick={() => {
                  if (queryTime === 0) {
                    alert('Henüz veri yok. Sayfayı yenileyerek performans metriklerini görebilirsiniz.')
                    return
                  }
                  alert(`Dashboard Performansı:\n\nSon sorgu: ${queryTime.toFixed(2)}ms\nToplam istatistik: ${stats.totalDekontlar + stats.totalIsletmeler + stats.totalOgretmenler} kayıt`)
                }}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm"
              >
                📊 {queryTime > 0 ? `${queryTime.toFixed(0)}ms` : 'Perf'}
              </button>
            )}
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Dekont</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalDekontlar}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Bu ay</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bekleyen</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.bekleyenDekontlar}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/admin/dekontlar" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200">
                  İncele →
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Onaylanan</p>
                  <p className="text-3xl font-bold text-green-600">{stats.onaylananDekontlar}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-gray-500">Bu hafta</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reddedilen</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rededilenDekontlar}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-gray-500">Bu hafta</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Öğretmen</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalOgretmenler}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/admin/ogretmenler" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200">
                  Yönet →
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Kayıtlı İşletme</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalIsletmeler}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Building className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link href="/admin/isletmeler" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200">
                  Görüntüle →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>


      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`h-6 w-6 ${action.textColor}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Son Aktiviteler</h2>
            <Link href="/admin/dekontlar" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Tümünü Gör →
            </Link>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <ListSkeleton items={3} className="space-y-0" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Yeni dekont bekleniyor</p>
                  <p className="text-xs text-gray-500">Ahmet Yılmaz - ABC Teknoloji Ltd.</p>
                </div>
                <span className="text-xs text-gray-400">2 saat önce</span>
              </div>

              <div className="flex items-center space-x-4 hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Dekont onaylandı</p>
                  <p className="text-xs text-gray-500">Fatma Demir - XYZ İnşaat A.Ş.</p>
                </div>
                <span className="text-xs text-gray-400">1 gün önce</span>
              </div>

              <div className="flex items-center space-x-4 hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Dekont reddedildi</p>
                  <p className="text-xs text-gray-500">Mehmet Kaya - DEF Otomotiv Ltd.</p>
                </div>
                <span className="text-xs text-gray-400">2 gün önce</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 