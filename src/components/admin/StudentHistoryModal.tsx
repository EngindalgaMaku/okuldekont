'use client'

import { useState, useEffect } from 'react'
import { History, User, Clock, ChevronDown, ChevronUp, Filter, Calendar } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface StudentHistoryRecord {
  id: string
  changeType: string
  fieldName: string
  previousValue: string | null
  newValue: string | null
  validFrom: string
  validTo?: string | null
  reason?: string | null
  notes?: string | null
  changedByUser: {
    id: string
    email: string
    adminProfile?: {
      name: string
    }
  }
}

interface StudentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    name: string
    surname: string
    className: string
    number: string
  } | null
}

const CHANGE_TYPE_LABELS = {
  'PERSONAL_INFO_UPDATE': 'Kişisel Bilgi Değişikliği',
  'CONTACT_INFO_UPDATE': 'İletişim Bilgileri Değişikliği',
  'PARENT_INFO_UPDATE': 'Veli Bilgileri Değişikliği',
  'SCHOOL_INFO_UPDATE': 'Okul Bilgileri Değişikliği',
  'OTHER_UPDATE': 'Diğer Değişiklikler'
}

const FIELD_NAME_LABELS = {
  'name': 'Ad',
  'surname': 'Soyad',
  'tcNo': 'TC Kimlik No',
  'phone': 'Telefon',
  'email': 'E-posta',
  'parentName': 'Veli Adı',
  'parentPhone': 'Veli Telefon',
  'className': 'Sınıf',
  'number': 'Okul Numarası',
  'gender': 'Cinsiyet',
  'birthDate': 'Doğum Tarihi'
}

export default function StudentHistoryModal({ isOpen, onClose, student }: StudentHistoryModalProps) {
  const [history, setHistory] = useState<StudentHistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [filterChangeType, setFilterChangeType] = useState<string>('all')
  const [filterFieldName, setFilterFieldName] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (isOpen && student) {
      fetchHistory()
    }
  }, [isOpen, student, filterChangeType, filterFieldName, page])

  const fetchHistory = async () => {
    if (!student) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        studentId: student.id,
        page: page.toString(),
        limit: '20'
      })

      if (filterChangeType !== 'all') {
        params.append('changeType', filterChangeType)
      }

      if (filterFieldName !== 'all') {
        params.append('fieldName', filterFieldName)
      }

      const response = await fetch(`/api/admin/student-history?${params}`)
      
      if (!response.ok) {
        throw new Error('Geçmiş kayıtları yüklenirken hata oluştu')
      }

      const data = await response.json()

      if (data.success) {
        setHistory(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        throw new Error(data.error || 'Bilinmeyen hata')
      }
    } catch (err: any) {
      setError(err.message)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const parseValue = (value: string | null) => {
    if (!value) return '-'
    try {
      const parsed = JSON.parse(value)
      return parsed
    } catch {
      return value
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'PERSONAL_INFO_UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CONTACT_INFO_UPDATE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PARENT_INFO_UPDATE':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'SCHOOL_INFO_UPDATE':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const resetFilters = () => {
    setFilterChangeType('all')
    setFilterFieldName('all')
    setPage(1)
  }

  if (!student) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📋 ${student.name} ${student.surname} - Kişisel Bilgi Geçmişi`}
    >
      <div className="space-y-6">
        {/* Student Info */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-indigo-800">Öğrenci Bilgileri</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Ad Soyad:</span>
              <span className="ml-2 font-medium">{student.name} {student.surname}</span>
            </div>
            <div>
              <span className="text-gray-600">Sınıf:</span>
              <span className="ml-2 font-medium">{student.className}</span>
            </div>
            <div>
              <span className="text-gray-600">Numara:</span>
              <span className="ml-2 font-medium">{student.number}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-700">Filtreler</span>
            <button
              onClick={resetFilters}
              className="ml-auto text-sm text-indigo-600 hover:text-indigo-800"
            >
              Temizle
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Değişiklik Türü
              </label>
              <select
                value={filterChangeType}
                onChange={(e) => {
                  setFilterChangeType(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">Tüm Türler</option>
                {Object.entries(CHANGE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alan
              </label>
              <select
                value={filterFieldName}
                onChange={(e) => {
                  setFilterFieldName(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">Tüm Alanlar</option>
                {Object.entries(FIELD_NAME_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Geçmiş kayıtları yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Tekrar Dene
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geçmiş kayıt bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterChangeType !== 'all' || filterFieldName !== 'all' 
                  ? 'Seçili filtrelere uygun geçmiş kayıt bulunmuyor.'
                  : 'Bu öğrenci için henüz kişisel bilgi değişikliği kaydı bulunmuyor.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRecord(
                      expandedRecord === record.id ? null : record.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getChangeTypeColor(record.changeType)}`}>
                          {CHANGE_TYPE_LABELS[record.changeType as keyof typeof CHANGE_TYPE_LABELS] || record.changeType}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {FIELD_NAME_LABELS[record.fieldName as keyof typeof FIELD_NAME_LABELS] || record.fieldName}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {formatDate(record.validFrom)}
                            <span>•</span>
                            <span>
                              {record.changedByUser.adminProfile?.name || record.changedByUser.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      {expandedRecord === record.id ? 
                        <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      }
                    </div>
                  </div>

                  {expandedRecord === record.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Önceki Değer
                          </label>
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                            {parseValue(record.previousValue)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Yeni Değer
                          </label>
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                            {parseValue(record.newValue)}
                          </div>
                        </div>
                      </div>

                      {(record.reason || record.notes) && (
                        <div className="mt-4">
                          {record.reason && (
                            <div className="mb-2">
                              <label className="block text-sm font-medium text-gray-600 mb-1">
                                Değişiklik Nedeni
                              </label>
                              <div className="text-sm text-gray-800">{record.reason}</div>
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">
                                Notlar
                              </label>
                              <div className="text-sm text-gray-800">{record.notes}</div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Geçerli: {formatDate(record.validFrom)}</span>
                            {record.validTo && (
                              <span> - {formatDate(record.validTo)}</span>
                            )}
                          </div>
                          <div>
                            ID: {record.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-700">
              Sayfa {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </Modal>
  )
}