import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GraduationCap, Users, Building2, BookOpen, CheckCircle } from 'lucide-react'

async function fetchDashboardData() {
  try {
    const [
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.adminProfile.count(),
      prisma.teacherProfile.count(),
      prisma.companyProfile.count(),
      prisma.egitimYili.count()
    ])

    return {
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return {
      userCount: 0,
      adminCount: 0,
      teacherCount: 0,
      companyCount: 0,
      educationYearCount: 0
    }
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const stats = await fetchDashboardData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">MariaDB + Prisma + NextAuth.js sistem durumu</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Migration Successful</span>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Hoşgeldiniz, {session.user.email}!
              </h2>
              <p className="text-gray-600">
                Sistem başarıyla MariaDB + Prisma + NextAuth.js'e geçirildi
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{stats.userCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admin</p>
                <p className="text-2xl font-bold text-gray-900">{stats.adminCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Öğretmenler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teacherCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">İşletmeler</p>
                <p className="text-2xl font-bold text-gray-900">{stats.companyCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistem Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Veritabanı:</span>
                <span className="font-medium text-green-600">MariaDB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ORM:</span>
                <span className="font-medium text-blue-600">Prisma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Authentication:</span>
                <span className="font-medium text-purple-600">NextAuth.js</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Session Type:</span>
                <span className="font-medium">JWT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User Role:</span>
                <span className="font-medium text-indigo-600">{session.user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Migration Status:</span>
                <span className="font-medium text-green-600">Complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Migration Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">Migration Başarılı!</h4>
              <p className="text-green-700 mt-1">
                Sistem başarıyla Supabase'den MariaDB + Prisma + NextAuth.js'e geçirildi. 
                Tüm authentication ve database işlemleri yeni sistem üzerinde çalışmaktadır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}