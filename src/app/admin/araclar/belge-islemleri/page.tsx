'use client'

import { useState, useEffect } from 'react'
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  FileText,
  Trash2
} from 'lucide-react'

interface Belge {
  id: string
  ad: string
  belgeTuru: string
  dosyaUrl: string
  dosyaAdi: string
  yuklenenTaraf: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  teacher?: {
    name: string
    surname: string
  } | null
  company?: {
    name: string
    contact: string
  } | null
  redNedeni?: string
}

type StatusType = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED'

export default function BelgeIslemleriPage() {
  const [belgeler, setBelgeler] = useState<Belge[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusType>('PENDING')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<{id: string} | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteItem, setDeleteItem] = useState<{id: string, ad: string} | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Belge verilerini getir
      const belgeResponse = await fetch('/api/admin/belgeler')
      if (belgeResponse.ok) {
        const belgeData = await belgeResponse.json()
        setBelgeler(belgeData.belgeler || [])
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id)
      
      const response = await fetch(`/api/admin/belgeler/${id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchData() // Verileri yenile
      } else {
        alert('Onaylama işlemi başarısız!')
      }
    } catch (error) {
      console.error('Onaylama hatası:', error)
      alert('Onaylama işlemi başarısız!')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string, reason: string) => {
    if (!reason.trim()) {
      alert('Lütfen reddetme nedenini giriniz.')
      return
    }

    try {
      setActionLoading(id)
      
      const response = await fetch(`/api/admin/belgeler/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        setSelectedItem(null)
        setRejectReason('')
        fetchData() // Verileri yenile
      } else {
        alert('Reddetme işlemi başarısız!')
      }
    } catch (error) {
      console.error('Reddetme hatası:', error)
      alert('Reddetme işlemi başarısız!')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(id)
      
      const response = await fetch(`/api/admin/belgeler/${id}/delete`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteItem(null)
        fetchData() // Verileri yenile
        alert('Belge başarıyla silindi!')
      } else {
        alert('Silme işlemi başarısız!')
      }
    } catch (error) {
      console.error('Silme hatası:', error)
      alert('Silme işlemi başarısız!')
    } finally {
      setActionLoading(null)
    }
  }

  const openFile = (url: string) => {
    window.open(url, '_blank')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Bekliyor'
      case 'APPROVED':
        return 'Onaylandı'
      case 'REJECTED':
        return 'Reddedildi'
      default:
        return 'Bilinmiyor'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Filtreleme
  const filteredBelgeler = belgeler.filter(belge => {
    const matchesStatus = statusFilter === 'all' || belge.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      belge.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      belge.belgeTuru.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (belge.teacher && `${belge.teacher.name} ${belge.teacher.surname}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (belge.company && belge.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const pendingCount = belgeler.filter(b => b.status === 'PENDING').length
  const approvedCount = belgeler.filter(b => b.status === 'APPROVED').length
  const rejectedCount = belgeler.filter(b => b.status === 'REJECTED').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Belgeler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl">
            <FileCheck className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Belge İşlemleri</h1>
            <p className="text-gray-600">
              Öğretmen ve işletme panellerinden yüklenen belgelerin onay/red işlemleri
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">Bekleyen</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Onaylanan</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Reddedilen</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="text-purple-800 font-medium">Toplam</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">{belgeler.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Belge adı, türü, öğretmen veya işletme ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="PENDING">Bekliyor</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
          </select>
        </div>
      </div>

      {/* Belgeler */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Belgeler ({filteredBelgeler.length})
            </h2>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredBelgeler.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Filtreye uygun belge bulunamadı.</p>
            </div>
          ) : (
            filteredBelgeler.map((belge) => (
              <div key={belge.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(belge.status)}`}>
                        {getStatusIcon(belge.status)}
                        {getStatusText(belge.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(belge.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">İşletme:</span>
                        <p className="font-medium">{belge.company ? belge.company.name : 'Bilinmiyor'}</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Belge Türü:</span>
                        <p className="font-medium">{belge.belgeTuru}</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Yükleyen:</span>
                        <p className="font-medium">
                          {belge.yuklenenTaraf === 'ogretmen' && belge.teacher
                            ? `${belge.teacher.name} ${belge.teacher.surname} (Öğretmen)`
                            : belge.yuklenenTaraf === 'isletme' && belge.company
                            ? `${belge.company.contact} (İşletme)`
                            : 'Bilinmiyor'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Dosya:</span>
                      <span className="font-medium ml-1">{belge.dosyaAdi}</span>
                    </div>

                    {belge.redNedeni && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Reddetme Nedeni:</strong> {belge.redNedeni}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openFile(belge.dosyaUrl)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Dosyayı görüntüle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {belge.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(belge.id)}
                          disabled={actionLoading === belge.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === belge.id ? 'İşleniyor...' : 'Onayla'}
                        </button>
                        <button
                          onClick={() => setSelectedItem({id: belge.id})}
                          disabled={actionLoading === belge.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Reddet
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => setDeleteItem({id: belge.id, ad: belge.ad})}
                      disabled={actionLoading === belge.id}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Belgeyi sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Belgeyi Reddet
              </h3>
              <p className="text-gray-600 mb-4">
                Lütfen reddetme nedeninizi belirtiniz:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reddetme nedeni..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-24 resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setSelectedItem(null)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleReject(selectedItem.id, rejectReason)}
                  disabled={!rejectReason.trim() || actionLoading === selectedItem.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === selectedItem.id ? 'İşleniyor...' : 'Reddet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Belgeyi Sil
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>"{deleteItem.ad}"</strong> adlı belgeyi silmek istediğinizden emin misiniz?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Uyarı:</strong> Bu işlem geri alınamaz. Belge ve dosya kalıcı olarak silinecektir.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteItem(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDelete(deleteItem.id)}
                  disabled={actionLoading === deleteItem.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === deleteItem.id ? 'Siliniyor...' : 'Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}