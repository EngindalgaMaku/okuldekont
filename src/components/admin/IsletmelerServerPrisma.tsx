'use client'

import { useState, useEffect } from 'react'
import { Building2, Search, Filter, Plus, Eye } from 'lucide-react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  contact?: string
  phone?: string
  address?: string
  _count?: {
    students: number
  }
  teacher?: {
    name: string
    surname: string
  }
}

interface SearchParams {
  page?: string
  search?: string
  filter?: string
  per_page?: string
}

interface IsletmelerServerPrismaProps {
  searchParams: SearchParams
}

export default function IsletmelerServerPrisma({ searchParams }: IsletmelerServerPrismaProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const page = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  const filter = searchParams.filter || ''
  const perPage = parseInt(searchParams.per_page || '10')

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: page.toString(),
          search,
          filter,
          per_page: perPage.toString()
        })
        
        const response = await fetch(`/api/admin/companies?${params}`)
        if (!response.ok) {
          throw new Error('İşletmeler yüklenirken hata oluştu')
        }
        
        const data = await response.json()
        setCompanies(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [page, search, filter, perPage])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">İşletmeler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Hata: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İşletme Yönetimi</h1>
          <p className="text-gray-600 mt-1">Sistemdeki tüm işletmeleri yönetin</p>
        </div>
        <Link
          href="/admin/isletmeler/yeni"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni İşletme
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="İşletme adı, yetkili veya telefon ile ara..."
                value={search}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                readOnly
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                disabled
              >
                <option value="">Tümü</option>
                <option value="active">Aktif Stajı Olanlar</option>
                <option value="empty">Boş İşletmeler</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {company.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {company._count?.students || 0} öğrenci
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/isletmeler/${company.id}`}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-2">
                {company.contact && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Yetkili:</span> {company.contact}
                  </p>
                )}
                {company.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tel:</span> {company.phone}
                  </p>
                )}
                {company.teacher && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Koordinatör:</span> {company.teacher.name} {company.teacher.surname}
                  </p>
                )}
                {company.address && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    <span className="font-medium">Adres:</span> {company.address}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">İşletme bulunamadı</h3>
          <p className="text-gray-600 mb-6">
            Arama kriterlerinizle eşleşen işletme bulunmuyor.
          </p>
        </div>
      )}
    </div>
  )
}