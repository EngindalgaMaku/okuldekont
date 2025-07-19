'use client'

import { useState, useEffect } from 'react'
import { FileText, Users, Building, TrendingUp, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { fetchDashboardStatsOptimized } from '@/lib/optimized-queries'
import { isPerformanceMonitoringEnabled } from '@/lib/admin-settings'
import { useToast } from '@/components/ui/Toast'
import DekontDurumChart from './DekontDurumChart'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

// Define the types for the props
interface Stats {
  totalDekontlar: number;
  bekleyenDekontlar: number;
  onaylananDekontlar: number;
  rededilenDekontlar: number;
  totalIsletmeler: number;
  totalOgretmenler: number;
  totalOgrenciler: number;
}

interface RecentDekont {
  id: number;
  created_at: string;
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
  stajlar: {
    ogrenciler: { ad: string; soyad: string } | null;
    isletmeler: { ad: string } | null;
  } | null;
}

interface AdminDashboardClientProps {
  initialStats: Stats;
  initialSchoolName: string;
  initialQueryTime: number;
  initialRecentDekonts: RecentDekont[];
}

export default function AdminDashboardClient({ initialStats, initialSchoolName, initialQueryTime, initialRecentDekonts }: AdminDashboardClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [schoolName, setSchoolName] = useState(initialSchoolName)
  const [refreshing, setRefreshing] = useState(false)
  const [queryTime, setQueryTime] = useState(initialQueryTime)
  const [showPerformanceButton, setShowPerformanceButton] = useState(false)
  const [recentDekonts, setRecentDekonts] = useState(initialRecentDekonts)
  const { showToast } = useToast()

  const refreshAllData = async () => {
    setRefreshing(true)
    try {
      // In a real app, you'd re-fetch all data from the server.
      // For this example, we'll just simulate a refresh.
      const optimizedStats = await fetchDashboardStatsOptimized()
      setStats(optimizedStats)
      setQueryTime(optimizedStats.queryTime)

      showToast({
        type: 'success',
        title: 'Dashboard Güncellendi',
        message: 'Tüm veriler başarıyla yenilendi.',
        duration: 3000
      })
    } catch (error) {
      console.error('Veriler yenilenirken hata:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Veriler yenilenirken bir sorun oluştu.',
        duration: 5000
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const checkPerformanceSettings = async () => {
      const enabled = await isPerformanceMonitoringEnabled()
      setShowPerformanceButton(enabled)
    }
    checkPerformanceSettings()
  }, [])

  const chartData = [
    { name: 'Bekleyen', value: stats.bekleyenDekontlar },
    { name: 'Onaylanan', value: stats.onaylananDekontlar },
    { name: 'Reddedilen', value: stats.rededilenDekontlar },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Paneli</h1>
            <p className="text-indigo-200">{schoolName} - Koordinatörlük Yönetimi</p>
          </div>
          <div className="flex items-center space-x-3">
            {showPerformanceButton && (
              <button
                onClick={() => alert(`Dashboard Performansı:\n\nSon sorgu: ${queryTime.toFixed(2)}ms`)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm"
              >
                <span>📊</span>
                <span>{queryTime > 0 ? `${queryTime.toFixed(0)}ms` : 'Perf'}</span>
              </button>
            )}
            <button
              onClick={refreshAllData}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={FileText} title="Toplam Dekont" value={stats.totalDekontlar} color="blue" />
        <StatCard icon={Clock} title="Bekleyen Dekont" value={stats.bekleyenDekontlar} color="yellow" link="/admin/dekontlar" />
        <StatCard icon={CheckCircle} title="Onaylanan Dekont" value={stats.onaylananDekontlar} color="green" />
        <StatCard icon={XCircle} title="Reddedilen Dekont" value={stats.rededilenDekontlar} color="red" />
        <StatCard icon={Users} title="Aktif Öğretmen" value={stats.totalOgretmenler} color="purple" link="/admin/ogretmenler" />
        <StatCard icon={Building} title="Kayıtlı İşletme" value={stats.totalIsletmeler} color="orange" link="/admin/isletmeler" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dekont Durum Grafiği */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dekont Durumları</h2>
          <DekontDurumChart data={chartData} />
        </div>

        {/* Son Aktiviteler */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Son Aktiviteler</h2>
            <Link href="/admin/dekontlar" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Tümünü Gör →
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {recentDekonts.length > 0 ? (
              recentDekonts.map(dekont => <ActivityItem key={dekont.id} dekont={dekont} />)
            ) : (
              <p className="text-gray-500 text-center py-4">Görüntülenecek aktivite yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for Stat Cards to reduce repetition
const StatCard = ({ icon: Icon, title, value, color, link }: { icon: React.ElementType, title: string, value: number, color: string, link?: string }) => {
  const colors: { [key: string]: string } = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  const cardContent = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="p-3 bg-white/20 rounded-xl">
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  )

  return (
    <div className={`${colors[color]} rounded-xl shadow-lg p-6 hover:scale-105 transition-transform duration-200`}>
      {link ? <Link href={link} className="block">{cardContent}</Link> : cardContent}
    </div>
  )
}

// Helper component for Activity Items
const ActivityItem = ({ dekont }: { dekont: RecentDekont }) => {
  const statusInfo = {
    bekliyor: { icon: Clock, color: 'yellow', text: 'Yeni dekont gönderildi' },
    onaylandi: { icon: CheckCircle, color: 'green', text: 'Dekont onaylandı' },
    reddedildi: { icon: XCircle, color: 'red', text: 'Dekont reddedildi' },
  }

  const { icon: Icon, color, text } = statusInfo[dekont.onay_durumu]
  const bgColor = `bg-${color}-50`
  const textColor = `text-${color}-600`

  const studentName = dekont.stajlar?.ogrenciler ? `${dekont.stajlar.ogrenciler.ad} ${dekont.stajlar.ogrenciler.soyad}` : 'Bilinmeyen Öğrenci'
  const companyName = dekont.stajlar?.isletmeler?.ad || 'Bilinmeyen İşletme'

  return (
    <div className="flex items-center space-x-4 hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
      <div className={`p-2 ${bgColor} rounded-lg`}>
        <Icon className={`h-5 w-5 ${textColor}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{studentName} - {companyName}</p>
      </div>
      <span className="text-xs text-gray-400">
        {formatDistanceToNow(new Date(dekont.created_at), { addSuffix: true, locale: tr })}
      </span>
    </div>
  )
}