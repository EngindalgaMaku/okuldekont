'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Users, Building, GraduationCap,
  Monitor, Calculator, Heart, Globe, Sprout, Settings,
  Car, Wrench, Camera, Palette, ChefHat, BookOpen,
  Zap, Hammer, Scissors, Stethoscope, MoreVertical,
  Edit, Eye, EyeOff, Trash2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Alan {
  id: string
  ad: string
  aciklama?: string
  aktif: boolean
  ogretmen_sayisi: number
  ogrenci_sayisi: number
  isletme_sayisi: number
}

// Alan ismine göre icon ve renk döndüren fonksiyon
const getAlanIconAndColor = (alanAd: string) => {
  const alanAdLower = alanAd.toLowerCase()
  
  if (alanAdLower.includes('bilişim') || alanAdLower.includes('bilgisayar') || alanAdLower.includes('yazılım')) {
    return {
      icon: Monitor,
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
      borderColor: 'border-blue-200'
    }
  }
  if (alanAdLower.includes('muhasebe') || alanAdLower.includes('finans') || alanAdLower.includes('ekonomi')) {
    return {
      icon: Calculator,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderColor: 'border-green-200'
    }
  }
  if (alanAdLower.includes('sağlık') || alanAdLower.includes('hemşire') || alanAdLower.includes('tıp')) {
    return {
      icon: Heart,
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
      borderColor: 'border-red-200'
    }
  }
  if (alanAdLower.includes('turizm') || alanAdLower.includes('otel') || alanAdLower.includes('muhasebe')) {
    return {
      icon: Globe,
      color: 'from-orange-500 to-yellow-600',
      bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
      borderColor: 'border-orange-200'
    }
  }
  if (alanAdLower.includes('tarım') || alanAdLower.includes('ziraat') || alanAdLower.includes('hayvancılık')) {
    return {
      icon: Sprout,
      color: 'from-lime-500 to-green-600',
      bgColor: 'bg-gradient-to-r from-lime-50 to-green-50',
      borderColor: 'border-lime-200'
    }
  }
  if (alanAdLower.includes('endüstri') || alanAdLower.includes('makine') || alanAdLower.includes('üretim')) {
    return {
      icon: Settings,
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50',
      borderColor: 'border-gray-200'
    }
  }
  if (alanAdLower.includes('otomotiv') || alanAdLower.includes('araç')) {
    return {
      icon: Car,
      color: 'from-indigo-500 to-blue-600',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-50',
      borderColor: 'border-indigo-200'
    }
  }
  if (alanAdLower.includes('radyo') || alanAdLower.includes('elektronik')) {
    return {
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200'
    }
  }
  if (alanAdLower.includes('inşaat') || alanAdLower.includes('yapı')) {
    return {
      icon: Hammer,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
      borderColor: 'border-amber-200'
    }
  }
  if (alanAdLower.includes('kuaför') || alanAdLower.includes('güzellik') || alanAdLower.includes('berber')) {
    return {
      icon: Scissors,
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50',
      borderColor: 'border-pink-200'
    }
  }
  if (alanAdLower.includes('aşçı') || alanAdLower.includes('yemek') || alanAdLower.includes('mutfak')) {
    return {
      icon: ChefHat,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-50',
      borderColor: 'border-orange-200'
    }
  }
  if (alanAdLower.includes('halk') || alanAdLower.includes('tasarım') || alanAdLower.includes('sanat')) {
    return {
      icon: Palette,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-gradient-to-r from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200'
    }
  }
  
  // Varsayılan
  return {
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-50',
    borderColor: 'border-slate-200'
  }
}

export default function AlanlarClient({ initialAlanlar }: { initialAlanlar: Alan[] }) {
  const router = useRouter()
  const [alanlar, setAlanlar] = useState<Alan[]>(initialAlanlar)
  const [loading, setLoading] = useState(false)
  const [selectedAlan, setSelectedAlan] = useState<Alan | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isToggleActiveModalOpen, setIsToggleActiveModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [editAlanName, setEditAlanName] = useState('')
  const [editAlanDescription, setEditAlanDescription] = useState('')
  const [editAlanActive, setEditAlanActive] = useState(true)

  const [newAlanName, setNewAlanName] = useState('')
  const [newAlanDescription, setNewAlanDescription] = useState('')
  const [newAlanActive, setNewAlanActive] = useState(true)

  const [deleteAlanId, setDeleteAlanId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const fetchAlanlar = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/alanlar')
      if (!response.ok) {
        throw new Error('Alanlar yüklenirken hata oluştu')
      }
      const data = await response.json()
      setAlanlar(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Alanlar güncellenirken bir hata oluştu.')
      console.error('Alanlar yüklenirken hata:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditAlan = async () => {
    if (!editAlanName.trim() || !selectedAlan) {
      toast.error('Alan adı boş olamaz.')
      return
    }

    try {
      const response = await fetch(`/api/admin/alanlar?id=${selectedAlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editAlanName.trim(),
          description: editAlanDescription.trim(),
          active: editAlanActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Alan güncellenirken hata oluştu')
      }

      toast.success('Alan başarıyla güncellendi.')
      setIsEditModalOpen(false)
      fetchAlanlar()
    } catch (err) {
      toast.error('Alan güncellenirken bir hata oluştu.')
      console.error('Alan güncellenirken hata:', err)
    }
  }

  const handleAddNewAlan = async () => {
    if (!newAlanName.trim()) {
      toast.error('Alan adı boş olamaz.')
      return
    }

    try {
      const response = await fetch('/api/admin/alanlar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAlanName.trim(),
          description: newAlanDescription.trim(),
          active: newAlanActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Alan eklenirken hata oluştu')
      }

      toast.success('Alan başarıyla eklendi.')
      setIsAddModalOpen(false)
      setNewAlanName('')
      setNewAlanDescription('')
      setNewAlanActive(true)
      fetchAlanlar() // Listeyi yenile
    } catch (err) {
      toast.error('Alan eklenirken bir hata oluştu.')
      console.error('Alan eklenirken hata:', err)
    }
  }

  const handleDeleteAlan = async () => {
    if (!deleteAlanId || deleteConfirmText !== 'SIL') return

    try {
      const response = await fetch(`/api/admin/alanlar?id=${deleteAlanId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Alan silinirken hata oluştu')
      }

      toast.success('Alan başarıyla silindi.')
      setIsDeleteModalOpen(false)
      setDeleteAlanId(null)
      setDeleteConfirmText('')
      fetchAlanlar()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Alan silinirken bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Alan silinirken hata:', err)
    }
  }

  const handleToggleActive = async () => {
    if (!selectedAlan) return

    try {
      const response = await fetch(`/api/admin/alanlar/${selectedAlan.id}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Alan aktiflik durumu değiştirilirken hata oluştu')
      }

      toast.success('Alan aktiflik durumu başarıyla değiştirildi.')
      setIsToggleActiveModalOpen(false)
      fetchAlanlar()
    } catch (err) {
      toast.error('Alan aktiflik durumu değiştirilirken bir hata oluştu.')
      console.error('Alan aktiflik durumu değiştirilirken hata:', err)
    }
  }

  const handleEditClick = (alan: Alan) => {
    setSelectedAlan(alan)
    setEditAlanName(alan.ad)
    setEditAlanDescription(alan.aciklama || '')
    setEditAlanActive(alan.aktif)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (alan: Alan) => {
    setSelectedAlan(alan)
    setDeleteAlanId(alan.id)
    setDeleteConfirmText('')
    setIsDeleteModalOpen(true)
  }

  const handleToggleActiveClick = (alan: Alan) => {
    setSelectedAlan(alan)
    setIsToggleActiveModalOpen(true)
  }

  const handleViewClick = (alan: Alan) => {
    router.push(`/admin/alanlar/${alan.id}`)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Alanlar güncelleniyor...</div>
  }

  if (alanlar.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz alan yok</h3>
          <p className="mt-2 text-gray-500">İlk meslek alanını oluşturmak için yeni alan ekleyin.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 inline-flex items-center p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" /> Yeni Alan Ekle
          </button>
        </div>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Yeni Meslek Alanı Ekle"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="newAlanName" className="block text-sm font-medium text-gray-700">Alan Adı</label>
              <input
                type="text"
                id="newAlanName"
                value={newAlanName}
                onChange={(e) => setNewAlanName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Örn: Bilişim Teknolojileri"
              />
            </div>
            <div>
              <label htmlFor="newAlanDescription" className="block text-sm font-medium text-gray-700">Açıklama</label>
              <textarea
                id="newAlanDescription"
                value={newAlanDescription}
                onChange={(e) => setNewAlanDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Alanla ilgili kısa bir açıklama"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newAlanActive"
                checked={newAlanActive}
                onChange={(e) => setNewAlanActive(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="newAlanActive" className="ml-2 block text-sm text-gray-900">Alan başlangıçta aktif olsun</label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddNewAlan}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meslek Alanları</h1>
          <p className="text-gray-600">Alan bazlı öğrenci, öğretmen ve staj yönetimi</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" /> Yeni Alan Ekle
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Tüm Alanlar ({alanlar?.length || 0})</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {alanlar.map((alan: Alan) => {
              const { icon: IconComponent, color } = getAlanIconAndColor(alan.ad)
              
              return (
                <div
                  key={alan.id}
                  className={`group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer ${!alan.aktif ? 'opacity-50 grayscale' : ''}`}
                  onClick={() => handleViewClick(alan)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${color} shadow-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      {!alan.aktif && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                          Pasif
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 mb-2">
                      {alan.ad}
                    </h3>
                    {alan.aciklama ? (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{alan.aciklama}</p>
                    ) : (
                      <p className="text-gray-400 text-sm mb-4 italic">Açıklama bulunmuyor</p>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <GraduationCap className="h-4 w-4" />
                          <span className="text-sm font-medium">Öğretmen</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{alan.ogretmen_sayisi}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Öğrenci</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{alan.ogrenci_sayisi}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building className="h-4 w-4" />
                          <span className="text-sm font-medium">İşletme</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{alan.isletme_sayisi}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditClick(alan)
                        }}
                        className="p-2 text-gray-600 hover:text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActiveClick(alan)
                        }}
                        className="p-2 text-gray-600 hover:text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                        title={alan.aktif ? 'Pasif Et' : 'Aktif Et'}
                      >
                        {alan.aktif ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(alan)
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Meslek Alanı Ekle"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="newAlanName" className="block text-sm font-medium text-gray-700">Alan Adı</label>
            <input
              type="text"
              id="newAlanName"
              value={newAlanName}
              onChange={(e) => setNewAlanName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Örn: Bilişim Teknolojileri"
            />
          </div>
          <div>
            <label htmlFor="newAlanDescription" className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea
              id="newAlanDescription"
              value={newAlanDescription}
              onChange={(e) => setNewAlanDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="Alanla ilgili kısa bir açıklama"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="newAlanActive"
              checked={newAlanActive}
              onChange={(e) => setNewAlanActive(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="newAlanActive" className="ml-2 block text-sm text-gray-900">Alan başlangıçta aktif olsun</label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleAddNewAlan}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Ekle
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Alanı Düzenle"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editAlanName" className="block text-sm font-medium text-gray-700">Alan Adı</label>
            <input
              type="text"
              id="editAlanName"
              value={editAlanName}
              onChange={(e) => setEditAlanName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label htmlFor="editAlanDescription" className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea
              id="editAlanDescription"
              value={editAlanDescription}
              onChange={(e) => setEditAlanDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="editAlanActive"
              checked={editAlanActive}
              onChange={(e) => setEditAlanActive(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="editAlanActive" className="ml-2 block text-sm text-gray-900">Alanı Aktif Et</label>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleEditAlan}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeleteConfirmText('')
        }}
        title="⚠️ Tehlikeli İşlem: Alanı Sil"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Bu işlem kalıcı veri kaybına neden olacaktır!
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>"{selectedAlan?.ad}"</strong> alanı tamamen silinecek</li>
                    <li>Bu alana bağlı tüm veriler kaybolacak</li>
                    <li>Bu işlem <strong>GERİ ALINAMAZ</strong></li>
                    <li>Alan silindikten sonra ilişkili veriler de silinecek</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Bu alanı gerçekten silmek istiyorsanız, aşağıdaki kutuya <strong className="text-red-600">"SIL"</strong> yazın:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SIL yazın"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeleteConfirmText('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleDeleteAlan}
              disabled={deleteConfirmText !== 'SIL'}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                deleteConfirmText === 'SIL'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Alanı Kalıcı Olarak Sil
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isToggleActiveModalOpen}
        onClose={() => setIsToggleActiveModalOpen(false)}
        onConfirm={handleToggleActive}
        title={selectedAlan?.aktif ? 'Alanı Pasif Et' : 'Alanı Aktif Et'}
        description={`"${selectedAlan?.ad}" adlı alanı ${selectedAlan?.aktif ? 'pasif' : 'aktif'} etmek istediğinize emin misiniz?`}
      />
    </div>
  )
}