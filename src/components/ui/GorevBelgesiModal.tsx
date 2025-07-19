'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, X, Calendar, Building2, User, BookOpen } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'
import { getISOWeek } from 'date-fns'

interface Isletme {
  id: string
  ad: string
}

interface Ogretmen {
   id: string;
   ad: string;
   soyad: string;
}

interface Alan {
   id: string;
   ad: string;
   name?: string;
}

interface GorevBelgesiModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GorevBelgesiModal({
  isOpen,
  onClose,
}: GorevBelgesiModalProps) {
  const [allAlanlar, setAllAlanlar] = useState<Alan[]>([])
  const [displayAlanlar, setDisplayAlanlar] = useState<Alan[]>([])
  const [selectedAlanAd, setSelectedAlanAd] = useState<string>('')
  const [alanTeachers, setAlanTeachers] = useState<Ogretmen[]>([])
  const [selectedOgretmenId, setSelectedOgretmenId] = useState<string>('')
  const [teacherIsletmeler, setTeacherIsletmeler] = useState<Isletme[]>([])
  const [selectedWeek, setSelectedWeek] = useState('')
  const [selectedIsletmeler, setSelectedIsletmeler] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOverwriteConfirmOpen, setIsOverwriteConfirmOpen] = useState(false)

  // Set default week on mount
  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const week = getISOWeek(today)
    setSelectedWeek(`${year}-W${week.toString().padStart(2, '0')}`)
  }, [])

  // Fetch all alanlar when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchAlanlar = async () => {
        setIsLoading(true)
        try {
          const response = await fetch('/api/admin/fields')
          if (response.ok) {
            const data = await response.json()
            const mappedFields = data.fields.map((field: any) => ({
              id: field.id,
              ad: field.name,
              name: field.name
            }))
            setAllAlanlar(mappedFields)
            const uniqueAlanlar = Array.from(new Map(mappedFields.map((alan: Alan) => [alan.name, alan])).values()) as Alan[]
            setDisplayAlanlar(uniqueAlanlar)
          }
        } catch (error) {
          console.error('Alanlar yüklenirken hata:', error)
        }
        setIsLoading(false)
      }
      fetchAlanlar()
    } else {
       // Reset state on close
       setAllAlanlar([])
       setDisplayAlanlar([])
       setSelectedAlanAd('')
       setAlanTeachers([])
       setSelectedOgretmenId('')
       setTeacherIsletmeler([])
       setSelectedIsletmeler([])
    }
  }, [isOpen])

  // Fetch teachers for the selected alan
  useEffect(() => {
    if (selectedAlanAd) {
      const fetchTeachers = async () => {
        setIsLoading(true)
        setAlanTeachers([])
        setSelectedOgretmenId('')
        
        const alanIds = allAlanlar
          .filter((alan: Alan) => alan.name === selectedAlanAd)
          .map((alan: Alan) => alan.id);

        if (alanIds.length > 0) {
          try {
            const response = await fetch(`/api/admin/fields/teachers?fieldIds=${alanIds.join(',')}`)
            if (response.ok) {
              const data = await response.json()
              setAlanTeachers(data.teachers.map((teacher: any) => ({
                id: teacher.id,
                ad: teacher.name,
                soyad: teacher.surname
              })))
            }
          } catch (error) {
            console.error('Öğretmenler yüklenirken hata:', error)
          }
        }
        setIsLoading(false)
      }
      fetchTeachers()
    } else {
      setAlanTeachers([])
      setSelectedOgretmenId('')
    }
  }, [selectedAlanAd, allAlanlar])

  // Fetch businesses for the selected teacher
  useEffect(() => {
    if (selectedOgretmenId) {
      const fetchTeacherData = async () => {
        setIsLoading(true);
        setTeacherIsletmeler([]);
        setSelectedIsletmeler([]);

        try {
          const response = await fetch(`/api/admin/teachers/${selectedOgretmenId}/companies`)
          if (response.ok) {
            const data = await response.json()
            setTeacherIsletmeler(data.companies);
            setSelectedIsletmeler(data.companies.map((i: any) => i.id));
          } else {
            toast.error("Öğretmenin işletme bilgileri alınamadı.");
          }
        } catch (error) {
          console.error("Öğretmenin işletme bilgileri çekilirken hata:", error);
          toast.error("Öğretmenin işletme bilgileri alınamadı.");
        }

        setIsLoading(false);
      };
      fetchTeacherData();
    } else {
      setTeacherIsletmeler([]);
      setSelectedIsletmeler([]);
    }
  }, [selectedOgretmenId])

  const handleIsletmeToggle = (isletmeId: string) => {
    setSelectedIsletmeler(prev =>
      prev.includes(isletmeId) ? prev.filter(id => id !== isletmeId) : [...prev, isletmeId]
    )
  }

  const executePrint = async (overwrite = false) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/gorev-belgesi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ogretmen_id: selectedOgretmenId,
          hafta: selectedWeek,
          isletme_idler: selectedIsletmeler,
          overwrite: overwrite,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Bilinmeyen bir hata oluştu.');
      }

      const printUrl = `/admin/gorev-belgesi/yazdir/${result.id}`;
      window.open(printUrl, '_blank');
      onClose();

      toast("Yeni görev belgesi için kayıt oluşturuldu. Eğer bu belgeyi kullanmayacaksanız, lütfen Görev Takip sayfasından ilgili kaydı silin.", {
        duration: 6000,
        icon: 'ℹ️',
      });

    } catch (error: any) {
      console.error("Görev belgesi oluşturulurken hata:", error);
      toast.error(`Bir hata oluştu: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setIsOverwriteConfirmOpen(false);
    }
  }

  const handlePrint = async () => {
    if (!selectedOgretmenId) {
       toast.error("Lütfen bir öğretmen seçin.");
       return;
    }
    if (selectedIsletmeler.length === 0) {
        toast.error("Lütfen en az bir işletme seçin.");
        return;
    }
    
    try {
      const response = await fetch(`/api/admin/gorev-belgesi?teacherId=${selectedOgretmenId}&week=${selectedWeek}`)
      if (response.ok) {
        const data = await response.json()
        if (data.documents && data.documents.length > 0) {
          setIsOverwriteConfirmOpen(true);
        } else {
          executePrint(false);
        }
      } else {
        toast.error("Mevcut belge kontrol edilirken hata oluştu.");
      }
    } catch (error) {
      console.error("Mevcut belge kontrol hatası:", error);
      toast.error("Mevcut belge kontrol edilirken hata oluştu.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Haftalık Görev Belgesi Oluştur">
       <ConfirmModal
           isOpen={isOverwriteConfirmOpen}
           onClose={() => setIsOverwriteConfirmOpen(false)}
           onConfirm={() => executePrint(true)}
           title="Mevcut Belgeyi Geçersiz Kıl"
           description="Bu öğretmen için bu haftaya ait bir görev belgesi zaten mevcut. Yeni bir belge oluşturmak eskisini 'İptal Edildi' olarak işaretleyecektir. Devam etmek istiyor musunuz?"
           confirmText="Evet, Devam Et"
           isLoading={isProcessing}
       />
      <div className="space-y-6">
        
        <div>
           <label htmlFor="alan-select" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
               <BookOpen className="h-4 w-4 mr-2" />
               Alan Seçin
           </label>
           <select
               id="alan-select"
               value={selectedAlanAd}
               onChange={(e) => setSelectedAlanAd(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
               disabled={isLoading}
           >
               <option value="">-- Alan Seçiniz --</option>
               {displayAlanlar.map((alan: Alan) => (
                   <option key={alan.id} value={alan.name}>{alan.name}</option>
               ))}
           </select>
        </div>

        <div className={!selectedAlanAd ? 'opacity-50' : ''}>
           <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
               <User className="h-4 w-4 mr-2" />
               Öğretmen Seçin
           </label>
           <select
               id="teacher-select"
               value={selectedOgretmenId}
               onChange={(e) => setSelectedOgretmenId(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
               disabled={isLoading || !selectedAlanAd}
           >
               <option value="">-- Öğretmen Seçiniz --</option>
               {alanTeachers.map(teacher => (
                   <option key={teacher.id} value={teacher.id}>{teacher.ad} {teacher.soyad}</option>
               ))}
           </select>
        </div>

        <div>
          <label htmlFor="week-picker" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Görev Haftası Seçin
          </label>
          <input
            type="week"
            id="week-picker"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className={!selectedOgretmenId ? 'opacity-50' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Belgeye Dahil Edilecek İşletmeler
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                {isLoading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
                {!isLoading && teacherIsletmeler.length === 0 && <p className="text-sm text-gray-500">{selectedOgretmenId ? 'Bu öğretmene atanmış staj yeri bulunamadı.' : 'Lütfen önce bir alan ve öğretmen seçin.'}</p>}
                {teacherIsletmeler.map(isletme => (
                    <div key={isletme.id} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`isletme-${isletme.id}`}
                            checked={selectedIsletmeler.includes(isletme.id)}
                            onChange={() => handleIsletmeToggle(isletme.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor={`isletme-${isletme.id}`} className="ml-3 block text-sm text-gray-800">
                            {isletme.ad}
                        </label>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <X className="h-4 w-4 mr-2" />
            İptal
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedOgretmenId || selectedIsletmeler.length === 0 || isProcessing || isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing || isLoading ? (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
               <Printer className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'İşleniyor...' : isLoading ? 'Veri Yükleniyor...' : 'Yazdırma Sayfasını Aç'}
          </button>
        </div>
      </div>
    </Modal>
  )
}