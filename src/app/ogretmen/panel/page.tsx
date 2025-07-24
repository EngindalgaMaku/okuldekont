'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, LogOut, Loader, User, Receipt, GraduationCap, CheckCircle, Clock, XCircle, Download, Plus, Upload, Trash2, Calendar, Loader2, AlertTriangle, Search, Filter, Bell, Key, ChevronDown, ChevronUp } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DekontUploadForm from '@/components/ui/DekontUpload'
import PinChangeModal from '@/components/ui/PinChangeModal'
import { DekontFormData } from '@/types/dekont'

// Import types and utilities
import {
  Ogrenci,
  Isletme,
  Dekont,
  Belge,
  Notification,
  Teacher,
  ErrorModal,
  SuccessModal
} from '@/types/teacher-panel'

import {
  truncateFileName,
  getCurrentMonth,
  getCurrentYear,
  getCurrentDay,
  isGecikme,
  isKritikSure,
  aylar,
  formatBelgeTur,
  getDurum,
  getBelgeDurum,
  getCompanyStyles,
  handleFileDownload,
  handleFileView
} from '@/utils/teacher-panel-utils'

const TeacherPanel = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([]);
  const [dekontlar, setDekontlar] = useState<Dekont[]>([]);
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([]);
  const [dekontSearchTerm, setDekontSearchTerm] = useState('');
  const [isletmeFilter, setIsletmeFilter] = useState<string>('all');
  const [onayDurumuFilter, setOnayDurumuFilter] = useState<string>('all');
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
  const [successModal, setSuccessModal] = useState<SuccessModal>({ isOpen: false, title: '', message: '' });
  const [belgeSilModalOpen, setBelgeSilModalOpen] = useState(false);
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null);
  const [schoolName, setSchoolName] = useState('Okul Adı');
  const [ogrenciSecimModalOpen, setOgrenciSecimModalOpen] = useState(false);
  const [isletmeSecimModalOpen, setIsletmeSecimModalOpen] = useState(false);
  
  // Bildirim states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const NOTIFICATIONS_PER_PAGE = 5;
  
  // PIN change modal state
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');
  
  // Collapsible işletme öğrenci listesi için state
  const [expandedIsletmeler, setExpandedIsletmeler] = useState<{[key: string]: boolean}>({});
  
  // Collapsible dekont grupları için state
  const [expandedStudents, setExpandedStudents] = useState<{[key: string]: boolean}>({});
  
  // Ek dekont uyarı modal state
  const [ekDekontModalOpen, setEkDekontModalOpen] = useState(false);
  const [ekDekontData, setEkDekontData] = useState<{
    ogrenci: Ogrenci;
    isletme: Isletme;
    ay: number;
    yil: number;
    mevcutDekontSayisi: number;
  } | null>(null);

  
  // Önceki ay için dekont eksik olan öğrencileri tespit et
  const getEksikDekontOgrenciler = () => {
    const currentDate = new Date();
    const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
    const previousYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    
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
        d.ogrenci_ad === `${ogrenci.ad} ${ogrenci.soyad}` &&
        d.ay === previousMonth &&
        d.yil === previousYear
      );
      return ogrenciDekontlari.length === 0;
    });
  };


  // Öğrencinin başlangıç tarihinden önceki aya kadar olan ayları getir
  const getMonthsFromStartToPrevious = (startDate: string): { month: number, year: number, label: string }[] => {
    const start = new Date(startDate);
    const currentDate = new Date();
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    const months: { month: number, year: number, label: string }[] = [];
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

  // Belirli ay için dekont durumunu kontrol et
  const getDekontStatus = (ogrenciAd: string, month: number, year: number): 'approved' | 'pending' | 'rejected' | 'none' => {
    const dekont = dekontlar.find(d =>
      d.ogrenci_ad === ogrenciAd &&
      d.ay === month &&
      d.yil === year
    );
    
    if (!dekont) return 'none';
    if (dekont.onay_durumu === 'onaylandi') return 'approved';
    if (dekont.onay_durumu === 'reddedildi') return 'rejected';
    return 'pending';
  };

  // Öğrenci için bekleyen dekont sayısını getir
  const getPendingDekontCount = (ogrenciAd: string): number => {
    return dekontlar.filter(d =>
      d.ogrenci_ad === ogrenciAd &&
      d.onay_durumu === 'bekliyor'
    ).length;
  };

  // Öğrenci için reddedilen dekont sayısını getir
  const getRejectedDekontCount = (ogrenciAd: string): number => {
    return dekontlar.filter(d =>
      d.ogrenci_ad === ogrenciAd &&
      d.onay_durumu === 'reddedildi'
    ).length;
  };

  // Son ayın dekont durumunu getir
  const getLastMonthDekontStatus = (ogrenciAd: string): string => {
    const currentDate = new Date();
    const lastMonth = currentDate.getMonth(); // 0-based
    const lastMonthYear = lastMonth === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
    const targetMonth = lastMonth === 0 ? 12 : lastMonth;
    
    const status = getDekontStatus(ogrenciAd, targetMonth, lastMonthYear);
    const monthName = aylar[targetMonth - 1];
    
    switch (status) {
      case 'approved':
        return `${monthName}: ✅ Onaylandı`;
      case 'pending':
        return `${monthName}: ⏳ Bekliyor`;
      case 'rejected':
        return `${monthName}: ❌ Reddedildi`;
      default:
        return `${monthName}: ❗ Eksik`;
    }
  };

  // İşletme için toplam dekont istatistikleri
  const getCompanyDekontStats = (isletmeAd: string) => {
    const companyDekonts = dekontlar.filter(d => d.isletme_ad === isletmeAd);
    const pending = companyDekonts.filter(d => d.onay_durumu === 'bekliyor').length;
    const rejected = companyDekonts.filter(d => d.onay_durumu === 'reddedildi').length;
    const approved = companyDekonts.filter(d => d.onay_durumu === 'onaylandi').length;
    
    return { pending, rejected, approved, total: companyDekonts.length };
  };

  const eksikDekontOgrenciler = getEksikDekontOgrenciler();

  useEffect(() => {
    const checkSessionStorage = async () => {
      const storedOgretmenId = sessionStorage.getItem('ogretmen_id');
      if (!storedOgretmenId) {
        router.push('/');
        return;
      }
      
      // Paralel API çağrıları için optimize edilmiş versiyon
      await initializeData(storedOgretmenId);
    };
    checkSessionStorage();
  }, [router]);

  const initializeData = async (ogretmenId: string) => {
    setLoading(true);
    try {
      // Tüm API çağrılarını paralel olarak başlat
      const [
        teacherResponse,
        schoolNameResponse
      ] = await Promise.allSettled([
        fetch(`/api/admin/teachers/${ogretmenId}`),
        fetch('/api/system-settings/school-name')
      ]);

      // Teacher data işle
      if (teacherResponse.status === 'fulfilled' && teacherResponse.value.ok) {
        const ogretmenData = await teacherResponse.value.json();
        setTeacher(ogretmenData);
        setTeacherPin(ogretmenData.pin || '');

        // Teacher bağımlı verileri paralel olarak çek
        const [
          internshipsResponse,
          dekontlarResponse,
          belgelerResponse,
          notificationsResponse
        ] = await Promise.allSettled([
          fetch(`/api/admin/teachers/${ogretmenId}/internships`),
          fetch(`/api/admin/teachers/${ogretmenId}/dekontlar`),
          fetch(`/api/admin/teachers/${ogretmenId}/belgeler`),
          fetch(`/api/admin/teachers/${ogretmenId}/notifications`)
        ]);

        // Internships data işle
        if (internshipsResponse.status === 'fulfilled' && internshipsResponse.value.ok) {
          const groupedIsletmeler = await internshipsResponse.value.json();
          setIsletmeler(groupedIsletmeler);
        }

        // Dekontlar data işle
        if (dekontlarResponse.status === 'fulfilled' && dekontlarResponse.value.ok) {
          const dekontData = await dekontlarResponse.value.json();
          setDekontlar(dekontData);
          setFilteredDekontlar(dekontData);
        }

        // Belgeler data işle
        if (belgelerResponse.status === 'fulfilled' && belgelerResponse.value.ok) {
          const belgeData = await belgelerResponse.value.json();
          setBelgeler(belgeData);
          setFilteredBelgeler(belgeData);
        }

        // Notifications data işle
        if (notificationsResponse.status === 'fulfilled' && notificationsResponse.value.ok) {
          const notificationData = await notificationsResponse.value.json();
          setNotifications(notificationData || []);
          const unreadNotifications = notificationData?.filter((n: any) => !n.is_read) || [];
          setUnreadCount(unreadNotifications.length);
        }

        // PIN kontrolü
        if (ogretmenData.pin === '2025') {
          setPinChangeModalOpen(true);
        }
      } else {
        throw new Error('Öğretmen bulunamadı');
      }

      // School name işle
      if (schoolNameResponse.status === 'fulfilled' && schoolNameResponse.value.ok) {
        const schoolData = await schoolNameResponse.value.json();
        if (schoolData.value) {
          setSchoolName(schoolData.value);
        }
      }

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      sessionStorage.removeItem('ogretmen_id');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(`/api/admin/teachers/${teacherId}/notifications`);
      if (!response.ok) {
        throw new Error('Bildirimler getirilemedi');
      }
      
      const data = await response.json();
      setNotifications(data || []);
      const unreadNotifications = data?.filter((n: any) => !n.is_read) || [];
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Bildirimler getirme hatası:', error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    if (!teacher) return;
    
    try {
      const response = await fetch(`/api/admin/teachers/${teacher.id}/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          markAsRead: true
        })
      });

      if (!response.ok) {
        throw new Error('Bildirim güncellenemedi');
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
      const response = await fetch(`/api/admin/teachers/${teacher.id}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAllAsRead: true
        })
      });

      if (!response.ok) {
        throw new Error('Bildirimler güncellenemedi');
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

  // Dekont filtreleme ve sıralama
  useEffect(() => {
    let filtered = dekontlar;

    if (dekontSearchTerm) {
      filtered = filtered.filter(dekont =>
        dekont.ogrenci_ad?.toLowerCase().includes(dekontSearchTerm.toLowerCase()) ||
        dekont.isletme_ad?.toLowerCase().includes(dekontSearchTerm.toLowerCase()) ||
        dekont.yukleyen_kisi?.toLowerCase().includes(dekontSearchTerm.toLowerCase())
      );
    }

    if (isletmeFilter !== 'all') {
      filtered = filtered.filter(dekont => dekont.isletme_ad === isletmeFilter);
    }

    if (onayDurumuFilter !== 'all') {
      filtered = filtered.filter(dekont => dekont.onay_durumu === onayDurumuFilter);
    }

    // Kronolojik sıralama - en yeni ay en üstte
    filtered = filtered.sort((a, b) => {
      // Önce yıla göre sırala (büyükten küçüğe)
      if (a.yil !== b.yil) {
        return b.yil - a.yil;
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

    setFilteredDekontlar(filtered);
  }, [dekontlar, dekontSearchTerm, isletmeFilter, onayDurumuFilter]);

  const fetchOgretmenData = async (teacherId: string) => {
    setLoading(true);
    try {
      // Paralel API çağrıları
      const [
        internshipsResponse,
        dekontlarResponse,
        belgelerResponse
      ] = await Promise.allSettled([
        fetch(`/api/admin/teachers/${teacherId}/internships`),
        fetch(`/api/admin/teachers/${teacherId}/dekontlar`),
        fetch(`/api/admin/teachers/${teacherId}/belgeler`)
      ]);

      // Internships data işle
      if (internshipsResponse.status === 'fulfilled' && internshipsResponse.value.ok) {
        const groupedIsletmeler = await internshipsResponse.value.json();
        setIsletmeler(groupedIsletmeler);
      } else {
        console.error('Staj verileri getirilemedi');
      }

      // Dekontlar data işle
      if (dekontlarResponse.status === 'fulfilled' && dekontlarResponse.value.ok) {
        const dekontData = await dekontlarResponse.value.json();
        setDekontlar(dekontData);
        setFilteredDekontlar(dekontData);
      }

      // Belgeler data işle
      if (belgelerResponse.status === 'fulfilled' && belgelerResponse.value.ok) {
        const belgeData = await belgelerResponse.value.json();
        setBelgeler(belgeData);
        setFilteredBelgeler(belgeData);
      }

    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const findStajId = async (ogrenciId: string, isletmeId: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/admin/internships/find?ogrenci_id=${ogrenciId}&isletme_id=${isletmeId}`);
      if (!response.ok) {
        throw new Error('Staj ID bulunamadı');
      }
      
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Staj ID bulunamadı:', error);
      setErrorModal({
        isOpen: true,
        title: 'Staj Kaydı Bulunamadı',
        message: 'Bu öğrenci ve işletmeye ait staj kaydı bulunamadı. Dekont yüklenemiyor.'
      });
      return null;
    }
  };

  const handlePinChangeSuccess = () => {
    setPinChangeModalOpen(false);
    setSuccessModal({
      isOpen: true,
      title: 'PIN Başarıyla Değiştirildi',
      message: 'PIN kodunuz güvenli bir şekilde güncellenmiştir. Yeni PIN kodunuzu unutmayın!'
    });
    if (teacher) {
      fetchOgretmenData(teacher.id);
      fetchNotifications(teacher.id);
    }
  };

  // İşletme öğrenci listesi toggle fonksiyonu - accordion behavior
  const toggleIsletmeExpanded = (isletmeId: string) => {
    setExpandedIsletmeler(prev => {
      const isCurrentlyExpanded = prev[isletmeId];
      
      // If clicking on an already expanded company, just close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [isletmeId]: false
        };
      }
      
      // Otherwise, close all others and open the clicked one
      const newState: {[key: string]: boolean} = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[isletmeId] = true;
      
      return newState;
    });
  };

  // Dekont grupları toggle fonksiyonu - accordion behavior
  const toggleStudentExpanded = (studentKey: string) => {
    setExpandedStudents(prev => {
      const isCurrentlyExpanded = prev[studentKey];
      
      // If clicking on an already expanded student, just close it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [studentKey]: false
        };
      }
      
      // Otherwise, close all others and open the clicked one
      const newState: {[key: string]: boolean} = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[studentKey] = true;
      
      return newState;
    });
  };

  // Dekontları işletme ve öğrenciye göre gruplandır
  const groupDekontsByStudent = () => {
    const groups: {[key: string]: {
      students: {[key: string]: {student: any, dekontlar: any[], count: number}},
      totalCount: number
    }} = {};
    
    filteredDekontlar.forEach(dekont => {
      const companyKey = dekont.isletme_ad;
      const studentKey = dekont.ogrenci_ad;
      
      if (!groups[companyKey]) {
        groups[companyKey] = {
          students: {},
          totalCount: 0
        };
      }
      
      if (!groups[companyKey].students[studentKey]) {
        // İşletme listesinden öğrenci detaylarını bul
        const isletme = isletmeler.find(i => i.ad === dekont.isletme_ad);
        const ogrenci = isletme?.ogrenciler.find(o => `${o.ad} ${o.soyad}` === dekont.ogrenci_ad);
        
        groups[companyKey].students[studentKey] = {
          student: {
            name: dekont.ogrenci_ad,
            company: dekont.isletme_ad,
            sinif: ogrenci?.sinif || '',
            no: ogrenci?.no || ''
          },
          dekontlar: [],
          count: 0
        };
      }
      
      groups[companyKey].students[studentKey].dekontlar.push(dekont);
      groups[companyKey].students[studentKey].count++;
      groups[companyKey].totalCount++;
    });
    
    return groups;
  };

  // Belgeleri işletmeye göre gruplandır
  const groupBelgelerByCompany = () => {
    const groups: {[key: string]: {belgeler: any[], count: number}} = {};
    
    filteredBelgeler.forEach(belge => {
      const companyKey = belge.isletme_ad;
      
      if (!groups[companyKey]) {
        groups[companyKey] = {
          belgeler: [],
          count: 0
        };
      }
      
      groups[companyKey].belgeler.push(belge);
      groups[companyKey].count++;
    });
    
    return groups;
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

        const response = await fetch(`/api/admin/dekontlar/${dekont.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Dekont silinirken hata oluştu');
        }

        // State'i güncelle
        setDekontlar(prevDekontlar => prevDekontlar.filter(d => d.id !== dekont.id));
        setFilteredDekontlar(prevFiltered => prevFiltered.filter(d => d.id !== dekont.id));

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
      // Güncel ay ve gelecek aylar için dekont yüklemeyi engelle
      const currentMonth = getCurrentMonth();
      const currentYear = getCurrentYear();
      
      // Dekont yüklemek için seçilen ay/yıl modal'da belirleneceği için
      // şimdilik sadece genel kontrolü yapıyoruz
      // Normal dekont yükleme - modal'da ay kısıtlaması uygulanacak
      setSelectedStudent({ ...ogrenci, staj_id: stajId.toString() });
      setSelectedIsletme(isletme);
      setDekontUploadModalOpen(true);
    }
  };
  
  const handleEkDekontOnay = () => {
    if (ekDekontData) {
      setSelectedStudent({ ...ekDekontData.ogrenci, staj_id: '' });
      setSelectedIsletme(ekDekontData.isletme);
      setEkDekontModalOpen(false);
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
      const submitData = new FormData();
      
      // FormData'yı hazırla
      submitData.append('staj_id', formData.staj_id || '');
      submitData.append('miktar', formData.miktar?.toString() || '0');
      submitData.append('ay', formData.ay.toString());
      submitData.append('yil', formData.yil.toString());
      submitData.append('aciklama', formData.aciklama || '');
      submitData.append('ogretmen_id', teacher.id);
      
      if (formData.dosya) {
        submitData.append('dosya', formData.dosya);
      }

      const response = await fetch('/api/admin/dekontlar', {
        method: 'POST',
        body: submitData
      });

      // Ek dekont uyarısı (409 status code)
      if (response.status === 409) {
        const warningData = await response.json();
        setEkDekontData({
          ogrenci: selectedStudent,
          isletme: selectedIsletme,
          ay: parseInt(formData.ay.toString()),
          yil: parseInt(formData.yil.toString()),
          mevcutDekontSayisi: warningData.mevcutDekontSayisi || 1
        });
        setDekontUploadModalOpen(false);
        setEkDekontModalOpen(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dekont yüklenemedi');
      }

      const result = await response.json();
      const yeniDekont = result.data || result;
      
      // Formatla ve state'e ekle
      const formattedDekont: Dekont = {
        ...yeniDekont,
        isletme_ad: selectedIsletme.ad,
        ogrenci_ad: `${selectedStudent.ad} ${selectedStudent.soyad}`,
        yukleyen_kisi: `${teacher.name} ${teacher.surname} (Öğretmen)`
      };

      setDekontlar(prev => [formattedDekont, ...prev]);
      setFilteredDekontlar(prev => [formattedDekont, ...prev]);
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
      const submitData = new FormData();
      submitData.append('isletme_id', formData.isletmeId);
      submitData.append('dosya_adi', formData.dosyaAdi);
      submitData.append('belge_turu', formData.belgeTuru);
      submitData.append('dosya', formData.dosya);
      
      if (teacher) {
        submitData.append('ogretmen_id', teacher.id);
      }

      const response = await fetch('/api/admin/belgeler', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Belge yüklenemedi');
      }

      const result = await response.json();
      
      console.log('API Response:', result); // Debug için
      
      // API response'unun doğru formatta olduğundan emin ol
      const newBelge: Belge = {
        id: result.id,
        isletme_ad: result.isletme_ad,
        dosya_adi: result.dosya_adi,
        dosya_url: result.dosya_url,
        belge_turu: result.belge_turu,
        yukleme_tarihi: result.yukleme_tarihi,
        yukleyen_kisi: result.yukleyen_kisi,
        status: result.status || 'PENDING',
        onaylanma_tarihi: result.onaylanma_tarihi,
        red_nedeni: result.red_nedeni
      };
      
      // Yeni belgeyi state'e ekle
      setBelgeler(prev => [newBelge, ...prev]);
      setFilteredBelgeler(prev => [newBelge, ...prev]);
      
      setBelgeUploadModalOpen(false);
      setSelectedFile(null);
      
      setSuccessModal({
        isOpen: true,
        title: 'Başarılı',
        message: 'Belge başarıyla yüklendi!'
      });

    } catch (error: any) {
      console.error('Belge yükleme hatası:', error);
      setErrorModal({
        isOpen: true,
        title: 'Belge Yükleme Hatası',
        message: `Belge yüklenirken bir hata oluştu: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Belge silme fonksiyonu
  const handleBelgeSil = async (belge: Belge) => {
    // Onaylanmış belgelerin silinmesini engelle
    if (belge.status === 'APPROVED') {
      setErrorModal({
        isOpen: true,
        title: 'Silme İşlemi Yapılamaz',
        message: 'Onaylanmış belgeler silinemez.'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/admin/belgeler/${belge.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Belge silinirken hata oluştu');
      }

      // State'i güncelle
      setBelgeler(prev => prev.filter(b => b.id !== belge.id));
      setFilteredBelgeler(prev => prev.filter(b => b.id !== belge.id));

      setBelgeSilModalOpen(false);
      
      setSuccessModal({
        isOpen: true,
        title: 'Başarılı',
        message: 'Belge başarıyla silindi!'
      });

    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: 'Silme Hatası',
        message: `Belge silinirken bir sorun oluştu: ${error.message}`
      });
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


  // Pagination logic for dekontlar
  const totalDekontPages = Math.ceil(filteredDekontlar.length / DEKONTLAR_PER_PAGE);
  const paginatedDekontlar = filteredDekontlar.slice(
    (dekontPage - 1) * DEKONTLAR_PER_PAGE,
    dekontPage * DEKONTLAR_PER_PAGE
  );

  // Get unique companies for filter
  const uniqueCompanies = Array.from(new Set(dekontlar.map(d => d.isletme_ad))).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-indigo-600 to-indigo-800 pb-24 sm:pb-32">
        {/* Pattern Background */}
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
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="sm:ml-6 min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white">
                  Öğretmen Paneli
                </h1>
                <p className="text-indigo-200 text-xs sm:text-sm">Koordinatörlük Yönetimi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Bildirim Butonu */}
              <button
                onClick={() => setNotificationModalOpen(true)}
                className="relative flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Bildirimler"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">Bildirimler</span>
              </button>
              
              {/* PIN Değiştirme Butonu */}
              <button
                onClick={() => setPinChangeModalOpen(true)}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="PIN Değiştir"
              >
                <Key className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                <span className="sr-only">PIN Değiştir</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                <span className="sr-only">Çıkış Yap</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 sm:mt-8">
            <nav className="-mb-px flex space-x-1 sm:space-x-4" aria-label="Tabs">
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
                      group relative min-w-0 flex-1 overflow-hidden py-2 sm:py-3 px-2 sm:px-6 rounded-t-xl text-xs sm:text-sm font-medium text-center hover:bg-white hover:bg-opacity-10 transition-all duration-200
                      ${isActive
                        ? 'bg-white text-indigo-700'
                        : 'text-indigo-100 hover:text-white'}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? 'text-indigo-700' : 'text-indigo-300 group-hover:text-white'} mb-1 sm:mb-0 sm:mr-2`} />
                      <div className="flex flex-col sm:flex-row items-center">
                        <span className="hidden sm:inline">
                          {tab.label}
                        </span>
                        <span className="text-[10px] sm:text-xs sm:ml-1">
                          ({tab.count})
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
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-100 border-l-4 border-green-500">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="ml-2 sm:ml-3 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-green-800">
                    📬 Okunmamış Mesajınız Var!
                  </h3>
                  <div className="mt-2 text-xs sm:text-sm text-green-700">
                    <p className="font-medium mb-2">
                      Size gönderilmiş {unreadCount} adet okunmamış mesaj bulunmaktadır.
                    </p>
                    <div className="space-y-2">
                      {notifications.filter(n => !n.is_read).slice(0, 3).map((notification) => (
                        <div key={notification.id} className="p-2 sm:p-3 bg-green-100 border border-green-200 rounded-lg">
                          <div className="font-medium text-green-900 text-sm">
                            {notification.title}
                          </div>
                          <div className="text-xs text-green-700 mt-1">
                            Gönderen: {notification.sent_by} - {new Date(notification.created_at).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-green-600 mt-1 truncate">
                            {notification.content.length > 80 ? notification.content.substring(0, 80) + '...' : notification.content}
                          </div>
                        </div>
                      ))}
                      {unreadCount > 3 && (
                        <div className="text-xs text-green-600 font-medium">
                          ... ve {unreadCount - 3} mesaj daha
                        </div>
                      )}
                    </div>
                    <button
                      onClick={markAllAsRead}
                      className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
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
                      {(() => {
                        const currentDate = new Date();
                        const previousMonthIndex = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
                        return isGecikme()
                          ? `${aylar[previousMonthIndex]} ayı dekont yükleme süresi geçti! İşletmeler devlet katkı payı alamayabilir.`
                          : isKritikSure()
                          ? `${aylar[previousMonthIndex]} ayı dekontlarını ayın 10'una kadar yüklemelisiniz!`
                          : `${aylar[previousMonthIndex]} ayı için eksik dekontlar var.`;
                      })()}
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
            {/* Tab content will be rendered here */}
            {activeTab === 'isletmeler' && (
              <div className="space-y-6 p-6">
                {isletmeler.map((isletme, index) => {
                  // Get company styling based on backend metadata
                  const getCompanyStyles = () => {
                    if (isletme.color_scheme) {
                      return {
                        border: `2px solid ${isletme.color_scheme.accent}`,
                        background: `linear-gradient(135deg, ${isletme.color_scheme.secondary} 0%, white 100%)`,
                        iconBg: isletme.color_scheme.secondary,
                        iconColor: isletme.color_scheme.primary
                      };
                    }
                    
                    // Fallback styling based on company type
                    switch (isletme.company_type) {
                      case 'tech':
                        return {
                          border: '2px solid #C7D2FE',
                          background: 'linear-gradient(135deg, #EEF2FF 0%, white 100%)',
                          iconBg: '#EEF2FF',
                          iconColor: '#4F46E5'
                        };
                      case 'accounting':
                        return {
                          border: '2px solid #A7F3D0',
                          background: 'linear-gradient(135deg, #ECFDF5 0%, white 100%)',
                          iconBg: '#ECFDF5',
                          iconColor: '#059669'
                        };
                      default:
                        return {
                          border: '2px solid #E5E7EB',
                          background: 'linear-gradient(135deg, #F9FAFB 0%, white 100%)',
                          iconBg: '#F9FAFB',
                          iconColor: '#6B7280'
                        };
                    }
                  };

                  const styles = getCompanyStyles();
                  
                  return (
                    <div key={isletme.id}>
                      {/* Company Separator */}
                      {index > 0 && (
                        <div className="flex items-center justify-center mb-6">
                          <div
                            className="h-1 flex-1 rounded-full mx-4"
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, ${isletme.separator_color || '#E5E7EB'} 50%, transparent 100%)`
                            }}
                          />
                          <div
                            className="h-1 flex-1 rounded-full mx-4"
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, ${isletme.separator_color || '#E5E7EB'} 50%, transparent 100%)`
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Company Card */}
                      <div
                        className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] p-6 relative overflow-hidden"
                        style={{
                          border: styles.border,
                          background: styles.background
                        }}
                      >
                        {/* Company Type Badge */}
                        {isletme.company_type && (
                          <div className="absolute top-4 right-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              isletme.company_type === 'tech' ? 'bg-blue-100 text-blue-800' :
                              isletme.company_type === 'accounting' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {isletme.company_type === 'tech' ? '💻 Teknoloji' :
                               isletme.company_type === 'accounting' ? '📊 Muhasebe' :
                               '🏢 Diğer'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center border-2 hidden sm:block"
                            style={{
                              backgroundColor: styles.iconBg,
                              borderColor: styles.iconColor + '40'
                            }}
                          >
                            <Building2
                              className="h-6 w-6"
                              style={{ color: styles.iconColor }}
                            />
                          </div>
                          <div className="sm:ml-4 flex-1 pr-16 sm:pr-20">
                            <h3 className="text-lg font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="break-words">{isletme.ad}</span>
                              {isletme.total_students && (
                                <span className="text-xs sm:text-sm font-normal text-gray-600 mt-1 sm:mt-0">
                                  ({isletme.total_students} öğrenci)
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              👤 Yetkili: {isletme.yukleyen_kisi}
                            </p>
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
                      <button
                        onClick={() => toggleIsletmeExpanded(isletme.id)}
                        className="w-full text-left text-sm font-medium text-gray-700 flex items-center gap-2 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
                      >
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                        <span>Öğrenciler ({isletme.ogrenciler.length})</span>
                        {expandedIsletmeler[isletme.id] ? (
                          <ChevronUp className="h-4 w-4 text-gray-500 ml-auto" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500 ml-auto" />
                        )}
                      </button>
                      
                      {expandedIsletmeler[isletme.id] && (
                        <>
                          {isletme.ogrenciler.map((ogrenci) => {
                            const ogrenciFullName = `${ogrenci.ad} ${ogrenci.soyad}`;
                            const pendingCount = getPendingDekontCount(ogrenciFullName);
                            const rejectedCount = getRejectedDekontCount(ogrenciFullName);
                            const lastMonthStatus = getLastMonthDekontStatus(ogrenciFullName);
                            
                            return (
                              <div key={ogrenci.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3 border border-blue-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg flex items-center justify-center hidden sm:block">
                                    <User className="h-5 w-5 text-indigo-600" />
                                  </div>
                                  <div className="sm:ml-3 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-gray-900">{ogrenci.ad} {ogrenci.soyad}</p>
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
                                    <div className="flex items-center space-x-3 mt-1 text-xs">
                                      <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium">
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
                               
                              {/* Dekont Durumu Tablosu */}
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-xs font-medium text-gray-600 mb-2">Dekont Durumu:</div>
                                <div className="flex flex-wrap gap-1">
                                  {getMonthsFromStartToPrevious(ogrenci.baslangic_tarihi).map((monthData) => {
                                    const dekontStatus = getDekontStatus(`${ogrenci.ad} ${ogrenci.soyad}`, monthData.month, monthData.year);
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
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {dekontStatus === 'approved' ? '✓' : dekontStatus === 'pending' ? '?' : dekontStatus === 'rejected' ? '✗' : '○'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                          
                          {isletme.ogrenciler.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="mt-4 text-sm font-medium text-gray-900">Öğrenci Bulunamadı</h3>
                              <p className="mt-2 text-xs text-gray-500">Henüz bu işletmeye öğrenci atanmamış.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
              </div>
            )}

            {activeTab === 'dekontlar' && (
              <div className="space-y-4 p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Dekontlar ({filteredDekontlar.length})
                  </h2>
                  <button
                    onClick={() => setOgrenciSecimModalOpen(true)}
                    className="flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Dekont Ekle
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Dekontlarda ara..."
                      value={dekontSearchTerm}
                      onChange={(e) => setDekontSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={isletmeFilter}
                      onChange={(e) => setIsletmeFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                    >
                      <option value="all">Tüm Firmalar</option>
                      {uniqueCompanies.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={onayDurumuFilter}
                      onChange={(e) => setOnayDurumuFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                    >
                      <option value="all">Tüm Durumlar</option>
                      <option value="bekliyor">Bekliyor</option>
                      <option value="onaylandi">Onaylandı</option>
                      <option value="reddedildi">Reddedildi</option>
                    </select>
                  </div>
                </div>

                {filteredDekontlar.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Dekont Bulunamadı</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {dekontSearchTerm || isletmeFilter !== 'all' || onayDurumuFilter !== 'all'
                        ? 'Arama kriterlerinize uygun dekont bulunamadı.'
                        : 'Henüz dekont yüklenmemiş.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const groupedDekontlar = groupDekontsByStudent();
                      const companyKeys = Object.keys(groupedDekontlar);
                      
                      return (
                        <div className="space-y-6">
                          {companyKeys.map((companyKey) => {
                            const companyGroup = groupedDekontlar[companyKey];
                            const studentKeys = Object.keys(companyGroup.students);
                            
                            return (
                              <div key={companyKey} className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                                {/* Company Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hidden sm:block">
                                        <Building2 className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <h2 className="text-lg font-bold">{companyKey}</h2>
                                        <p className="text-blue-100 text-sm">
                                          {studentKeys.length} öğrenci - {companyGroup.totalCount} dekont
                                        </p>
                                      </div>
                                    </div>
                                    {(() => {
                                      const companyStats = getCompanyDekontStats(companyKey);
                                      return (
                                        <div className="flex items-center gap-2 text-xs">
                                          {companyStats.pending > 0 && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                                              {companyStats.pending} bekliyor
                                            </span>
                                          )}
                                          {companyStats.rejected > 0 && (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                                              {companyStats.rejected} reddedilen
                                            </span>
                                          )}
                                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                                            {companyStats.approved} onaylı
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Students List */}
                                <div className="bg-gray-50">
                                  {studentKeys.map((studentKey, index) => {
                                    const studentGroup = companyGroup.students[studentKey];
                                    const isExpanded = expandedStudents[studentKey];
                                    
                                    return (
                                      <div key={studentKey} className={`${index > 0 ? 'border-t border-gray-200' : ''}`}>
                                        {/* Student Header - Clickable */}
                                        <button
                                          onClick={() => toggleStudentExpanded(studentKey)}
                                          className="w-full text-left p-4 hover:bg-gray-100 transition-colors flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg flex items-center justify-center hidden sm:block">
                                              <User className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-semibold text-gray-900">
                                                  {studentGroup.student.name}
                                                </h3>
                                                {(() => {
                                                  const pendingCount = getPendingDekontCount(studentGroup.student.name);
                                                  const rejectedCount = getRejectedDekontCount(studentGroup.student.name);
                                                  return (
                                                    (pendingCount > 0 || rejectedCount > 0) && (
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
                                                    )
                                                  );
                                                })()}
                                              </div>
                                              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                                {studentGroup.student.sinif && (
                                                  <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium">
                                                    {studentGroup.student.sinif}
                                                  </span>
                                                )}
                                                {studentGroup.student.no && (
                                                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded font-medium">
                                                    No: {studentGroup.student.no}
                                                  </span>
                                                )}
                                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                                                  {studentGroup.count} dekont
                                                </span>
                                              </div>
                                              {/* Son Ay Durumu */}
                                              <div className="mt-1 text-xs">
                                                <span className="text-gray-600">{getLastMonthDekontStatus(studentGroup.student.name)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-gray-500" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-gray-500" />
                                            )}
                                          </div>
                                        </button>

                                        {/* Student's Dekontlar - Collapsible */}
                                        {isExpanded && (
                                          <div className="bg-white mx-4 mb-4 rounded-lg border border-gray-200">
                                            <div className="p-4 space-y-3">
                                              {studentGroup.dekontlar.map((dekont, dekontIndex) => (
                                                <div
                                                  key={`dekont-${dekont.id}-${dekont.ay}-${dekont.yil}-${dekontIndex}`}
                                                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                                                >
                                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="space-y-2">
                                                      <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurum(dekont.onay_durumu).bg} ${getDurum(dekont.onay_durumu).color}`}>
                                                          {getDurum(dekont.onay_durumu).text}
                                                        </span>
                                                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold border border-indigo-200">
                                                          {aylar[dekont.ay - 1]} {dekont.yil}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs">
                                                          <span className="font-bold">Gönderen:</span> {dekont.yukleyen_kisi}
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                                      {dekont.dosya_url && (
                                                        <button
                                                          onClick={() => handleFileDownload(dekont.dosya_url!, `dekont-${dekont.ogrenci_ad}-${aylar[dekont.ay - 1]}-${dekont.yil}`)}
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
                                                  
                                                  {/* Reddetme Gerekçesi */}
                                                  {dekont.onay_durumu === 'reddedildi' && dekont.red_nedeni && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                      <div className="flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
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
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'belgeler' && (
              <div className="p-6">
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
                    {(() => {
                      const groupedBelgeler = groupBelgelerByCompany();
                      const companyKeys = Object.keys(groupedBelgeler);
                      
                      return (
                        <div className="space-y-6">
                          {companyKeys.map((companyKey) => {
                            const companyGroup = groupedBelgeler[companyKey];
                            
                            return (
                              <div key={companyKey} className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                                {/* Company Header */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hidden sm:block">
                                      <Building2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <h2 className="text-lg font-bold">{companyKey}</h2>
                                      <p className="text-purple-100 text-sm">
                                        {companyGroup.count} belge
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Documents List */}
                                <div className="p-4 space-y-4">
                                  {companyGroup.belgeler.map((belge) => (
                                    <div key={belge.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                                      <div className="flex flex-col">
                                        <div className="flex items-start">
                                          <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 hidden sm:block">
                                            <FileText className="h-6 w-6 text-indigo-600" />
                                          </div>
                                          <div className="sm:ml-4 flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-gray-900 truncate" title={belge.dosya_adi}>
                                              {belge.dosya_adi}
                                            </h3>
                                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                              <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">
                                                {formatBelgeTur(belge.belge_turu)}
                                              </div>
                                              {belge.status && (
                                                <div className={`px-3 py-1.5 rounded-lg font-medium ${getBelgeDurum(belge.status).bg} ${getBelgeDurum(belge.status).color}`}>
                                                  {getBelgeDurum(belge.status).text}
                                                </div>
                                              )}
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
                                        
                                        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-gray-200">
                                          {belge.dosya_url && (
                                            <button
                                              onClick={() => handleFileView(belge.dosya_url)}
                                              className="flex items-center justify-center px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                              <Download className="h-4 w-4 mr-2" />
                                              Dosyayı İndir
                                            </button>
                                          )}
                                          {belge.status !== 'APPROVED' && (
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
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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

     {/* Footer */}
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

     {/* Modals */}
     {isDekontUploadModalOpen && selectedStudent && selectedIsletme && (
       <Modal
         isOpen={isDekontUploadModalOpen}
         onClose={() => setDekontUploadModalOpen(false)}
         title={`Dekont Yükle: ${selectedStudent.ad} ${selectedStudent.soyad}`}
       >
         <DekontUploadForm
           stajId={selectedStudent.staj_id?.toString() || ''}
           onSubmit={handleDekontSubmit}
           isLoading={isSubmitting}
           isletmeler={isletmeler.map(i => ({ id: i.id, ad: i.ad }))}
           selectedIsletmeId={selectedIsletme.id}
           startDate={selectedStudent.baslangic_tarihi}
         />
       </Modal>
     )}

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

     {/* Success Modal */}
     <Modal
       isOpen={successModal.isOpen}
       onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
       title={successModal.title}
     >
       <div className="space-y-4">
         <div className="flex items-center gap-3 p-3 bg-green-50 border-l-4 border-green-400 rounded text-green-900 text-sm">
           <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
           <span>{successModal.message}</span>
         </div>
         <div className="flex justify-end pt-4">
           <button
             onClick={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
           >
             Tamam
           </button>
         </div>
       </div>
     </Modal>

     {/* Delete Confirmation Modal */}
     <Modal
       isOpen={deleteConfirmOpen}
       onClose={() => setDeleteConfirmOpen(false)}
       title="Dekontu Sil"
     >
       <div className="space-y-4">
         <p className="text-sm text-gray-700">
           {selectedDekont && `'${selectedDekont.ogrenci_ad}' adlı öğrencinin dekontunu kalıcı olarak silmek istediğinizden emin misiniz?`}
         </p>
         <div className="flex justify-end gap-3">
           <button
             onClick={() => setDeleteConfirmOpen(false)}
             className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
           >
             İptal
           </button>
           <button
             onClick={() => {
               if (selectedDekont) {
                 handleDekontSil(selectedDekont);
                 setDeleteConfirmOpen(false);
               }
             }}
             className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
           >
             Sil
           </button>
         </div>
       </div>
     </Modal>

     {/* Student Selection Modal */}
     <Modal
       isOpen={ogrenciSecimModalOpen}
       onClose={() => setOgrenciSecimModalOpen(false)}
       title="Öğrenci Seç"
     >
       <div className="space-y-4">
         <p className="text-sm text-gray-600">Dekont eklemek istediğiniz öğrenciyi seçin:</p>
         <div className="max-h-96 overflow-y-auto space-y-2">
           {isletmeler.map(isletme =>
             isletme.ogrenciler.map(ogrenci => (
               <button
                 key={`${ogrenci.id}-${isletme.id}`}
                 onClick={() => {
                   handleOpenDekontUpload(ogrenci, isletme);
                   setOgrenciSecimModalOpen(false);
                 }}
                 className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
               >
                 <div className="font-medium text-gray-900">{ogrenci.ad} {ogrenci.soyad}</div>
                 <div className="text-sm text-gray-600">{isletme.ad} - {ogrenci.sinif}</div>
               </button>
             ))
           )}
         </div>
       </div>
     </Modal>

     {/* Company Selection Modal for Document Upload */}
     <Modal
       isOpen={isletmeSecimModalOpen}
       onClose={() => setIsletmeSecimModalOpen(false)}
       title="İşletme Seç"
     >
       <div className="space-y-4">
         <p className="text-sm text-gray-600">Belge eklemek istediğiniz işletmeyi seçin:</p>
         <div className="max-h-96 overflow-y-auto space-y-2">
           {isletmeler.map(isletme => (
             <button
               key={isletme.id}
               onClick={() => {
                 handleBelgeYukle(isletme);
                 setIsletmeSecimModalOpen(false);
               }}
               className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
             >
               <div className="font-medium text-gray-900">{isletme.ad}</div>
               <div className="text-sm text-gray-600">
                 Yetkili: {isletme.yukleyen_kisi} | {isletme.ogrenciler.length} öğrenci
               </div>
             </button>
           ))}
         </div>
       </div>
     </Modal>

     {/* Document Upload Modal */}
     <Modal
       isOpen={isBelgeUploadModalOpen}
       onClose={() => setBelgeUploadModalOpen(false)}
       title={`Belge Yükle: ${selectedIsletme?.ad || ''}`}
     >
       <div className="space-y-6">
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">
             Belge Türü
           </label>
           <select
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
             id="belge-turu-select"
             defaultValue="Sözleşme"
           >
             <option value="Sözleşme">Sözleşme</option>
             <option value="Fesih Belgesi">Fesih Belgesi</option>
             <option value="Usta Öğreticilik Belgesi">Usta Öğretici Belgesi</option>
             <option value="Diğer">Diğer</option>
           </select>
         </div>

         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">
             Belge Dosyası
           </label>
           <div
             className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
               isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
             }`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
           >
             <input
               type="file"
               id="belge-dosya"
               accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
               onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
               className="hidden"
             />
             <label htmlFor="belge-dosya" className="cursor-pointer">
               <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
               <p className="text-sm text-gray-600">
                 {selectedFile ? selectedFile.name : 'Belge dosyası seçmek için tıklayın veya sürükleyip bırakın'}
               </p>
               <p className="text-xs text-gray-500 mt-1">
                 PDF, DOC, DOCX, JPG, PNG formatları desteklenir
               </p>
             </label>
           </div>
         </div>

         <div className="flex justify-end space-x-3 pt-4">
           <button
             onClick={() => {
               setBelgeUploadModalOpen(false);
               setSelectedFile(null);
             }}
             className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
           >
             İptal
           </button>
           <button
             onClick={() => {
               const belgeTuruSelect = document.getElementById('belge-turu-select') as HTMLSelectElement;
               
               if (!selectedFile || !selectedIsletme) {
                 alert('Lütfen dosya seçiniz!');
                 return;
               }

               handleBelgeSubmit({
                 isletmeId: selectedIsletme.id,
                 dosyaAdi: selectedFile.name,
                 dosya: selectedFile,
                 belgeTuru: belgeTuruSelect.value
               });
             }}
             disabled={isSubmitting}
             className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
           >
             {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
             Belge Yükle
           </button>
         </div>
       </div>
     </Modal>

     {/* Success Modal */}
     <Modal
       isOpen={showSuccessModal}
       onClose={() => setShowSuccessModal(false)}
       title="Başarılı"
     >
       <div className="space-y-4 text-center">
         <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
           <CheckCircle className="h-8 w-8 text-green-600" />
         </div>
         <p className="text-lg font-medium text-gray-900">Dekont başarıyla yüklendi!</p>
         <p className="text-sm text-gray-600">3 saniye sonra dekont listesine yönlendirileceksiniz...</p>
       </div>
     </Modal>

     {/* Ek Dekont Modal */}
     <Modal
       isOpen={ekDekontModalOpen}
       onClose={() => setEkDekontModalOpen(false)}
       title="Ek Dekont Yükleme"
     >
       <div className="space-y-4">
         <div className="flex items-center gap-3 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-800">
           <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
           <div>
             <p className="font-medium text-sm">Dikkat: Bu ay için zaten dekont var!</p>
             <p className="text-sm mt-1">
               {ekDekontData && `${ekDekontData.ogrenci.ad} ${ekDekontData.ogrenci.soyad} öğrencisinin ${aylar[ekDekontData.ay - 1]} ${ekDekontData.yil} ayı için zaten ${ekDekontData.mevcutDekontSayisi} adet dekont bulunmaktadır.`}
             </p>
             <p className="text-sm mt-2 font-medium">
               Yükleyeceğiniz dekont <span className="text-orange-600">ek dekont</span> olarak eklenecektir.
             </p>
           </div>
         </div>
         <div className="flex justify-end gap-3 pt-4">
           <button
             onClick={() => setEkDekontModalOpen(false)}
             className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
           >
             İptal
           </button>
           <button
             onClick={handleEkDekontOnay}
             className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
           >
             Ek Dekont Olarak Yükle
           </button>
         </div>
       </div>
     </Modal>

     {/* Belge Silme Modal */}
     <Modal
       isOpen={belgeSilModalOpen}
       onClose={() => setBelgeSilModalOpen(false)}
       title="Belgeyi Sil"
     >
       <div className="space-y-4">
         <p className="text-sm text-gray-700">
           {selectedBelge && `'${selectedBelge.dosya_adi}' adlı belgeyi kalıcı olarak silmek istediğinizden emin misiniz?`}
         </p>
         <div className="flex justify-end gap-3">
           <button
             onClick={() => setBelgeSilModalOpen(false)}
             className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
           >
             İptal
           </button>
           <button
             onClick={() => {
               if (selectedBelge) {
                 handleBelgeSil(selectedBelge);
               }
             }}
             disabled={isSubmitting}
             className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
           >
             {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
             Sil
           </button>
         </div>
       </div>
     </Modal>

     {/* PIN Change Modal */}
     <PinChangeModal
       isOpen={pinChangeModalOpen}
       onClose={() => setPinChangeModalOpen(false)}
       onSuccess={handlePinChangeSuccess}
       teacherId={teacher?.id || ''}
       teacherName={teacher ? `${teacher.name} ${teacher.surname}` : ''}
     />

     {/* Notification Modal */}
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
                               {!notification.is_read && (
                                 <button
                                   onClick={() => markAsRead(notification.id)}
                                   className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                 >
                                   Okundu olarak işaretle
                                 </button>
                               )}
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
   </div>
 );
};

export default TeacherPanel;