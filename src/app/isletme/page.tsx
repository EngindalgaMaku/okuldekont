'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, FileText, LogOut, User, Upload, Plus, Download, Eye, Search, Filter, Receipt, Loader, GraduationCap, Calendar, CheckCircle, Clock, XCircle, Trash2, Bell, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import Modal from '@/components/ui/Modal'
import PinChangeModal from '@/components/ui/PinChangeModal'

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
  red_nedeni?: string
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
  onay_durumu?: 'PENDING' | 'APPROVED' | 'REJECTED'
  onaylanma_tarihi?: string
  red_nedeni?: string
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
  const [successMessage, setSuccessMessage] = useState('Dekont başarıyla yüklendi!');
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  
  // Dekont filtreleme için state'ler
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([]);
  
  // Bildirim states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const NOTIFICATIONS_PER_PAGE = 5;
  
  // PIN change modal state
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [isManualPinChange, setIsManualPinChange] = useState(false);
  
  // Ek dekont uyarı modal state
  const [ekDekontModalOpen, setEkDekontModalOpen] = useState(false);
  const [ekDekontData, setEkDekontData] = useState<{
    ogrenci: Ogrenci;
    ay: number;
    yil: number;
    mevcutDekontSayisi: number;
  } | null>(null);

  // Collapsible student groups state
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  // Dekont takip sistemi için yardımcı fonksiyonlar
  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentYear = () => new Date().getFullYear();
  const getCurrentDay = () => new Date().getDate();
  
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  // Önceki ay için dekont eksik olan öğrencileri tespit et
  const getEksikDekontOgrenciler = () => {
    const currentDate = new Date();
    const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const previousYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    
    return ogrenciler.filter(ogrenci => {
      // Öğrencinin başlangıç tarihini kontrol et
      const startDate = new Date(ogrenci.baslangic_tarihi);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      
      // Eğer öğrenci önceki aydan sonra işe başlamışsa, dekont aranmaz
      if (previousYear < startYear || (previousYear === startYear && previousMonth < startMonth)) {
        return false;
      }
      
      // Önceki ay için dekont kontrolü
      const ogrenciDekontlari = dekontlar.filter(d =>
        String(d.staj_id) === String(ogrenci.staj_id) &&
        d.ay === previousMonth &&
        String(d.yil) === String(previousYear)
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

  // Öğrencinin başlangıç tarihinden önceki aya kadar olan ayları getir
  const getMonthsFromStartToPrevious = (startDate: string): { month: number, year: number, label: string }[] => {
    const start = new Date(startDate);
    const currentDate = new Date();
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    const months: { month: number, year: number, label: string }[] = [];
    
    // Öğrencinin başladığı aydan başla (1 gün bile çalışsa dekont gerekir)
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= previousMonth) {
      months.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        label: aylar[current.getMonth()].substring(0, 3) // İlk 3 harf (Oca, Şub, vb.)
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months.slice(-6); // Son 6 ayı göster (alan tasarrufu için)
  };

  // Belirli ay için dekont durumunu kontrol et - staj_id kullanarak
  const getDekontStatus = (stajId: string, month: number, year: number): 'approved' | 'pending' | 'rejected' | 'none' => {
    const dekont = dekontlar.find(d =>
      String(d.staj_id) === String(stajId) &&
      d.ay === month &&
      String(d.yil) === String(year)
    );
    
    if (!dekont) return 'none';
    if (dekont.onay_durumu === 'onaylandi') return 'approved';
    if (dekont.onay_durumu === 'reddedildi') return 'rejected';
    return 'pending';
  };

  // Helper functions for dekont statistics - staj_id kullanarak
  const getPendingDekontCount = (stajId: string): number => {
    return dekontlar.filter(d =>
      String(d.staj_id) === String(stajId) &&
      d.onay_durumu === 'bekliyor'
    ).length;
  };

  const getRejectedDekontCount = (stajId: string): number => {
    return dekontlar.filter(d =>
      String(d.staj_id) === String(stajId) &&
      d.onay_durumu === 'reddedildi'
    ).length;
  };

  const getLastMonthDekontStatus = (stajId: string): string => {
    const lastMonth = getCurrentMonth() === 1 ? 12 : getCurrentMonth() - 1;
    const lastMonthYear = getCurrentMonth() === 1 ? getCurrentYear() - 1 : getCurrentYear();
    
    const lastMonthStatus = getDekontStatus(stajId, lastMonth, lastMonthYear);
    
    switch (lastMonthStatus) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '➖';
    }
  };

  // Group dekontlar by student
  const groupDekontlarByStudent = () => {
    const grouped: { [key: string]: Dekont[] } = {};
    
    filteredDekontlar.forEach(dekont => {
      const studentName = `${dekont.stajlar?.ogrenciler?.ad} ${dekont.stajlar?.ogrenciler?.soyad}`;
      if (!grouped[studentName]) {
        grouped[studentName] = [];
      }
      grouped[studentName].push(dekont);
    });
    
    return grouped;
  };

  // Toggle group expansion - accordion behavior
  const toggleGroupExpansion = (studentName: string) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = prev[studentName];
      
      // If clicking on an already expanded student, just close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [studentName]: false
        };
      }
      
      // Otherwise, close all others and open the clicked one
      const newState: {[key: string]: boolean} = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[studentName] = true;
      
      return newState;
    });
  };

  const eksikDekontOgrenciler = getEksikDekontOgrenciler();

  // Belge form verileri
  const [belgeFormData, setBelgeFormData] = useState({
    ad: '',
    tur: 'sozlesme',
    customTur: '',
    dosya: null as File | null
  })

  // Dekont form verileri - önceki aya ayarlı
  const [dekontFormData, setDekontFormData] = useState(() => {
    const currentDate = new Date();
    const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const yearForPreviousMonth = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    
    return {
      ay: previousMonth,
      yil: yearForPreviousMonth,
      aciklama: '',
      miktar: '',
      dosya: null as File | null
    };
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

      // Agresif mobil cache-busting stratejisi
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const cacheBuster = `?_cb=${timestamp}&_r=${randomId}&_mobile=${navigator.userAgent.includes('Mobile') ? '1' : '0'}&_v=${Math.floor(timestamp/1000)}`
      
      const noCacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
        'If-None-Match': '*'
      };

      // İşletme verilerini API'dan getir
      const isletmeResponse = await fetch(`/api/companies/${sessionIsletmeId}${cacheBuster}`, {
        headers: noCacheHeaders
      });
      if (!isletmeResponse.ok) {
        throw new Error('İşletme verisi getirilemedi');
      }
      
      const isletmeData = await isletmeResponse.json();
      setIsletme(isletmeData);
      
      // Check if PIN needs to be changed (default PIN is 1234)
      if (isletmeData.pin === '1234') {
        setTimeout(() => {
          setIsManualPinChange(false); // Otomatik açılma
          setPinChangeModalOpen(true)
        }, 1000)
      }
      
      // İşletme bildirimleri getir
      fetchNotifications(isletmeData.id);

      // İşletmenin öğrencilerini getir
      const studentsResponse = await fetch(`/api/companies/${sessionIsletmeId}/students${cacheBuster}`, {
        headers: noCacheHeaders
      });
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setOgrenciler(studentsData);
      }

      // İşletmenin dekontlarını getir
      const dekontResponse = await fetch(`/api/companies/${sessionIsletmeId}/dekontlar${cacheBuster}`, {
        headers: noCacheHeaders
      });
      if (dekontResponse.ok) {
        const dekontData = await dekontResponse.json();
        setDekontlar(dekontData);
      }

      // İşletmenin belgelerini getir
      const belgeResponse = await fetch(`/api/companies/${sessionIsletmeId}/documents${cacheBuster}`, {
        headers: noCacheHeaders
      });
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
      const cacheBuster = `?_t=${Date.now()}&r=${Math.random()}`;
      const noCacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      const response = await fetch(`/api/companies/${isletmeId}/notifications${cacheBuster}`, {
        headers: noCacheHeaders
      });
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
      const response = await fetch(`/api/companies/${isletme.id}/notifications`, {
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
      const response = await fetch(`/api/companies/${isletme.id}/notifications`, {
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
      const response = await fetch(`/api/companies/${isletme.id}/notifications`, {
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

  // Dekont filtreleme
  useEffect(() => {
    let filtered = dekontlar

    if (selectedStudentFilter !== 'all') {
      filtered = filtered.filter(dekont =>
        `${dekont.stajlar?.ogrenciler?.ad} ${dekont.stajlar?.ogrenciler?.soyad}` === selectedStudentFilter
      )
    }

    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(dekont =>
        dekont.onay_durumu === selectedStatusFilter
      )
    }

    // Kronolojik sıralama - en yeni ay en üstte
    filtered = filtered.sort((a, b) => {
      // Önce yıla göre sırala (büyükten küçüğe)
      if (a.yil !== b.yil) {
        return Number(b.yil) - Number(a.yil);
      }
      // Yıl aynıysa aya göre sırala (büyükten küçüğe)
      if (a.ay !== b.ay) {
        return b.ay - a.ay;
      }
      // Ay ve yıl aynıysa oluşturulma tarihine göre sırala (en yeni en üstte)
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    setFilteredDekontlar(filtered)
  }, [dekontlar, selectedStudentFilter, selectedStatusFilter])

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredDekontlar.length / dekontsPerPage)
  const currentDekontlar = filteredDekontlar.slice(
    (currentPage - 1) * dekontsPerPage,
    currentPage * dekontsPerPage
  )

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

      const response = await fetch(`/api/companies/${isletme.id}/documents`, {
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
    if (!isletme) {
      alert('İşletme bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    try {
      const response = await fetch(`/api/companies/${isletme.id}/documents?belgeId=${belge.id}`, {
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
      console.log('🚀 Dekont yükleme işlemi başlatılıyor...')

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

      console.log('📁 Seçilen dosya:', {
        name: dekontFormData.dosya.name,
        size: dekontFormData.dosya.size,
        type: dekontFormData.dosya.type
      })

      // Dosya boyutu kontrolü (frontend)
      if (dekontFormData.dosya.size > 10 * 1024 * 1024) {
        setErrorModal({
          isOpen: true,
          title: 'Dosya Boyutu Hatası',
          message: 'Dosya boyutu 10MB\'dan büyük olamaz!'
        });
        return;
      }

      // Dosya türü kontrolü (frontend)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(dekontFormData.dosya.type)) {
        setErrorModal({
          isOpen: true,
          title: 'Dosya Türü Hatası',
          message: 'Sadece PDF, JPG ve PNG dosyaları yükleyebilirsiniz!'
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

      // Tarih validasyonu - öğrenci başlangıç tarihinden önce dekont yüklenemez
      const startDate = new Date(selectedOgrenci.baslangic_tarihi);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      
      if (dekontFormData.yil < startYear ||
          (dekontFormData.yil === startYear && dekontFormData.ay < startMonth)) {
        setErrorModal({
          isOpen: true,
          title: 'Geçersiz Tarih',
          message: `${selectedOgrenci.ad} ${selectedOgrenci.soyad} ${startDate.toLocaleDateString('tr-TR')} tarihinde işe başlamış. Bu tarihten önceki aylar için dekont yükleyemezsiniz.`
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

      console.log('📋 FormData oluşturuluyor...', {
        staj_id: selectedOgrenci.staj_id,
        ay: dekontFormData.ay,
        yil: dekontFormData.yil,
        aciklama: dekontFormData.aciklama,
        miktar: dekontFormData.miktar
      })

      const formData = new FormData();
      formData.append('staj_id', selectedOgrenci.staj_id);
      formData.append('ay', dekontFormData.ay.toString());
      formData.append('yil', dekontFormData.yil.toString());
      formData.append('aciklama', dekontFormData.aciklama);
      formData.append('miktar', dekontFormData.miktar);
      formData.append('dosya', dekontFormData.dosya);

      console.log('🌐 API çağrısı yapılıyor:', `/api/companies/${isletme.id}/dekontlar`)

      // Doğru endpoint'i kullan
      const response = await fetch(`/api/companies/${isletme.id}/dekontlar`, {
        method: 'POST',
        body: formData
      });

      console.log('📡 API yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

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
        console.error('❌ API hatası:', errorData)
        throw new Error(errorData.error || 'Dekont yüklenemedi');
      }

      const result = await response.json();
      console.log('✅ Dekont başarıyla yüklendi:', result)
      
      // Modal'ı kapat
      setDekontModalOpen(false);
      setSelectedOgrenci(null);
      setDekontFormData(() => {
        const currentDate = new Date();
        const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
        const yearForPreviousMonth = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        
        return {
          ay: previousMonth,
          yil: yearForPreviousMonth,
          aciklama: '',
          miktar: '',
          dosya: null
        };
      });
      
      setSuccessMessage('Dekont başarıyla yüklendi!');
      setSuccessModalOpen(true);
      setActiveTab('dekontlar');
      
      // Veri yenileme - hard refresh yerine veri çekme
      console.log('🔄 Veri yenileniyor...')
      await fetchData();
      
    } catch (error: any) {
      console.error('❌ Dekont yükleme hatası:', error)
      setErrorModal({
        isOpen: true,
        title: 'Dekont Yükleme Hatası',
        message: `Bir hata oluştu: ${error.message}`
      });
    }
  }

  const handleEkDekontOnay = async () => {
    if (ekDekontData && isletme) {
      try {
        console.log('🚀 Ek dekont yükleme işlemi başlatılıyor...', ekDekontData)

        // Öğrenci listesinden doğru öğrenciyi bul
        const ogrenci = ogrenciler.find(o => String(o.id) === String(ekDekontData.ogrenci.id));
        const selectedOgrenciToUse = ogrenci || ekDekontData.ogrenci;

        // Dosya seçimi için input oluştur
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            console.log('📁 Ek dekont dosyası seçildi:', {
              name: file.name,
              size: file.size,
              type: file.type
            })

            // Dosya boyutu kontrolü
            if (file.size > 10 * 1024 * 1024) {
              setErrorModal({
                isOpen: true,
                title: 'Dosya Boyutu Hatası',
                message: 'Dosya boyutu 10MB\'dan büyük olamaz!'
              });
              return;
            }

            // Dosya türü kontrolü
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
              setErrorModal({
                isOpen: true,
                title: 'Dosya Türü Hatası',
                message: 'Sadece PDF, JPG ve PNG dosyaları yükleyebilirsiniz!'
              });
              return;
            }

            // FormData hazırla
            const formData = new FormData();
            formData.append('staj_id', selectedOgrenciToUse.staj_id);
            formData.append('ay', ekDekontData.ay.toString());
            formData.append('yil', ekDekontData.yil.toString());
            formData.append('aciklama', `Ek dekont - ${aylar[ekDekontData.ay - 1]} ${ekDekontData.yil}`);
            formData.append('miktar', '');
            formData.append('dosya', file);

            console.log('🌐 Ek dekont API çağrısı yapılıyor...')

            try {
              const response = await fetch(`/api/companies/${isletme.id}/dekontlar`, {
                method: 'POST',
                body: formData
              });

              console.log('📡 Ek dekont API yanıtı:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
              })

              if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Ek dekont API hatası:', errorData)
                throw new Error(errorData.error || 'Ek dekont yüklenemedi');
              }

              const result = await response.json();
              console.log('✅ Ek dekont başarıyla yüklendi:', result)
              
              setSuccessMessage('Ek dekont başarıyla yüklendi!');
              setSuccessModalOpen(true);
              setActiveTab('dekontlar');
              
              // Veri yenileme - hard refresh yerine fetchData
              console.log('🔄 Ek dekont sonrası veri yenileniyor...')
              await fetchData();
              
            } catch (error: any) {
              console.error('❌ Ek dekont yükleme hatası:', error)
              setErrorModal({
                isOpen: true,
                title: 'Ek Dekont Yükleme Hatası',
                message: `Bir hata oluştu: ${error.message}`
              });
            }
          }
        };
        
        // Modal'ı kapat ve dosya seçimi aç
        setEkDekontModalOpen(false);
        input.click();
        
      } catch (error: any) {
        console.error('❌ Ek dekont hatası:', error)
        setErrorModal({
          isOpen: true,
          title: 'Ek Dekont Hatası',
          message: `Bir hata oluştu: ${error.message}`
        });
      }
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
    if (!isletme) {
      setErrorModal({
        isOpen: true,
        title: 'Hata',
        message: 'İşletme bilgisi bulunamadı'
      });
      return;
    }

    try {
      console.log('🗑️ Dekont silme işlemi başlatılıyor:', {
        dekontId: dekont.id,
        ogrenci: `${dekont.stajlar?.ogrenciler?.ad} ${dekont.stajlar?.ogrenciler?.soyad}`,
        ay: dekont.ay,
        yil: dekont.yil
      })

      const response = await fetch(`/api/companies/${isletme.id}/dekontlar?dekontId=${dekont.id}`, {
        method: 'DELETE'
      });

      console.log('📡 Dekont silme API yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Dekont silme API hatası:', errorData)
        throw new Error(errorData.error || 'Dekont silinemedi');
      }

      console.log('✅ Dekont başarıyla silindi')

      // Başarılı silme işlemi
      setDeleteConfirmOpen(false);
      setPendingDeleteDekont(null);
      setSuccessMessage('Dekont başarıyla silindi!');
      setSuccessModalOpen(true);
      
      // Veri yenileme - hard refresh yerine fetchData
      console.log('🔄 Dekont silme sonrası veri yenileniyor...')
      await fetchData();
      
    } catch (error: any) {
      console.error('❌ Dekont silme hatası:', error);
      setDeleteConfirmOpen(false);
      setPendingDeleteDekont(null);
      setErrorModal({
        isOpen: true,
        title: 'Dekont Silme Hatası',
        message: `Dekont silinirken bir hata oluştu: ${error.message}`
      });
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

  const getBelgeOnayDurumu = (durum?: string) => {
    switch (durum) {
      case 'APPROVED':
        return {
          text: 'Onaylandı',
          bg: 'bg-green-100',
          color: 'text-green-800',
          icon: CheckCircle
        }
      case 'REJECTED':
        return {
          text: 'Reddedildi',
          bg: 'bg-red-100',
          color: 'text-red-800',
          icon: XCircle
        }
      case 'PENDING':
      default:
        return {
          text: 'Onay Bekliyor',
          bg: 'bg-yellow-100',
          color: 'text-yellow-800',
          icon: Clock
        }
    }
  }

  const getOnayDurumuRenk = (durum: string) => {
    switch (durum) {
      case 'bekliyor':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border-yellow-300 hover:from-yellow-200 hover:to-yellow-300'
      case 'onaylandi':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border-green-300 hover:from-green-200 hover:to-green-300'
      case 'reddedildi':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 border-red-300 hover:from-red-200 hover:to-red-300'
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border-gray-300 hover:from-gray-200 hover:to-gray-300'
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
      // URL'den dosya adını çıkar
      const urlParts = fileUrl.split('/');
      const originalFileName = urlParts[urlParts.length - 1];
      
      // API endpoint'i kullanarak dosyayı indir
      const downloadUrl = `/api/admin/dekontlar/download/${originalFileName}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
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

  // Dosya görüntüleme handler'ı - Belgeler için özel endpoint
  const handleFileView = async (fileUrl: string) => {
    try {
      // Belge dosyaları için doğrudan URL'yi kullan
      if (fileUrl.startsWith('http') || fileUrl.startsWith('/uploads/')) {
        window.open(fileUrl, '_blank');
      } else {
        // Eğer tam URL değilse, belgeler klasörü ekle
        const fullUrl = fileUrl.startsWith('/') ? fileUrl : `/uploads/belgeler/${fileUrl}`;
        window.open(fullUrl, '_blank');
      }
    } catch (error) {
      console.error('Dosya görüntüleme hatası:', error);
      alert('Dosya açılamadı. Lütfen tekrar deneyiniz.');
    }
  };

  // Belge indirme handler'ı
  const handleBelgeDownload = async (fileUrl: string, fileName: string) => {
    try {
      // URL'den dosya adını çıkar
      const urlParts = fileUrl.split('/');
      const originalFileName = urlParts[urlParts.length - 1];
      
      // API endpoint'i kullanarak dosyayı indir
      const downloadUrl = `/api/admin/belgeler/download/${encodeURIComponent(originalFileName)}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Belge indirme hatası:', error);
      alert('Belge indirilemedi. Lütfen tekrar deneyiniz.');
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
      <div className="relative bg-gradient-to-b from-indigo-600 to-indigo-800 pb-24 sm:pb-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto pt-4 sm:pt-6 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0 hidden sm:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-2xl transform rotate-6 scale-105 opacity-20" />
                  <div className="relative p-3 bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="sm:ml-6 min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {isletme.ad}
                </h1>
                <p className="text-indigo-200 text-xs sm:text-sm">İşletme Paneli</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setNotificationModalOpen(true)}
                className="relative flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Mesajlar"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setIsManualPinChange(true); // Manuel PIN değişikliği
                  setPinChangeModalOpen(true);
                }}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="PIN Değiştir"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 sm:mt-8">
            <nav className="-mb-px flex space-x-0.5 sm:space-x-4" aria-label="Tabs">
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
                      group relative min-w-0 flex-1 overflow-hidden py-1.5 sm:py-3 px-1 sm:px-6 rounded-t-xl text-xs sm:text-sm font-medium text-center hover:bg-white hover:bg-opacity-10 transition-all duration-200
                      ${isActive
                        ? 'bg-white text-indigo-700'
                        : 'text-indigo-100 hover:text-white'}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[3rem] sm:min-h-[3.5rem]">
                      <Icon className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${isActive ? 'text-indigo-700' : 'text-indigo-300 group-hover:text-white'} mb-0.5 sm:mb-0 sm:mr-2 flex-shrink-0`} />
                      <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-sm font-medium truncate max-w-full">
                          {tab.label}
                        </span>
                        <span className="text-[9px] sm:text-xs font-semibold leading-none">
                          ({tab.count > 99 ? '99+' : tab.count})
                        </span>
                      </div>
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
      <main className="relative -mt-24 sm:-mt-32 pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Okunmamış Mesaj Bildirimi */}
          {unreadCount > 0 && (
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-indigo-100 border-l-4 border-purple-500">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="ml-2 sm:ml-3 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-purple-800">
                    📬 Okunmamış Mesajınız Var!
                  </h3>
                  <div className="mt-2 text-xs sm:text-sm text-purple-700">
                    <p className="font-medium mb-2">
                      Size gönderilmiş {unreadCount} adet okunmamış mesaj bulunmaktadır.
                    </p>
                    <div className="space-y-2">
                      {notifications.filter(n => !n.is_read).slice(0, 3).map((notification) => (
                        <div key={notification.id} className="p-2 sm:p-3 bg-purple-100 border border-purple-200 rounded-lg">
                          <div className="font-medium text-purple-900 text-sm">
                            {notification.title}
                          </div>
                          <div className="text-xs text-purple-700 mt-1">
                            Gönderen: {notification.sent_by} - {new Date(notification.created_at).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-purple-600 mt-1 truncate">
                            {notification.content.length > 80 ? notification.content.substring(0, 80) + '...' : notification.content}
                          </div>
                        </div>
                      ))}
                      {unreadCount > 3 && (
                        <div className="text-xs text-purple-600 font-medium">
                          ... ve {unreadCount - 3} mesaj daha
                        </div>
                      )}
                    </div>
                    <button
                      onClick={markAllAsRead}
                      className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Okundu Olarak İşaretle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dekont Takip Uyarı Sistemi */}
          {eksikDekontOgrenciler.length > 0 && (
            <div className={`mb-4 sm:mb-6 rounded-xl sm:rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5 p-4 sm:p-6 ${
              isGecikme()
                ? 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500'
                : isKritikSure()
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {isGecikme() ? (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  ) : isKritikSure() ? (
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  ) : (
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  )}
                </div>
                <div className="ml-2 sm:ml-3 flex-1">
                  <h3 className={`text-base sm:text-lg font-medium ${
                    isGecikme() ? 'text-red-800' : isKritikSure() ? 'text-yellow-800' : 'text-blue-800'
                  }`}>
                    {isGecikme()
                      ? '🚨 GECİKME UYARISI!'
                      : isKritikSure()
                      ? '⏰ KRİTİK SÜRE!'
                      : '📅 Dekont Hatırlatması'
                    }
                  </h3>
                  <div className={`mt-2 text-xs sm:text-sm ${
                    isGecikme() ? 'text-red-700' : isKritikSure() ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    <p className="font-medium mb-2">
                      {isGecikme()
                        ? `${aylar[getCurrentMonth() === 1 ? 11 : getCurrentMonth() - 2]} ayı dekont yükleme süresi geçti! Devlet katkı payı alamayabilirsiniz.`
                        : isKritikSure()
                        ? `${aylar[getCurrentMonth() === 1 ? 11 : getCurrentMonth() - 2]} ayı dekontlarını ayın 10'una kadar yüklemelisiniz!`
                        : `${aylar[getCurrentMonth() === 1 ? 11 : getCurrentMonth() - 2]} ayı için eksik dekontlar var.`
                      }
                    </p>
                    <p className="mb-3">
                      <strong>Eksik dekont olan öğrenciler ({eksikDekontOgrenciler.length} kişi):</strong>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {eksikDekontOgrenciler.map((ogrenci) => (
                        <div key={ogrenci.id} className={`p-2 sm:p-3 rounded-lg ${
                          isGecikme() ? 'bg-red-100 border border-red-200' :
                          isKritikSure() ? 'bg-yellow-100 border border-yellow-200' :
                          'bg-blue-100 border border-blue-200'
                        }`}>
                          <div className="font-medium text-gray-900 text-sm">
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

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 p-4 sm:p-6 divide-y divide-gray-200">
            {activeTab === 'ogrenciler' && (
              <div className="space-y-6 p-6">
                {ogrenciler.map((ogrenci, index) => {
                   const ogrenciFullName = `${ogrenci.ad} ${ogrenci.soyad}`;
                   const pendingCount = getPendingDekontCount(ogrenci.staj_id);
                   const rejectedCount = getRejectedDekontCount(ogrenci.staj_id);
                   const lastMonthStatus = getLastMonthDekontStatus(ogrenci.staj_id);
                  
                  return (
                    <div
                      key={ogrenci.id}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] p-6 border border-blue-100 hover:border-blue-200"
                    >
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-indigo-100 hidden sm:block">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="sm:ml-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900">
                              {ogrenci.ad} {ogrenci.soyad}
                            </h3>
                            {(pendingCount > 0 || rejectedCount > 0) && (
                              <div className="flex items-center gap-1 text-xs">
                                {pendingCount > 0 && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                    ({pendingCount} bekliyor)
                                  </span>
                                )}
                                {rejectedCount > 0 && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                                    ({rejectedCount} reddedilen)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mt-2 text-sm">
                            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                              {ogrenci.sinif}-{ogrenci.no}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>Başlangıç: {new Date(ogrenci.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                          {/* Son Ay Durumu */}
                          <div className="mt-2 text-xs">
                            <span className="font-medium text-gray-700">{lastMonthStatus}</span>
                          </div>
                        </div>
                      </div>
                    
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center text-sm text-gray-500">
                          <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg font-medium">
                            {ogrenci.alanlar?.ad || "Alan bilgisi yok"}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-700">Koordinatör:</span>{' '}
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium ml-1">
                            {ogrenci.ogretmen_ad} {ogrenci.ogretmen_soyad}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => handleDekontYuklemeClick(ogrenci)}
                          className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="Dekont Yükle"
                        >
                          <Upload className="h-4 w-4 mr-1.5" />
                          Dekont Yükle
                        </button>
                      </div>
                      
                      {/* Dekont Durumu Tablosu */}
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <div className="text-xs font-medium text-gray-600 mb-2">Dekont Durumu:</div>
                        <div className="flex flex-wrap gap-1">
                          {getMonthsFromStartToPrevious(ogrenci.baslangic_tarihi).map((monthData) => {
                            const dekontStatus = getDekontStatus(ogrenci.staj_id, monthData.month, monthData.year);
                            return (
                              <div key={`${monthData.year}-${monthData.month}`} className="flex flex-col items-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {monthData.label}
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  dekontStatus === 'approved'
                                    ? 'bg-green-100 text-green-600'
                                    : dekontStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : dekontStatus === 'rejected'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {dekontStatus === 'approved' ? '✓' : dekontStatus === 'pending' ? '?' : dekontStatus === 'rejected' ? '✗' : '–'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'dekontlar' && (
              <div className="space-y-4 p-6">
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-900 text-xs sm:text-sm">
                  <span className="font-semibold">Dekontu yanlış yüklediyseniz silebilirsiniz.</span> Uyarı: Onaylanmış dekontlarda silme işlemi yoktur.
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Dekontlar ({filteredDekontlar.length})</h2>
                  <button
                    onClick={() => setDekontModalOpen(true)}
                    className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Yeni Dekont Ekle
                  </button>
                </div>

                {/* Dekont Filtreleme */}
                <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <select
                        value={selectedStudentFilter}
                        onChange={(e) => setSelectedStudentFilter(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                      >
                        <option value="all">Tüm Öğrenciler</option>
                        {ogrenciler.map((ogrenci) => (
                          <option key={ogrenci.id} value={`${ogrenci.ad} ${ogrenci.soyad}`}>
                            {ogrenci.ad} {ogrenci.soyad} - {ogrenci.sinif}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                      >
                        <option value="all">Tüm Durumlar</option>
                        <option value="bekliyor">Bekliyor</option>
                        <option value="onaylandi">Onaylandı</option>
                        <option value="reddedildi">Reddedildi</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    Toplam {filteredDekontlar.length} dekont bulundu
                  </div>
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
                  <div className="space-y-6">
                    {/* Student-based grouping */}
                    {Object.entries(groupDekontlarByStudent()).map(([studentName, studentDekontlar]) => {
                      const pendingCount = getPendingDekontCount(studentName);
                      const rejectedCount = getRejectedDekontCount(studentName);
                      const lastMonthStatus = getLastMonthDekontStatus(studentName);
                      const isExpanded = expandedGroups[studentName] ?? false; // Default to collapsed
                      
                      return (
                        <div key={studentName} className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                          {/* Student Header - Clickable */}
                          <button
                            onClick={() => toggleGroupExpansion(studentName)}
                            className="w-full text-left p-4 hover:bg-gray-100 transition-colors flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hidden sm:block">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-white">
                                    {studentName}
                                  </h3>
                                  {studentDekontlar[0]?.stajlar?.ogrenciler?.sinif && studentDekontlar[0]?.stajlar?.ogrenciler?.no && (
                                    <span className="text-sm font-medium text-blue-100">
                                      {studentDekontlar[0].stajlar.ogrenciler.sinif}-{studentDekontlar[0].stajlar.ogrenciler.no}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {pendingCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {pendingCount} bekliyor
                                    </span>
                                  )}
                                  {rejectedCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      {rejectedCount} reddedildi
                                    </span>
                                  )}
                                  <span className="text-xs text-blue-100">
                                    {studentDekontlar.length} dekont - {lastMonthStatus}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-white" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-white" />
                              )}
                            </div>
                          </button>
                          
                          {/* Student's Dekontlar - Collapsible */}
                          {isExpanded && (
                            <div className="bg-gray-50">
                              <div className="p-4 space-y-3">
                                {studentDekontlar.map((dekont, dekontIndex) => (
                                  <div
                                    key={`dekont-${dekont.id}-${dekont.ay}-${dekont.yil}-${dekontIndex}`}
                                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                                  >
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOnayDurumuRenk(dekont.onay_durumu)}`}>
                                            {getOnayDurumuText(dekont.onay_durumu)}
                                          </span>
                                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
                                            {(() => {
                                              // Aynı öğrenci, ay, yıl için dekont sayısını hesapla
                                              const ayniDekontlar = dekontlar.filter(d =>
                                                String(d.staj_id) === String(dekont.staj_id) &&
                                                d.ay === dekont.ay &&
                                                String(d.yil) === String(dekont.yil)
                                              ).sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
                                              
                                              const dekontIndex = ayniDekontlar.findIndex(d => d.id === dekont.id);
                                              const ekIndex = dekontIndex > 0 ? ` - ek${dekontIndex}` : '';
                                              
                                              return `${aylar[dekont.ay - 1]} ${dekont.yil}${ekIndex}`;
                                            })()}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs">
                                            <span className="font-bold">Gönderen:</span> {dekont.yukleyen_kisi || 'Bilinmiyor'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        {dekont.dosya_url && (
                                          <button
                                            onClick={() => {
                                              const filename = dekont.dosya_url!.split('/').pop() || 'dekont.pdf';
                                              handleFileDownload(dekont.dosya_url!, filename);
                                            }}
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
                                    {(dekont.miktar && dekont.miktar > 0) || dekont.created_at ? (
                                      <div className="flex justify-between items-end mt-2">
                                        {dekont.miktar && dekont.miktar > 0 && (
                                          <span className="text-xs font-bold text-green-600">
                                            Miktar: {dekont.miktar} TL
                                          </span>
                                        )}
                                        {dekont.created_at && (
                                          <span className="text-xs text-gray-400">
                                            {new Date(dekont.created_at).toLocaleString('tr-TR', {
                                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    ) : null}
                                    
                                    {/* Reddetme Gerekçesi */}
                                    {dekont.onay_durumu === 'reddedildi' && dekont.red_nedeni && (
                                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-xs font-medium text-red-800 mb-1">Reddetme Gerekçesi:</p>
                                            <p className="text-xs text-red-700">{dekont.red_nedeni}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'belgeler' && (
              <div className="p-6">
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
                  <div className="space-y-4">
                    {filteredBelgeler.map((belge) => (
                      <div key={belge.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] p-6">
                        <div className="flex items-start">
                          <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-indigo-100 flex-shrink-0 hidden sm:block">
                            <FileText className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="sm:ml-4 flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate" title={belge.ad}>
                              {belge.ad}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                              <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium border border-purple-200">
                                {formatBelgeTur(belge.tur)}
                              </div>
                              {belge.yukleyen_kisi && (
                                <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">
                                  👤 {belge.yukleyen_kisi}
                                </div>
                              )}
                              {(() => {
                                const onayDurumu = getBelgeOnayDurumu(belge.onay_durumu);
                                const Icon = onayDurumu.icon;
                                return (
                                  <div className={`flex items-center px-3 py-1.5 rounded-lg font-medium border ${onayDurumu.bg} ${onayDurumu.color}`}>
                                    <Icon className="h-4 w-4 mr-1.5" />
                                    {onayDurumu.text}
                                  </div>
                                );
                              })()}
                            </div>
                            <p className="text-sm text-gray-500 mt-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-1.5" />
                              Yüklenme Tarihi: {new Date(belge.yukleme_tarihi).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-purple-200">
                          {belge.dosya_url && (
                            <button
                              onClick={() => {
                                // Belge adını kullan ve dosya uzantısını koru
                                const originalFileName = belge.dosya_url!.split('/').pop() || 'belge.pdf';
                                const fileExtension = originalFileName.split('.').pop() || 'pdf';
                                const cleanBelgeName = belge.ad || 'belge';
                                const downloadFileName = `${cleanBelgeName}.${fileExtension}`;
                                handleBelgeDownload(belge.dosya_url!, downloadFileName);
                              }}
                              className="flex items-center justify-center px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 hover:border-indigo-300"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Belgeyi İndir
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBelge(belge)
                              setBelgeDeleteModalOpen(true)
                            }}
                            className="flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Belgeyi Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
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
                  {aylar.map((ay, index) => {
                    const ayIndex = index + 1;
                    let isDisabled = false;
                    let disabledReason = '';
                    
                    // Mevcut ay ve gelecek aylar seçilemez (öğrenciler önceki ayın maaşını alır)
                    const currentDate = new Date();
                    const currentYear = currentDate.getFullYear();
                    const currentMonth = currentDate.getMonth() + 1;
                    
                    if (dekontFormData.yil > currentYear ||
                        (dekontFormData.yil === currentYear && ayIndex >= currentMonth)) {
                      isDisabled = true;
                      disabledReason = 'Mevcut ay ve sonrası';
                    }
                    
                    // Öğrenci seçiliyse, başlangıç tarihinden önce dekont yüklenemez
                    if (selectedOgrenci && !isDisabled) {
                      const startDate = new Date(selectedOgrenci.baslangic_tarihi);
                      const startYear = startDate.getFullYear();
                      const startMonth = startDate.getMonth() + 1;
                      
                      // Seçilen yıl başlangıç yılından küçükse disable
                      if (dekontFormData.yil < startYear) {
                        isDisabled = true;
                        disabledReason = 'İş başlangıcından önce';
                      }
                      // Aynı yıl ama ay başlangıç ayından küçükse disable
                      else if (dekontFormData.yil === startYear && ayIndex < startMonth) {
                        isDisabled = true;
                        disabledReason = 'İş başlangıcından önce';
                      }
                    }
                    
                    return (
                      <option
                        key={index}
                        value={ayIndex}
                        disabled={isDisabled}
                        style={isDisabled ? { color: '#ccc', backgroundColor: '#f5f5f5' } : {}}
                      >
                        {ay} {isDisabled ? `(${disabledReason})` : ''}
                      </option>
                    );
                  })}
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
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(yil => {
                    let isDisabled = false;
                    let disabledReason = '';
                    
                    // Mevcut yıl ve gelecek yıllar için sınırlama
                    const currentYear = new Date().getFullYear();
                    if (yil > currentYear) {
                      isDisabled = true;
                      disabledReason = 'Gelecek yıl';
                    }
                    
                    // Öğrenci seçiliyse, başlangıç tarihinden önceki yıllar seçilemez
                    if (selectedOgrenci && !isDisabled) {
                      const startDate = new Date(selectedOgrenci.baslangic_tarihi);
                      const startYear = startDate.getFullYear();
                      
                      if (yil < startYear) {
                        isDisabled = true;
                        disabledReason = 'İş başlangıcından önce';
                      }
                    }
                    
                    return (
                      <option
                        key={yil}
                        value={yil}
                        disabled={isDisabled}
                        style={isDisabled ? { color: '#ccc', backgroundColor: '#f5f5f5' } : {}}
                      >
                        {yil} {isDisabled ? `(${disabledReason})` : ''}
                      </option>
                    );
                  })}
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
                setDekontFormData(() => {
                  const currentDate = new Date();
                  const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
                  const yearForPreviousMonth = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
                  
                  return {
                    ay: previousMonth,
                    yil: yearForPreviousMonth,
                    aciklama: '',
                    miktar: '',
                    dosya: null
                  };
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
              {successMessage}
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
      <Modal
        isOpen={notificationModalOpen}
        onClose={() => {
          setNotificationModalOpen(false);
          setShowAllMessages(false);
          setNotificationPage(1);
        }}
        title="Mesajlar"
      >
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowAllMessages(false);
                  setNotificationPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !showAllMessages
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Okunmamış ({notifications.filter(n => !n.is_read).length})
              </button>
              <button
                onClick={() => {
                  setShowAllMessages(true);
                  setNotificationPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showAllMessages
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tümünü Göster ({notifications.length})
              </button>
            </div>
            
            {!showAllMessages && notifications.filter(n => !n.is_read).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          {(() => {
            // Filter messages based on selection
            const filteredMessages = showAllMessages
              ? notifications
              : notifications.filter(n => !n.is_read);
            
            // Calculate pagination
            const totalPages = Math.ceil(filteredMessages.length / NOTIFICATIONS_PER_PAGE);
            const paginatedMessages = filteredMessages.slice(
              (notificationPage - 1) * NOTIFICATIONS_PER_PAGE,
              notificationPage * NOTIFICATIONS_PER_PAGE
            );

            return (
              <>
                {filteredMessages.length > 0 ? (
                  <>
                    {/* Messages List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {paginatedMessages.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border ${
                            notification.is_read
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`font-semibold ${
                                  notification.is_read ? 'text-gray-700' : 'text-gray-900'
                                }`}>
                                  {notification.title}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  notification.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {notification.priority === 'high' ? 'Yüksek' :
                                   notification.priority === 'normal' ? 'Normal' : 'Düşük'}
                                </span>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className={`text-sm mb-3 ${
                                notification.is_read ? 'text-gray-600' : 'text-gray-700'
                              }`}>
                                {notification.content}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                  <div>Gönderen: {notification.sent_by}</div>
                                  <div>Tarih: {new Date(notification.created_at).toLocaleString('tr-TR')}</div>
                                  {notification.is_read && notification.read_at && (
                                    <div>Okunma: {new Date(notification.read_at).toLocaleString('tr-TR')}</div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!notification.is_read && (
                                    <button
                                      onClick={() => markAsRead(notification.id)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                      Okundu olarak işaretle
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
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => setNotificationPage(p => Math.max(1, p - 1))}
                          disabled={notificationPage === 1}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Önceki
                        </button>
                        <span className="text-sm text-gray-700 px-2">
                          Sayfa {notificationPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setNotificationPage(p => Math.min(totalPages, p + 1))}
                          disabled={notificationPage === totalPages}
                          className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sonraki
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {showAllMessages ? 'Mesaj Bulunamadı' : 'Okunmamış Mesaj Yok'}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {showAllMessages
                        ? 'Henüz size gönderilmiş mesaj bulunmamaktadır.'
                        : 'Tüm mesajlarınızı okudunuz! 🎉'}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setNotificationModalOpen(false);
              setShowAllMessages(false);
              setNotificationPage(1);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </Modal>

      {/* PIN Değiştirme Modal */}
      <PinChangeModal
        isOpen={pinChangeModalOpen}
        onClose={() => setPinChangeModalOpen(false)}
        onSuccess={() => {
          setPinChangeModalOpen(false);
          setSuccessMessage('PIN başarıyla değiştirildi!');
          setSuccessModalOpen(true);
          fetchData();
        }}
        userId={isletme?.id || ''}
        userName={isletme?.yetkili_kisi || ''}
        isRequired={!isManualPinChange}
        userType="company"
      />

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