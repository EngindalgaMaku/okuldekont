'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  History, 
  TrendingUp, 
  Users, 
  Building, 
  GraduationCap,
  Clock,
  BarChart3,
  ArrowRight,
  RefreshCw,
  FileText,
  Search,
  Archive
} from 'lucide-react'

export default function TemporalDataPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudentEnrollments: 0,
    totalCompanyHistory: 0,
    totalTeacherHistory: 0,
    activeEducationYear: null as any,
    recentChanges: 0
  })

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Öğrenci kayıt istatistikleri
      const enrollmentsResponse = await fetch('/api/admin/student-enrollments?stats=true')
      const enrollmentsData = await enrollmentsResponse.json()

      // İşletme geçmiş istatistikleri
      const companyHistoryResponse = await fetch('/api/admin/company-history?stats=true')
      const companyHistoryData = await companyHistoryResponse.json()

      // Öğretmen geçmiş istatistikleri
      const teacherHistoryResponse = await fetch('/api/admin/teacher-history?stats=true')
      const teacherHistoryData = await teacherHistoryResponse.json()

      // Aktif eğitim yılı
      const educationYearsResponse = await fetch('/api/admin/education-years')
      const educationYearsData = await educationYearsResponse.json()
      const activeYear = educationYearsData.data ? educationYearsData.data.find((year: any) => year.active) : null

      setStats({
        totalStudentEnrollments: enrollmentsData.total || 0,
        totalCompanyHistory: companyHistoryData.total || 0,
        totalTeacherHistory: teacherHistoryData.total || 0,
        activeEducationYear: activeYear,
        recentChanges: (enrollmentsData.recent || 0) + (companyHistoryData.recent || 0) + (teacherHistoryData.recent || 0)
      })
    } catch (error) {
      console.error('Temporal veri istatistikleri çekilirken hata:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const features = [
    {
      title: 'Geçmiş Bilgi Görüntüleme',
      description: 'Belirli bir tarihteki öğretmen, işletme ve öğrenci bilgilerini görüntüleyin',
      icon: History,
      href: '/admin/temporal/history',
      color: 'blue',
      stats: `${stats.totalCompanyHistory + stats.totalTeacherHistory} geçmiş kayıt`
    },
    {
      title: 'Sınıf Yükseltme İşlemleri',
      description: 'Öğrencilerin sınıf yükseltme işlemlerini toplu olarak gerçekleştirin',
      icon: TrendingUp,
      href: '/admin/temporal/promotion',
      color: 'green',
      stats: `${stats.totalStudentEnrollments} kayıt takibi`
    },
    {
      title: 'İşletme Geçmiş Takibi',
      description: 'İşletmelerin geçmiş bilgilerini ve değişikliklerini takip edin',
      icon: Building,
      href: '/admin/temporal/company-history',
      color: 'orange',
      stats: `${stats.totalCompanyHistory} değişiklik kaydı`
    },
    {
      title: 'Öğretmen Geçmiş Takibi',
      description: 'Öğretmenlerin geçmiş bilgilerini ve değişikliklerini takip edin',
      icon: Users,
      href: '/admin/temporal/teacher-history',
      color: 'purple',
      stats: `${stats.totalTeacherHistory} değişiklik kaydı`
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Temporal Veri Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Geçmiş bilgi takibi ve sınıf yükseltme işlemleri</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl hover:bg-indigo-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Öğrenci Kayıtları</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudentEnrollments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-orange-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">İşletme Geçmişi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCompanyHistory}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-purple-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Öğretmen Geçmişi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeacherHistory}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-green-100 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Son Değişiklikler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentChanges}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Education Year */}
        {stats.activeEducationYear && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Aktif Eğitim Yılı</h3>
                  <p className="text-sm text-green-700">{stats.activeEducationYear.year}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">Başlangıç</p>
                <p className="text-sm font-medium text-green-800">
                  {stats.activeEducationYear.start_date ? 
                    new Date(stats.activeEducationYear.start_date).toLocaleDateString('tr-TR') : 
                    '-'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <div className={`bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-${feature.color}-100 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 bg-${feature.color}-100 rounded-xl group-hover:bg-${feature.color}-200 transition-colors`}>
                      <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${feature.color}-100 text-${feature.color}-800`}>
                        {feature.stats}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
            Hızlı İşlemler
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/temporal/history?search=teacher"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <Search className="h-5 w-5 text-gray-400 group-hover:text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-800">
                Öğretmen Ara
              </span>
            </Link>
            
            <Link
              href="/admin/temporal/history?search=company"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors group"
            >
              <Search className="h-5 w-5 text-gray-400 group-hover:text-orange-600 mr-3" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-orange-800">
                İşletme Ara
              </span>
            </Link>
            
            <Link
              href="/admin/temporal/promotion"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
            >
              <TrendingUp className="h-5 w-5 text-gray-400 group-hover:text-green-600 mr-3" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-green-800">
                Sınıf Yükselt
              </span>
            </Link>
            
            <Link
              href="/admin/temporal/history?period=last-year"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
            >
              <Archive className="h-5 w-5 text-gray-400 group-hover:text-purple-600 mr-3" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-800">
                Geçen Yıl
              </span>
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start">
            <FileText className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-semibold text-blue-900 mb-2">Temporal Veri Sistemi Hakkında</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Geçmiş Takip:</strong> Tüm öğretmen ve işletme bilgi değişiklikleri kaydedilir</p>
                <p>• <strong>Sınıf Yükseltme:</strong> Öğrencilerin otomatik sınıf yükseltme işlemleri desteklenir</p>
                <p>• <strong>Zaman Sorgulama:</strong> Herhangi bir tarihteki bilgileri sorgulayabilirsiniz</p>
                <p>• <strong>MESEM Desteği:</strong> MESEM öğrencilerinin 9-12. sınıf ilerlemesi takip edilir</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}