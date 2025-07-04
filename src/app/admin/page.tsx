'use client'

import { useState, useEffect } from 'react'
import { FileText, Users, Building, TrendingUp, CheckCircle, Clock, XCircle, Shield, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDekontlar: 4,
    bekleyenDekontlar: 2,
    onaylananDekontlar: 1,
    rededilenDekontlar: 1,
    totalIsletmeler: 6,
    totalOgretmenler: 0,
    totalOgrenciler: 0,
    kilitliHesaplar: 0
  })

  const quickActions = [
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
      title: 'İşletme Yönetimi',
      description: 'İşletme bilgilerini düzenleyin',
      href: '/admin/isletmeler',
      icon: Building,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Öğretmen Yönetimi',
      description: 'Öğretmen kayıtlarını yönetin',
      href: '/admin/ogretmenler',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Güvenlik Yönetimi',
      description: 'Kilitli hesapları yönetin',
      href: '/admin/guvenlik',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-indigo-100">Hüsniye Özdilek MTAL - Koordinatörlük Yönetimi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
            <Link href="/admin/dekontlar" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              İncele →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kilitli Hesaplar</p>
              <p className="text-3xl font-bold text-orange-600">{stats.kilitliHesaplar}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/guvenlik" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Yönet →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Güvenlik Logları</p>
              <p className="text-3xl font-bold text-gray-900">24</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <Shield className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">Son 24 saat</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Başarısız Girişler</p>
              <p className="text-3xl font-bold text-red-600">8</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">Son 24 saat</span>
          </div>
        </div>
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
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Yeni dekont bekleniyor</p>
                <p className="text-xs text-gray-500">Ahmet Yılmaz - ABC Teknoloji Ltd.</p>
              </div>
              <span className="text-xs text-gray-400">2 saat önce</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Dekont onaylandı</p>
                <p className="text-xs text-gray-500">Fatma Demir - XYZ İnşaat A.Ş.</p>
              </div>
              <span className="text-xs text-gray-400">1 gün önce</span>
            </div>

            <div className="flex items-center space-x-4">
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
        </div>
      </div>
    </div>
  )
} 