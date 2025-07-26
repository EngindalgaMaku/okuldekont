'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, School, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from 'react-hot-toast'

interface HaftalikProgram {
  pazartesi: 'okul' | 'isletme' | 'bos'
  sali: 'okul' | 'isletme' | 'bos'
  carsamba: 'okul' | 'isletme' | 'bos'
  persembe: 'okul' | 'isletme' | 'bos'
  cuma: 'okul' | 'isletme' | 'bos'
}

interface Sinif {
  id: string
  ad: string
  dal?: string | null
  ogrenci_sayisi?: number
  alan_id: string
  isletme_gunleri?: string | null
  okul_gunleri?: string | null
  haftalik_program?: HaftalikProgram | null
}

interface Props {
  initialSiniflar: Sinif[]
  alanId: string
}

const HaftalikProgramBileseni = ({ program, onChange }: { program: HaftalikProgram, onChange: (yeniProgram: HaftalikProgram) => void }) => {
  const gunler = [
    { key: 'pazartesi', label: 'Pzt' }, { key: 'sali', label: 'Sal' }, { key: 'carsamba', label: 'Çar' }, { key: 'persembe', label: 'Per' }, { key: 'cuma', label: 'Cum' }
  ] as const;

  const sonrakiDurum = (durum: 'okul' | 'isletme' | 'bos'): 'okul' | 'isletme' | 'bos' => {
    if (durum === 'bos') return 'okul';
    if (durum === 'okul') return 'isletme';
    return 'bos';
  };

  const durumRengi = (durum: string) => {
    if (durum === 'okul') return 'bg-blue-100 text-blue-800';
    if (durum === 'isletme') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-600';
  };

  const handleGunClick = (gunKey: keyof HaftalikProgram) => {
    const yeniProgram = { ...program, [gunKey]: sonrakiDurum(program[gunKey]) };
    onChange(yeniProgram);
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {gunler.map(({ key, label }) => (
        <div key={key} className="text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
          <button type="button" onClick={() => handleGunClick(key)} className={`w-full p-2 rounded-md border ${durumRengi(program[key])} hover:opacity-80`}>
            <div className="font-bold">{program[key].charAt(0).toUpperCase()}</div>
          </button>
        </div>
      ))}
    </div>
  );
};

export default function SiniflarTab({ initialSiniflar, alanId }: Props) {
  const router = useRouter();
  
  const [sinifModalOpen, setSinifModalOpen] = useState(false);
  const [editSinifModal, setEditSinifModal] = useState(false);
  const [deleteSinifModal, setDeleteSinifModal] = useState(false);
  const [selectedSinif, setSelectedSinif] = useState<Sinif | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const initialFormState = { ad: '', dal: '', haftalik_program: { pazartesi: 'bos', sali: 'bos', carsamba: 'bos', persembe: 'bos', cuma: 'bos' } as HaftalikProgram };
  const [sinifFormData, setSinifFormData] = useState(initialFormState);
  const [editSinifFormData, setEditSinifFormData] = useState(initialFormState);
  const [countdown, setCountdown] = useState(0);

  // Countdown useEffect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        const newCountdown = countdown - 1;
        setCountdown(newCountdown);
        
        // Countdown bitti, modal'ı kapat
        if (newCountdown === 0) {
          setTimeout(() => {
            setEditSinifModal(false);
            setSelectedSinif(null);
            window.location.reload();
          }, 100);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSinifEkle = async () => {
    if (!sinifFormData.ad.trim()) { return toast.error('Sınıf adı gereklidir!'); }
    setSubmitLoading(true);
    try {
      const response = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sinifFormData.ad.trim(),
          alanId: alanId,
          dal: sinifFormData.dal.trim() || null,
          haftalik_program: sinifFormData.haftalik_program
        })
      });
      
      if (!response.ok) {
        throw new Error('Sınıf eklenirken bir hata oluştu');
      }
      
      toast.success('Sınıf başarıyla eklendi.');
      setSinifModalOpen(false);
      setSinifFormData(initialFormState);
      router.refresh();
    } catch (error: any) {
      toast.error(`Sınıf eklenirken hata: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSinifDuzenle = (sinif: Sinif) => {
    // Check for alternative id fields or use ad as fallback
    const identifier = sinif.id || (sinif as any).uuid || (sinif as any).sinif_id || sinif.ad;
    
    if (!sinif || !identifier) {
      toast.error('Sınıf bilgisi eksik. Lütfen sayfayı yenileyin.');
      return;
    }
    
    // Create a temporary ID-like object for compatibility
    const sinifWithId = {
      ...sinif,
      id: identifier,
      _useAdAsId: !sinif.id // Flag to know we're using ad as id
    };
    
    // Reset countdown when opening modal
    setCountdown(0);
    setSelectedSinif(sinifWithId);
    setEditSinifFormData({
      ad: sinif.ad || '',
      dal: sinif.dal || '',
      haftalik_program: sinif.haftalik_program || initialFormState.haftalik_program
    });
    setEditSinifModal(true);
  };

  const handleSinifGuncelle = async () => {
    if (!selectedSinif || !selectedSinif.id) {
      toast.error('Sınıf bilgisi bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }
    
    if (!editSinifFormData.ad.trim()) {
      toast.error('Sınıf adı boş olamaz!');
      return;
    }
    
    setSubmitLoading(true);
    try {
      const response = await fetch(`/api/admin/classes/${selectedSinif.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editSinifFormData.ad.trim(),
          dal: editSinifFormData.dal.trim() || null,
          haftalik_program: editSinifFormData.haftalik_program
        })
      });
      
      if (!response.ok) {
        throw new Error('Sınıf güncellenirken bir hata oluştu');
      }
      
      toast.success('Sınıf başarıyla güncellendi.');
      
      // 3 saniye geri sayım başlat
      setCountdown(3);
    } catch (error: any) {
      toast.error(`Sınıf güncellenirken hata: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSinifSilOnayla = async () => {
    if (!selectedSinif || !selectedSinif.id) {
      toast.error('Sınıf bilgisi bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }
    
    setSubmitLoading(true);
    try {
      const response = await fetch(`/api/admin/classes/${selectedSinif.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Sınıf silinirken bir hata oluştu');
      }
      
      toast.success('Sınıf başarıyla silindi.');
      setDeleteSinifModal(false);
      setSelectedSinif(null);
      router.refresh();
    } catch (error: any) {
      toast.error(`Sınıf silinirken hata: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Sınıflar</h2>
        <button onClick={() => { setSinifFormData(initialFormState); setSinifModalOpen(true); }} className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl" title="Yeni Sınıf Ekle"><Plus className="h-5 w-5" /></button>
      </div>

      {initialSiniflar.length > 0 ? (
        <div className="space-y-4">
          {initialSiniflar.map((sinif, index) => (
            <div key={sinif.id || `sinif-${index}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 text-left"><div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3"><School className="h-5 w-5 text-indigo-600" /></div><div><h3 className="font-semibold text-gray-900">{sinif.ad}</h3><p className="text-sm text-gray-500">{sinif.ogrenci_sayisi || 0} öğrenci</p>{sinif.dal && (<p className="text-xs text-indigo-600 font-medium">{sinif.dal}</p>)}</div></div>
                <button onClick={() => handleSinifDuzenle(sinif)} className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg" title="Sınıfı Düzenle"><Edit className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12"><School className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Henüz sınıf yok</h3><p className="mt-1 text-sm text-gray-500">Bu alan için henüz sınıf eklenmemiş.</p></div>
      )}

      <Modal isOpen={sinifModalOpen} onClose={() => setSinifModalOpen(false)} title="Yeni Sınıf Ekle">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Sınıf Adı</label><input type="text" value={sinifFormData.ad} onChange={(e) => setSinifFormData({ ...sinifFormData, ad: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Dal (İsteğe Bağlı)</label><input type="text" value={sinifFormData.dal} onChange={(e) => setSinifFormData({ ...sinifFormData, dal: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Haftalık Program</label><HaftalikProgramBileseni program={sinifFormData.haftalik_program} onChange={(p) => setSinifFormData({...sinifFormData, haftalik_program: p})} /></div>
          <div className="flex justify-end space-x-3 pt-4 border-t"><button onClick={() => setSinifModalOpen(false)} className="px-4 py-2 rounded-md border">İptal</button><button onClick={handleSinifEkle} disabled={submitLoading} className="px-4 py-2 text-white bg-indigo-600 rounded-md disabled:opacity-50">{submitLoading ? 'Ekleniyor...' : 'Ekle'}</button></div>
        </div>
      </Modal>

      {editSinifModal && selectedSinif && (
        <Modal isOpen={editSinifModal} onClose={() => setEditSinifModal(false)} title="Sınıfı Düzenle">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sınıf Adı</label><input type="text" value={editSinifFormData.ad} onChange={(e) => setEditSinifFormData({ ...editSinifFormData, ad: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dal (İsteğe Bağlı)</label><input type="text" value={editSinifFormData.dal || ''} onChange={(e) => setEditSinifFormData({ ...editSinifFormData, dal: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Haftalık Program</label><HaftalikProgramBileseni program={editSinifFormData.haftalik_program} onChange={(p) => setEditSinifFormData({...editSinifFormData, haftalik_program: p})} /></div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => { setEditSinifModal(false); setDeleteSinifModal(true); }} disabled={countdown > 0} className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 className="h-4 w-4 mr-2" />Sil</button>
              <div className="flex space-x-3">
                <button onClick={() => setEditSinifModal(false)} disabled={submitLoading || countdown > 0} className="px-4 py-2 rounded-md border disabled:opacity-50">İptal</button>
                <button onClick={handleSinifGuncelle} disabled={submitLoading || countdown > 0} className="px-4 py-2 text-white bg-indigo-600 rounded-md disabled:opacity-50">{submitLoading ? 'Güncelleniyor...' : 'Güncelle'}</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmModal 
        isOpen={deleteSinifModal} 
        onClose={() => setDeleteSinifModal(false)} 
        onConfirm={handleSinifSilOnayla} 
        title="Sınıfı Sil" 
        description={`"${selectedSinif?.ad || 'Seçili sınıf'}" adlı sınıfı kalıcı olarak silmek istediğinizden emin misiniz?`} 
        isLoading={submitLoading} 
      />
    </div>
  )
}