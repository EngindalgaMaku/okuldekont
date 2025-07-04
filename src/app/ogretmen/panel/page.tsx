'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, LogOut, Loader, User, Receipt, GraduationCap, CheckCircle, Clock, XCircle, Download, Plus, Upload, Trash2, Calendar, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import DekontUploadForm from '@/components/ui/DekontUpload'
import { DekontFormData } from '@/types/dekont'

// TypeScript Arayüzleri
interface Ogrenci {
  id: string;
  ad: string;
  soyad: string;
  no: string;
  sinif: string;
  alan: string;
  staj_id?: number;
}

interface Isletme {
  id: string;
  ad: string;
  ogrenciler: Ogrenci[];
  yukleyen_kisi: string;
}

interface Dekont {
  id: number;
  isletme_ad: string;
  ogrenci_ad: string;
  miktar: number | null;
  odeme_tarihi: string;
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
  ay: string;
  yil: number | string;
  dosya_url?: string;
  aciklama?: string;
  red_nedeni?: string;
  yukleyen_kisi: string;
}

interface Belge {
  id: number;
  isletme_ad: string;
  dosya_adi: string;
  dosya_url: string;
  belge_turu: string;
}

// Bileşenler
const TeacherPanel = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<{ id: string; ad: string; soyad: string; } | null>(null);
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [dekontlar, setDekontlar] = useState<Dekont[]>([]);
  const [activeTab, setActiveTab] = useState<'isletmeler' | 'dekontlar'>('isletmeler');

  const [isDekontUploadModalOpen, setDekontUploadModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Ogrenci | null>(null);
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBelgeUploadModalOpen, setBelgeUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const checkLocalStorage = () => {
      const storedOgretmen = localStorage.getItem('ogretmen');
      if (!storedOgretmen) {
        router.push('/');
        return;
      }

      try {
        const teacherData = JSON.parse(storedOgretmen);
        setTeacher(teacherData);
        fetchOgretmenData(teacherData.id);
      } catch (error) {
        console.error('localStorage verisi geçersiz:', error);
        localStorage.removeItem('ogretmen');
        router.push('/');
      }
    };

    checkLocalStorage();
  }, [router]);

  const fetchOgretmenData = async (teacherId: string) => {
    setLoading(true);
    try {
      // Öğretmenin sorumlu olduğu stajları ve bu stajlar üzerinden işletme ve öğrenci bilgilerini çek
      const { data: stajData, error: stajError } = await supabase
        .from('stajlar')
        .select(`
          isletme_id,
          ogrenci_id,
          isletmeler (id, ad),
          ogrenciler (id, ad, soyad, no, sinif, alanlar (ad))
        `)
        .eq('ogretmen_id', teacherId);

      if (stajError) throw stajError;

      // Verileri işletmelere göre grupla
      const isletmeMap = new Map<string, Isletme>();
      stajData.forEach((staj: any) => {
        if (!staj.isletmeler || !staj.ogrenciler) return;

        let isletme = isletmeMap.get(staj.isletmeler.id);
        if (!isletme) {
          isletme = {
            id: staj.isletmeler.id,
            ad: staj.isletmeler.ad,
            ogrenciler: [],
            yukleyen_kisi: 'Bilinmiyor',
          };
          isletmeMap.set(staj.isletmeler.id, isletme);
        }
        isletme.ogrenciler.push({
          id: staj.ogrenciler.id,
          ad: staj.ogrenciler.ad,
          soyad: staj.ogrenciler.soyad,
          no: staj.ogrenciler.no,
          sinif: staj.ogrenciler.sinif,
          alan: staj.ogrenciler.alanlar.ad,
        });
      });

      const groupedIsletmeler = Array.from(isletmeMap.values());
      setIsletmeler(groupedIsletmeler);

      // Öğretmenin sorumlu olduğu işletmelerin dekontlarını getir
      const isletmeIds = Array.from(isletmeMap.keys());
      if (isletmeIds.length > 0) {
        const { data: dekontData, error: dekontError } = await supabase
          .from('dekontlar')
          .select(`
            *,
            stajlar(ogrenciler(ad, soyad)),
            isletmeler(ad),
            ogretmenler(ad, soyad)
          `)
          .in('isletme_id', isletmeIds)
          .order('created_at', { ascending: false });
        
        if (dekontError) throw dekontError;

        const formattedDekontlar = dekontData.map((d: any) => {
          let yukleyenKisi = 'Bilinmiyor';
          if (d.ogretmen_id && d.ogretmenler) {
            yukleyenKisi = `${d.ogretmenler.ad} ${d.ogretmenler.soyad} (Öğretmen)`;
          } else {
            yukleyenKisi = `${d.isletmeler.ad} (İşletme)`;
          }

          return {
            id: d.id,
            isletme_ad: d.isletmeler.ad,
            ogrenci_ad: d.stajlar ? `${d.stajlar.ogrenciler.ad} ${d.stajlar.ogrenciler.soyad}` : 'İlişkili Öğrenci Yok',
            miktar: d.tutar,
            odeme_tarihi: d.odeme_tarihi,
            onay_durumu: d.onay_durumu,
            ay: d.ay,
            yil: d.yil,
            dosya_url: d.dosya_url,
            aciklama: d.aciklama,
            red_nedeni: d.red_nedeni,
            yukleyen_kisi: yukleyenKisi,
          };
        });
        setDekontlar(formattedDekontlar);
      }

      setLoading(false);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const findStajId = async (ogrenciId: string, isletmeId: string): Promise<number | null> => {
    const { data, error } = await supabase
      .from('stajlar')
      .select('id')
      .eq('ogrenci_id', ogrenciId)
      .eq('isletme_id', isletmeId)
      .single();

    if (error || !data) {
      console.error('Staj ID bulunamadı:', error);
      alert('Bu öğrenci ve işletmeye ait staj kaydı bulunamadı. Dekont yüklenemiyor.');
      return null;
    }
    return data.id;
  };

  const handleLogout = () => {
    localStorage.removeItem('ogretmen');
    router.push('/');
  };

  const handleDekontSil = async (dekont: Dekont) => {
    if (dekont.onay_durumu !== 'bekliyor') {
      alert('Sadece "bekliyor" durumundaki dekontlar silinebilir.');
      return;
    }

    if (confirm(`'${dekont.ogrenci_ad}' adlı öğrencinin dekontunu kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      try {
        setLoading(true);

        // 1. Storage'dan dosyayı sil
        if (dekont.dosya_url) {
          const dosyaYolu = dekont.dosya_url.split('/dekontlar/').pop();
          if (dosyaYolu) {
            const { error: storageError } = await supabase.storage.from('dekontlar').remove([dosyaYolu]);
            if (storageError && storageError.message !== 'The resource was not found') {
              console.error('Dosya silinirken hata:', storageError);
            }
          }
        }

        // 2. Veritabanından dekontu sil
        const { error: dbError } = await supabase.from('dekontlar').delete().eq('id', dekont.id);
        if (dbError) throw dbError;

        // 3. State'i güncelle
        setDekontlar(prevDekontlar => prevDekontlar.filter(d => d.id !== dekont.id));
        alert('Dekont başarıyla silindi.');

      } catch (error: any) {
        alert(`Hata: Dekont silinirken bir sorun oluştu. ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenDekontUpload = async (ogrenci: Ogrenci, isletme: Isletme) => {
    const stajId = await findStajId(ogrenci.id, isletme.id);
    if (stajId) {
      setSelectedStudent({ ...ogrenci, staj_id: stajId });
      setSelectedIsletme(isletme);
      setDekontUploadModalOpen(true);
    }
  };

  const handleDekontSubmit = async (formData: DekontFormData) => {
    if (!teacher || !selectedStudent || !selectedIsletme) {
      alert("Gerekli bilgiler eksik, işlem iptal edildi.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!formData.dosya) {
        throw new Error("Dekont dosyası zorunludur.");
      }

      const file = formData.dosya;
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const filePath = `${selectedIsletme.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dekontlar')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Dosya yükleme hatası: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('dekontlar')
        .getPublicUrl(filePath);
      
      const dosyaUrl = urlData.publicUrl;

      const { data, error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: formData.staj_id,
          isletme_id: selectedIsletme.id,
          ogretmen_id: teacher.id,
          tutar: formData.tutar,
          ay: formData.ay.toString(),
          yil: formData.yil,
          aciklama: formData.aciklama || null,
          dosya_url: dosyaUrl,
          onay_durumu: 'bekliyor',
          odeme_tarihi: new Date().toISOString().split('T')[0]
        })
        .select().single();

      if (error) {
        await supabase.storage.from('dekontlar').remove([filePath]);
        throw new Error(`Veritabanı kayıt hatası: ${error.message}`);
      }

      const yeniDekont: Dekont = {
        ...data,
        id: data.id,
        isletme_ad: selectedIsletme.ad,
        ogrenci_ad: `${selectedStudent.ad} ${selectedStudent.soyad}`,
        miktar: data.tutar,
        yukleyen_kisi: `${teacher.ad} ${teacher.soyad} (Öğretmen)`
      };

      setDekontlar(prev => [yeniDekont, ...prev]);
      setDekontUploadModalOpen(false);
      alert('Dekont başarıyla yüklendi!');

    } catch (error: any) {
      alert(`Bir hata oluştu: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBelgeYukle = (isletme: Isletme) => {
    setSelectedIsletme(isletme);
    setBelgeUploadModalOpen(true);
  };

  const handleBelgeSubmit = async (formData: { isletmeId: string; dosyaAdi: string; dosya: File; belgeTuru: string; }) => {
    setIsSubmitting(true);
    try {
      const fileExt = formData.dosya.name.split('.').pop();
      const fileName = `${formData.belgeTuru}-${Date.now()}.${fileExt}`;
      const filePath = `belgeler/${formData.isletmeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('belgeler')
        .upload(filePath, formData.dosya);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('belgeler')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('belgeler')
        .insert({
          isletme_id: formData.isletmeId,
          dosya_adi: formData.dosyaAdi,
          dosya_url: publicUrl,
          belge_turu: formData.belgeTuru,
        });

      if (dbError) throw dbError;

      alert('Belge başarıyla yüklendi.');
      setBelgeUploadModalOpen(false);
    } catch (error) {
      console.error('Belge yükleme hatası:', error);
      alert('Belge yüklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  const getDurum = (durum: Dekont['onay_durumu']) => {
    switch (durum) {
      case 'onaylandi':
        return { text: 'Onaylandı', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' };
      case 'reddedildi':
        return { text: 'Reddedildi', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' };
      case 'bekliyor':
      default:
        return { text: 'Bekliyor', icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-800">Öğretmen Paneli</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 hidden sm:block">
                Hoş geldiniz, {teacher?.ad} {teacher?.soyad}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('isletmeler')}
                className={`${activeTab === 'isletmeler' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center transition-colors min-w-[120px]`}
              >
                <Building2 className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>İşletmeler ({isletmeler.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('dekontlar')}
                className={`${activeTab === 'dekontlar' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center transition-colors min-w-[120px]`}
              >
                <Receipt className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>Dekontlar ({dekontlar.length})</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'isletmeler' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isletmeler.map(isletme => (
                <div key={isletme.id} className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="h-5 w-5 mr-3 text-indigo-500" />
                        {isletme.ad}
                      </h3>
                      <button
                        onClick={() => handleBelgeYukle(isletme)}
                        title="Belge Yükle"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50/70 px-5 py-2">
                     <h4 className="text-sm font-medium text-gray-600 mb-2">Staj Yapan Öğrenciler</h4>
                  </div>
                   <div className="p-5 pt-3">
                     <div className="space-y-3">
                      {isletme.ogrenciler.map(ogrenci => (
                        <div key={ogrenci.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                           <div className="flex items-center gap-3">
                             <div className="flex-shrink-0">
                               <User className="h-8 w-8 text-gray-400" />
                             </div>
                             <div>
                               <p className="font-semibold text-gray-900">{ogrenci.ad} {ogrenci.soyad}</p>
                               <p className="text-xs text-gray-500">{ogrenci.alan} - {ogrenci.sinif} / {ogrenci.no}</p>
                             </div>
                           </div>
                           <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDekontUpload(ogrenci, isletme); }}
                            title="Dekont Yükle"
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Upload className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dekontlar' && (
            <>
              {dekontlar.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz dekont bulunmuyor</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    İşletmeler sekmesinden öğrenci seçerek dekont yükleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dekontlar.map((dekont) => (
                    <div key={dekont.id} className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Receipt className="h-5 w-5 mr-3 text-indigo-500" />
                            {dekont.ogrenci_ad}
                          </h3>
                          <button
                            onClick={() => window.open(dekont.dosya_url, '_blank')}
                            title="Dekont İndir"
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50/70 px-5 py-2">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Dekont Bilgileri</h4>
                      </div>
                      <div className="p-5 pt-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Miktar</span>
                            <span className="text-sm font-medium text-gray-900">{dekont.miktar}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Ödeme Tarihi</span>
                            <span className="text-sm font-medium text-gray-900">{dekont.odeme_tarihi}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Onay Durumu</span>
                            <span className="text-sm font-medium text-gray-900">{getDurum(dekont.onay_durumu).text}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Staj Takip Sistemi
          </p>
        </div>
      </footer>

      {/* Dekont Yükleme Modal'ı */}
      {isDekontUploadModalOpen && selectedStudent && selectedIsletme && selectedStudent.staj_id && (
        <Modal 
          isOpen={isDekontUploadModalOpen} 
          onClose={() => setDekontUploadModalOpen(false)}
          title={`Dekont Yükle: ${selectedStudent.ad} ${selectedStudent.soyad}`}
        >
          <DekontUploadForm
            stajId={selectedStudent.staj_id}
            onSubmit={handleDekontSubmit}
            isLoading={isSubmitting}
          />
        </Modal>
      )}

      {/* Belge Yükleme Modalı */}
      <BelgeUploadModal
        isOpen={isBelgeUploadModalOpen}
        onClose={() => setBelgeUploadModalOpen(false)}
        isletmeler={isletmeler}
        onSubmit={handleBelgeSubmit}
        isLoading={isSubmitting}
        selectedIsletmeId={selectedIsletme?.id}
      />
    </div>
  );
};

// Belge Yükleme için ayrı bir modal bileşeni
const BelgeUploadModal = ({
  isOpen,
  onClose,
  isletmeler,
  onSubmit,
  isLoading,
  selectedIsletmeId = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  isletmeler: Isletme[];
  onSubmit: (formData: { isletmeId: string; dosyaAdi: string; dosya: File; belgeTuru: string; }) => Promise<void>;
  isLoading: boolean;
  selectedIsletmeId?: string;
}) => {
  const [selectedIsletme, setSelectedIsletme] = useState<string>(selectedIsletmeId);
  const [belgeTuru, setBelgeTuru] = useState('');
  const [digerBelgeTuru, setDigerBelgeTuru] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [belgeler, setBelgeler] = useState<any[]>([]);
  const [belgelerLoading, setBelgelerLoading] = useState(false);

  const belgeTurleri = [
    'Sözleşme',
    'Fesih Belgesi',
    'Usta Öğreticilik Belgesi',
    'Diğer'
  ];

  useEffect(() => {
    setSelectedIsletme(selectedIsletmeId);
    if (selectedIsletmeId) {
      fetchBelgeler(selectedIsletmeId);
    }
  }, [selectedIsletmeId]);

  const fetchBelgeler = async (isletmeId: string) => {
    setBelgelerLoading(true);
    try {
      const { data, error } = await supabase
        .from('belgeler')
        .select('*')
        .eq('isletme_id', isletmeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBelgeler(data || []);
    } catch (error) {
      console.error('Belgeler getirilemedi:', error);
    } finally {
      setBelgelerLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIsletme || !belgeTuru || !selectedFile) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (belgeTuru === 'Diğer' && !digerBelgeTuru) {
      setError('Lütfen belge türünü belirtin.');
      return;
    }

    const dosyaAdi = belgeTuru === 'Diğer' ? digerBelgeTuru : belgeTuru;
    setError('');
    await onSubmit({ isletmeId: selectedIsletme, dosyaAdi, dosya: selectedFile, belgeTuru });
    setShowUploadForm(false);
    if (selectedIsletme) {
      fetchBelgeler(selectedIsletme);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="İşletme Belgeleri">
      <div className="space-y-6">
        {!showUploadForm ? (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {isletmeler.find(i => i.id === selectedIsletme)?.ad} - Belgeler
              </h3>
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Belge Ekle
              </button>
            </div>

            {belgelerLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : belgeler.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Bu işletme için henüz belge yüklenmemiş</p>
              </div>
            ) : (
              <div className="space-y-4">
                {belgeler.map((belge) => (
                  <div key={belge.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{belge.dosya_adi}</p>
                        <p className="text-xs text-gray-500">{new Date(belge.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(belge.dosya_url, '_blank')}
                      className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="belgeTuru" className="block text-sm font-medium text-gray-700">
                Belge Türü
              </label>
              <select
                id="belgeTuru"
                value={belgeTuru}
                onChange={(e) => setBelgeTuru(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="" disabled>-- Belge Türü Seçin --</option>
                {belgeTurleri.map(tur => (
                  <option key={tur} value={tur}>{tur}</option>
                ))}
              </select>
            </div>

            {belgeTuru === 'Diğer' && (
              <div>
                <label htmlFor="digerBelgeTuru" className="block text-sm font-medium text-gray-700">
                  Belge Türünü Belirtin
                </label>
                <input
                  type="text"
                  id="digerBelgeTuru"
                  value={digerBelgeTuru}
                  onChange={(e) => setDigerBelgeTuru(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Örn: Sigorta Belgesi"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosya
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="dosya"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <label htmlFor="dosya" className="cursor-pointer">
                  {selectedFile ? (
                    <>
                      <FileText className="h-10 w-10 text-indigo-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">{selectedFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        Dosya seçmek için tıklayın veya sürükleyip bırakın
                      </p>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                  </p>
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  'Yükle'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default TeacherPanel; 