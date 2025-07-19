'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Settings, ChevronRight, Edit, Trash2, EyeOff, Eye } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'react-hot-toast'

interface Alan {
  id: string;
  ad: string;
  aciklama?: string;
  aktif: boolean;
}

interface Props {
  alan: Alan;
}

export default function AlanDetayHeader({ alan }: Props) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isToggleActiveModalOpen, setIsToggleActiveModalOpen] = useState(false)

  const [editAlanName, setEditAlanName] = useState(alan.ad)
  const [editAlanDescription, setEditAlanDescription] = useState(alan.aciklama || '')
  
  const handleUpdate = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('alanlar')
      .update({ ad: editAlanName, aciklama: editAlanDescription })
      .eq('id', alan.id)

    if (error) {
      toast.error('Alan güncellenirken bir hata oluştu.')
    } else {
      toast.success('Alan başarıyla güncellendi.')
      setIsEditModalOpen(false)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    const supabase = createClient()
    const { error } = await supabase.from('alanlar').delete().eq('id', alan.id)
    if (error) {
      toast.error('Alan silinirken bir hata oluştu.')
    } else {
      toast.success('Alan başarıyla silindi.')
      router.push('/admin/alanlar')
    }
  }

  const handleToggleActive = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('alanlar')
      .update({ aktif: !alan.aktif })
      .eq('id', alan.id)
    
    if (error) {
      toast.error('Alan durumu güncellenirken bir hata oluştu.')
    } else {
      toast.success('Alan durumu başarıyla güncellendi.')
      setIsToggleActiveModalOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center text-sm text-gray-600 mb-2">
            <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
              Meslek Alanları
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-gray-900">{alan.ad}</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">{alan.ad}</h1>
        </div>
        <div className="relative">
            <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                title="Alan Ayarları"
            >
                <Settings className="h-5 w-5" />
            </button>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Alanı Düzenle">
        <div className="space-y-4">
          <div>
            <label htmlFor="editAlanName" className="block text-sm font-medium text-gray-700">Alan Adı</label>
            <input
              type="text"
              id="editAlanName"
              value={editAlanName}
              onChange={(e) => setEditAlanName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="editAlanDescription" className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea
              id="editAlanDescription"
              value={editAlanDescription}
              onChange={(e) => setEditAlanDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="flex justify-between pt-4 border-t">
            <div>
                <button onClick={() => {setIsEditModalOpen(false); setIsToggleActiveModalOpen(true)}} className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${alan.aktif ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {alan.aktif ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {alan.aktif ? 'Pasif Et' : 'Aktif Et'}
                </button>
                <button onClick={() => {setIsEditModalOpen(false); setIsDeleteModalOpen(true)}} className="ml-2 inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-md border">İptal</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Güncelle</button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Alanı Sil"
        description={`"${alan.ad}" adlı alanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />

      <ConfirmModal
        isOpen={isToggleActiveModalOpen}
        onClose={() => setIsToggleActiveModalOpen(false)}
        onConfirm={handleToggleActive}
        title={alan.aktif ? 'Alanı Pasif Et' : 'Alanı Aktif Et'}
        description={`"${alan.ad}" adlı alanı ${alan.aktif ? 'pasif' : 'aktif'} etmek istediğinize emin misiniz?`}
      />
    </>
  )
}