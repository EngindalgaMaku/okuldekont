'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Edit, Trash2, Search, Phone, Mail, MapPin, Users, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface IsletmeStaj {
  id: string
  student: {
    id: string
    name: string
    surname: string
    className: string
  }
}

interface Isletme {
  id: string
  ad: string
  yetkili: string
  telefon?: string
  email?: string
  adres?: string
  stajlar?: IsletmeStaj[]
}

interface Props {
  alanId: string
  initialIsletmeListesi: Isletme[]
}

export default function IsletmelerTab({ alanId, initialIsletmeListesi }: Props) {
  const router = useRouter()
  
  // State management
  const [isletmeler, setIsletmeler] = useState<Isletme[]>(initialIsletmeListesi)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [isletmeModalOpen, setIsletmeModalOpen] = useState(false)
  const [editIsletmeModal, setEditIsletmeModal] = useState(false)
  const [deleteIsletmeModal, setDeleteIsletmeModal] = useState(false)
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredIsletmeler, setFilteredIsletmeler] = useState<Isletme[]>(initialIsletmeListesi)
  
  // Form data
  const initialFormState = { 
    ad: '', 
    yetkili: '', 
    telefon: '', 
    email: '', 
    adres: '' 
  }
  const [isletmeFormData, setIsletmeFormData] = useState(initialFormState)
  const [editIsletmeFormData, setEditIsletmeFormData] = useState(initialFormState)

  // Fetch companies for this field
  const fetchIsletmeler = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/companies?alanId=${alanId}`)
      if (!response.ok) throw new Error('İşletmeler getirilemedi')
      
      const data = await response.json()
      setIsletmeler(data || [])
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Filter companies based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredIsletmeler(isletmeler)
    } else {
      const filtered = isletmeler.filter(isletme =>
        isletme.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        isletme.yetkili.toLowerCase().includes(searchTerm.toLowerCase()) ||
        isletme.telefon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        isletme.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredIsletmeler(filtered)
    }
  }, [searchTerm, isletmeler])

  // Add company
  const handleIsletmeEkle = async () => {
    if (!isletmeFormData.ad.trim() || !isletmeFormData.yetkili.trim()) {
      toast.error('İşletme adı ve yetkili kişi alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isletmeFormData.ad.trim(),
          contact: isletmeFormData.yetkili.trim(),
          phone: isletmeFormData.telefon.trim() || null,
          email: isletmeFormData.email.trim() || null,
          address: isletmeFormData.adres.trim() || null
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'İşletme eklenirken hata oluştu')
      }
      
      toast.success('İşletme başarıyla eklendi!')
      setIsletmeModalOpen(false)
      setIsletmeFormData(initialFormState)
      fetchIsletmeler()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Edit company
  const handleIsletmeDuzenle = (isletme: Isletme) => {
    setSelectedIsletme(isletme)
    setEditIsletmeFormData({
      ad: isletme.ad,
      yetkili: isletme.yetkili,
      telefon: isletme.telefon || '',
      email: isletme.email || '',
      adres: isletme.adres || ''
    })
    setEditIsletmeModal(true)
  }

  const handleIsletmeGuncelle = async () => {
    if (!selectedIsletme || !editIsletmeFormData.ad.trim() || !editIsletmeFormData.yetkili.trim()) {
      toast.error('İşletme adı ve yetkili kişi alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/companies?id=${selectedIsletme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editIsletmeFormData.ad.trim(),
          contact: editIsletmeFormData.yetkili.trim(),
          phone: editIsletmeFormData.telefon.trim() || null,
          email: editIsletmeFormData.email.trim() || null,
          address: editIsletmeFormData.adres.trim() || null
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'İşletme güncellenirken hata oluştu')
      }
      
      toast.success('İşletme başarıyla güncellendi!')
      setEditIsletmeModal(false)
      setSelectedIsletme(null)
      fetchIsletmeler()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete company
  const handleIsletmeSil = (isletme: Isletme) => {
    setSelectedIsletme(isletme)
    setDeleteIsletmeModal(true)
  }

  const handleIsletmeSilOnayla = async () => {
    if (!selectedIsletme) return
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/companies?id=${selectedIsletme.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'İşletme silinirken hata oluştu')
      }
      
      toast.success('İşletme başarıyla silindi!')
      setDeleteIsletmeModal(false)
      setSelectedIsletme(null)
      fetchIsletmeler()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          İşletmeler ({filteredIsletmeler.length})
        </h2>
        <button
          onClick={() => {
            setIsletmeFormData(initialFormState)
            setIsletmeModalOpen(true)
          }}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni İşletme Ekle
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="İşletme, yetkili kişi, telefon veya e-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Company List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      ) : filteredIsletmeler.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredIsletmeler.map((isletme) => (
            <div key={isletme.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {isletme.ad}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Yetkili: {isletme.yetkili}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleIsletmeDuzenle(isletme)}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="İşletmeyi Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleIsletmeSil(isletme)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="İşletmeyi Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 mb-4">
                {isletme.telefon && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{isletme.telefon}</span>
                  </div>
                )}
                {isletme.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{isletme.email}</span>
                  </div>
                )}
                {isletme.adres && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{isletme.adres}</span>
                  </div>
                )}
              </div>

              {/* Student Count */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2 text-gray-400" />
                  <span>
                    {isletme.stajlar?.length || 0} öğrenci staj yapıyor
                  </span>
                </div>
                <Link
                  href={`/admin/isletmeler/${isletme.id}`}
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Detaylar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {/* Student List Preview */}
              {isletme.stajlar && isletme.stajlar.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Stajyer Öğrenciler:</p>
                  <div className="flex flex-wrap gap-1">
                    {isletme.stajlar.slice(0, 3).map((staj) => (
                      <span
                        key={staj.id}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700"
                      >
                        {staj.student.name} {staj.student.surname}
                      </span>
                    ))}
                    {isletme.stajlar.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        +{isletme.stajlar.length - 3} diğer
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">İşletme bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Arama kriterlerinize uygun işletme bulunamadı.'
              : 'Bu alan için henüz stajyer öğrenci olan işletme bulunmuyor.'
            }
          </p>
        </div>
      )}

      {/* Add Company Modal */}
      <Modal isOpen={isletmeModalOpen} onClose={() => setIsletmeModalOpen(false)} title="Yeni İşletme Ekle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İşletme Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={isletmeFormData.ad}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="İşletme adını girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yetkili Kişi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={isletmeFormData.yetkili}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, yetkili: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Yetkili kişi adını girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={isletmeFormData.telefon}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, telefon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Telefon numarası"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={isletmeFormData.email}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="E-posta adresi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
            <textarea
              value={isletmeFormData.adres}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, adres: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="İşletme adresi"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setIsletmeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleIsletmeEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Company Modal */}
      {editIsletmeModal && selectedIsletme && (
        <Modal isOpen={editIsletmeModal} onClose={() => setEditIsletmeModal(false)} title="İşletmeyi Düzenle">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İşletme Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editIsletmeFormData.ad}
                onChange={(e) => setEditIsletmeFormData({ ...editIsletmeFormData, ad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yetkili Kişi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editIsletmeFormData.yetkili}
                onChange={(e) => setEditIsletmeFormData({ ...editIsletmeFormData, yetkili: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={editIsletmeFormData.telefon}
                onChange={(e) => setEditIsletmeFormData({ ...editIsletmeFormData, telefon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={editIsletmeFormData.email}
                onChange={(e) => setEditIsletmeFormData({ ...editIsletmeFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <textarea
                value={editIsletmeFormData.adres}
                onChange={(e) => setEditIsletmeFormData({ ...editIsletmeFormData, adres: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setEditIsletmeModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleIsletmeGuncelle}
                disabled={submitLoading}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteIsletmeModal}
        onClose={() => setDeleteIsletmeModal(false)}
        onConfirm={handleIsletmeSilOnayla}
        title="İşletmeyi Sil"
        description={`"${selectedIsletme?.ad}" adlı işletmeyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        isLoading={submitLoading}
      />
    </div>
  )
}