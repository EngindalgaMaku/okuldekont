'use client'

import { useState, useEffect } from 'react'
import { History, User, X, Calendar, Filter } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'

interface TeacherHistoryData {
  id: string
  teacherId: string
  changeType: string
  fieldName: string
  previousValue: string | null
  newValue: string | null
  validFrom: string
  validTo: string | null
  changedBy: string
  reason: string | null
  createdAt: string
}

interface Teacher {
  id: string
  name: string
  surname: string
}

interface TeacherHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  teacher: Teacher | null
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  'PERSONAL_INFO_UPDATE': 'Kişisel Bilgi Güncelleme',
  'CONTACT_INFO_UPDATE': 'İletişim Bilgisi Güncelleme',
  'PROFESSIONAL_INFO_UPDATE': 'Mesleki Bilgi Güncelleme',
  'FIELD_ASSIGNMENT': 'Alan Atama',
  'STATUS_CHANGE': 'Durum Değişikliği',
  'SECURITY_UPDATE': 'Güvenlik Güncelleme'
}

const FIELD_LABELS: Record<string, string> = {
  'name': 'Ad',
  'surname': 'Soyad',
  'phone': 'Telefon',
  'email': 'E-posta',
  'tcNo': 'TC Kimlik No',
  'alanId': 'Alan',
  'position': 'Pozisyon',
  'active': 'Aktiflik Durumu',
  'pin': 'PIN Kodu',
  'userId': 'Kullanıcı Hesabı'
}

export default function TeacherHistoryModal({ isOpen, onClose, teacher }: TeacherHistoryModalProps) {
  const [history, setHistory] = useState<TeacherHistoryData[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (isOpen && teacher) {
      fetchHistory()
    }
  }, [isOpen, teacher, currentPage, filterType])

  const fetchHistory = async () => {
    if (!teacher) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        teacherId: teacher.id,
        page: currentPage.toString(),
        limit: '10',
        ...(filterType !== 'all' && { changeType: filterType })
      })

      const response = await fetch(`/api/admin/teacher-history?${params}`)
      if (!response.ok) {
        throw new Error('Öğretmen geçmişi alınamadı')
      }

      const data = await response.json()
      setHistory(data.history || [])
      setTotalPages(Math.ceil((data.totalCount || 0) / 10))
    } catch (error) {
      console.error('Teacher history fetch error:', error)
      toast.error('Öğretmen geçmişi yüklenirken hata oluştu')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatValue = (value: string | null) => {
    if (value === null || value === '') return 'Boş'
    if (value === 'true') return 'Aktif'
    if (value === 'false') return 'Pasif'
    return value
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'PERSONAL_INFO_UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'CONTACT_INFO_UPDATE':
        return 'bg-green-100 text-green-800'
      case 'PROFESSIONAL_INFO_UPDATE':
        return 'bg-purple-100 text-purple-800'
      case 'FIELD_ASSIGNMENT':
        return 'bg-orange-100 text-orange-800'
      case 'STATUS_CHANGE':
        return 'bg-yellow-100 text-yellow-800'
      case 'SECURITY_UPDATE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const resetFilters = () => {
    setFilterType('all')
    setCurrentPage(1)
  }

  if (!teacher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Öğretmen Geçmişi
              </h3>
              <p className="text-sm text-gray-600">
                {teacher.name} {teacher.surname} - Bilgi Değişiklik Kayıtları
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Değişiklikler</option>
              <option value="PERSONAL_INFO_UPDATE">Kişisel Bilgi Güncellemeleri</option>
              <option value="CONTACT_INFO_UPDATE">İletişim Güncellemeleri</option>
              <option value="PROFESSIONAL_INFO_UPDATE">Mesleki Bilgi Güncellemeleri</option>
              <option value="FIELD_ASSIGNMENT">Alan Atamaları</option>
              <option value="STATUS_CHANGE">Durum Değişiklikleri</option>
              <option value="SECURITY_UPDATE">Güvenlik Güncellemeleri</option>
            </select>
          </div>
          
          {filterType !== 'all' && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        {/* History Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Geçmiş yükleniyor...</p>
            </div>
          ) : history.length > 0 ? (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((record) => (
                  <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <History className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChangeTypeColor(record.changeType)}`}>
                              {CHANGE_TYPE_LABELS[record.changeType] || record.changeType}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {FIELD_LABELS[record.fieldName] || record.fieldName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(record.createdAt)}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <User className="h-3 w-3 mr-1" />
                          {record.changedBy}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Önceki Değer
                        </div>
                        <div className="text-sm text-gray-900 bg-red-50 px-2 py-1 rounded">
                          {formatValue(record.previousValue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Yeni Değer
                        </div>
                        <div className="text-sm text-gray-900 bg-green-50 px-2 py-1 rounded">
                          {formatValue(record.newValue)}
                        </div>
                      </div>
                    </div>

                    {record.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Değişiklik Nedeni
                        </div>
                        <div className="text-sm text-gray-700 italic">
                          {record.reason}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Sayfa {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geçmiş Kaydı Bulunamadı</h3>
              <p className="text-gray-600">
                {filterType !== 'all' 
                  ? 'Bu kriterlere uygun geçmiş kaydı bulunamadı.'
                  : 'Bu öğretmen için henüz değişiklik kaydı bulunmuyor.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}