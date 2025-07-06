'use client'

import React, { useState, useEffect } from 'react'
import { 
  CustomBarChart, 
  CustomLineChart, 
  CustomPieChart, 
  CustomAreaChart,
  ChartSkeleton,
  formatNumber,
  formatCurrency,
  formatPercentage 
} from '@/components/charts/ChartComponents'
import { 
  CalendarDays, 
  Download, 
  Filter,
  TrendingUp,
  Users,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { exportAnalyticsReport } from '@/utils/exportUtils'

// Mock data for analytics
const mockMonthlyData = [
  { month: 'Oca', dekontlar: 45, onaylanan: 38, reddedilen: 7, toplam_ucret: 125000 },
  { month: 'Şub', dekontlar: 52, onaylanan: 47, reddedilen: 5, toplam_ucret: 145000 },
  { month: 'Mar', dekontlar: 48, onaylanan: 43, reddedilen: 5, toplam_ucret: 132000 },
  { month: 'Nis', dekontlar: 61, onaylanan: 55, reddedilen: 6, toplam_ucret: 168000 },
  { month: 'May', dekontlar: 58, onaylanan: 52, reddedilen: 6, toplam_ucret: 159000 },
  { month: 'Haz', dekontlar: 67, onaylanan: 61, reddedilen: 6, toplam_ucret: 187000 }
]

const mockAreaData = [
  { name: 'Bilişim Teknolojileri', ogrenci_sayisi: 125, staj_yeri_sayisi: 45 },
  { name: 'Makine Teknolojisi', ogrenci_sayisi: 98, staj_yeri_sayisi: 38 },
  { name: 'Elektrik-Elektronik', ogrenci_sayisi: 87, staj_yeri_sayisi: 32 },
  { name: 'Otomotiv Teknolojisi', ogrenci_sayisi: 76, staj_yeri_sayisi: 28 },
  { name: 'İnşaat Teknolojisi', ogrenci_sayisi: 65, staj_yeri_sayisi: 25 }
]

const mockStatusData = [
  { name: 'Onaylanan', value: 278, color: '#10b981' },
  { name: 'Bekleyen', value: 45, color: '#f59e0b' },
  { name: 'Reddedilen', value: 32, color: '#ef4444' }
]

const mockCompanyTypes = [
  { name: 'Özel Şirket', value: 145 },
  { name: 'Kamu Kurumu', value: 67 },
  { name: 'STK/Dernek', value: 23 },
  { name: 'Kooperatif', value: 12 }
]

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('6m') // 1m, 3m, 6m, 1y
  const [selectedArea, setSelectedArea] = useState('all')
  const { showToast } = useToast()

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const handleExportData = async (format: 'excel' | 'pdf' | 'csv') => {
    showToast({
      type: 'info',
      title: 'Dışa Aktarma',
      message: `${format.toUpperCase()} formatında rapor hazırlanıyor...`,
      duration: 3000
    })

    try {
      const result = await exportAnalyticsReport(
        mockMonthlyData,
        mockAreaData,
        mockStatusData,
        mockCompanyTypes,
        format
      )

      if (result.success) {
        showToast({
          type: 'success',
          title: 'Dışa Aktarma Tamamlandı',
          message: `Rapor "${result.filename}" dosyası olarak indirildi.`,
          duration: 5000
        })
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Dışa Aktarma Hatası',
        message: `Rapor oluşturulurken hata: ${(error as Error).message}`,
        duration: 6000
      })
    }
  }

  const handleFilterChange = (newRange: string) => {
    setDateRange(newRange)
    setLoading(true)
    
    // Simulate data refresh
    setTimeout(() => {
      setLoading(false)
      showToast({
        type: 'success',
        title: 'Veriler Güncellendi',
        message: `${newRange === '1m' ? 'Son 1 ay' : newRange === '3m' ? 'Son 3 ay' : newRange === '6m' ? 'Son 6 ay' : 'Son 1 yıl'} verileri yüklendi.`,
        duration: 3000
      })
    }, 800)
  }

  const kpiCards = [
    {
      title: 'Toplam Dekont',
      value: '331',
      change: '+12.5%',
      trend: 'up',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Aktif Öğrenci',
      value: '451',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'green'
    },
    {
      title: 'İş Ortağı',
      value: '247',
      change: '+15.7%',
      trend: 'up',
      icon: Building2,
      color: 'purple'
    },
    {
      title: 'Onay Oranı',
      value: '84.2%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'emerald'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-blue-100">Sistem performansı ve istatistiksel analiz</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExportData('excel')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExportData('pdf')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExportData('csv')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtreleme:</span>
            <div className="flex space-x-2">
              {[
                { key: '1m', label: 'Son 1 Ay' },
                { key: '3m', label: 'Son 3 Ay' },
                { key: '6m', label: 'Son 6 Ay' },
                { key: '1y', label: 'Son 1 Yıl' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => handleFilterChange(period.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    dateRange === period.key
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <CalendarDays className="h-4 w-4 mr-2" />
            Son güncelleme: {new Date().toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">{kpi.change}</span>
                    <span className="text-sm text-gray-500 ml-1">bu ay</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-${kpi.color}-50`}>
                  <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <ChartSkeleton height={350} />
          ) : (
            <CustomLineChart
              data={mockMonthlyData}
              xKey="month"
              lines={[
                { key: 'dekontlar', name: 'Toplam Dekont', color: '#6366f1' },
                { key: 'onaylanan', name: 'Onaylanan', color: '#10b981' },
                { key: 'reddedilen', name: 'Reddedilen', color: '#ef4444' }
              ]}
              title="Aylık Dekont Trendi"
              height={350}
              formatter={formatNumber}
            />
          )}
        </div>

        {/* Area Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <ChartSkeleton height={350} />
          ) : (
            <CustomBarChart
              data={mockAreaData}
              xKey="name"
              yKey="ogrenci_sayisi"
              title="Alan Bazında Öğrenci Dağılımı"
              height={350}
              formatter={formatNumber}
            />
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <ChartSkeleton height={350} />
          ) : (
            <CustomPieChart
              data={mockStatusData}
              dataKey="value"
              nameKey="name"
              title="Dekont Durumu Dağılımı"
              height={350}
              formatter={formatNumber}
            />
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <ChartSkeleton height={350} />
          ) : (
            <CustomAreaChart
              data={mockMonthlyData}
              xKey="month"
              areas={[
                { key: 'toplam_ucret', name: 'Toplam Ücret', color: '#8b5cf6' }
              ]}
              title="Aylık Ücret Trendi"
              height={350}
              formatter={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <ChartSkeleton height={300} />
          ) : (
            <CustomPieChart
              data={mockCompanyTypes}
              dataKey="value"
              nameKey="name"
              title="İşletme Türü Dağılımı"
              height={300}
              showLabels={false}
              formatter={formatNumber}
            />
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Son Aktiviteler</h3>
          <div className="space-y-4">
            {[
              { icon: CheckCircle, text: '15 dekont onaylandı', time: '2 saat önce', color: 'green' },
              { icon: FileText, text: '8 yeni dekont başvurusu', time: '4 saat önce', color: 'blue' },
              { icon: Users, text: '23 öğrenci staja başladı', time: '6 saat önce', color: 'purple' },
              { icon: Building2, text: '5 yeni işletme kaydı', time: '1 gün önce', color: 'indigo' },
              { icon: XCircle, text: '3 dekont reddedildi', time: '1 gün önce', color: 'red' },
            ].map((activity, index) => {
              const Icon = activity.icon
              return (
                <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className={`p-2 rounded-lg bg-${activity.color}-50`}>
                    <Icon className={`h-4 w-4 text-${activity.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}