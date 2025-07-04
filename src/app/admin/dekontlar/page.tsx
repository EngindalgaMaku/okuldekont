'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Eye, Trash2, Loader, Search, Filter, Calendar, Building, User, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Dekont {
    id: number;
    tarih: string;
    miktar: number;
    ay: number;
    yil: number;
    odeme_tarihi: string;
    odeme_son_tarihi: string;
    aciklama?: string;
    onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
    red_nedeni?: string;
    created_at: string;
    ogrenciler?: { ad: string; soyad: string };
    isletmeler?: { ad: string };
    ogretmenler?: { ad: string; soyad: string };
    saat_sayisi?: number;
}

export default function DekontYonetimiPage() {
  const router = useRouter()
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Modal states
  const [viewModal, setViewModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  async function fetchDekontlar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dekontlar')
      .select(`
        *,
        ogrenciler (ad, soyad),
        isletmeler (ad),
        ogretmenler (ad, soyad)
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
        console.error('Dekontlar çekilirken hata:', error)
        alert('Dekontlar yüklenirken bir hata oluştu.')
    } else {
        setDekontlar(data || [])
        setFilteredDekontlar(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDekontlar()
  }, [])

  // Filter dekontlar
  useEffect(() => {
    let filtered = dekontlar

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(dekont => 
        dekont.ogrenciler?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dekont.ogrenciler?.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dekont.isletmeler?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dekont.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(dekont => dekont.onay_durumu === statusFilter)
    }

    setFilteredDekontlar(filtered)
  }, [dekontlar, searchTerm, statusFilter])

  const handleView = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setViewModal(true)
  }

  const handleDelete = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedDekont) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('dekontlar')
      .delete()
      .eq('id', selectedDekont.id)

    if (error) {
      alert('Dekont silinirken bir hata oluştu: ' + error.message)
    } else {
      setDeleteModal(false)
      fetchDekontlar()
    }
    setSubmitLoading(false)
  }

  const handleApproval = async (dekontId: number, newStatus: 'onaylandi' | 'reddedildi') => {
    const { error } = await supabase
      .from('dekontlar')
      .update({ onay_durumu: newStatus })
      .eq('id', dekontId)

    if (error) {
      alert('Onay durumu güncellenirken bir hata oluştu: ' + error.message)
    } else {
      fetchDekontlar()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'reddedildi':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'Onaylandı'
      case 'reddedildi':
        return 'Reddedildi'
      default:
        return 'Bekliyor'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'reddedildi':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-32">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Dekont Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Öğrenci dekontlarını inceleyin ve onaylayın.</p>
          </div>
          <div className="text-sm text-gray-500">
            Toplam: {filteredDekontlar.length} dekont
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arama
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Öğrenci adı, işletme veya açıklama..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Onay Durumu
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="all">Tümü</option>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="onaylandi">Onaylandı</option>
                  <option value="reddedildi">Reddedildi</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Dekont List */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Öğrenci / İşletme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Tarih / Saat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-200">
                {filteredDekontlar.map((dekont) => (
                  <tr key={dekont.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {dekont.ogrenciler?.ad} {dekont.ogrenciler?.soyad}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          {dekont.isletmeler?.ad}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(dekont.tarih).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {dekont.saat_sayisi} saat
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {dekont.aciklama || 'Açıklama yok'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(dekont.onay_durumu)}`}>
                        {getStatusIcon(dekont.onay_durumu)}
                        <span className="ml-1">{getStatusText(dekont.onay_durumu)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleView(dekont)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {dekont.onay_durumu === 'bekliyor' && (
                          <>
                            <button 
                              onClick={() => handleApproval(dekont.id, 'onaylandi')}
                              className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-all duration-200"
                              title="Onayla"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleApproval(dekont.id, 'reddedildi')}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                              title="Reddet"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(dekont)} 
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                          title="Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDekontlar.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Dekont bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Arama kriterlerinize uygun dekont bulunamadı.' 
                  : 'Henüz hiç dekont kaydı yok.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => setViewModal(false)}
        title="Dekont Detayları"
      >
        {selectedDekont && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Öğrenci Bilgileri</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedDekont.ogrenciler?.ad} {selectedDekont.ogrenciler?.soyad}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">İşletme Bilgileri</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedDekont.isletmeler?.ad}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Tarih</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(selectedDekont.tarih).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Çalışılan Saat</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {selectedDekont.saat_sayisi} saat
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Ödeme Bilgileri</h4>
                        <div className="mt-2 bg-gray-50 rounded-lg p-4">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm text-gray-500">Ödeme Tarihi:</span>
                                    <p className="text-sm font-medium">{new Date(selectedDekont.odeme_tarihi).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Son Ödeme Tarihi:</span>
                                    <p className="text-sm font-medium">{new Date(selectedDekont.odeme_son_tarihi).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Dönem:</span>
                                    <p className="text-sm font-medium">{selectedDekont.ay}/{selectedDekont.yil}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Miktar:</span>
                                    <p className="text-sm font-medium">{selectedDekont.miktar.toLocaleString('tr-TR')} ₺</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Onay Durumu</h4>
                        <div className="mt-2 bg-gray-50 rounded-lg p-4">
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    {getStatusIcon(selectedDekont.onay_durumu)}
                                    <span className="ml-2 text-sm font-medium">{getStatusText(selectedDekont.onay_durumu)}</span>
                                </div>
                                {selectedDekont.onay_durumu === 'reddedildi' && selectedDekont.red_nedeni && (
                                    <div>
                                        <span className="text-sm text-gray-500">Red Nedeni:</span>
                                        <p className="text-sm font-medium text-red-600">{selectedDekont.red_nedeni}</p>
                                    </div>
                                )}
                                {selectedDekont.ogretmenler && (
                                    <div>
                                        <span className="text-sm text-gray-500">İşlemi Yapan:</span>
                                        <p className="text-sm font-medium">{selectedDekont.ogretmenler.ad} {selectedDekont.ogretmenler.soyad}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedDekont.aciklama && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Açıklama</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900">{selectedDekont.aciklama}</p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Kayıt Tarihi</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">
                  {new Date(selectedDekont.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            {selectedDekont.onay_durumu === 'bekliyor' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    handleApproval(selectedDekont.id, 'reddedildi')
                    setViewModal(false)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-xl hover:bg-red-200 transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </button>
                <button
                  onClick={() => {
                    handleApproval(selectedDekont.id, 'onaylandi')
                    setViewModal(false)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-xl hover:bg-green-200 transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Onayla
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Dekontu Sil"
        description={
          selectedDekont
            ? `"${selectedDekont.ogrenciler?.ad} ${selectedDekont.ogrenciler?.soyad}" öğrencisinin dekontunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`
            : ""
        }
        confirmText="Sil"
        isLoading={submitLoading}
      />
    </div>
  )
} 