'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Download, User, Building2, Receipt, Phone, Mail, Eye, Trash2, MoreHorizontal } from 'lucide-react'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'
import { toast } from 'react-hot-toast'

export interface DekontDetay {
  id: string;
  ay: number;
  yil: number;
  onay_durumu: 'onaylandi' | 'bekliyor' | 'reddedildi';
  ogrenci_ad_soyad: string;
  ogrenci_sinif?: string;
  ogrenci_no?: string;
  ogrenci_alan?: string;
  isletme_ad: string;
  isletme_yetkili?: string;
  isletme_telefon?: string;
  isletme_email?: string;
  dosya_url?: string;
  red_nedeni?: string;
  miktar?: number;
}

interface OgretmenDekontListesiProps {
  dekontlar: DekontDetay[];
  onUpdate?: () => void;
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

const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function OgretmenDekontListesi({ dekontlar, onUpdate }: OgretmenDekontListesiProps) {
  const [selectedDekont, setSelectedDekont] = useState<DekontDetay | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  if (dekontlar.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Receipt className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium">Dekont Bulunmuyor</h3>
        <p>Bu öğretmenin sorumlu olduğu öğrencilere ait dekont bulunmuyor.</p>
      </div>
    )
  }

  const handleApprove = async (dekont: DekontDetay) => {
    setSelectedDekont(dekont)
    setConfirmModalOpen(true)
  }

  const handleReject = async (dekont: DekontDetay) => {
    setSelectedDekont(dekont)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleDelete = async (dekont: DekontDetay) => {
    setSelectedDekont(dekont)
    setDeleteModalOpen(true)
  }

  const handleViewDetail = (dekont: DekontDetay) => {
    setSelectedDekont(dekont)
    setDetailModalOpen(true)
  }

  const updateDekontStatus = async (dekontId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setLoading(true)
    try {
      let response;
      
      if (status === 'APPROVED') {
        response = await fetch(`/api/admin/dekontlar/${dekontId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        response = await fetch(`/api/admin/dekontlar/${dekontId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        })
      }

      if (response.ok) {
        toast.success(status === 'APPROVED' ? 'Dekont onaylandı' : 'Dekont reddedildi')
        onUpdate?.()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'İşlem sırasında hata oluştu')
      }
    } catch (error) {
      toast.error('İşlem sırasında hata oluştu')
    }
    setLoading(false)
  }

  const deleteDekont = async (dekontId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/dekontlar/${dekontId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Dekont silindi')
        onUpdate?.()
      } else {
        toast.error('Silme işlemi sırasında hata oluştu')
      }
    } catch (error) {
      toast.error('Silme işlemi sırasında hata oluştu')
    }
    setLoading(false)
  }

  const submitApprove = async () => {
    if (selectedDekont) {
      await updateDekontStatus(selectedDekont.id, 'APPROVED')
      setConfirmModalOpen(false)
    }
  }

  const submitReject = async () => {
    if (selectedDekont && rejectReason.trim()) {
      await updateDekontStatus(selectedDekont.id, 'REJECTED', rejectReason)
      setRejectModalOpen(false)
    }
  }

  const submitDelete = async () => {
    if (selectedDekont && deleteConfirmText === 'SİL') {
      await deleteDekont(selectedDekont.id)
      setDeleteModalOpen(false)
      setDeleteConfirmText('')
    }
  }

  const downloadFile = async (dekont: DekontDetay) => {
    if (!dekont.dosya_url) return
    
    try {
      // Extract filename from URL (remove /uploads/dekontlar/ prefix)
      const filename = dekont.dosya_url.split('/').pop()
      if (!filename) {
        toast.error('Geçersiz dosya adı')
        return
      }
      
      const response = await fetch(`/api/admin/dekontlar/download/${filename}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${dekont.ogrenci_ad_soyad}_${aylar[dekont.ay - 1]}_${dekont.yil}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast.error('Dosya bulunamadı')
      }
    } catch (error) {
      toast.error('Dosya indirilemedi')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Öğrenci Bilgileri</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">İşletme & İletişim</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Dönem</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Tutar</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Durum</th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dekontlar.map(dekont => (
            <tr key={dekont.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-semibold text-gray-900">{dekont.ogrenci_ad_soyad}</span>
                  </div>
                  {dekont.ogrenci_sinif && (
                    <div className="text-sm text-gray-600">Sınıf: {dekont.ogrenci_sinif}</div>
                  )}
                  {dekont.ogrenci_no && (
                    <div className="text-sm text-gray-600">No: {dekont.ogrenci_no}</div>
                  )}
                  {dekont.ogrenci_alan && (
                    <div className="text-xs text-blue-700 font-medium">{dekont.ogrenci_alan}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{dekont.isletme_ad}</span>
                  </div>
                  {dekont.isletme_yetkili && (
                    <div className="text-sm text-gray-600">Yetkili: {dekont.isletme_yetkili}</div>
                  )}
                  {dekont.isletme_telefon && (
                    <div className="flex items-center text-sm text-blue-700">
                      <Phone className="h-3 w-3 mr-1" />
                      <a href={`tel:${dekont.isletme_telefon}`} className="hover:underline">
                        {dekont.isletme_telefon}
                      </a>
                    </div>
                  )}
                  {dekont.isletme_email && (
                    <div className="flex items-center text-sm text-blue-700">
                      <Mail className="h-3 w-3 mr-1" />
                      <a href={`mailto:${dekont.isletme_email}`} className="hover:underline">
                        {dekont.isletme_email}
                      </a>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {aylar[dekont.ay - 1]} {dekont.yil}
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                {dekont.miktar && (
                  <div className="text-sm font-medium text-gray-900">
                    ₺{dekont.miktar.toLocaleString('tr-TR')}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(dekont.onay_durumu)}`}>
                  {getStatusIcon(dekont.onay_durumu)}
                  <span className="ml-1">{getStatusText(dekont.onay_durumu)}</span>
                </span>
                {dekont.onay_durumu === 'reddedildi' && dekont.red_nedeni && (
                  <div className="mt-1 text-xs text-red-600 max-w-xs mx-auto">
                    {dekont.red_nedeni}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleViewDetail(dekont)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Detayları Görüntüle"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {dekont.dosya_url && (
                    <button
                      onClick={() => downloadFile(dekont)}
                      className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Dosyayı İndir"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}

                  {dekont.onay_durumu === 'bekliyor' && (
                    <>
                      <button
                        onClick={() => handleApprove(dekont)}
                        className="p-1 text-green-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Onayla"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(dekont)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Reddet"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(dekont)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detail Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Dekont Detayları">
        {selectedDekont && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Öğrenci Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Ad Soyad:</span> {selectedDekont.ogrenci_ad_soyad}</p>
                  {selectedDekont.ogrenci_sinif && <p><span className="font-medium">Sınıf:</span> {selectedDekont.ogrenci_sinif}</p>}
                  {selectedDekont.ogrenci_no && <p><span className="font-medium">No:</span> {selectedDekont.ogrenci_no}</p>}
                  {selectedDekont.ogrenci_alan && <p><span className="font-medium">Alan:</span> {selectedDekont.ogrenci_alan}</p>}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">İşletme Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">İşletme:</span> {selectedDekont.isletme_ad}</p>
                  {selectedDekont.isletme_yetkili && <p><span className="font-medium">Yetkili:</span> {selectedDekont.isletme_yetkili}</p>}
                  {selectedDekont.isletme_telefon && <p><span className="font-medium">Telefon:</span> {selectedDekont.isletme_telefon}</p>}
                  {selectedDekont.isletme_email && <p><span className="font-medium">E-posta:</span> {selectedDekont.isletme_email}</p>}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Dönem:</span> {aylar[selectedDekont.ay - 1]} {selectedDekont.yil}
                </div>
                {selectedDekont.miktar && (
                  <div>
                    <span className="font-medium">Tutar:</span> ₺{selectedDekont.miktar.toLocaleString('tr-TR')}
                  </div>
                )}
                <div className="flex items-center">
                  <span className="font-medium mr-2">Durum:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(selectedDekont.onay_durumu)}`}>
                    {getStatusIcon(selectedDekont.onay_durumu)}
                    <span className="ml-1">{getStatusText(selectedDekont.onay_durumu)}</span>
                  </span>
                </div>
              </div>
            </div>

            {selectedDekont.red_nedeni && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="font-medium text-red-800 mb-1">Red Nedeni:</h5>
                <p className="text-sm text-red-700">{selectedDekont.red_nedeni}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={submitApprove}
        title="Dekont Onaylama"
        description={selectedDekont ? `${selectedDekont.ogrenci_ad_soyad} öğrencisinin ${aylar[selectedDekont.ay - 1]} ${selectedDekont.yil} ayına ait dekontunu onaylıyor musunuz?` : ''}
        confirmText="Onayla"
        isLoading={loading}
      />

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Dekont Reddetme">
        <div className="space-y-4">
          {selectedDekont && (
            <p className="text-sm text-gray-600">
              <strong>{selectedDekont.ogrenci_ad_soyad}</strong> öğrencisinin <strong>{aylar[selectedDekont.ay - 1]} {selectedDekont.yil}</strong> ayına ait dekontunu reddediyorsunuz.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Red Nedeni</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="Red nedenini açıklayın..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              İptal
            </button>
            <button
              onClick={submitReject}
              disabled={!rejectReason.trim() || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'İşleniyor...' : 'Reddet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Dekont Silme">
        {selectedDekont && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Dikkat: Kalıcı Veri Kaybı!</h4>
                  <p className="text-sm text-red-700 mb-2">
                    Bu işlem <strong>geri alınamaz</strong> ve aşağıdaki verilerin <strong>kalıcı olarak kaybına</strong> neden olacaktır:
                  </p>
                  <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
                    <li>Dekont kaydı ve tüm bilgileri</li>
                    <li>Yüklenen dosya (PDF/resim)</li>
                    <li>Onay/red geçmişi</li>
                    <li>Ödeme kayıtları</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Silinecek Dekont Bilgileri:</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Öğrenci:</strong> {selectedDekont.ogrenci_ad_soyad}</p>
                <p><strong>Dönem:</strong> {aylar[selectedDekont.ay - 1]} {selectedDekont.yil}</p>
                <p><strong>İşletme:</strong> {selectedDekont.isletme_ad}</p>
                {selectedDekont.miktar && <p><strong>Tutar:</strong> ₺{selectedDekont.miktar.toLocaleString('tr-TR')}</p>}
                <p><strong>Durum:</strong> {getStatusText(selectedDekont.onay_durumu)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bu işlemi onaylamak için "<strong>SİL</strong>" yazın:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="SİL"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                İptal
              </button>
              <button
                onClick={submitDelete}
                disabled={deleteConfirmText !== 'SİL' || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}