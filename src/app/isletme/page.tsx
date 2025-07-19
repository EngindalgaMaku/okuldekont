'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, FileText, LogOut, User, Upload, Plus, Download, Eye, Search, Filter, Receipt, Loader, GraduationCap, Calendar, CheckCircle, Clock, XCircle, Trash2, Bell } from 'lucide-react'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import Modal from '@/components/ui/Modal'

interface Isletme {
  id: string
  ad: string
  yetkili_kisi: string
  pin?: string
}

interface Ogrenci {
  id: string
  staj_id: string
  ad: string
  soyad: string
  sinif: string
  no: string
  baslangic_tarihi: string
  bitis_tarihi: string
  ogretmen_ad: string
  ogretmen_soyad: string
  alanlar?: {
    ad: string
  }
}

interface Dekont {
  id: number | string
  ogrenci_adi: string
  miktar: number | null
  odeme_tarihi?: string
  onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi'
  aciklama?: string
  dosya_url?: string
  ay: number
  yil: number | string
  staj_id: string | number
  yukleyen_kisi?: string
  stajlar?: {
    ogrenciler?: {
      ad: string
      soyad: string
      alanlar?: {
        ad: string
      }
      sinif?: string
      no?: string
    }
  }
  created_at?: string
}

interface Belge {
  id: number
  isletme_id: number
  ad: string
  tur: string
  dosya_url?: string
  yukleme_tarihi: string
  yukleyen_kisi?: string
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

type ActiveTab = 'ogrenciler' | 'dekontlar' | 'belgeler'

export default function PanelPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [isletme, setIsletme] = useState<Isletme | null>(null)
  const [schoolName, setSchoolName] = useState<string>('Okul Adı')
  const [activeTab, setActiveTab] = useState<ActiveTab>('ogrenciler')
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [belgeler, setBelgeler] = useState<Belge[]>([])
  const [filteredBelgeler, setFilteredBelgeler] = useState<Belge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)

  // Sayfalama için state'ler
  const [currentPage, setCurrentPage] = useState(1)
  const dekontsPerPage = 5
  const totalPages = Math.ceil(dekontlar.length / dekontsPerPage)
  const currentDekontlar = dekontlar.slice(
    (currentPage - 1) * dekontsPerPage,
    currentPage * dekontsPerPage
  )

  // Belge yönetimi için state'ler
  const [belgeSearchTerm, setBelgeSearchTerm] = useState('')
  const [belgeTurFilter, setBelgeTurFilter] = useState<string>('all')
  const [belgeModalOpen, setBelgeModalOpen] = useState(false)
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null)
  const [belgeDeleteModalOpen, setBelgeDeleteModalOpen] = useState(false)

  // Dekont yönetimi için state'ler
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteDekont, setPendingDeleteDekont] = useState<Dekont | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  
  // Bildirim states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // PIN change modal state
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  
  // Ek dekont uyarı modal state
  const [ekDekontModalOpen, setEkDekontModalOpen] = useState(false);
  const [ekDekontData, setEkDekontData] = useState<{
    ogrenci: Ogrenci;
    ay: number;
    yil: number;
    mevcutDekontSayisi: number;
  } | null>(null);

  // Dekont takip sistemi için yardımcı fonksiyonlar
  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentYear = () => new Date().getFullYear();
  const getCurrentDay = () => new Date().getDate();
  
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  // Bu ay için dekont eksik olan öğrencileri tespit et
  const getEksikDekontOgrenciler = () => {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    
    return ogrenciler.filter(ogrenci => {
      const ogrenciDekontlari = dekontlar.filter(d =>
        String(d.staj_id) === String(ogrenci.staj_id) &&
        d.ay === currentMonth &&
        String(d.yil) === String(currentYear)
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

  // Belge form verileri
  const [belgeFormData, setBelgeFormData] = useState({
    ad: '',
    tur: 'sozlesme',
    customTur: '',
    dosya: null as File | null
  })

  // Dekont form verileri
  const [dekontFormData, setDekontFormData] = useState({
    ay: new Date().getMonth() + 1,
    yil: new Date().getFullYear(),
    aciklama: '',
    miktar: '',
    dosya: null as File | null
  })

  const fetchSchoolName = async () => {
    try {
      const response = await fetch('/api/system-settings/school-name');
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setSchoolName(data.value);
        }
      }
    } catch (error) {
      console.error('Okul adı alınırken hata:', error);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Tarayıcı session'ından işletme bilgilerini al
      const sessionIsletmeId = sessionStorage.getItem('isletme_id')
      
      if (!sessionIsletmeId) {
        console.error('Session\'da işletme ID bulunamadı - giriş yapılmamış')
        router.push('/')
        return
      }

      // İşletme verilerini API'dan getir
      const isletmeResponse = await fetch(`/api/admin/companies/${sessionIsletmeId}`);
      if (!isletmeResponse.ok) {
        throw new Error('İşletme verisi getirilemedi');
      }
      
      const isletmeData = await isletmeResponse.json();
      setIsletme(isletmeData);
      
      // Check if PIN needs to be changed (default PIN is 1234)
      if (isletmeData.pin === '1234') {
        setTimeout(() => {
          setPinChangeModalOpen(true)
        }, 1000)
      }
      
      // İşletme bildirimleri getir
      fetchNotifications(isletmeData.id);

      // İşletmenin öğrencilerini getir
      const studentsResponse = await fetch(`/api/admin/companies/${sessionIsletmeId}/students`);
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setOgrenciler(studentsData);
      }

      // İşletmenin dekontlarını getir
      const dekontResponse = await fetch(`/api/admin/companies/${sessionIsletmeId}/dekontlar`);
      if (dekontResponse.ok) {
        const dekontData = await dekontResponse.json();
        setDekontlar(dekontData);
      }

      // İşletmenin belgelerini getir
      const belgeResponse = await fetch(`/api/admin/companies/${sessionIsletmeId}/documents`);
      if (belgeResponse.ok) {
        const belgeData = await belgeResponse.json();
        setBelgeler(belgeData);
        setFilteredBelgeler(belgeData);
      }

    } catch (error) {
      console.error('Veri getirme hatası:', error)
      alert('Veri getirme hatası! Lütfen tekrar giriş yapın.')
      sessionStorage.removeItem('isletme_id')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Bildirimleri getir
  const fetchNotifications = async (isletmeId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${isletmeId}/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
        const unreadNotifications = data?.filter((n: any) => !n.is_read) || [];
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Bildirimler getirme hatası:', error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    if (!isletme) return;
    
    try {
      const response = await fetch(`/api/admin/companies/${isletme.id}/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          markAsRead: true
        })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!isletme) return;

    try {
      const response = await fetch(`/api/admin/companies/${isletme.id}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAllAsRead: true
        })
      });

      if (response.ok) {
        const now = new Date().toISOString();
        setNotifications(prev =>
          prev.map(n =>
            !n.is_read
              ? { ...n, is_read: true, read_at: now }
              : n
          )
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Tüm bildirimler güncelleme hatası:', error);
    }
  };

  // Bildirimi sil
  const deleteNotification = async (notificationId: string) => {
    if (!isletme) return;
    
    try {
      const response = await fetch(`/api/admin/companies/${isletme.id}/notifications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId
        })
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Bildirim silme hatası:', error);
      alert('Bir hata oluştu!');
    }
  };

  // PIN değiştirme fonksiyonu
  const handlePinChange = async () => {
    if (!newPin || !confirmPin) {
      setErrorModal({
        isOpen: true,
        title: 'Eksik Bilgi',
        message: 'Lütfen tüm alanları doldurun'
      });
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorModal({
        isOpen: true,
        title: 'Geçersiz PIN',
        message: 'PIN 4 haneli bir sayı olmalıdır'
      });
      return;
    }

    if (newPin !== confirmPin) {
      setErrorModal({
        isOpen: true,
        title: 'PIN Uyumsuzluğu',
        message: 'PIN\'ler eşleşmiyor'
      });
      return;
    }

    if (newPin === '1234') {
      setErrorModal({
        isOpen: true,
        title: 'Güvensiz PIN',
        message: 'Varsayılan PIN\'i kullanamaz. Farklı bir PIN seçin'
      });
      return;
    }

    if (!isletme) {
      setErrorModal({
        isOpen: true,
        title: 'Hata',
        message: 'İşletme bilgisi bulunamadı'
      });
      return;
    }

    try {
      setPinChangeLoading(true);
      const response = await fetch(`/api/admin/companies/${isletme.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: newPin
        })
      });

      if (!response.ok) {
        throw new Error('PIN güncellenemedi');
      }

      // PIN başarıyla güncellendi, state'i güncelle
      setIsletme({ ...isletme, pin: newPin });
      setPinChangeModalOpen(false);
      setNewPin('');
      setConfirmPin('');
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('PIN değiştirme hatası:', error);
      setErrorModal({
        isOpen: true,
        title: 'PIN Değiştirme Hatası',
        message: 'PIN değiştirilirken bir hata oluştu'
      });
    } finally {
      setPinChangeLoading(false);
    }
  };

  useEffect(() => {
    fetchData()
    fetchSchoolName()
  }, [fetchData])

  // Belge filtreleme
  useEffect(() => {
    if (!isletme) return
    
    let filtered = belgeler

    if (belgeSearchTerm) {
      filtered = filtered.filter(belge => 
        belge.ad?.toLowerCase().includes(belgeSearchTerm.toLowerCase()) ||
        belge.tur?.toLowerCase().includes(belgeSearchTerm.toLowerCase())
      )
    }

    if (belgeTurFilter !== 'all') {
      filtered = filtered.filter(belge => belge.tur === belgeTurFilter)
    }

    setFilteredBelgeler(filtered)
  }, [belgeler, belgeSearchTerm, belgeTurFilter, isletme])

  const handleBelgeEkle = async () => {
    const belgeTuru = belgeFormData.tur === 'other' ? belgeFormData.customTur : belgeFormData.tur

    if (!belgeTuru.trim()) {
      alert('Belge türü gereklidir!')
      return
    }

    if (!belgeFormData.dosya) {
      alert('Dosya seçimi zorunludur!')
      return
    }

    if (!isletme) {
      alert('İşletme bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    try {
      const formData = new FormData();
      formData.append('isletme_id', isletme.id);
      formData.append('belge_turu', belgeTuru);
      formData.append('dosya', belgeFormData.dosya);
      // İşletme yüklemesi için ogretmen_id gönderme

      const response = await fetch('/api/admin/belgeler', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Belge yüklenemedi');
      }

      const newBelge = await response.json();
      setBelgeler(prev => [newBelge, ...prev]);
      setBelgeModalOpen(false);
      setBelgeFormData({ ad: '', tur: 'sozlesme', customTur: '', dosya: null });
    } catch (error: any) {
      console.error('Belge ekleme hatası:', error);
      alert(`Belge yüklenirken bir hata oluştu: ${error.message}`);
    }
  }

  const handleBelgeSil = async (belge: Belge) => {
    try {
      const response = await fetch(`/api/admin/belgeler/${belge.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Belge silinemedi');
      }

      setBelgeler(belgeler.filter(b => b.id !== belge.id));
      if (selectedBelge && selectedBelge.id === belge.id) {
        setSelectedBelge(null);
      }
    } catch (error: any) {
      console.error('Belge silme hatası:', error);
      alert(`Belge silinirken bir hata oluştu: ${error.message}`);
    }
  };

  const handleDekontEkle = async () => {
    try {
      if (!selectedOgrenci) {
        setErrorModal({
          isOpen: true,
          title: 'Öğrenci Seçimi',
          message: 'Lütfen öğrenci seçiniz'
        });
        return
      }

      if (!dekontFormData.dosya) {
        setErrorModal({
          isOpen: true,
          title: 'Dosya Seçimi',
          message: 'Lütfen bir dekont dosyası seçiniz!'
        });
        return;
      }

      if (!isletme) {
        setErrorModal({
          isOpen: true,
          title: 'Hata',
          message: 'İşletme bilgisi bulunamadı'
        });
        return;
      }

      // Mevcut dekont kontrolü
      const mevcutDekontlar = dekontlar.filter(d =>
        String(d.staj_id) === String(selectedOgrenci.staj_id) &&
        d.ay === dekontFormData.ay &&
        String(d.yil) === String(dekontFormData.yil)
      );

      // Onaylanmış dekont varsa yükleme yapılamaz
      const onaylanmisDekont = mevcutDekontlar.find(d => d.onay_durumu === 'onaylandi');
      if (onaylanmisDekont) {
        setErrorModal({
          isOpen: true,
          title: 'Dekont Yüklenemez',
          message: `${aylar[dekontFormData.ay - 1]} ${dekontFormData.yil} ayı için onaylanmış dekont bulunmaktadır. O ayla ilgili işlemler kapanmıştır.`
        });
        return;
      }

      // Beklemede dekont varsa ek dekont uyarısı göster
      const beklemedeDekont = mevcutDekontlar.find(d => d.onay_durumu === 'bekliyor');
      if (beklemedeDekont) {
        setEkDekontData({
          ogrenci: selectedOgrenci,
          ay: dekontFormData.ay,
          yil: dekontFormData.yil,
          mevcutDekontSayisi: mevcutDekontlar.length
        });
        setDekontModalOpen(false);
        setEkDekontModalOpen(true);
        return;
      }

      const formData = new FormData();
      formData.append('staj_id', selectedOgrenci.staj_id);
      formData.append('ay', dekontFormData.ay.toString());
      formData.append('yil', dekontFormData.yil.toString());
      formData.append('aciklama', dekontFormData.aciklama);
      formData.append('miktar', dekontFormData.miktar);
      formData.append('dosya', dekontFormData.dosya);

      // Doğru endpoint'i kullan
      const response = await fetch(`/api/admin/companies/${isletme.id}/dekontlar`, {
        method: 'POST',
        body: formData
      });

      // Ek dekont uyarısı (409 status code)
      if (response.status === 409) {
        const warningData = await response.json();
        setEkDekontData({
          ogrenci: selectedOgrenci,
          ay: dekontFormData.ay,
          yil: dekontFormData.yil,
          mevcutDekontSayisi: warningData.mevcutDekontSayisi || 1
        });
        setDekontModalOpen(false);
        setEkDekontModalOpen(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dekont yüklenemedi');
      }

      const result = await response.json();
      const newDekont = result.data || result;
      setDekontlar(prev => [newDekont, ...prev]);
      setDekontModalOpen(false);
      setSelectedOgrenci(null);
      setDekontFormData({
        ay: new Date().getMonth() + 1,
        yil: new Date().getFullYear(),
        aciklama: '',
        miktar: '',
        dosya: null
      });
      setSuccessModalOpen(true);
      setActiveTab('dekontlar');
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: 'Dekont Yükleme Hatası',
        message: `Bir hata oluştu: ${error.message}`
      });
    }
  }

  const handleEkDekontOnay = () => {
    if (ekDekontData) {
      setSelectedOgrenci(ekDekontData.ogrenci);
      setDekontFormData({
        ay: ekDekontData.ay,
        yil: ekDekontData.yil,
        aciklama: '',
        miktar: '',
        dosya: null
      });
      setEkDekontModalOpen(false);
      setDekontModalOpen(true);
    }
  };

  const handleDekontYuklemeClick = (ogrenci: Ogrenci) => {
    // Bu öğrencinin bu ay için mevcut dekontlarını kontrol et
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    
    const mevcutDekontlar = dekontlar.filter(d =>
      String(d.staj_id) === String(ogrenci.staj_id) &&
      d.ay === currentMonth &&
      String(d.yil) === String(currentYear)
    );
    
    // Onaylanmış dekont varsa yükleme yapılamaz
    const onaylanmisDekont = mevcutDekontlar.find(d => d.onay_durumu === 'onaylandi');
    if (onaylanmisDekont) {
      setErrorModal({
        isOpen: true,
        title: 'Dekont Yüklenemez',
        message: `${aylar[currentMonth - 1]} ${currentYear} ayı için onaylanmış dekont bulunmaktadır. O ayla ilgili işlemler kapanmıştır.`
      });
      return;
    }
    
    // Beklemede dekont varsa ek dekont uyarısı göster
    const beklemedeDekont = mevcutDekontlar.find(d => d.onay_durumu === 'bekliyor');
    if (beklemedeDekont) {
      setEkDekontData({
        ogrenci,
        ay: currentMonth,
        yil: currentYear,
        mevcutDekontSayisi: mevcutDekontlar.length
      });
      setEkDekontModalOpen(true);
      return;
    }
    
    // Normal dekont yükleme
    setSelectedOgrenci(ogrenci);
    setDekontModalOpen(true);
  };

  const handleDekontSil = async (dekont: Dekont) => {
    try {
      const response = await fetch(`/api/admin/dekontlar/${dekont.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Dekont silinemedi');
      }

      setDekontlar(dekontlar.filter(d => d.id !== dekont.id));
      setDeleteConfirmOpen(false);
      setPendingDeleteDekont(null);
    } catch (error: any) {
      console.error('Dekont silme hatası:', error);
      alert(`Dekont silinirken bir hata oluştu: ${error.message}`);
    }
  };

  const formatBelgeTur = (tur: string) => {
    switch (tur) {
      case 'sozlesme': return 'Sözleşme'
      case 'fesih_belgesi': return 'Fesih Belgesi'
      case 'usta_ogretici_belgesi': return 'Usta Öğretici Belgesi'
      default: return tur
    }
  }

  const getOnayDurumuRenk = (durum: string) => {
    switch (durum) {
      case 'bekliyor':
        return 'bg-yellow-100 text-yellow-800'
      case 'onaylandi':
        return 'bg-green-100 text-green-800'
      case 'reddedildi':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOnayDurumuText = (durum: string) => {
    switch (durum) {
      case 'bekliyor':
        return 'Bekliyor'
      case 'onaylandi':
        return 'Onaylandı'
      case 'reddedildi':
        return 'Reddedildi'
      default:
        return 'Bilinmiyor'
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('isletme_id')
    router.push('/')
  }

  // Sayfa değiştirme fonksiyonu
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  // Dosya indirme handler'ı
  const handleFileDownload = async (fileUrl: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Dosya indirme hatası:', error);
      alert('Dosya indirilemedi. Lütfen tekrar deneyiniz.');
    }
  };

  // Dosya görüntüleme handler'ı
  const handleFileView = async (fileUrl: string) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Dosya görüntüleme hatası:', error);
      alert('Dosya açılamadı. Lütfen tekrar deneyiniz.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isletme) {
    return null 
  }

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-indigo-600 to-indigo-800 pb-32">
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
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-white">
                  {isletme.ad}
                </h1>
                <p className="text-indigo-200 text-sm">İşletme Paneli</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNotificationModalOpen(true)}
                className="relative flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Mesajlar"
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
              {[
                { id: 'ogrenciler', icon: Users, label: 'Öğrenciler', count: ogrenciler.length },
                { id: 'dekontlar', icon: Receipt, label: 'Dekontlar', count: dekontlar.length },
                { id: 'belgeler', icon: FileText, label: 'Belgeler', count: filteredBelgeler.length }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
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
                        ? `${aylar[getCurrentMonth() - 1]} ayı dekont yükleme süresi geçti! Devlet katkı payı alamayabilirsiniz.`
                        : isKritikSure()
                        ? `${aylar[getCurrentMonth() - 1]} ayı dekontlarını ayın 10'una kadar yüklemelisiniz!`
                        : `${aylar[getCurrentMonth() - 1]} ayı için eksik dekontlar var.`
                      }
                    </p>
                    <p className="mb-3">
                      <strong>Eksik dekont olan öğrenciler ({eksikDekontOgrenciler.length} kişi):</strong>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {eksikDekontOgrenciler.map((ogrenci) => (
                        <div key={ogrenci.id} className={`p-3 rounded-lg ${
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
                          <button
                            onClick={() => handleDekontYuklemeClick(ogrenci)}
                            className={`mt-2 w-full flex items-center justify-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                              isGecikme() ? 'bg-red-600 text-white hover:bg-red-700' :
                              isKritikSure() ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                              'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Hemen Yükle
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 p-6 divide-y divide-gray-200">
            {activeTab === 'ogrenciler' && (
              <div className="space-y-6">
                {ogrenciler.map((ogrenci, index) => (
                  <div
                    key={ogrenci.id}
                    className={`pt-6 first:pt-0 p-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                      index % 2 === 0
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:from-blue-100 hover:to-indigo-100'
                        : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:from-purple-100 hover:to-pink-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          index % 2 === 0
                            ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600'
                            : 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600'
                        }`}>
                          <User className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </h3>
                          <div className="flex items-center space-x-3 mt-2 text-sm">
                            <div className={`px-3 py-1.5 rounded-lg font-medium min-w-[80px] text-center ${
                              index % 2 === 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {ogrenci.sinif}
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg font-medium ${
                              index % 2 === 0
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}>
                              No: {ogrenci.no}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDekontYuklemeClick(ogrenci)}
                        className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                          index % 2 === 0
                            ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                            : 'text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Dekont Yükle
                      </button>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                        <span className={`px-2 py-1 rounded-lg font-medium ${
                          index % 2 === 0
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {ogrenci.alanlar?.ad || "Alan bilgisi yok"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">Staja Başlama:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(ogrenci.baslangic_tarihi).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">Koordinatör:</span>{' '}
                        <span className={`px-2 py-1 rounded-lg font-medium ml-1 ${
                          index % 2 === 0
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {ogrenci.ogretmen_ad} {ogrenci.ogretmen_soyad}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'dekontlar' && (
              <div className="space-y-4">
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-900 text-sm">
                  <span className="font-semibold">Dekontu yanlış yüklediyseniz silebilirsiniz.</span> Uyarı: Onaylanmış dekontlarda silme işlemi yoktur.
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Dekontlar</h2>
                  <button
                    onClick={() => setDekontModalOpen(true)}
                    className="flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Dekont Ekle
                  </button>
                </div>

                {dekontlar.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <Receipt className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Dekont Bulunamadı</h3>
                    <p className="mt-2 text-sm text-gray-500">Henüz dekont yüklenmemiş.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {currentDekontlar.map((dekont, index) => (
                        <div
                          key={dekont.id}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {dekont.stajlar?.ogrenciler?.ad} {dekont.stajlar?.ogrenciler?.soyad}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOnayDurumuRenk(dekont.onay_durumu)}`}>
                                  {getOnayDurumuText(dekont.onay_durumu)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                                {dekont.stajlar?.ogrenciler?.sinif && (
                                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                    {dekont.stajlar.ogrenciler.sinif}
                                  </span>
                                )}
                                {dekont.stajlar?.ogrenciler?.alanlar?.ad && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                    {dekont.stajlar.ogrenciler.alanlar.ad}
                                  </span>
                                )}
                                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
                                  {aylar[dekont.ay - 1]} {dekont.yil}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs">
                                  <span className="font-bold">Gönderen:</span> {dekont.yukleyen_kisi || 'Bilinmiyor'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {dekont.dosya_url && (
                                <button
                                  onClick={() => handleFileDownload(dekont.dosya_url!, `dekont-${dekont.stajlar?.ogrenciler?.ad}-${aylar[dekont.ay - 1]}-${dekont.yil}`)}
                                  className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Dekontu İndir"
                                >
                                  <Download className="h-5 w-5" />
                                </button>
                              )}
                              {(dekont.onay_durumu === 'bekliyor' || dekont.onay_durumu === 'reddedildi') &&
                               dekont.yukleyen_kisi && !dekont.yukleyen_kisi.includes('(Öğretmen)') && (
                                <button
                                  title="Dekontu Sil"
                                  className="p-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg transition-colors"
                                  onClick={() => {
                                    setPendingDeleteDekont(dekont);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-xs font-bold text-green-600">
                              Miktar: {dekont.miktar ? dekont.miktar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}
                            </span>
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

                    {/* Sayfalama */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
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
                    İşletme Belgeleri ({filteredBelgeler.length})
                  </h2>
                  <button
                    onClick={() => setBelgeModalOpen(true)}
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
                      <option value="sozlesme">Sözleşme</option>
                      <option value="fesih_belgesi">Fesih Belgesi</option>
                      <option value="usta_ogretici_belgesi">Usta Öğretici Belgesi</option>
                      <option value="diger">Diğer</option>
                    </select>
                  </div>
                </div>

                {filteredBelgeler.length > 0 ? (
                  <div className="space-y-6">
                    {filteredBelgeler.map((belge) => (
                      <div key={belge.id} className="pt-6 first:pt-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center">
                              <FileText className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900">
                                {belge.ad}
                              </h3>
                              <div className="flex items-center space-x-3 mt-2 text-sm">
                                <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">
                                  {formatBelgeTur(belge.tur)}
                                </div>
                                {belge.yukleyen_kisi && (
                                  <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">
                                    {belge.yukleyen_kisi}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {belge.dosya_url && (
                              <button
                                onClick={() => handleFileView(belge.dosya_url!)}
                                className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4 mr-1.5" />
                                İndir
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedBelge(belge)
                                setBelgeDeleteModalOpen(true)
                              }}
                              className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              Sil
                            </button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-500">
                            Yüklenme Tarihi: {new Date(belge.yukleme_tarihi).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz Belge Yok</h3>
                    <p className="mt-2 text-sm text-gray-500">Bu işletmeye ait hiç belge bulunmamaktadır.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dekont Modal */}
      <Modal isOpen={dekontModalOpen} onClose={() => setDekontModalOpen(false)} title="Yeni Dekont Ekle">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci Adı <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOgrenci?.id ? String(selectedOgrenci.id) : ''}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue === '') {
                  setSelectedOgrenci(null);
                } else {
                  const ogrenci = ogrenciler.find(o => String(o.id) === selectedValue);
                  setSelectedOgrenci(ogrenci || null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Öğrenci Seçiniz</option>
              {ogrenciler.map((ogrenci) => (
                <option key={ogrenci.id} value={String(ogrenci.id)}>
                  {ogrenci.ad} {ogrenci.soyad} - {ogrenci.sinif}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dekont Dönemi <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <select
                  value={dekontFormData.ay}
                  onChange={(e) => setDekontFormData({...dekontFormData, ay: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Ay Seçiniz</option>
                  {aylar.map((ay, index) => (
                    <option key={index} value={index + 1}>{ay}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={dekontFormData.yil}
                  onChange={(e) => setDekontFormData({...dekontFormData, yil: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Yıl Seçiniz</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(yil => (
                    <option key={yil} value={yil}>{yil}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <textarea
              value={dekontFormData.aciklama}
              onChange={(e) => setDekontFormData({...dekontFormData, aciklama: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Dekont açıklamasını giriniz (opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miktar (₺)
            </label>
            <input
              type="number"
              step="0.01"
              value={dekontFormData.miktar}
              onChange={(e) => setDekontFormData({...dekontFormData, miktar: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00 (opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dekont Dosyası <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="dekont-dosya"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDekontFormData({...dekontFormData, dosya: e.target.files?.[0] || null})}
                className="hidden"
              />
              <label htmlFor="dekont-dosya" className="cursor-pointer">
                <Receipt className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {dekontFormData.dosya ? dekontFormData.dosya.name : 'Dekont dosyası seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setDekontModalOpen(false)
                setSelectedOgrenci(null)
                setDekontFormData({ 
                  ay: new Date().getMonth() + 1, 
                  yil: new Date().getFullYear(), 
                  aciklama: '', 
                  miktar: '', 
                  dosya: null 
                })
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleDekontEkle}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
            >
              Dekont Ekle
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Modal */}
      <Modal isOpen={belgeModalOpen} onClose={() => setBelgeModalOpen(false)} title="Yeni Belge Ekle">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Türü
            </label>
            <select
              value={belgeFormData.tur}
              onChange={(e) => setBelgeFormData({...belgeFormData, tur: e.target.value, customTur: ''})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="sozlesme">Sözleşme</option>
              <option value="fesih_belgesi">Fesih Belgesi</option>
              <option value="usta_ogretici_belgesi">Usta Öğretici Belgesi</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          {belgeFormData.tur === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özel Belge Türü
              </label>
              <input
                type="text"
                value={belgeFormData.customTur}
                onChange={(e) => setBelgeFormData({...belgeFormData, customTur: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Belge türünü yazınız"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Dosyası <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="belge-dosya"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setBelgeFormData({
                    ...belgeFormData,
                    dosya: file,
                    ad: file ? file.name.split('.')[0] : '' // Dosya adından uzantıyı çıkar
                  });
                }}
                className="hidden"
              />
              <label htmlFor="belge-dosya" className="cursor-pointer">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {belgeFormData.dosya ? belgeFormData.dosya.name : 'Belge dosyası seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG, DOC, DOCX formatları desteklenir
                </p>
              </label>
            </div>
            {belgeFormData.dosya && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Belge Adı:</strong> {belgeFormData.ad}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setBelgeModalOpen(false)
                setBelgeFormData({ ad: '', tur: 'sozlesme', customTur: '', dosya: null })
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleBelgeEkle}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200"
            >
              Belge Ekle
            </button>
          </div>
        </div>
      </Modal>

      {/* Belge Silme Onay Modal */}
      <Modal isOpen={belgeDeleteModalOpen} onClose={() => setBelgeDeleteModalOpen(false)} title="Belgeyi Sil">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            "{selectedBelge?.ad}" belgesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setBelgeDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (selectedBelge) {
                  handleBelgeSil(selectedBelge);
                }
                setBelgeDeleteModalOpen(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* Dekont Silme Onay Modal */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Dekontu Sil">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bu dekontu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (pendingDeleteDekont) {
                  handleDekontSil(pendingDeleteDekont);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* Başarı Modal */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Başarılı">
        <div className="space-y-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <p className="text-sm text-gray-600">
              Dekont başarıyla yüklendi!
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      {/* Hata Modal */}
      <Modal isOpen={errorModal.isOpen} onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })} title={errorModal.title}>
        <div className="space-y-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500 mr-3" />
            <p className="text-sm text-gray-600">
              {errorModal.message}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      {/* Bildirim Modal */}
      <Modal isOpen={notificationModalOpen} onClose={() => setNotificationModalOpen(false)} title="Bildirimler">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {notifications.length} bildirim
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-3">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Henüz bildirim yok</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.is_read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleString('tr-TR')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          notification.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : notification.priority === 'normal'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority === 'high' ? 'Yüksek' :
                           notification.priority === 'normal' ? 'Orta' : 'Düşük'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Okundu İşaretle"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* PIN Değiştirme Modal */}
      <Modal isOpen={pinChangeModalOpen} onClose={() => setPinChangeModalOpen(false)} title="PIN Değiştir">
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Güvenlik Uyarısı:</strong> Varsayılan PIN'inizi değiştirmeniz önemle tavsiye edilir.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni PIN (4 haneli)
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]{4}"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0000"
                disabled={pinChangeLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni PIN (Tekrar)
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]{4}"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0000"
                disabled={pinChangeLoading}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setPinChangeModalOpen(false);
                setNewPin('');
                setConfirmPin('');
              }}
              disabled={pinChangeLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Şimdi Değil
            </button>
            <button
              onClick={handlePinChange}
              disabled={pinChangeLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {pinChangeLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
              PIN'i Değiştir
            </button>
          </div>
        </div>
      </Modal>

      {/* Ek Dekont Uyarı Modal */}
      <Modal isOpen={ekDekontModalOpen} onClose={() => setEkDekontModalOpen(false)} title="Ek Dekont Uyarısı">
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800 font-medium">
                Bu öğrenci için <strong>{ekDekontData?.ay && aylar[ekDekontData.ay - 1]} {ekDekontData?.yil}</strong> ayında
                zaten <strong>{ekDekontData?.mevcutDekontSayisi}</strong> adet beklemede dekont bulunmaktadır.
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Ek dekont yüklemek istediğinizden emin misiniz?</strong>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Ek dekont dosya adına "ek{ekDekontData?.mevcutDekontSayisi}" eklenir (örn: dekont-ek{ekDekontData?.mevcutDekontSayisi}.pdf)
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setEkDekontModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleEkDekontOnay}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Evet, Ek Dekont Yükle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}