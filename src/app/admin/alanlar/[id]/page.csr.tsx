'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User, Users, GraduationCap, Settings, Building2, ChevronRight, Edit, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import OgretmenlerTab from '@/components/admin/alan-detay/OgretmenlerTab'
import SiniflarTab from '@/components/admin/alan-detay/SiniflarTab'
import OgrencilerTab from '@/components/admin/alan-detay/OgrencilerTab'
import IsletmelerTab from '@/components/admin/alan-detay/IsletmelerTab'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

export const dynamic = 'force-dynamic'

interface Alan {
  id: string;
  ad: string;
  aciklama?: string;
  aktif: boolean;
}

const PAGE_SIZE = 15;

export default function AlanDetayPage() {
  const router = useRouter()
  const params = useParams()
  const alanId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alan, setAlan] = useState<Alan | null>(null)
  const [ogretmenler, setOgretmenler] = useState<any[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [isletmeListesi, setIsletmeListesi] = useState<any[]>([])
  const [ogrenciler, setOgrenciler] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOgrenciler, setTotalOgrenciler] = useState(0)
  const [activeTab, setActiveTab] = useState('ogretmenler')
  
  // Settings modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isToggleActiveModalOpen, setIsToggleActiveModalOpen] = useState(false)
  
  const [editAlanName, setEditAlanName] = useState('')
  const [editAlanDescription, setEditAlanDescription] = useState('')
  const [editAlanActive, setEditAlanActive] = useState(true)

  useEffect(() => {
    if (alanId) {
      fetchAlanData()
    }
  }, [alanId])

  useEffect(() => {
    // Get active tab from URL
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab') || 'ogretmenler'
    setActiveTab(tab)
  }, [])

  const fetchAlanData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const alanPromise = supabase.from('alanlar').select('*').eq('id', alanId).single()
      const ogretmenlerPromise = supabase.from('ogretmenler').select('*').eq('alan_id', alanId).order('ad')
      const siniflarPromise = supabase.from('siniflar').select('*').eq('alan_id', alanId).order('ad')
      const isletmelerPromise = supabase.rpc('get_isletmeler_for_alan', { p_alan_id: alanId })
      
      // Build a query for students
      let studentQuery = supabase
        .from('ogrenciler')
        .select('id, ad, soyad, no, sinif', { count: 'exact' })
        .eq('alan_id', alanId)
      
      const offset = (currentPage - 1) * PAGE_SIZE
      const studentPromise = studentQuery.range(offset, offset + PAGE_SIZE - 1).order('ad')

      const [
        { data: alanData, error: alanError },
        { data: ogretmenlerData, error: ogretmenlerError },
        { data: siniflarData, error: siniflarError },
        { data: isletmeListesiData, error: isletmeError },
        { data: ogrencilerData, error: ogrencilerError, count: totalOgrencilerCount }
      ] = await Promise.all([
        alanPromise,
        ogretmenlerPromise,
        siniflarPromise,
        isletmelerPromise,
        studentPromise
      ])

      if (alanError) {
        setError('Alan bulunamadı')
        console.error('Error fetching alan:', alanError)
        return
      }

      // Handle other errors gracefully
      if (ogretmenlerError) console.error('Error fetching ogretmenler:', ogretmenlerError)
      if (siniflarError) console.error('Error fetching siniflar:', siniflarError)
      if (isletmeError) console.error('Error fetching isletmeler:', isletmeError)
      if (ogrencilerError) console.error('Error fetching ogrenciler:', ogrencilerError)

      // Her sınıf için öğrenci sayısını hesaplayayım
      const siniflarWithCounts = await Promise.all(
        (siniflarData || []).map(async (sinif) => {
          const { count } = await supabase
            .from('ogrenciler')
            .select('*', { count: 'exact' })
            .eq('alan_id', alanId)
            .eq('sinif', sinif.ad)
          
          return {
            ...sinif,
            ogrenci_sayisi: count || 0
          }
        })
      )

      setAlan(alanData)
      setOgretmenler(ogretmenlerData || [])
      setSiniflar(siniflarWithCounts)
      setIsletmeListesi(isletmeListesiData || [])
      setOgrenciler(ogrencilerData || [])
      setTotalOgrenciler(totalOgrencilerCount || 0)
      setTotalPages(Math.ceil((totalOgrencilerCount || 0) / PAGE_SIZE))
      setCurrentPage(Math.max(1, Math.min(currentPage, Math.ceil((totalOgrencilerCount || 0) / PAGE_SIZE))))

    } catch (err) {
      setError('Veri yüklenirken bir hata oluştu')
      console.error('Error fetching alan data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditAlan = async () => {
    console.log('handleEditAlan (detay sayfası) fonksiyonu çağrıldı')
    console.log('editAlanName:', editAlanName)
    console.log('alan:', alan)
    
    if (!editAlanName.trim() || !alan) {
      console.log('Validation failed:', { editAlanName, alan })
      toast.error('Alan adı boş olamaz.')
      return
    }

    try {
      console.log('Supabase client oluşturuluyor...')
      const supabase = createClient()
      console.log('Veritabanı güncelleme isteği gönderiliyor...')
      
      const { error } = await supabase
        .from('alanlar')
        .update({
          ad: editAlanName.trim(),
          aciklama: editAlanDescription.trim() || null,
          aktif: editAlanActive,
        })
        .eq('id', alan.id)

      console.log('Veritabanı yanıtı:', { error })

      if (error) {
        console.error('Veritabanı hatası:', error)
        toast.error('Alan güncellenirken bir hata oluştu.')
        return
      }

      console.log('Başarılı güncelleme, local state güncelleniyor...')
      setAlan({ ...alan, ad: editAlanName.trim(), aciklama: editAlanDescription.trim(), aktif: editAlanActive })
      toast.success('Alan başarıyla güncellendi.')
      setIsEditModalOpen(false)
    } catch (err) {
      console.error('Catch bloğu hatası:', err)
      toast.error('Alan güncellenirken bir hata oluştu.')
    }
  }

  const handleDeleteAlan = async () => {
    if (!alan) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('alanlar')
        .delete()
        .eq('id', alan.id)

      if (error) {
        toast.error('Alan silinirken bir hata oluştu.')
        console.error('Alan silinirken hata:', error)
        return
      }

      toast.success('Alan başarıyla silindi.')
      router.push('/admin/alanlar')
    } catch (err) {
      toast.error('Alan silinirken bir hata oluştu.')
      console.error('Alan silinirken hata:', err)
    }
  }

  const handleToggleActive = async () => {
    if (!alan) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('alanlar')
        .update({ aktif: !alan.aktif })
        .eq('id', alan.id)

      if (error) {
        toast.error('Alan aktiflik durumu değiştirilirken bir hata oluştu.')
        console.error('Alan aktiflik durumu değiştirilirken hata:', error)
        return
      }

      setAlan({ ...alan, aktif: !alan.aktif })
      toast.success('Alan aktiflik durumu başarıyla değiştirildi.')
      setIsToggleActiveModalOpen(false)
    } catch (err) {
      toast.error('Alan aktiflik durumu değiştirilirken bir hata oluştu.')
      console.error('Alan aktiflik durumu değiştirilirken hata:', err)
    }
  }

  const handleEditClick = () => {
    if (!alan) return
    setEditAlanName(alan.ad)
    setEditAlanDescription(alan.aciklama || '')
    setEditAlanActive(alan.aktif)
    setIsEditModalOpen(true)
    setIsSettingsModalOpen(false)
  }

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
    setIsSettingsModalOpen(false)
  }

  const handleToggleActiveClick = () => {
    setIsToggleActiveModalOpen(true)
    setIsSettingsModalOpen(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
  }

  if (error || !alan) {
    return <div className="text-center py-12 text-red-500">{error || 'Alan bulunamadı'}</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <nav className="flex items-center text-sm text-gray-600 mb-2">
              <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">Meslek Alanları</Link>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="text-gray-900">{alan.ad}</span>
            </nav>
            <h1 className="text-2xl font-semibold text-gray-900">{alan.ad}</h1>
          </div>
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="relative z-10 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" 
            title="Alan Ayarları"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <Link href={`/admin/alanlar/${alanId}?tab=ogretmenler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'ogretmenler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Users className="h-5 w-5" /> Öğretmenler ({ogretmenler.length})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=siniflar`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'siniflar' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <GraduationCap className="h-5 w-5" /> Sınıflar ({siniflar.length})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=ogrenciler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'ogrenciler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <User className="h-5 w-5" /> Öğrenciler ({totalOgrenciler})
              </Link>
              <Link href={`/admin/alanlar/${alanId}?tab=isletmeler`} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'isletmeler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Building2 className="h-5 w-5" /> İşletmeler ({isletmeListesi.length})
              </Link>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'ogretmenler' && <OgretmenlerTab ogretmenler={ogretmenler} />}
            {activeTab === 'siniflar' && <SiniflarTab alanId={alanId} initialSiniflar={siniflar} />}
            {activeTab === 'ogrenciler' && <OgrencilerTab initialOgrenciler={ogrenciler} siniflar={siniflar} alanId={alanId} currentPage={currentPage} totalPages={totalPages} totalOgrenciler={totalOgrenciler} />}
            {activeTab === 'isletmeler' && <IsletmelerTab alanId={alanId} initialIsletmeListesi={isletmeListesi} />}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Alan Ayarları"
        titleIcon={Settings}
      >
        <div className="space-y-3">
          <button
            onClick={handleEditClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit className="h-5 w-5 text-indigo-600" />
            <div>
              <div className="font-medium">Alan Bilgilerini Düzenle</div>
              <div className="text-sm text-gray-500">Ad, açıklama ve aktiflik durumunu güncelle</div>
            </div>
          </button>
          
          <button
            onClick={handleToggleActiveClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {alan.aktif ? <EyeOff className="h-5 w-5 text-yellow-600" /> : <Eye className="h-5 w-5 text-green-600" />}
            <div>
              <div className="font-medium">{alan.aktif ? 'Alanı Pasif Et' : 'Alanı Aktif Et'}</div>
              <div className="text-sm text-gray-500">
                {alan.aktif ? 'Bu alan artık görünmez olacak' : 'Bu alan tekrar görünür olacak'}
              </div>
            </div>
          </button>
          
          <button
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5 text-red-600" />
            <div>
              <div className="font-medium">Alanı Sil</div>
              <div className="text-sm text-red-500">Bu işlem geri alınamaz</div>
            </div>
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Alan Bilgilerini Düzenle"
        titleIcon={Edit}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editAlanName" className="block text-sm font-medium text-gray-700 mb-1">Alan Adı</label>
            <input
              type="text"
              id="editAlanName"
              value={editAlanName}
              onChange={(e) => setEditAlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Alan adını girin"
            />
          </div>
          
          <div>
            <label htmlFor="editAlanDescription" className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              id="editAlanDescription"
              value={editAlanDescription}
              onChange={(e) => setEditAlanDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Alan açıklamasını girin (isteğe bağlı)"
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
            <label htmlFor="editAlanActive" className="ml-2 block text-sm text-gray-900">
              Alan aktif durumda
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-300"
            >
              İptal
            </button>
            <button
              onClick={handleEditAlan}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAlan}
        title="Alanı Sil"
        description={
          <div className="space-y-2">
            <p><strong>"{alan.ad}"</strong> adlı alanı silmek istediğinize emin misiniz?</p>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Uyarı:</strong> Bu işlem geri alınamaz. Alan ile ilişkili tüm veriler silinecek.
              </p>
            </div>
          </div>
        }
        confirmText="Sil"
      />

      {/* Toggle Active Confirmation Modal */}
      <ConfirmModal
        isOpen={isToggleActiveModalOpen}
        onClose={() => setIsToggleActiveModalOpen(false)}
        onConfirm={handleToggleActive}
        title={alan.aktif ? 'Alanı Pasif Et' : 'Alanı Aktif Et'}
        description={`"${alan.ad}" adlı alanı ${alan.aktif ? 'pasif' : 'aktif'} etmek istediğinize emin misiniz?`}
        confirmText={alan.aktif ? 'Pasif Et' : 'Aktif Et'}
      />
    </div>
  )
}