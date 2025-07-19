'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, LogOut, Loader, User, Receipt, GraduationCap, CheckCircle, Clock, XCircle, Download, Plus, Upload, Trash2, Calendar, Loader2, AlertTriangle, Search, Filter, Bell } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DekontUploadForm from '@/components/ui/DekontUpload'
import PinChangeModal from '@/components/ui/PinChangeModal'
import { DekontFormData } from '@/types/dekont'

// TypeScript Arayüzleri
interface Ogrenci {
  id: string;
  ad: string;
  soyad: string;
  no: string;
  sinif: string;
  alan: string;
  staj_id?: string;
  baslangic_tarihi: string;
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
  ay: number;
  yil: number;
  dosya_url?: string;
  aciklama?: string;
  red_nedeni?: string;
  yukleyen_kisi: string;
  created_at?: string;
}

interface Belge {
  id: number;
  isletme_ad: string;
  dosya_adi: string;
  dosya_url: string;
  belge_turu: string;
  yukleme_tarihi: string;
  yukleyen_kisi?: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  sent_by: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// Dosya adı kısaltma fonksiyonu
const truncateFileName = (fileName: string, maxLength: number = 40) => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4);
  return `${truncatedName}...${extension}`;
};

const TeacherPanel = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<{ id: string; ad: string; soyad: string; } | null>(null);
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [dekontlar, setDekontlar] = useState<Dekont[]>([]);
  const [activeTab, setActiveTab] = useState<'isletmeler' | 'dekontlar' | 'belgeler'>('isletmeler');
  const [dekontPage, setDekontPage] = useState(1);
  const DEKONTLAR_PER_PAGE = 5;
  const [isDekontUploadModalOpen, setDekontUploadModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Ogrenci | null>(null);
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBelgeUploadModalOpen, setBelgeUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [filteredBelgeler, setFilteredBelgeler] = useState<Belge[]>([]);
  const [belgeSearchTerm, setBelgeSearchTerm] = useState('');
  const [belgeTurFilter, setBelgeTurFilter] = useState<string>('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [belgeSilModalOpen, setBelgeSilModalOpen] = useState(false);
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null);
  const [schoolName, setSchoolName] = useState('Okul Adı');
  const [ogrenciSecimModalOpen, setOgrenciSecimModalOpen] = useState(false);
  const [isletmeSecimModalOpen, setIsletmeSecimModalOpen] = useState(false);
  
  // Bildirim states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // PIN change modal state
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');

  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentYear = () => new Date().getFullYear();
  const getCurrentDay = () => new Date().getDate();
  
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  // Bu ay için dekont eksik olan öğrencileri tespit et (İşletme sistemini adapte ettik)
  const getEksikDekontOgrenciler = () => {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    const tumOgrenciler: Array<{id: string, ad: string, soyad: string, sinif: string, no: string, isletme_ad: string, baslangic_tarihi: string, staj_id?: string}> = [];
    
    isletmeler.forEach(isletme => {
      isletme.ogrenciler.forEach(ogrenci => {
        tumOgrenciler.push({
          ...ogrenci,
          isletme_ad: isletme.ad
        });
      });
    });
    
    return tumOgrenciler.filter(ogrenci => {
      const ogrenciDekontlari = dekontlar.filter(d =>
        d.ogrenci_ad === `${ogrenci.ad} ${ogrenci.soyad}` &&
        d.ay === currentMonth &&
        d.yil === currentYear
      );
      return ogrenciDekontlari.length === 0;
    });
  };

  // Gecikme durumunu kontrol et (ayın 10'undan sonra)
  const isGecikme = () => getCurrentDay() > 10;
  
  // Kritik süre kontrolü (ayın 1-10'u arası)
  const isKritikSure = () => {
    const day = getCurrentDay();
    return day >= 1 && day <= 10;
  };

  const eksikDekontOgrenciler = getEksikDekontOgrenciler();

  useEffect(() => {
    const checkSessionStorage = () => {
      const storedOgretmenId = sessionStorage.getItem('ogretmen_id');
      if (!storedOgretmenId) {
        router.push('/');
        return;
      }
      
      // Öğretmen verilerini veritabanından getir
      fetchOgretmenById(storedOgretmenId);
    };
    checkSessionStorage();
    fetchSchoolName();
  }, [router]);

  const fetchOgretmenById = async (ogretmenId: string) => {
    try {
      const response = await fetch(`/api/admin/teachers/${ogretmenId}`);
      if (!response.ok) {
        throw new Error('Öğretmen bulunamadı');
      }
      
      const ogretmenData = await response.json();
      
      setTeacher(ogretmenData);
      setTeacherPin(ogretmenData.pin || '');
      
      // Always fetch data regardless of PIN
      fetchOgretmenData(ogretmenData.id);
      fetchNotifications(ogretmenData.id);
      
      // Check if PIN needs to be changed after data is loaded
      if (ogretmenData.pin === '2025') {
        setPinChangeModalOpen(true);
      }
    } catch (error) {
      console.error('Öğretmen verisi getirme hatası:', error);
      sessionStorage.removeItem('ogretmen_id');
      router.push('/');
    }
  };

  // Bildirimleri getir
  const fetchNotifications = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', teacherId)
        .eq('recipient_type', 'ogretmen')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Bildirimler getirilirken hata:', error);
        return;
      }

      setNotifications(data || []);
      const unreadNotifications = data?.filter(n => !n.is_read) || [];
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Bildirimler getirme hatası:', error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Bildirim okundu olarak işaretlenirken hata:', error);
        return;
      }

      // State'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!teacher) return;

    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', unreadIds);

      if (error) {
        console.error('Tüm bildirimler okundu olarak işaretlenirken hata:', error);
        return;
      }

      // State'i güncelle
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n =>
          !n.is_read
            ? { ...n, is_read: true, read_at: now }
            : n
        )
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Tüm bildirimler güncelleme hatası:', error);
    }
  };

  const fetchSchoolName = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'school_name')
        .single();

      if (data?.value) {
        setSchoolName(data.value);
      }
    } catch (error) {
      console.error('Okul adı alınırken hata:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'dekontlar') setDekontPage(1);
  }, [activeTab]);

  // Belge filtreleme
  useEffect(() => {
    let filtered = belgeler;

    if (belgeSearchTerm) {
      filtered = filtered.filter(belge =>
        belge.dosya_adi?.toLowerCase().includes(belgeSearchTerm.toLowerCase()) ||
        belge.belge_turu?.toLowerCase().includes(belgeSearchTerm.toLowerCase()) ||
        belge.isletme_ad?.toLowerCase().includes(belgeSearchTerm.toLowerCase())
      );
    }

    if (belgeTurFilter !== 'all') {
      filtered = filtered.filter(belge => belge.belge_turu === belgeTurFilter);
    }

    setFilteredBelgeler(filtered);
  }, [belgeler, belgeSearchTerm, belgeTurFilter]);

  const fetchOgretmenData = async (teacherId: string) => {
    setLoading(true);
    try {
      // Öğretmenin sorumlu olduğu stajları ve bu stajlar üzerinden işletme ve öğrenci bilgilerini çek
      const { data: stajData, error: stajError } = await supabase
        .from('stajlar')
        .select(`
          isletme_id,
          ogrenci_id,
          baslangic_tarihi,
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
          baslangic_tarihi: staj.baslangic_tarihi,
        });
      });

      const groupedIsletmeler = Array.from(isletmeMap.values());
      setIsletmeler(groupedIsletmeler);

      // Öğretmenin sorumlu olduğu işletmelerin dekontlarını getir
      const isletmeIds = Array.from(isletmeMap.keys());
      if (isletmeIds.length > 0) {
        const { data: dekontData, error: dekontError } = await supabase
          .from('dekontlar')
          .select('*')
          .in('isletme_id', isletmeIds)
          .order('created_at', { ascending: false });
        
        if (dekontError) throw dekontError;

        const formattedDekontlar = await Promise.all(dekontData.map(async (d: any) => {
          const { data: staj, error: stajError } = await supabase.from('stajlar').select('ogrenciler(ad, soyad), isletmeler(ad)').eq('id', d.staj_id).single();
          const { data: ogretmen, error: ogretmenError } = await supabase.from('ogretmenler').select('ad, soyad').eq('id', d.ogretmen_id).single();

          let yukleyenKisi = 'Bilinmiyor';
          if (d.ogretmen_id && ogretmen) {
            yukleyenKisi = `${ogretmen.ad} ${ogretmen.soyad} (Öğretmen)`;
          } else if (staj?.isletmeler) {
            const isletme = Array.isArray(staj.isletmeler) ? staj.isletmeler[0] : staj.isletmeler;
            yukleyenKisi = `${isletme.ad} (İşletme)`;
          }

          const isletme = staj?.isletmeler ? (Array.isArray(staj.isletmeler) ? staj.isletmeler[0] : staj.isletmeler) : null;
          const ogrenci = staj?.ogrenciler ? (Array.isArray(staj.ogrenciler) ? staj.ogrenciler[0] : staj.ogrenciler) : null;

          return {
            id: d.id,
            isletme_ad: isletme?.ad || 'Bilinmeyen İşletme',
            ogrenci_ad: ogrenci ? `${ogrenci.ad} ${ogrenci.soyad}` : 'İlişkili Öğrenci Yok',
            miktar: d.miktar,
            odeme_tarihi: d.odeme_tarihi,
            onay_durumu: d.onay_durumu,
            ay: d.ay,
            yil: d.yil,
            dosya_url: d.dosya_url,
            aciklama: d.aciklama,
            red_nedeni: d.red_nedeni,
            yukleyen_kisi: yukleyenKisi,
            created_at: d.created_at,
          };
        }));
        setDekontlar(formattedDekontlar);
      }

      // Öğretmenin sorumlu olduğu işletmelerin belgelerini getir
      if (isletmeIds.length > 0) {
        const { data: belgeData, error: belgeError } = await supabase
          .from('belgeler')
          .select('*')
          .in('isletme_id', isletmeIds)
          .order('created_at', { ascending: false });

        if (belgeError) {
          console.error('Belgeleri getirme hatası:', belgeError);
        } else if (belgeData) {
          const formattedBelgeler = await Promise.all(belgeData.map(async (belge: any) => {
            const { data: isletme, error: isletmeError } = await supabase.from('isletmeler').select('ad').eq('id', belge.isletme_id).single();
            
            let yukleyenKisi = 'Bilinmiyor';
            if (belge.ogretmen_id) {
              yukleyenKisi = 'Öğretmen';
            } else if (belge.isletme_yukleyen) {
              yukleyenKisi = 'İşletme';
            } else {
              yukleyenKisi = 'Yönetici';
            }

            return {
              id: belge.id,
              isletme_ad: isletme?.ad || 'Bilinmeyen İşletme',
              dosya_adi: belge.dosya_adi || belge.ad,
              dosya_url: belge.dosya_url,
              belge_turu: belge.belge_turu || belge.tur,
              yukleme_tarihi: belge.created_at,
              yukleyen_kisi: yukleyenKisi
            };
          }));
          setBelgeler(formattedBelgeler);
          setFilteredBelgeler(formattedBelgeler);
        }
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
      setErrorModal({
        isOpen: true,
        title: 'Staj Kaydı Bulunamadı',
        message: 'Bu öğrenci ve işletmeye ait staj kaydı bulunamadı. Dekont yüklenemiyor.'
      });
      return null;
    }
    return data.id;
  };

  const handlePinChangeSuccess = () => {
    setPinChangeModalOpen(false);
    if (teacher) {
      fetchOgretmenData(teacher.id);
      fetchNotifications(teacher.id);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ogretmen_id');
    router.push('/');
  };

  const handleDekontSil = async (dekont: Dekont) => {
    if (dekont.onay_durumu === 'onaylandi') {
      setErrorModal({
        isOpen: true,
        title: 'Silme İşlemi Yapılamaz',
        message: 'Onaylanmış dekontlar silinemez.'
      });
      return;
    }

    if (confirm(`'${dekont.ogrenci_ad}' adlı öğrencinin dekontunu kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      try {
        setLoading(true);

        // 1. Storage'dan dosyayı sil
        if (dekont.dosya_url) {
          const dosyaYolu = new URL(dekont.dosya_url).pathname.split('/dekontlar/').pop();
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
        // Başarı için modal yerine toast kullanabiliriz veya şimdilik bırakabiliriz

      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          title: 'Silme Hatası',
          message: `Dekont silinirken bir sorun oluştu: ${error.message}`
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenDekontUpload = async (ogrenci: Ogrenci, isletme: Isletme) => {
    const stajId = await findStajId(ogrenci.id, isletme.id);
    if (stajId) {
      setSelectedStudent({ ...ogrenci, staj_id: stajId.toString() });
      setSelectedIsletme(isletme);
      setDekontUploadModalOpen(true);
    }
  };

  const handleDekontSubmit = async (formData: DekontFormData) => {
    if (!teacher || !selectedStudent || !selectedIsletme) {
      setErrorModal({
        isOpen: true,
        title: 'Eksik Bilgi',
        message: 'Gerekli bilgiler eksik, işlem iptal edildi.'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!formData.dosya) {
        throw new Error("Dekont dosyası zorunludur.");
      }

      // Onaylanmış dekont kontrolü - aynı öğrenci, ay ve yıl için
      const ayAdi = formData.ay;
      const ogrenciAdi = `${selectedStudent.ad} ${selectedStudent.soyad}`;
      const mevcutDekontlar = dekontlar.filter(d =>
        d.ogrenci_ad === ogrenciAdi &&
        d.ay === parseInt(ayAdi, 10) &&
        d.yil === parseInt(formData.yil, 10)
      );
      
      const onaylanmisDekont = mevcutDekontlar.find(d => d.onay_durumu === 'onaylandi');
      if (onaylanmisDekont) {
        setErrorModal({
          isOpen: true,
          title: 'Dekont Zaten Mevcut',
          message: `${aylar[parseInt(ayAdi, 10) - 1]} ${formData.yil} döneminde öğrencinin onaylanmış dekontu bulunuyor. Aynı aya tekrar dekont yükleyemezsiniz.`
        });
        setIsSubmitting(false);
        return;
      }

      const stajBaslangic = new Date(selectedStudent.baslangic_tarihi);
      const dekontTarihi = new Date(parseInt(formData.yil, 10), parseInt(ayAdi, 10) - 1);
      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0); // Sadece tarih karşılaştırması için

      if (dekontTarihi >= bugun) {
        setErrorModal({
          isOpen: true,
          title: 'Geçersiz Tarih',
          message: 'Gelecek veya mevcut ay için dekont yükleyemezsiniz.'
        });
        setIsSubmitting(false);
        return;
      }

      if (dekontTarihi < stajBaslangic) {
        setErrorModal({
          isOpen: true,
          title: 'Geçersiz Tarih',
          message: `Dekont tarihi, öğrencinin staj başlangıç tarihinden (${stajBaslangic.toLocaleDateString('tr-TR')}) önce olamaz.`
        });
        setIsSubmitting(false);
        return;
      }

      const file = formData.dosya;
      
      // Anlamlı dosya ismi oluştur: dekont_ay_yil_ogretmen_isletme_ogrenci
      const fileExt = file.name.split('.').pop();
      const cleanName = (text: string) => text.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      
      // Ek dekont kontrolü - aynı dönemde kaçıncı dekont olduğunu bul
      const ekDekontIndex = mevcutDekontlar.length; // Mevcut dekont sayısı = bu dekonttun sıra numarası
      
      let dosyaIsmi = [
        'dekont',
        cleanName(formData.ay.toLowerCase()),
        formData.yil,
        cleanName(`${teacher.ad}_${teacher.soyad}`),
        cleanName(selectedIsletme.ad),
        cleanName(`${selectedStudent.ad}_${selectedStudent.soyad}`)
      ].join('_');
      
      // Ek dekont varsa belirt
      if (ekDekontIndex > 0) {
        dosyaIsmi += `_ek${ekDekontIndex + 1}`;
      }
      
      const fileName = dosyaIsmi + '.' + fileExt;
      const filePath = `${selectedIsletme.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dekontlar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw new Error(`Dosya yükleme hatası: ${uploadError.message}`);

      // Public URL'i al - bucket public ise
      const { data: urlData } = supabase.storage
        .from('dekontlar')
        .getPublicUrl(filePath);
      
      let dosyaUrl = urlData.publicUrl;

      // Eğer public URL çalışmıyorsa signed URL kullan
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('dekontlar')
          .createSignedUrl(filePath, 31536000); // 1 yıl geçerli

        if (!signedUrlError && signedUrlData) {
          dosyaUrl = signedUrlData.signedUrl;
        }
      } catch (signedUrlErr) {
        console.warn('Signed URL oluşturulamadı, public URL kullanılıyor:', signedUrlErr);
      }

      const { data, error } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: formData.staj_id,
          isletme_id: selectedIsletme.id,
          ogretmen_id: teacher.id,
          miktar: formData.miktar,
          ay: parseInt(formData.ay, 10) || getCurrentMonth(),
          yil: parseInt(formData.yil, 10) || getCurrentYear(),
          aciklama: formData.aciklama || null,
          dosya_url: dosyaUrl,
          onay_durumu: 'bekliyor',
          odeme_tarihi: new Date().toISOString().split('T')[0],
          odeme_son_tarihi: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0]
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
        miktar: data.miktar,
        yukleyen_kisi: `${teacher.ad} ${teacher.soyad} (Öğretmen)`,
        created_at: data.created_at
      };

      setDekontlar(prev => [yeniDekont, ...prev]);
      setDekontUploadModalOpen(false);
      
      // Başarı modal'ını göster
      setShowSuccessModal(true);
      
      // 3 saniye sonra dekont listesine yönlendir
      setTimeout(() => {
        setShowSuccessModal(false);
        setActiveTab('dekontlar');
      }, 3000);

    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: 'Dekont Yükleme Hatası',
        message: `Bir hata oluştu: ${error.message}`
      });
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
      // İşletme adını al
      const isletme = isletmeler.find(i => i.id === formData.isletmeId);
      if (!isletme) throw new Error('İşletme bulunamadı');

      // Aynı türde kaç belge var, sayı no belirle
      const { data: existingBelgeler } = await supabase
        .from('belgeler')
        .select('id')
        .eq('isletme_id', formData.isletmeId)
        .eq('tur', formData.belgeTuru);
      
      const belgeNo = String((existingBelgeler?.length || 0) + 1).padStart(3, '0');

      // Belge adını otomatik oluştur
      const cleanText = (text: string) => text.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      const isletmeAdi = cleanText(isletme.ad);
      const belgeTuruAdi = cleanText(formData.belgeTuru);
      const tarih = new Date().toISOString().split('T')[0];
      const zamanDamgasi = Date.now();
      const fileExt = formData.dosya.name.split('.').pop();
      
      const otomatikBelgeAdi = `${belgeTuruAdi}_${isletmeAdi}_${tarih}_${zamanDamgasi}.${fileExt}`;
      const filePath = `${formData.isletmeId}/${otomatikBelgeAdi}`;

      const { error: uploadError } = await supabase.storage
        .from('belgeler')
        .upload(filePath, formData.dosya, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Public URL'i al
      const { data: { publicUrl } } = supabase.storage
        .from('belgeler')
        .getPublicUrl(filePath);
      
      let dosyaUrl = publicUrl;

      // Eğer public URL çalışmıyorsa signed URL kullan
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('belgeler')
          .createSignedUrl(filePath, 31536000); // 1 yıl geçerli

        if (!signedUrlError && signedUrlData) {
          dosyaUrl = signedUrlData.signedUrl;
        }
      } catch (signedUrlErr) {
        console.warn('Signed URL oluşturulamadı, public URL kullanılıyor:', signedUrlErr);
      }

      const { error: dbError } = await supabase
        .from('belgeler')
        .insert({
          isletme_id: formData.isletmeId,
          ad: otomatikBelgeAdi,
          dosya_url: dosyaUrl,
          tur: formData.belgeTuru,
          ogretmen_id: teacher?.id
        });

      if (dbError) throw dbError;

      alert('Belge başarıyla yüklendi.');
      setBelgeUploadModalOpen(false);
      
      // Belge listesini yeniden yükle
      if (teacher) {
        fetchOgretmenData(teacher.id);
      }
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

  // Dosya erişimi için fresh signed URL oluştur
  const getFileUrl = async (storedUrl: string, bucketName: string) => {
    try {
      // Eğer URL signed URL'se ve expire olmamışsa kullan
      if (storedUrl.includes('token=') && storedUrl.includes('exp=')) {
        return storedUrl;
      }

      // Public URL'den dosya yolunu çıkar
      const urlParts = storedUrl.split(`/${bucketName}/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        
        // Fresh signed URL oluştur
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600); // 1 saat geçerli

        if (!error && data) {
          return data.signedUrl;
        }
      }

      // Fallback olarak orijinal URL'i döndür
      return storedUrl;
    } catch (error) {
      console.error('URL oluşturma hatası:', error);
      return storedUrl;
    }
  };

  // Dosya indirme handler'ı
  const handleFileDownload = async (dosyaUrl: string, fileName: string, bucketName: string = 'dekontlar') => {
    try {
      const freshUrl = await getFileUrl(dosyaUrl, bucketName);
      
      // Dosyayı indir
      const link = document.createElement('a');
      link.href = freshUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Dosya indirme hatası:', error);
      alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  // Dosya görüntüleme handler'ı
  const handleFileView = async (dosyaUrl: string, bucketName: string = 'dekontlar') => {
    try {
      const freshUrl = await getFileUrl(dosyaUrl, bucketName);
      window.open(freshUrl, '_blank');
    } catch (error) {
      console.error('Dosya görüntüleme hatası:', error);
      alert('Dosya görüntülenemedi. Lütfen tekrar deneyin.');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  // Belge türü formatlama fonksiyonu
  const formatBelgeTur = (tur: string) => {
    switch (tur) {
      case 'Sözleşme':
      case 'sozlesme':
        return 'Sözleşme'
      case 'Fesih Belgesi':
      case 'fesih_belgesi':
        return 'Fesih Belgesi'
      case 'Usta Öğreticilik Belgesi':
      case 'usta_ogretici_belgesi':
        return 'Usta Öğretici Belgesi'
      default:
        return tur
    }
  }

  // Onay durumu için yardımcı fonksiyon
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

  // Pagination logic for dekontlar
  const totalDekontPages = Math.ceil(dekontlar.length / DEKONTLAR_PER_PAGE);
  const paginatedDekontlar = dekontlar.slice(
    (dekontPage - 1) * DEKONTLAR_PER_PAGE,
    dekontPage * DEKONTLAR_PER_PAGE
  );

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-indigo-600 to-indigo-800 pb-32">
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-2xl transform rotate-6 scale-105 opacity-20" />
                  <div className="relative p-3 bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-white">
                  Öğretmen Paneli
                </h1>
                <p className="text-indigo-200 text-sm">Staj Takip Sistemi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Bildirim Butonu */}
              <button
                onClick={() => setNotificationModalOpen(true)}
                className="relative flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Bildirimler"
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">Bildirimler</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5 text-white" />
                <span className="sr-only">Çıkış Yap</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
              {[
                { id: 'isletmeler', icon: Building2, label: 'İşletmeler', count: isletmeler.length },
                { id: 'dekontlar', icon: Receipt, label: 'Dekont Listesi', count: dekontlar.length },
                { id: 'belgeler', icon: FileText, label: 'Belgeler', count: belgeler.length }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'isletmeler' | 'dekontlar' | 'belgeler')}
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden py-3 px-6 rounded-t-xl text-sm font-medium text-center hover:bg-white hover:bg-opacity-10 transition-all duration-200
                      ${isActive
                        ? 'bg-white text-indigo-700'
                        : 'text-indigo-100 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-700' : 'text-indigo-300 group-hover:text-white'} mr-2`} />
                      {tab.label} ({tab.count})
                    </div>
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-700" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative -mt-32 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Dekont Takip Uyarı Sistemi */}
          {eksikDekontOgrenciler.length > 0 && (
            <div className={`mb-6 rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 ${
              isGecikme()
                ? 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500'
                : isKritikSure()
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {isGecikme() ? (
                    <XCircle className="h-6 w-6 text-red-600" />
                  ) : isKritikSure() ? (
                    <Clock className="h-6 w-6 text-yellow-600" />
                  ) : (
                    <Calendar className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className={`text-lg font-medium ${
                    isGecikme() ? 'text-red-800' : isKritikSure() ? 'text-yellow-800' : 'text-blue-800'
                  }`}>
                    {isGecikme()
                      ? '🚨 GECİKME UYARISI!'
                      : isKritikSure()
                      ? '⏰ KRİTİK SÜRE!'
                      : '📅 Dekont Hatırlatması'
                    }
                  </h3>
                  <div className={`mt-2 text-sm ${
                    isGecikme() ? 'text-red-700' : isKritikSure() ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    <p className="font-medium mb-2">
                      {isGecikme()
                        ? `${aylar[getCurrentMonth() - 1]} ayı dekont yükleme süresi geçti! İşletmeler devlet katkı payı alamayabilir.`
                        : isKritikSure()
                        ? `${aylar[getCurrentMonth() - 1]} ayı dekontlarını ayın 10'una kadar yüklemelisiniz!`
                        : `${aylar[getCurrentMonth() - 1]} ayı için eksik dekontlar var.`
                      }
                    </p>
                    <p className="mb-3">
                      <strong>Eksik dekont olan öğrenciler ({eksikDekontOgrenciler.length} kişi):</strong>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {eksikDekontOgrenciler.map((ogrenci) => {
                        const isletme = isletmeler.find(i => i.ad === ogrenci.isletme_ad);
                        const fullOgrenci = isletme?.ogrenciler.find(o => o.ad === ogrenci.ad && o.soyad === ogrenci.soyad);
                        
                        return (
                          <div key={`${ogrenci.ad}-${ogrenci.soyad}-${ogrenci.isletme_ad}`} className={`p-3 rounded-lg ${
                            isGecikme() ? 'bg-red-100 border border-red-200' :
                            isKritikSure() ? 'bg-yellow-100 border border-yellow-200' :
                            'bg-blue-100 border border-blue-200'
                          }`}>
                            <div className="font-medium text-gray-900">
                              {ogrenci.ad} {ogrenci.soyad}
                            </div>
                            <div className="text-xs text-gray-600">
                              {ogrenci.sinif} - No: {ogrenci.no}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              {ogrenci.isletme_ad}
                            </div>
                            {fullOgrenci && isletme && (
                              <button
                                onClick={() => handleOpenDekontUpload(fullOgrenci, isletme)}
                                className={`mt-2 w-full flex items-center justify-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                                  isGecikme() ? 'bg-red-600 text-white hover:bg-red-700' :
                                  isKritikSure() ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                                  'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Hemen Yükle
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5">
          {activeTab === 'isletmeler' && (
            <div className="space-y-6 p-6">
              {isletmeler.map((isletme, index) => (
                <div key={isletme.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 p-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {isletme.ad}
                      </h3>
                      <p className="text-sm text-gray-500">Yetkili: {isletme.yukleyen_kisi}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleBelgeYukle(isletme)}
                      className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="Belgeler"
                    >
                      <FileText className="h-4 w-4 mr-1.5" />
                      Belgeler
                    </button>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      Öğrenciler ({isletme.ogrenciler.length})
                    </h4>
                    
                    {isletme.ogrenciler.map((ogrenci, index) => (
                      <div key={ogrenci.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3 border border-blue-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{ogrenci.ad} {ogrenci.soyad}</p>
                            <div className="flex items-center space-x-3 mt-1 text-xs">
                              <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium">
                                {ogrenci.sinif}
                              </div>
                              <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-medium">
                                No: {ogrenci.no}
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>Başlangıç: {new Date(ogrenci.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDekontUpload(ogrenci, isletme); }}
                            className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Dekont Yükle"
                          >
                            <Upload className="h-4 w-4 mr-1.5" />
                            Dekont Yükle
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {isletme.ogrenciler.length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-sm font-medium text-gray-900">Öğrenci Bulunamadı</h3>
                        <p className="mt-2 text-xs text-gray-500">Henüz bu işletmeye öğrenci atanmamış.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'dekontlar' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Dekontlar</h2>
                <button
                  onClick={() => setOgrenciSecimModalOpen(true)}
                  className="flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Dekont Ekle
                </button>
              </div>

              {dekontlar.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Dekont Bulunamadı</h3>
                  <p className="mt-2 text-sm text-gray-500">Henüz dekont yüklenmemiş.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {paginatedDekontlar.map((dekont, index) => (
                      <div
                        key={dekont.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {dekont.ogrenci_ad}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurum(dekont.onay_durumu).bg} ${getDurum(dekont.onay_durumu).color}`}>
                                {getDurum(dekont.onay_durumu).text}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                {dekont.isletme_ad}
                              </span>
                              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
                                {(() => {
                                  // Aynı öğrenci, ay ve yıl için kaçıncı ek olduğunu bul
                                  const sameDekonts = dekontlar.filter(d =>
                                    d.ogrenci_ad === dekont.ogrenci_ad &&
                                    d.ay === dekont.ay &&
                                    String(d.yil) === String(dekont.yil)
                                  );
                                  // Yüklenme tarihine göre sırala (en eski ilk)
                                  const sorted = [...sameDekonts].sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
                                  const ekIndex = sorted.findIndex(d => d.id === dekont.id);
                                  
                                  // Ay adını görüntüle - dekont.ay zaten ay adı olarak geliyor
                                  const ayAdi = aylar[dekont.ay - 1] || dekont.ay;
                                  return ayAdi + (ekIndex > 0 ? ` (ek-${ekIndex+1})` : '') + ' ' + dekont.yil;
                                })()}
                              </span>
                            </div>
                            {/* Yükleyen bilgisi */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs">
                                <span className="font-bold">Gönderen:</span> {dekont.yukleyen_kisi}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {dekont.dosya_url && (
                              <button
                                onClick={() => handleFileDownload(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad}-${dekont.ay}-${dekont.yil}`, 'dekontlar')}
                                className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Dekontu İndir"
                              >
                                <Download className="h-5 w-5" />
                              </button>
                            )}
                            {dekont.onay_durumu !== 'onaylandi' && (
                              <button
                                onClick={() => {
                                  setSelectedDekont(dekont);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="p-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg transition-colors"
                                title="Dekontu Sil"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Alt köşeler: miktar (sol), yüklenme tarihi (sağ) */}
                        <div className="flex justify-between items-end mt-2">
                          {/* Sol alt: Miktar */}
                          <span className="text-xs font-bold text-green-600">
                            Miktar: {dekont.miktar ? dekont.miktar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}
                          </span>
                          {/* Sağ alt: Yüklenme tarihi */}
                          {dekont.created_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(dekont.created_at).toLocaleString('tr-TR', {
                                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalDekontPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        onClick={() => setDekontPage((p) => Math.max(1, p - 1))}
                        disabled={dekontPage === 1}
                      >
                        Önceki
                      </button>
                      <span className="text-sm text-gray-700">
                        Sayfa {dekontPage} / {totalDekontPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        onClick={() => setDekontPage((p) => Math.min(totalDekontPages, p + 1))}
                        disabled={dekontPage === totalDekontPages}
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'belgeler' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Tüm İşletme Belgeleri ({filteredBelgeler.length})
                </h2>
                <button
                  onClick={() => setIsletmeSecimModalOpen(true)}
                  className="flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Belge Ekle
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Belgelerde ara..."
                    value={belgeSearchTerm}
                    onChange={(e) => setBelgeSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={belgeTurFilter}
                    onChange={(e) => setBelgeTurFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                  >
                    <option value="all">Tüm Türler</option>
                    <option value="Sözleşme">Sözleşme</option>
                    <option value="Fesih Belgesi">Fesih Belgesi</option>
                    <option value="Usta Öğreticilik Belgesi">Usta Öğretici Belgesi</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              {filteredBelgeler.length > 0 ? (
                <div className="space-y-6">
                  {filteredBelgeler.map((belge) => (
                    <div key={belge.id} className="pt-6 first:pt-0 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col">
                        {/* Üst kısım: İkon ve bilgiler */}
                        <div className="flex items-start">
                          <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 truncate" title={belge.dosya_adi}>
                              {belge.dosya_adi}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                                {belge.isletme_ad}
                              </div>
                              <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">
                                {formatBelgeTur(belge.belge_turu)}
                              </div>
                              {belge.yukleyen_kisi && (
                                <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">
                                  {belge.yukleyen_kisi}
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              Yüklenme Tarihi: {new Date(belge.yukleme_tarihi).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Alt kısım: Butonlar */}
                        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-gray-100">
                          {belge.dosya_url && (
                            <button
                              onClick={() => handleFileView(belge.dosya_url, 'belgeler')}
                              className="flex items-center justify-center px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Dosyayı İndir
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBelge(belge);
                              setBelgeSilModalOpen(true);
                            }}
                            className="flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Belgeyi Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Belge Bulunamadı</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {belgeSearchTerm || belgeTurFilter !== 'all'
                      ? 'Arama kriterlerinize uygun belge bulunamadı.'
                      : 'Henüz hiç belge yüklenmemiş.'}
                  </p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </main>
      {/* Silme Onay Modali */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Dekontu Sil">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-900 text-sm">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Bu dekontu silmek istediğinize emin misiniz? <b>Sadece onaylanmış dekontlar silinemez.</b></span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Vazgeç
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={async () => {
                if (!selectedDekont) return;
                // Dosya varsa storage'dan sil
                if (selectedDekont.dosya_url) {
                  const urlParts = selectedDekont.dosya_url.split('/dekontlar/');
                  if (urlParts.length === 2) {
                    const filePath = urlParts[1];
                    await supabase.storage.from('dekontlar').remove([filePath]);
                  }
                }
                // Veritabanından sil
                await supabase.from('dekontlar').delete().eq('id', selectedDekont.id);
                setDekontlar(prev => prev.filter(d => d.id !== selectedDekont.id));
                setDeleteConfirmOpen(false);
                setSelectedDekont(null);
              }}
            >
              Evet, Sil
            </button>
          </div>
        </div>
      </Modal>

      <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4 fixed bottom-0 left-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                {schoolName.charAt(0)}
              </div>
              <span className="text-sm">&copy; {new Date().getFullYear()} {schoolName}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Dekont Yükleme Modal'ı */}
      {isDekontUploadModalOpen && selectedStudent && selectedIsletme && typeof selectedStudent.staj_id === 'string' && (
        <Modal
          isOpen={isDekontUploadModalOpen}
          onClose={() => setDekontUploadModalOpen(false)}
          title={`Dekont Yükle: ${selectedStudent.ad} ${selectedStudent.soyad}`}
        >
          <DekontUploadForm
            stajId={selectedStudent.staj_id?.toString()}
            onSubmit={handleDekontSubmit}
            isLoading={isSubmitting}
            isletmeler={isletmeler.map(i => ({ id: i.id, ad: i.ad }))}
            selectedIsletmeId={selectedIsletme.id}
          />
        </Modal>
      )}

      {/* Başarı Modal'ı */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="">
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Dekont Başarıyla Yüklendi! 🎉
          </h3>
          <p className="text-gray-600 mb-4">
            Dekontunuz sisteme kaydedildi ve onay için gönderildi.
          </p>
          <div className="text-sm text-gray-500">
            3 saniye sonra dekont listesine yönlendirileceksiniz...
          </div>
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-3000 ease-linear"
                style={{
                  animation: 'progress 3s linear forwards',
                  width: '0%'
                }}
              />
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </Modal>

      {/* Belge Yükleme Modalı */}
      <BelgeUploadModal
        isOpen={isBelgeUploadModalOpen}
        onClose={() => setBelgeUploadModalOpen(false)}
        isletmeler={isletmeler}
        onSubmit={handleBelgeSubmit}
        isLoading={isSubmitting}
        selectedIsletmeId={selectedIsletme?.id}
        onFileView={handleFileView}
      />

      {/* Error Modal */}
      <Modal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-400 rounded text-red-900 text-sm">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{errorModal.message}</span>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Silme Onay Modalı */}
      <Modal isOpen={belgeSilModalOpen} onClose={() => setBelgeSilModalOpen(false)} title="Belgeyi Sil">
        {selectedBelge && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-900 text-sm">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <span>
                <b>{selectedBelge.dosya_adi}</b> adlı belgeyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => setBelgeSilModalOpen(false)}
                disabled={isSubmitting}
              >
                Vazgeç
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                disabled={isSubmitting}
                onClick={async () => {
                  if (!selectedBelge) return;
                  
                  setIsSubmitting(true);
                  try {
                    // 1. Storage'dan dosyayı sil
                    if (selectedBelge.dosya_url) {
                      const url = new URL(selectedBelge.dosya_url);
                      const pathWithBucket = url.pathname;
                      const pathParts = pathWithBucket.split('/belgeler/');
                      if (pathParts.length > 1) {
                        const filePath = pathParts[1];
                        const { error: storageError } = await supabase.storage.from('belgeler').remove([filePath]);
                        if (storageError && storageError.message !== 'The resource was not found') {
                          throw new Error(`Depolama hatası: ${storageError.message}`);
                        }
                      }
                    }
                    
                    // 2. Veritabanından belgeyi sil
                    const { error: dbError } = await supabase.from('belgeler').delete().eq('id', selectedBelge.id);
                    if (dbError) throw dbError;
                    
                    // 3. State'i güncelle
                    setBelgeler(prev => prev.filter(b => b.id !== selectedBelge.id));
                    
                    setBelgeSilModalOpen(false);
                    setSelectedBelge(null);
                  } catch (error: any) {
                    setErrorModal({
                      isOpen: true,
                      title: 'Silme Hatası',
                      message: `Belge silinirken bir sorun oluştu: ${error.message}`
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Evet, Sil
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Öğrenci Seçim Modalı */}
      <Modal isOpen={ogrenciSecimModalOpen} onClose={() => setOgrenciSecimModalOpen(false)} title="Dekont Ekle - Öğrenci Seçin">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Dekont yüklemek istediğiniz öğrenciyi seçin:
          </p>
          
          {isletmeler.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-900">Öğrenci Bulunamadı</h3>
              <p className="mt-2 text-xs text-gray-500">Henüz size atanmış öğrenci bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isletmeler.map((isletme) => (
                <div key={isletme.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-indigo-600" />
                    {isletme.ad}
                  </h3>
                  
                  {isletme.ogrenciler.length === 0 ? (
                    <p className="text-sm text-gray-500 ml-6">Bu işletmede öğrenci bulunmuyor</p>
                  ) : (
                    <div className="space-y-2 ml-6">
                      {isletme.ogrenciler.map((ogrenci) => (
                        <button
                          key={ogrenci.id}
                          onClick={() => {
                            handleOpenDekontUpload(ogrenci, isletme);
                            setOgrenciSecimModalOpen(false);
                          }}
                          className="w-full text-left p-3 rounded-lg border hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {ogrenci.ad} {ogrenci.soyad}
                              </p>
                              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                  {ogrenci.sinif}
                                </span>
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  No: {ogrenci.no}
                                </span>
                              </div>
                            </div>
                            <Upload className="h-4 w-4 text-indigo-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setOgrenciSecimModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </Modal>

      {/* İşletme Seçim Modalı (Belge Eklemek İçin) */}
      <Modal isOpen={isletmeSecimModalOpen} onClose={() => setIsletmeSecimModalOpen(false)} title="Belge Ekle - İşletme Seçin">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Belge yüklemek istediğiniz işletmeyi seçin:
          </p>
          
          {isletmeler.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-900">İşletme Bulunamadı</h3>
              <p className="mt-2 text-xs text-gray-500">Henüz size atanmış işletme bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isletmeler.map((isletme) => (
                <button
                  key={isletme.id}
                  onClick={() => {
                    handleBelgeYukle(isletme);
                    setIsletmeSecimModalOpen(false);
                  }}
                  className="w-full text-left p-4 rounded-lg border hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-indigo-600" />
                        {isletme.ad}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Yetkili: {isletme.yukleyen_kisi}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        <span>{isletme.ogrenciler.length} öğrenci</span>
                      </div>
                    </div>
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setIsletmeSecimModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      </Modal>

      {/* Bildirim Modalı */}
      <Modal
        isOpen={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        title="Bildirimler"
      >
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Bildirim Yok</h3>
              <p className="mt-2 text-sm text-gray-500">Henüz hiç bildirim almadınız.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {notifications.length} bildirim ({unreadCount} okunmamış)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Tümünü Okundu İşaretle
                  </button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      notification.is_read
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200 shadow-sm'
                    }`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${
                            notification.is_read ? 'text-gray-900' : 'text-blue-900'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          {/* Öncelik Badge'i */}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            notification.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : notification.priority === 'normal'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {notification.priority === 'high' ? 'Yüksek' :
                             notification.priority === 'normal' ? 'Normal' : 'Düşük'}
                          </span>
                          
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className={`mt-2 text-sm ${
                          notification.is_read ? 'text-gray-600' : 'text-blue-800'
                        }`}>
                          {notification.content}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">
                            Gönderen: {notification.sent_by}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.created_at).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {notification.is_read && notification.read_at && (
                          <div className="text-xs text-gray-400 mt-1">
                            Okunma: {new Date(notification.read_at).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setNotificationModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
      
      {/* PIN Change Modal */}
      <PinChangeModal
        isOpen={pinChangeModalOpen}
        onClose={() => {}} // Cannot close until PIN is changed
        onSuccess={handlePinChangeSuccess}
        teacherId={teacher?.id || ''}
        teacherName={teacher ? `${teacher.ad} ${teacher.soyad}` : ''}
      />
    </div>
  );
}

// Belge Yükleme için ayrı bir modal bileşeni
interface BelgeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isletmeler: Isletme[];
  onSubmit: (formData: { isletmeId: string; dosyaAdi: string; dosya: File; belgeTuru: string; }) => Promise<void>;
  isLoading: boolean;
  selectedIsletmeId?: string;
  onFileView: (dosyaUrl: string, bucketName?: string) => Promise<void>;
}

const BelgeUploadModal = ({
  isOpen,
  onClose,
  isletmeler,
  onSubmit,
  isLoading,
  selectedIsletmeId = '',
  onFileView,
}: BelgeUploadModalProps) => {
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
                        <p className="text-sm font-medium text-gray-900" title={belge.dosya_adi}>
                          {truncateFileName(belge.dosya_adi, 30)}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(belge.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onFileView(belge.dosya_url, 'belgeler')}
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
