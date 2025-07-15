'use client'

import { useState, useEffect, Fragment, ReactNode } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Briefcase, Plus, Edit, Trash2, User, Users, ArrowLeft, GraduationCap, School, UserCheck, Settings, AlertTriangle, Lock, Building2, ChevronRight, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Alan {
  id: string
  ad: string
  aciklama?: string
  aktif: boolean
}

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
  dal?: string
  ogrenci_sayisi?: number
  alan_id: string
  isletme_gunleri?: string
  okul_gunleri?: string
  haftalik_program?: HaftalikProgram
}

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  isletme_adi?: string | null
  staj_durumu?: string
  baslama_tarihi?: string | null
  bitis_tarihi?: string | null
  koordinator_ogretmen?: string | null
}

interface OgrenciFormData {
  ad: string
  soyad: string
  no: string
  sinif_id: string
}

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email: string
  alan_id: string
  telefon?: string
  is_koordinator?: boolean
}

interface Isletme {
  id: string
  ad: string
  adres?: string
  telefon?: string
  students?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
    baslangic_tarihi: string
    bitis_tarihi: string
  }[]
  koordinatorOgretmen?: {
    id: string
    ad: string
    soyad: string
    email: string
    telefon: string
  } | null
}

export default function AlanDetayPage() {
  const router = useRouter()
  const params = useParams()
  const alanId = params.id as string
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'ogretmenler'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Update activeTab when URL changes
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'ogretmenler'
    setActiveTab(urlTab)
  }, [searchParams])

  const [alan, setAlan] = useState<Alan | null>(null)
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSinifFilter, setSelectedSinifFilter] = useState('')
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [isletmeListesi, setIsletmeListesi] = useState<{id: string, ad: string, telefon?: string}[]>([])
  const [loadingSelectedIsletme, setLoadingSelectedIsletme] = useState(false)
  const [dataError, setDataError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStajFilter, setSelectedStajFilter] = useState('')
  
  // Sayfalama state'leri
  const [ogrenciCurrentPage, setOgrenciCurrentPage] = useState(1)
  const [ogrenciTotalPages, setOgrenciTotalPages] = useState(1)
  const [totalOgrenciler, setTotalOgrenciler] = useState(0)
  const [ogrenciLoading, setOgrenciLoading] = useState(false)
  const [sinifCurrentPage, setSinifCurrentPage] = useState(1)
  const [sinifTotalPages, setSinifTotalPages] = useState(1)
  const [totalSiniflar, setTotalSiniflar] = useState(0)
  const [sinifLoading, setSinifLoading] = useState(false)
  const pageSize = 10

  // Modal states
  const [sinifModalOpen, setSinifModalOpen] = useState(false)
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [editSinifModal, setEditSinifModal] = useState(false)
  const [deleteSinifModal, setDeleteSinifModal] = useState(false)
  const [editOgrenciModal, setEditOgrenciModal] = useState(false)
  const [deleteOgrenciModal, setDeleteOgrenciModal] = useState(false)
  const [ogrenciDetayModal, setOgrenciDetayModal] = useState(false)
  const [ogrenciEditMode, setOgrenciEditMode] = useState(false)
  const [selectedSinif, setSelectedSinif] = useState<Sinif | null>(null)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)

  // Form states
  const [submitLoading, setSubmitLoading] = useState(false)

  // Sınıf ekleme form state
  const [sinifFormData, setSinifFormData] = useState({
    ad: '',
    dal: '',
    isletme_gunleri: '',
    okul_gunleri: '',
    haftalik_program: {
      pazartesi: 'bos' as 'okul' | 'isletme' | 'bos',
      sali: 'bos' as 'okul' | 'isletme' | 'bos',
      carsamba: 'bos' as 'okul' | 'isletme' | 'bos',
      persembe: 'bos' as 'okul' | 'isletme' | 'bos',
      cuma: 'bos' as 'okul' | 'isletme' | 'bos'
    }
  })

  // Sınıf düzenleme form state
  const [editSinifFormData, setEditSinifFormData] = useState({
    ad: '',
    dal: '',
    isletme_gunleri: '',
    okul_gunleri: '',
    haftalik_program: {
      pazartesi: 'bos' as 'okul' | 'isletme' | 'bos',
      sali: 'bos' as 'okul' | 'isletme' | 'bos',
      carsamba: 'bos' as 'okul' | 'isletme' | 'bos',
      persembe: 'bos' as 'okul' | 'isletme' | 'bos',
      cuma: 'bos' as 'okul' | 'isletme' | 'bos'
    }
  })

  // Öğrenci form state
  const [ogrenciFormData, setOgrenciFormData] = useState<OgrenciFormData>({
    ad: '',
    soyad: '',
    no: '',
    sinif_id: ''
  })

  // Öğrenci düzenleme form state
  const [editOgrenciFormData, setEditOgrenciFormData] = useState({
    ad: '',
    soyad: '',
    no: '',
    sinif: ''
  })

  // Alan ayarları için state'ler
  const [alanAyarlarModal, setAlanAyarlarModal] = useState(false)
  const [alanSilModal, setAlanSilModal] = useState(false)
  const [alanFormData, setAlanFormData] = useState({
    ad: '',
    aciklama: '',
    aktif: false
  })

  // Silme onayı için state (alan silme)
  const [silmeOnayi, setSilmeOnayi] = useState('')
  const [silmeHatasi, setSilmeHatasi] = useState('')

  // Sınıf silme onayı için state
  const [sinifSilmeOnayi, setSinifSilmeOnayi] = useState('')
  const [sinifSilmeHatasi, setSinifSilmeHatasi] = useState('')

  useEffect(() => {
    if (alanId) {
      fetchAlanDetay()
      fetchSiniflar(1)
      fetchOgrenciler(1)
      fetchOgretmenler()
      fetchIsletmeListesi()
    }
  }, [alanId]) // Only depend on alanId
  
  // Sayfa değiştiğinde öğrencileri yeniden yükle
  useEffect(() => {
    if (alanId) {
      fetchOgrenciler(ogrenciCurrentPage)
    }
  }, [ogrenciCurrentPage, alanId])

  useEffect(() => {
    if (alanId) {
      fetchSiniflar(sinifCurrentPage)
    }
  }, [sinifCurrentPage, alanId])

  useEffect(() => {
    if (alan) {
      setAlanFormData({
        ad: alan.ad,
        aciklama: alan.aciklama || '',
        aktif: alan.aktif || false
      })
    }
  }, [alan])

  // Sınıf filtresi değiştiğinde sayfayı 1'e sıfırla ve öğrencileri yeniden yükle
  useEffect(() => {
    if (alanId) {
      setOgrenciCurrentPage(1)
      fetchOgrenciler(1)
    }
  }, [selectedSinifFilter, alanId])

  const fetchAlanDetay = async () => {
    try {
      const { data, error } = await supabase
        .from('alanlar')
        .select('*')
        .eq('id', alanId)
        .single()

      if (error) {
        console.error('Alan detayları alınırken hata:', error)
        setDataError(true)
        return
      }
      
      setAlan(data)
      setDataError(false)
    } catch (err) {
      console.error('Alan detayları alınırken beklenmeyen hata:', err)
      setDataError(true)
    }
  }

  const fetchSiniflar = async (page = 1) => {
    try {
      setSinifLoading(true)

      const countQuery = supabase
        .from('siniflar')
        .select('*', { count: 'exact', head: true })
        .eq('alan_id', alanId)

      const { count, error: countError } = await countQuery
      if (countError) throw countError

      setTotalSiniflar(count || 0)
      setSinifTotalPages(Math.ceil((count || 0) / pageSize))

      const { data: sinifData, error: sinifError } = await supabase
        .from('siniflar')
        .select('*')
        .eq('alan_id', alanId)
        .order('ad')
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (sinifError) throw sinifError

      const siniflarWithCount = await Promise.all(
        sinifData.map(async (sinif) => {
          const { count: ogrenciCount } = await supabase
            .from('ogrenciler')
            .select('*', { count: 'exact', head: true })
            .eq('sinif', sinif.ad)
            .eq('alan_id', alanId)

          return {
            ...sinif,
            ogrenci_sayisi: ogrenciCount || 0,
          }
        })
      )

      setSiniflar(siniflarWithCount)
    } catch (error) {
      console.error('Sınıflar alınırken hata:', error)
    } finally {
      setSinifLoading(false)
    }
  }

  const fetchOgrenciler = async (page = 1) => {
    try {
      setOgrenciLoading(true);
      
      // Build query with filters
      let countQuery = supabase
        .from('ogrenciler')
        .select('*', { count: 'exact', head: true })
        .eq('alan_id', alanId);

      let dataQuery = supabase
        .from('ogrenciler')
        .select('id, ad, soyad, no, sinif')
        .eq('alan_id', alanId);

      // Apply filters
      if (selectedSinifFilter) {
        countQuery = countQuery.eq('sinif', selectedSinifFilter);
        dataQuery = dataQuery.eq('sinif', selectedSinifFilter);
      }

      // First get total count with filters
      const { count, error: countError } = await countQuery;

      if (countError) throw countError;

      setTotalOgrenciler(count || 0);
      setOgrenciTotalPages(Math.ceil((count || 0) / pageSize));

      // Get paginated students with filters
      const { data: ogrencilerData, error: ogrencilerError } = await dataQuery
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('ad', { ascending: true });

      if (ogrencilerError) throw ogrencilerError;

      // Get staj and isletme info for each student
      const ogrencilerWithInfo = await Promise.all(
        ogrencilerData.map(async (ogrenci) => {
          try {
            // Get active staj for this student with more details
            const { data: stajData, error: stajError } = await supabase
              .from('stajlar')
              .select('durum, isletme_id, baslangic_tarihi, bitis_tarihi, ogretmen_id')
              .eq('ogrenci_id', ogrenci.id)
              .eq('durum', 'aktif')
              .maybeSingle();

            let isletme_adi = null;
            let staj_durumu = 'isletmesi_yok';
            let baslama_tarihi = null;
            let bitis_tarihi = null;
            let koordinator_ogretmen = null;
            
            // If staj query was successful and staj exists, get related data
            if (!stajError && stajData?.isletme_id) {
              try {
                // Get isletme name
                const { data: isletmeData, error: isletmeError } = await supabase
                  .from('isletmeler')
                  .select('ad')
                  .eq('id', stajData.isletme_id)
                  .maybeSingle();
                
                if (!isletmeError && isletmeData) {
                  isletme_adi = isletmeData.ad;
                }
              } catch (isletmeError) {
                console.warn(`İşletme bilgisi alınamadı (staj: ${stajData.isletme_id}):`, isletmeError);
              }

              // Get koordinator ogretmen
              if (stajData.ogretmen_id) {
                try {
                  const { data: ogretmenData, error: ogretmenError } = await supabase
                    .from('ogretmenler')
                    .select('ad, soyad')
                    .eq('id', stajData.ogretmen_id)
                    .maybeSingle();
                  
                  if (!ogretmenError && ogretmenData) {
                    koordinator_ogretmen = `${ogretmenData.ad} ${ogretmenData.soyad}`;
                  }
                } catch (ogretmenError) {
                  console.warn(`Öğretmen bilgisi alınamadı (öğretmen: ${stajData.ogretmen_id}):`, ogretmenError);
                }
              }

              staj_durumu = 'aktif';
              baslama_tarihi = stajData.baslangic_tarihi;
              bitis_tarihi = stajData.bitis_tarihi;
            } else if (stajError) {
              console.warn(`Staj bilgisi alınamadı (öğrenci: ${ogrenci.id}):`, stajError);
            }

            return {
              ...ogrenci,
              isletme_adi,
              staj_durumu,
              baslama_tarihi,
              bitis_tarihi,
              koordinator_ogretmen
            };
          } catch (error) {
            // If there's an error getting staj data, return student without staj info
            console.warn(`Genel hata (öğrenci: ${ogrenci.id}):`, error);
            return {
              ...ogrenci,
              isletme_adi: null,
              staj_durumu: 'isletmesi_yok',
              baslama_tarihi: null,
              bitis_tarihi: null,
              koordinator_ogretmen: null
            };
          }
        })
      );
      
      setOgrenciler(ogrencilerWithInfo);
    } catch (error) {
      console.error('Öğrenciler alınırken hata:', error);
    } finally {
      setOgrenciLoading(false);
    }
  }

  const fetchOgretmenler = async () => {
    const { data, error } = await supabase
      .from('ogretmenler')
      .select('*')
      .eq('alan_id', alanId)
      .order('ad', { ascending: true })

    if (error) {
      console.error('Öğretmenler alınırken hata:', error)
      return
    }

    setOgretmenler(data || [])
  }

  const fetchIsletmeListesi = async () => {
    try {
      const isletmeIds = new Set<string>();

      // First get isletme_alanlar for this alan
      const { data: isletmeAlanlarData, error: isletmeAlanlarError } = await supabase
        .from('isletme_alanlar')
        .select('isletme_id')
        .eq('alan_id', alanId);

      if (!isletmeAlanlarError && isletmeAlanlarData) {
        isletmeAlanlarData.forEach(ia => isletmeIds.add(ia.isletme_id));
      }

      // Also get isletmeler from stajlar table (students in this alan)
      const { data: stajlarData, error: stajlarError } = await supabase
        .from('stajlar')
        .select('isletme_id, ogrenciler!inner(alan_id)')
        .eq('ogrenciler.alan_id', alanId)
        .not('isletme_id', 'is', null);

      if (!stajlarError && stajlarData) {
        stajlarData.forEach(staj => {
          if (staj.isletme_id) {
            isletmeIds.add(staj.isletme_id);
          }
        });
      }

      // Get basic company info for the dropdown
      let isletmelerData, isletmelerError;
      
      if (isletmeIds.size === 0) {
        // Eğer hiç alan-özel işletme bulunamazsa, tüm işletmeleri göster
        const result = await supabase
          .from('isletmeler')
          .select('id, ad, telefon')
          .order('ad');
        
        isletmelerData = result.data;
        isletmelerError = result.error;
      } else {
        // Sadece bu alan için tanımlı işletmeleri göster
        const result = await supabase
          .from('isletmeler')
          .select('id, ad, telefon')
          .in('id', Array.from(isletmeIds))
          .order('ad');
        
        isletmelerData = result.data;
        isletmelerError = result.error;
      }

      if (!isletmelerError && isletmelerData) {
        const liste = isletmelerData.map(isletme => ({
          id: isletme.id,
          ad: isletme.ad,
          telefon: isletme.telefon
        }));
        
        setIsletmeListesi(liste);
        
        // İlk işletmeyi otomatik seç
        if (liste.length > 0 && !selectedIsletme) {
          fetchSelectedIsletme(liste[0].id);
        }
      }
    } catch (error) {
      console.error('İşletme listesi alınırken hata:', error);
      setIsletmeListesi([]);
    }
  }

  const fetchSelectedIsletme = async (isletmeId: string) => {
    try {
      setLoadingSelectedIsletme(true);
      
      // Get company details
      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, adres, telefon')
        .eq('id', isletmeId)
        .single();

      if (isletmeError || !isletmeData) return;

      // Get students doing internships at this company
      const { data: stajlarData, error: stajlarError } = await supabase
        .from('stajlar')
        .select(`
          id,
          durum,
          baslangic_tarihi,
          bitis_tarihi,
          ogretmen_id,
          ogrenci_id
        `)
        .eq('isletme_id', isletmeId)
        .eq('durum', 'aktif');

      const students = [];
      let koordinatorOgretmen = null;

      if (!stajlarError && stajlarData) {
        for (const staj of stajlarData) {
          try {
            // Get student details
            const { data: ogrenciData, error: ogrenciError } = await supabase
              .from('ogrenciler')
              .select('id, ad, soyad, no, sinif, alan_id')
              .eq('id', staj.ogrenci_id)
              .eq('alan_id', alanId)
              .maybeSingle();

            if (!ogrenciError && ogrenciData) {
              // Get coordinating teacher if not already fetched
              if (!koordinatorOgretmen && staj.ogretmen_id) {
                try {
                  const { data: ogretmenData, error: ogretmenError } = await supabase
                    .from('ogretmenler')
                    .select('id, ad, soyad, email, telefon')
                    .eq('id', staj.ogretmen_id)
                    .maybeSingle();

                  if (!ogretmenError && ogretmenData) {
                    koordinatorOgretmen = ogretmenData;
                  }
                } catch (ogretmenError) {
                  console.warn(`Koordinatör öğretmen bilgisi alınamadı (öğretmen: ${staj.ogretmen_id}):`, ogretmenError);
                }
              }

              students.push({
                id: ogrenciData.id,
                ad: ogrenciData.ad,
                soyad: ogrenciData.soyad,
                no: ogrenciData.no,
                sinif: ogrenciData.sinif,
                baslangic_tarihi: staj.baslangic_tarihi,
                bitis_tarihi: staj.bitis_tarihi
              });
            } else if (ogrenciError) {
              console.warn(`Öğrenci bilgisi alınamadı (öğrenci: ${staj.ogrenci_id}):`, ogrenciError);
            }
          } catch (error) {
            console.warn(`Staj detayları alınırken hata (staj: ${staj.id}):`, error);
          }
        }
      }

      const isletmeWithDetails = {
        ...isletmeData,
        students,
        koordinatorOgretmen
      };

      setSelectedIsletme(isletmeWithDetails);
    } catch (error) {
      console.error('Seçilen işletme bilgileri alınırken hata:', error);
      setSelectedIsletme(null);
    } finally {
      setLoadingSelectedIsletme(false);
    }
  }

  const handleSinifEkle = async () => {
    if (!sinifFormData.ad.trim()) {
      alert('Sınıf adı gereklidir!')
      return
    }

    setSubmitLoading(true)
    const { error } = await supabase
      .from('siniflar')
      .insert({
        ad: sinifFormData.ad.trim(),
        alan_id: alanId,
        dal: sinifFormData.dal.trim() || null,
        isletme_gunleri: sinifFormData.isletme_gunleri || null,
        okul_gunleri: sinifFormData.okul_gunleri || null,
        haftalik_program: sinifFormData.haftalik_program || null
      })

    if (error) {
      alert('Sınıf eklenirken hata oluştu: ' + error.message)
    } else {
      setSinifModalOpen(false)
      setSinifFormData({ ad: '', dal: '', isletme_gunleri: '', okul_gunleri: '', haftalik_program: { pazartesi: 'bos', sali: 'bos', carsamba: 'bos', persembe: 'bos', cuma: 'bos' } })
      fetchSiniflar(1)
    }
    setSubmitLoading(false)
  }

  const handleSinifDuzenle = (sinif: Sinif) => {
    setSelectedSinif(sinif)
    setEditSinifFormData({
      ad: sinif.ad,
      dal: sinif.dal || '',
      isletme_gunleri: sinif.isletme_gunleri || '',
      okul_gunleri: sinif.okul_gunleri || '',
      haftalik_program: sinif.haftalik_program || { pazartesi: 'bos', sali: 'bos', carsamba: 'bos', persembe: 'bos', cuma: 'bos' }
    })
    setEditSinifModal(true)
  }

  const handleSinifGuncelle = async () => {
    if (!selectedSinif || !editSinifFormData.ad.trim()) {
      alert('Sınıf adı gereklidir!')
      return
    }

    setSubmitLoading(true)
    const { error } = await supabase
      .from('siniflar')
      .update({
        ad: editSinifFormData.ad.trim(),
        dal: editSinifFormData.dal.trim() || null,
        isletme_gunleri: editSinifFormData.isletme_gunleri || null,
        okul_gunleri: editSinifFormData.okul_gunleri || null,
        haftalik_program: editSinifFormData.haftalik_program || null
      })
      .eq('id', selectedSinif.id)

    if (error) {
      alert('Sınıf güncellenirken hata oluştu: ' + error.message)
    } else {
      setEditSinifModal(false)
      fetchSiniflar(sinifCurrentPage)
      fetchOgrenciler(ogrenciCurrentPage) // Öğrenci listesini de güncelle
    }
    setSubmitLoading(false)
  }

  const handleSinifSil = (sinif: Sinif) => {
    setSelectedSinif(sinif)
    setDeleteSinifModal(true)
  }

  const handleSinifSilOnayla = async () => {
    if (!selectedSinif) return

    // Önce bu sınıfta öğrenci var mı kontrol et
    const { count } = await supabase
      .from('ogrenciler')
      .select('*', { count: 'exact', head: true })
      .eq('sinif', selectedSinif.ad)
      .eq('alan_id', alanId)

    if (count && count > 0) {
      alert(`Bu sınıfta ${count} öğrenci var. Önce öğrencileri silin veya başka sınıfa taşıyın.`)
      setDeleteSinifModal(false)
      return
    }

    setSubmitLoading(true)
    const { error } = await supabase
      .from('siniflar')
      .delete()
      .eq('id', selectedSinif.id)

    if (error) {
      alert('Sınıf silinirken hata oluştu: ' + error.message)
    } else {
      setDeleteSinifModal(false)
      fetchSiniflar(1)
      fetchOgrenciler(1) // Sınıf silme sonrası ilk sayfaya dön
    }
    setSubmitLoading(false)
  }

  const handleOgrenciEkle = async () => {
    if (!ogrenciFormData.ad.trim() || !ogrenciFormData.soyad.trim() ||
        !ogrenciFormData.no.trim() || !ogrenciFormData.sinif_id) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    try {
      setSubmitLoading(true)
      const { error } = await supabase
        .from('ogrenciler')
        .insert({
          ad: ogrenciFormData.ad.trim(),
          soyad: ogrenciFormData.soyad.trim(),
          no: ogrenciFormData.no.trim(),
          sinif: ogrenciFormData.sinif_id,
          alan_id: alanId
        })

      if (error) throw error

      // Verileri yeniden yükle
      await fetchOgrenciler(1) // Yeni öğrenci eklendiğinde ilk sayfaya dön
      await fetchSiniflar(1) // Sınıf sayıların�� güncelle
      
      setOgrenciModalOpen(false)
      setOgrenciFormData({ ad: '', soyad: '', no: '', sinif_id: '' })
      toast.success('Öğrenci başarıyla eklendi')
    } catch (error) {
      console.error('Öğrenci eklenirken hata:', error)
      toast.error('Öğrenci eklenirken bir hata oluştu')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleSinifClick = (sinif: Sinif) => {
    setSelectedSinif(selectedSinif?.id === sinif.id ? null : sinif)
  }

  const handleOgrenciDuzenle = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setEditOgrenciFormData({
      ad: ogrenci.ad,
      soyad: ogrenci.soyad,
      no: ogrenci.no,
      sinif: ogrenci.sinif || ''
    })
    setEditOgrenciModal(true)
  }

  // Öğrenci güncelleme fonksiyonu
  const handleOgrenciGuncelle = async () => {
    if (!selectedOgrenci || !editOgrenciFormData.ad.trim() || !editOgrenciFormData.soyad.trim()) {
      toast.error('Ad ve soyad alanları zorunludur!')
      return
    }

    try {
      setSubmitLoading(true)
      
      const { error } = await supabase
        .from('ogrenciler')
        .update({
          ad: editOgrenciFormData.ad.trim(),
          soyad: editOgrenciFormData.soyad.trim(),
          no: editOgrenciFormData.no.trim(),
          sinif: editOgrenciFormData.sinif
        })
        .eq('id', selectedOgrenci.id)

      if (error) throw error

      // Başarılı güncelleme
      toast.success('Öğrenci bilgileri güncellendi!')
      setOgrenciEditMode(false)
      fetchOgrenciler(ogrenciCurrentPage)
      
      // Modal'daki seçili öğrenci bilgilerini güncelle
      const updatedOgrenci = {
        ...selectedOgrenci,
        ad: editOgrenciFormData.ad.trim(),
        soyad: editOgrenciFormData.soyad.trim(),
        no: editOgrenciFormData.no.trim(),
        sinif: editOgrenciFormData.sinif
      }
      setSelectedOgrenci(updatedOgrenci)
      
    } catch (error) {
      console.error('Öğrenci güncellenirken hata:', error)
      toast.error('Öğrenci güncellenirken bir hata oluştu!')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Öğrenci silme onaylama fonksiyonu
  const handleOgrenciSilOnayla = async () => {
    if (!selectedOgrenci) return

    try {
      setSubmitLoading(true)

      // Önce öğrencinin aktif stajını kontrol et
      const { data: stajData } = await supabase
        .from('stajlar')
        .select('id')
        .eq('ogrenci_id', selectedOgrenci.id)
        .eq('durum', 'aktif')

      if (stajData && stajData.length > 0) {
        toast.error('Bu öğrencinin aktif stajı var! Önce stajını tamamlamanız gerekiyor.')
        return
      }

      // Öğrenciyi sil
      const { error } = await supabase
        .from('ogrenciler')
        .delete()
        .eq('id', selectedOgrenci.id)

      if (error) throw error

      // Başarılı silme
      toast.success('Öğrenci başarıyla silindi!')
      setDeleteOgrenciModal(false)
      setOgrenciDetayModal(false)
      setSelectedOgrenci(null)
      fetchOgrenciler(ogrenciCurrentPage)
      
    } catch (error) {
      console.error('Öğrenci silinirken hata:', error)
      toast.error('Öğrenci silinirken bir hata oluştu!')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Haftalık program yardımcı fonksiyonları
  const gunleriGetir = (programString: string): string[] => {
    if (!programString) return []
    return programString.split('-')
  }

  const programOtomatikOlustur = (isletmeGunleri: string, okulGunleri: string): HaftalikProgram => {
    const program: HaftalikProgram = {
      pazartesi: 'bos',
      sali: 'bos', 
      carsamba: 'bos',
      persembe: 'bos',
      cuma: 'bos'
    }

    const isletmeGunListesi = gunleriGetir(isletmeGunleri)
    const okulGunListesi = gunleriGetir(okulGunleri)

    // İşletme günlerini ayarla
    isletmeGunListesi.forEach(gun => {
      const gunAdi = gun.toLowerCase().trim()
      let programKey: keyof HaftalikProgram | null = null
      
      switch (gunAdi) {
        case 'pazartesi': programKey = 'pazartesi'; break
        case 'salı': programKey = 'sali'; break
        case 'çarşamba': programKey = 'carsamba'; break
        case 'perşembe': programKey = 'persembe'; break
        case 'cuma': programKey = 'cuma'; break
      }
      
      if (programKey) {
        program[programKey] = 'isletme'
      }
    })

    // Okul günlerini ayarla  
    okulGunListesi.forEach(gun => {
      const gunAdi = gun.toLowerCase().trim()
      let programKey: keyof HaftalikProgram | null = null
      
      switch (gunAdi) {
        case 'pazartesi': programKey = 'pazartesi'; break
        case 'salı': programKey = 'sali'; break
        case 'çarşamba': programKey = 'carsamba'; break
        case 'perşembe': programKey = 'persembe'; break
        case 'cuma': programKey = 'cuma'; break
      }
      
      if (programKey) {
        program[programKey] = 'okul'
      }
    })

    return program
  }

  // Haftalık Program Bileşeni
  const HaftalikProgramBileseni = ({ 
    program, 
    onChange, 
    readOnly = false 
  }: {
    program: HaftalikProgram
    onChange?: (yeniProgram: HaftalikProgram) => void
    readOnly?: boolean
  }) => {
    const gunler = [
      { key: 'pazartesi', label: 'Pazartesi' },
      { key: 'sali', label: 'Salı' },
      { key: 'carsamba', label: 'Çarşamba' },
      { key: 'persembe', label: 'Perşembe' },
      { key: 'cuma', label: 'Cuma' }
    ]

    const gunDegistir = (gun: keyof HaftalikProgram, durum: 'okul' | 'isletme' | 'bos') => {
      if (!onChange || readOnly) return
      onChange({
        ...program,
        [gun]: durum
      })
    }

    const durumRengi = (durum: string) => {
      switch (durum) {
        case 'okul': return 'bg-blue-100 border-blue-300 text-blue-800'
        case 'isletme': return 'bg-green-100 border-green-300 text-green-800'
        default: return 'bg-gray-100 border-gray-300 text-gray-600'
      }
    }

    const durumIkonu = (durum: string) => {
      switch (durum) {
        case 'okul': return '🏫'
        case 'isletme': return '🏢'
        default: return '⭕'
      }
    }

    const durumMetni = (durum: string) => {
      switch (durum) {
        case 'okul': return 'Okul'
        case 'isletme': return 'İşletme'
        default: return 'Boş'
      }
    }

    const sonrakiDurum = (durum: string): 'okul' | 'isletme' | 'bos' => {
      switch (durum) {
        case 'bos': return 'okul'
        case 'okul': return 'isletme'
        default: return 'bos'
      }
    }

    return (
      <div className="grid grid-cols-5 gap-4">
        {gunler.map(({ key, label }) => (
          <div key={`gun-${key}`} className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">
              {label}
            </div>
            <button
              type="button"
              onClick={() => gunDegistir(key as keyof HaftalikProgram, sonrakiDurum(program[key as keyof HaftalikProgram]))}
              disabled={readOnly}
              className={`w-full p-4 rounded-lg border ${durumRengi(program[key as keyof HaftalikProgram])} ${!readOnly && 'hover:opacity-80'} transition-opacity duration-200`}
            >
              <div className="text-2xl mb-1">{durumIkonu(program[key as keyof HaftalikProgram])}</div>
              <div className="text-sm font-medium">{durumMetni(program[key as keyof HaftalikProgram])}</div>
            </button>
          </div>
        ))}
      </div>
    )
  }

  // Alan güncelleme fonksiyonu
  const handleAlanGuncelle = async () => {
    if (!alanFormData.ad.trim()) {
      alert('Alan adı boş olamaz!')
      return
    }

    try {
      setSubmitLoading(true)
      
      const { data, error } = await supabase
        .from('alanlar')
        .update({
          ad: alanFormData.ad.trim(),
          aciklama: alanFormData.aciklama?.trim() || null,
          aktif: alanFormData.aktif
        })
        .eq('id', alanId)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Başarılı güncelleme
      await fetchAlanDetay()
      setAlanAyarlarModal(false)
    } catch (error) {
      console.error('Alan güncellenirken hata:', error)
      alert('Alan güncellenirken bir hata oluştu.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Alan silme fonksiyonu
  const handleAlanSil = async () => {
    try {
      setSubmitLoading(true)

      // Önce bağlı öğrencileri kontrol et
      const { count } = await supabase
        .from('ogrenciler')
        .select('*', { count: 'exact', head: true })
        .eq('alan_id', alanId)

      if (count && count > 0) {
        alert(`Bu alanda ${count} öğrenci kayıtlı. Önce öğrencileri başka bir alana aktarmanız gerekiyor.`)
        setAlanSilModal(false)
        return
      }

      // Öğretmenleri kontrol et
      const { data: ogretmenler, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')
        .eq('alan_id', alanId)

      if (ogretmenError) throw ogretmenError

      if (ogretmenler && ogretmenler.length > 0) {
        const ogretmenListesi = ogretmenler.map(o => `${o.ad} ${o.soyad}`).join(', ')
        alert(`Bu alanda ${ogretmenler.length} öğretmen görevli (${ogretmenListesi}). Önce öğretmenleri başka bir alana aktarmanız gerekiyor.`)
        setAlanSilModal(false)
        return
      }

      const { error } = await supabase
        .from('alanlar')
        .delete()
        .eq('id', alanId)

      if (error) throw error

      router.push('/admin/alanlar')
    } catch (error) {
      console.error('Alan silinirken hata:', error)
      alert('Alan silinirken bir hata oluştu.')
    } finally {
      setSubmitLoading(false)
      setAlanSilModal(false)
    }
  }

  // Öğrenci detaylarını gösteren modal'ı açma fonksiyonu
  const handleOgrenciDetay = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setEditOgrenciFormData({
      ad: ogrenci.ad,
      soyad: ogrenci.soyad,
      no: ogrenci.no,
      sinif: ogrenci.sinif
    })
    setOgrenciEditMode(false)
    setOgrenciDetayModal(true)
  }



  // Refresh all data function
  const handleRefreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchAlanDetay(),
        fetchSiniflar(1),
        fetchOgrenciler(1), // Veri yenileme sırasında ilk sayfaya dön
        fetchOgretmenler(),
        fetchIsletmeListesi()
      ])
      setDataError(false)
    } catch (error) {
      console.error('Veri yenileme sırasında hata:', error)
      setDataError(true)
    } finally {
      setRefreshing(false)
    }
  }

  // Check for data errors first, then passive field
  if (dataError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Üst Bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm text-gray-600 mb-2">
                <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
                  Meslek Alanları
                </Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-900">Alan</span>
              </nav>

              <h1 className="text-2xl font-semibold text-gray-900">Alan</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefreshData}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Yenileniyor...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Verileri Yenile
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Veri Hatası Uyarısı */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Veriler Yüklenemedi
                  </h3>
                  <p className="text-red-700 mb-4">
                    Sayfa verileri yüklenirken bir hata oluştu. Bu durum genellikle oturum süresinin dolması veya bağlantı sorunlarından kaynaklanır. Lütfen sayfayı yenileyin.
                  </p>
                  <button
                    onClick={handleRefreshData}
                    disabled={refreshing}
                    className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors duration-200 disabled:opacity-50"
                  >
                    {refreshing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full mr-2"></div>
                        Yenileniyor...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Verileri Yenile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Pasif alan kontrolü (sadece veri hatası yoksa)
  if (alan && !alan.aktif) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Üst Bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm text-gray-600 mb-2">
                <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
                  Meslek Alanları
                </Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-900">{alan?.ad}</span>
              </nav>

              <h1 className="text-2xl font-semibold text-gray-900">{alan?.ad || 'Alan'}</h1>
          </div>

          <div className="flex items-center space-x-2">
            {dataError && (
              <button
                onClick={handleRefreshData}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Yenileniyor...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Verileri Yenile
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setAlanAyarlarModal(true)}
              className="relative z-10 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200 cursor-pointer"
              title="Alan Ayarları"
              style={{ pointerEvents: 'auto' }}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          </div>

          {/* Alan Bilgileri */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-red-600 bg-clip-text text-transparent mb-2">
              {alan?.ad}
            </h1>
            <p className="text-gray-600">
              Alan detayları, sınıflar ve öğrenciler
            </p>
            {alan?.aciklama && (
              <p className="mt-4 text-gray-700 bg-amber-50 rounded-lg p-4">
                {alan.aciklama}
              </p>
            )}
            
            {/* Pasif Alan Uyarısı */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">
                    Bu Alan Pasif Durumda
                  </h3>
                  <p className="text-amber-700 mb-4">
                    Bu alanda herhangi bir işlem yapabilmek için önce alanı aktif hale getirmeniz gerekmektedir.
                    Pasif alanlarda öğrenci ve öğretmen işlemleri yapılamaz.
                  </p>
                  <button
                    onClick={() => setAlanAyarlarModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors duration-200"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Alan Ayarlarını Aç
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Kilitli İçerik */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center opacity-50">
            <School className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-500 mb-2">
              Alan İçeriği Kilitli
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Bu alandaki öğretmen, sınıf ve öğrenci bilgilerine erişmek için 
              önce alanı aktif hale getirmeniz gerekmektedir.
            </p>
          </div>
        </div>

        {/* Modalları ekle */}
        <Modal
          isOpen={alanAyarlarModal}
          onClose={() => setAlanAyarlarModal(false)}
          title="Alan Ayarları"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alan Adı
              </label>
              <input
                type="text"
                value={alanFormData.ad}
                onChange={(e) => setAlanFormData({ ...alanFormData, ad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={alanFormData.aciklama}
                onChange={(e) => setAlanFormData({ ...alanFormData, aciklama: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="alan-aktif"
                checked={alanFormData.aktif}
                onChange={(e) => setAlanFormData({ ...alanFormData, aktif: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="alan-aktif" className="ml-2 block text-sm text-gray-700">
                Alan aktif
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setAlanSilModal(true)}
                className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Alanı Sil
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => setAlanAyarlarModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleAlanGuncelle}
                  disabled={submitLoading || !alanFormData.ad.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {submitLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={alanSilModal}
          onClose={() => {
            setAlanSilModal(false)
            setSilmeOnayi('')
            setSilmeHatasi('')
          }}
          title="Alanı Sil"
        >
          <div className="space-y-4">
            <div className="bg-red-50 text-red-800 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="font-semibold">Dikkat!</span>
              </div>
              <p>Bu alan kalıcı olarak silinecek ve bu işlem geri alınamaz.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Onay
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Silme işlemini onaylamak için alan adını <span className="font-mono bg-gray-100 px-1 rounded">{alan?.ad}</span> yazın:
              </p>
              <input
                type="text"
                value={silmeOnayi}
                onChange={(e) => {
                  setSilmeOnayi(e.target.value)
                  setSilmeHatasi('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Alan adını yazın"
              />
              {silmeHatasi && (
                <p className="mt-1 text-sm text-red-600">{silmeHatasi}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => {
                  setAlanSilModal(false)
                  setSilmeOnayi('')
                  setSilmeHatasi('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (silmeOnayi !== alan?.ad) {
                    setSilmeHatasi('Alan adı eşleşmiyor')
                    return
                  }
                  handleAlanSil()
                }}
                disabled={!silmeOnayi || silmeOnayi !== alan?.ad || submitLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Üst Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-gray-600 mb-2">
              <Link href="/admin/alanlar" className="hover:text-indigo-600 flex items-center">
                Meslek Alanları
              </Link>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="text-gray-900">{alan?.ad}</span>
            </nav>

            <h1 className="text-2xl font-semibold text-gray-900">{alan?.ad}</h1>
          </div>

          <button
            onClick={() => setAlanAyarlarModal(true)}
            className="relative z-10 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors duration-200 cursor-pointer"
            title="Alan Ayarları"
            style={{ pointerEvents: 'auto' }}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => {
                  setActiveTab('ogretmenler')
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', 'ogretmenler')
                  window.history.pushState({}, '', url.toString())
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'ogretmenler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-5 w-5" />
                Öğretmenler ({ogretmenler.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('siniflar')
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', 'siniflar')
                  window.history.pushState({}, '', url.toString())
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'siniflar'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <GraduationCap className="h-5 w-5" />
                Sınıflar ({totalSiniflar})
              </button>
              <button
                onClick={() => {
                  setActiveTab('ogrenciler')
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', 'ogrenciler')
                  window.history.pushState({}, '', url.toString())
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'ogrenciler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="h-5 w-5" />
                Öğrenciler ({totalOgrenciler})
              </button>
              <button
                onClick={() => {
                  setActiveTab('isletmeler')
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', 'isletmeler')
                  window.history.pushState({}, '', url.toString())
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'isletmeler'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="h-5 w-5" />
                İşletmeler ({isletmeListesi.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'ogretmenler' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ogretmenler.map((ogretmen: any) => (
                  <Link
                    key={ogretmen.id}
                    href={`/admin/ogretmenler/${ogretmen.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 rounded-full">
                        <User className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{ogretmen.ad} {ogretmen.soyad}</h3>
                        {ogretmen.email && <p className="text-sm text-gray-500">{ogretmen.email}</p>}
                        {ogretmen.telefon && <p className="text-sm text-gray-500">{ogretmen.telefon}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === 'siniflar' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Sınıflar</h2>
                  <button
                    onClick={() => {
                      setSinifFormData({ ad: '', dal: '', isletme_gunleri: '', okul_gunleri: '', haftalik_program: { pazartesi: 'bos', sali: 'bos', carsamba: 'bos', persembe: 'bos', cuma: 'bos' } })
                      setSinifModalOpen(true)
                    }}
                    className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                    title="Yeni Sınıf Ekle"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {sinifLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Sınıflar yükleniyor...</p>
                  </div>
                ) : siniflar.length > 0 ? (
                  <div className="space-y-4">
                    {siniflar.map((sinif, index) => (
                      <div key={sinif.id || `sinif-${index}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setActiveTab('ogrenciler')
                              setSelectedSinifFilter(sinif.ad)
                            }}
                            className="flex items-center flex-1 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
                          >
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <School className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{sinif.ad}</h3>
                              <p className="text-sm text-gray-500">{sinif.ogrenci_sayisi || 0} öğrenci</p>
                              {sinif.dal && (
                                <p className="text-xs text-indigo-600 font-medium">{sinif.dal}</p>
                              )}
                            </div>
                          </button>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSinifDuzenle(sinif)
                              }}
                              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                              title="Sınıfı Düzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sinifTotalPages > 1 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            Toplam {totalSiniflar} sınıftan {((sinifCurrentPage - 1) * pageSize) + 1}-{Math.min(sinifCurrentPage * pageSize, totalSiniflar)} arası gösteriliyor
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSinifCurrentPage(sinifCurrentPage - 1)}
                              disabled={sinifCurrentPage === 1 || sinifLoading}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Önceki
                            </button>
                            <button
                              onClick={() => setSinifCurrentPage(sinifCurrentPage + 1)}
                              disabled={sinifCurrentPage === sinifTotalPages || sinifLoading}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Sonraki
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <School className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz sınıf yok</h3>
                    <p className="mt-1 text-sm text-gray-500">Bu alan için henüz sınıf eklenmemiş.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ogrenciler' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Öğrenciler</h2>
                  <div className="flex gap-3">
                    {/* Sınıf filtresi */}
                    <select
                      value={selectedSinifFilter}
                      onChange={(e) => setSelectedSinifFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option key="filter-all-siniflar" value="">Tüm sınıflar</option>
                      {siniflar.map((sinif, index) => (
                        <option key={`filter-sinif-${sinif.id || index}`} value={sinif.ad}>
                          {sinif.ad}
                        </option>
                      ))}
                    </select>
                    {/* Staj durumu filtresi */}
                    <select
                      value={selectedStajFilter}
                      onChange={(e) => setSelectedStajFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option key="filter-all-staj" value="">Tüm öğrenciler</option>
                      <option key="filter-staj-var" value="var">İşletmesi olanlar</option>
                      <option key="filter-staj-yok" value="yok">İşletmesi olmayanlar</option>
                    </select>
                    <button
                      onClick={() => {
                        setOgrenciFormData({ ad: '', soyad: '', no: '', sinif_id: '' })
                        setOgrenciModalOpen(true)
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                      title="Yeni Öğrenci Ekle"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {ogrenciLoading ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Öğrenciler yükleniyor...</p>
                  </div>
                ) : ogrenciler.filter(ogrenci => {
                  // Staj durumu filtresi
                  if (selectedStajFilter === 'var') {
                    return ogrenci.staj_durumu === 'aktif'
                  } else if (selectedStajFilter === 'yok') {
                    return ogrenci.staj_durumu !== 'aktif'
                  }
                  return true // Tüm öğrenciler
                }).length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Öğrenci
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                No
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sınıf
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                İşletme
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Koordinatör
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Başlama Tarihi
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Durum
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                İşlemler
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ogrenciler.filter(ogrenci => {
                              // Staj durumu filtresi
                              if (selectedStajFilter === 'var') {
                                return ogrenci.staj_durumu === 'aktif'
                              } else if (selectedStajFilter === 'yok') {
                                return ogrenci.staj_durumu !== 'aktif'
                              }
                              return true // Tüm öğrenciler
                            }).map((ogrenci, index) => (
                              <tr key={ogrenci.id || `ogrenci-${index}`} className="hover:bg-gray-50 transition-colors duration-200">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                      <User className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {ogrenci.ad} {ogrenci.soyad}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {ogrenci.no}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {ogrenci.sinif}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {ogrenci.isletme_adi || (
                                    <span className="text-gray-400 italic">Atanmamış</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {ogrenci.koordinator_ogretmen || (
                                    <span className="text-gray-400 italic">Atanmamış</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {ogrenci.baslama_tarihi ? (
                                    new Date(ogrenci.baslama_tarihi).toLocaleDateString('tr-TR')
                                  ) : (
                                    <span className="text-gray-400 italic">Belirlenmemiş</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    ogrenci.staj_durumu === 'aktif'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {ogrenci.staj_durumu === 'aktif' ? 'Aktif Staj' : 'Staj Yok'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleOgrenciDetay(ogrenci)}
                                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                    title="Öğrenci Detayları"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {ogrenciTotalPages > 1 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            Toplam {totalOgrenciler} öğrenciden {((ogrenciCurrentPage - 1) * pageSize) + 1}-{Math.min(ogrenciCurrentPage * pageSize, totalOgrenciler)} arası gösteriliyor
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setOgrenciCurrentPage(ogrenciCurrentPage - 1)}
                              disabled={ogrenciCurrentPage === 1 || ogrenciLoading}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Önceki
                            </button>
                            
                            {Array.from({ length: Math.min(5, ogrenciTotalPages) }, (_, i) => {
                              let pageNum;
                              if (ogrenciTotalPages <= 5) {
                                pageNum = i + 1;
                              } else if (ogrenciCurrentPage <= 3) {
                                pageNum = i + 1;
                              } else if (ogrenciCurrentPage >= ogrenciTotalPages - 2) {
                                pageNum = ogrenciTotalPages - 4 + i;
                              } else {
                                pageNum = ogrenciCurrentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={`page-${i}-${pageNum}`}
                                  onClick={() => setOgrenciCurrentPage(pageNum)}
                                  disabled={ogrenciLoading}
                                  className={`px-3 py-1 rounded text-sm ${
                                    ogrenciCurrentPage === pageNum
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => setOgrenciCurrentPage(ogrenciCurrentPage + 1)}
                              disabled={ogrenciCurrentPage === ogrenciTotalPages || ogrenciLoading}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Sonraki
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {selectedStajFilter === 'var' ? 'İşletmesi olan öğrenci yok' :
                       selectedStajFilter === 'yok' ? 'İşletmesi olmayan öğrenci yok' :
                       selectedSinifFilter ? `${selectedSinifFilter} sınıfında öğrenci yok` : 'Henüz öğrenci yok'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedStajFilter === 'var' ? 'Şu anda aktif stajı olan öğrenci bulunmuyor.' :
                       selectedStajFilter === 'yok' ? 'Şu anda stajı olmayan öğrenci bulunmuyor.' :
                       selectedSinifFilter ? 'Bu sınıf için henüz öğrenci eklenmemiş.' : 'Bu alan için henüz öğrenci eklenmemiş.'}
                    </p>
                    <button
                      onClick={() => {
                        setOgrenciFormData({ ad: '', soyad: '', no: '', sinif_id: selectedSinifFilter })
                        setOgrenciModalOpen(true)
                      }}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors duration-200"
                    >
                      <User className="h-4 w-4 mr-2" />
                      İlk öğrenciyi ekle
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'isletmeler' && (
              <div className="space-y-6">
                {/* İşletme Seçim Çubuğu */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">İşletme Seçimi</h3>
                  <select
                    value={selectedIsletme?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        fetchSelectedIsletme(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">İşletme seçin...</option>
                    {isletmeListesi.map((isletme) => (
                      <option key={isletme.id} value={isletme.id}>
                        {isletme.ad}
                        {isletme.telefon && ` - ${isletme.telefon}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seçilen İşletme Detayları */}
                {loadingSelectedIsletme ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">İşletme bilgileri yükleniyor...</p>
                  </div>
                ) : selectedIsletme ? (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Company Header */}
                    <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-100 rounded-lg">
                            <Building2 className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{selectedIsletme.ad}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              {selectedIsletme.adres && <p className="text-sm text-gray-600">{selectedIsletme.adres}</p>}
                              {selectedIsletme.telefon && <p className="text-sm text-gray-600">{selectedIsletme.telefon}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Stajyer Sayısı</div>
                          <div className="text-2xl font-bold text-indigo-600">{selectedIsletme.students?.length || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Coordinating Teacher */}
                    {selectedIsletme.koordinatorOgretmen && (
                      <div className="p-4 bg-blue-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-blue-900">Koordinatör Öğretmen</div>
                            <div className="text-sm text-blue-700">
                              {selectedIsletme.koordinatorOgretmen.ad} {selectedIsletme.koordinatorOgretmen.soyad}
                            </div>
                            {selectedIsletme.koordinatorOgretmen.email && (
                              <div className="text-xs text-blue-600">{selectedIsletme.koordinatorOgretmen.email}</div>
                            )}
                            {selectedIsletme.koordinatorOgretmen.telefon && (
                              <div className="text-xs text-blue-600">{selectedIsletme.koordinatorOgretmen.telefon}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Students Table */}
                    {selectedIsletme.students && selectedIsletme.students.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Öğrenci
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                No
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sınıf
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Başlama Tarihi
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Bitiş Tarihi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedIsletme.students.map((student: any) => (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                      <User className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.ad} {student.soyad}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.no}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {student.sinif}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.baslangic_tarihi ? (
                                    new Date(student.baslangic_tarihi).toLocaleDateString('tr-TR')
                                  ) : (
                                    <span className="text-gray-400 italic">Belirlenmemiş</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {student.bitis_tarihi ? (
                                    new Date(student.bitis_tarihi).toLocaleDateString('tr-TR')
                                  ) : (
                                    <span className="text-gray-400 italic">Belirlenmemiş</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p>Bu işletmede aktif stajyer bulunmamaktadır.</p>
                      </div>
                    )}
                  </div>
                ) : isletmeListesi.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz işletme yok</h3>
                    <p className="mt-1 text-sm text-gray-500">Bu alan için henüz işletme eklenmemiş.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">İşletme Seçin</h3>
                    <p className="text-gray-600">Detayları görüntülemek için yukarıdaki listeden bir işletme seçin.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sınıf Ekleme Modalı */}
      <Modal
        isOpen={sinifModalOpen}
        onClose={() => setSinifModalOpen(false)}
        title="Yeni Sınıf Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sınıf Adı
            </label>
            <input
              type="text"
              value={sinifFormData.ad}
              onChange={(e) => setSinifFormData({ ...sinifFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Örn: 12-A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dal
            </label>
            <input
              type="text"
              value={sinifFormData.dal}
              onChange={(e) => setSinifFormData({ ...sinifFormData, dal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Örn: Web Programcılığı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Haftalık Program
            </label>
            <HaftalikProgramBileseni
              program={sinifFormData.haftalik_program}
              onChange={(yeniProgram) => setSinifFormData({ ...sinifFormData, haftalik_program: yeniProgram })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setSinifModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
            >
              İptal
            </button>
            <button
              onClick={handleSinifEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sınıf Düzenleme Modalı */}
      <Modal
        isOpen={editSinifModal}
        onClose={() => setEditSinifModal(false)}
        title="Sınıfı Düzenle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sınıf Adı
            </label>
            <input
              type="text"
              value={editSinifFormData.ad}
              onChange={(e) => setEditSinifFormData({ ...editSinifFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dal
            </label>
            <input
              type="text"
              value={editSinifFormData.dal}
              onChange={(e) => setEditSinifFormData({ ...editSinifFormData, dal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Haftalık Program
            </label>
            <HaftalikProgramBileseni
              program={editSinifFormData.haftalik_program}
              onChange={(yeniProgram) => setEditSinifFormData({ ...editSinifFormData, haftalik_program: yeniProgram })}
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => {
                setEditSinifModal(false)
                setDeleteSinifModal(true)
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-300"
            >
              Sınıfı Sil
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditSinifModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
              >
                İptal
              </button>
              <button
                onClick={handleSinifGuncelle}
                disabled={submitLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              >
                {submitLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Sınıf Silme Onay Modalı */}
      <Modal
        isOpen={deleteSinifModal}
        onClose={() => {
          setDeleteSinifModal(false)
          setSinifSilmeOnayi('')
          setSinifSilmeHatasi('')
        }}
        title="Sınıfı Sil"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Dikkat: Bu işlem geri alınamaz!
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Bu sınıfı silmek için sınıf adını ({selectedSinif?.ad}) aşağıdaki kutuya yazın.
                    Bu işlem geri alınamaz ve sınıftaki tüm öğrenci kayıtları silinecektir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onay için sınıf adını yazın
            </label>
            <input
              type="text"
              value={sinifSilmeOnayi}
              onChange={(e) => {
                setSinifSilmeOnayi(e.target.value)
                setSinifSilmeHatasi('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={selectedSinif?.ad}
            />
            {sinifSilmeHatasi && (
              <p className="mt-1 text-sm text-red-600">{sinifSilmeHatasi}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setDeleteSinifModal(false)
                setSinifSilmeOnayi('')
                setSinifSilmeHatasi('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (sinifSilmeOnayi !== selectedSinif?.ad) {
                  setSinifSilmeHatasi('Sınıf adı eşleşmiyor')
                  return
                }
                handleSinifSilOnayla()
              }}
              disabled={!sinifSilmeOnayi || sinifSilmeOnayi !== selectedSinif?.ad || submitLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? 'Siliniyor...' : 'Evet, Sil'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Öğrenci Modalları */}
      <Modal
        isOpen={ogrenciModalOpen}
        onClose={() => setOgrenciModalOpen(false)}
        title="Yeni Öğrenci Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad
            </label>
            <input
              type="text"
              value={ogrenciFormData.ad}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soyad
            </label>
            <input
              type="text"
              value={ogrenciFormData.soyad}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, soyad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğrenci No
            </label>
            <input
              type="text"
              id="ogrenci-no"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Öğrenci numarası"
              value={ogrenciFormData.no}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, no: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sınıf
            </label>
            <select
              value={ogrenciFormData.sinif_id}
              onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, sinif_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option key="empty-sinif-select" value="">Sınıf seçin</option>
              {siniflar.map((sinif, index) => (
                <option key={`ogrenci-sinif-${sinif.id || index}`} value={sinif.ad}>
                  {sinif.ad}
                  {sinif.dal && ` - ${sinif.dal}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setOgrenciModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
            >
              İptal
            </button>
            <button
              onClick={handleOgrenciEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Öğrenci Düzenleme Modalı */}
      <Modal
        isOpen={editOgrenciModal}
        onClose={() => setEditOgrenciModal(false)}
        title="Öğrenciyi Düzenle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad
            </label>
            <input
              type="text"
              value={editOgrenciFormData.ad}
              onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soyad
            </label>
            <input
              type="text"
              value={editOgrenciFormData.soyad}
              onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, soyad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğrenci No
            </label>
            <input
              type="text"
              value={editOgrenciFormData.no}
              onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setEditOgrenciModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
            >
              İptal
            </button>
            <button
              onClick={handleOgrenciGuncelle}
              disabled={submitLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {submitLoading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Öğrenci Silme Onay Modalı */}
      <ConfirmModal
        isOpen={deleteOgrenciModal}
        onClose={() => setDeleteOgrenciModal(false)}
        onConfirm={handleOgrenciSilOnayla}
        title="Öğrenciyi Sil"
        description={`"${selectedOgrenci?.ad} ${selectedOgrenci?.soyad}" öğrencisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        isLoading={submitLoading}
      />

      {/* Öğrenci Detay Modalı */}
      <Modal
        isOpen={ogrenciDetayModal}
        onClose={() => {
          setOgrenciDetayModal(false)
          setOgrenciEditMode(false)
          setSelectedOgrenci(null)
        }}
        title={`${selectedOgrenci?.ad} ${selectedOgrenci?.soyad} - Detaylar`}
      >
        <div className="space-y-6">
          {/* Öğrenci Bilgileri */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
              {ogrenciEditMode ? (
                <input
                  type="text"
                  value={editOgrenciFormData.ad}
                  onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, ad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">{selectedOgrenci?.ad}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
              {ogrenciEditMode ? (
                <input
                  type="text"
                  value={editOgrenciFormData.soyad}
                  onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, soyad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">{selectedOgrenci?.soyad}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci No</label>
              {ogrenciEditMode ? (
                <input
                  type="text"
                  value={editOgrenciFormData.no}
                  onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">{selectedOgrenci?.no}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
              {ogrenciEditMode ? (
                <select
                  value={editOgrenciFormData.sinif}
                  onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, sinif: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {siniflar.map((sinif, index) => (
                    <option key={`edit-sinif-${sinif.id || index}`} value={sinif.ad}>
                      {sinif.ad} {sinif.dal && ` - ${sinif.dal}`}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">{selectedOgrenci?.sinif}</p>
              )}
            </div>
          </div>

          {/* Staj Bilgileri */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Staj Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İşletme</label>
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {selectedOgrenci?.isletme_adi || <span className="text-gray-400 italic">Atanmamış</span>}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koordinatör Öğretmen</label>
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {selectedOgrenci?.koordinator_ogretmen || <span className="text-gray-400 italic">Atanmamış</span>}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlama Tarihi</label>
                <p className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {selectedOgrenci?.baslama_tarihi 
                    ? new Date(selectedOgrenci.baslama_tarihi).toLocaleDateString('tr-TR')
                    : <span className="text-gray-400 italic">Belirlenmemiş</span>
                  }
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                <p className="px-3 py-2 bg-gray-50 rounded-md">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedOgrenci?.staj_durumu === 'aktif'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedOgrenci?.staj_durumu === 'aktif' ? 'Aktif Staj' : 'Staj Yok'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Modal Butonları */}
          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => {
                setOgrenciDetayModal(false)
                setDeleteOgrenciModal(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Öğrenciyi Sil
            </button>

            <div className="flex space-x-3">
              <button
                onClick={() => setOgrenciDetayModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
              >
                Kapat
              </button>
              
              {ogrenciEditMode ? (
                <>
                  <button
                    onClick={() => {
                      setOgrenciEditMode(false)
                      // Form'u resetle
                      setEditOgrenciFormData({
                        ad: selectedOgrenci?.ad || '',
                        soyad: selectedOgrenci?.soyad || '',
                        no: selectedOgrenci?.no || '',
                        sinif: selectedOgrenci?.sinif || ''
                      })
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleOgrenciGuncelle}
                    disabled={submitLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                  >
                    {submitLoading ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setOgrenciEditMode(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Alan Ayarları Modalı */}
      <Modal
        isOpen={alanAyarlarModal}
        onClose={() => setAlanAyarlarModal(false)}
        title="Alan Ayarları"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alan Adı
            </label>
            <input
              type="text"
              value={alanFormData.ad}
              onChange={(e) => setAlanFormData({ ...alanFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              value={alanFormData.aciklama}
              onChange={(e) => setAlanFormData({ ...alanFormData, aciklama: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="alan-aktif"
              checked={alanFormData.aktif}
              onChange={(e) => setAlanFormData({ ...alanFormData, aktif: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="alan-aktif" className="ml-2 block text-sm text-gray-700">
              Alan aktif
            </label>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setAlanSilModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Alanı Sil
            </button>
            <div className="space-x-2">
              <button
                onClick={() => setAlanAyarlarModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                İptal
              </button>
              <button
                onClick={handleAlanGuncelle}
                disabled={submitLoading || !alanFormData.ad.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50"
              >
                {submitLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Alan Silme Modalı */}
      <Modal
        isOpen={alanSilModal}
        onClose={() => {
          setAlanSilModal(false)
          setSilmeOnayi('')
          setSilmeHatasi('')
        }}
        title="Alanı Sil"
      >
        <div className="space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-semibold">Dikkat!</span>
            </div>
            <p>Bu alan kalıcı olarak silinecek ve bu işlem geri alınamaz.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onay
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Silme işlemini onaylamak için alan adını <span className="font-mono bg-gray-100 px-1 rounded">{alan?.ad}</span> yazın:
            </p>
            <input
              type="text"
              value={silmeOnayi}
              onChange={(e) => {
                setSilmeOnayi(e.target.value)
                setSilmeHatasi('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Alan adını yazın"
            />
            {silmeHatasi && (
              <p className="mt-1 text-sm text-red-600">{silmeHatasi}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => {
                setAlanSilModal(false)
                setSilmeOnayi('')
                setSilmeHatasi('')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              İptal
            </button>
            <button
              onClick={() => {
                if (silmeOnayi !== alan?.ad) {
                  setSilmeHatasi('Alan adı eşleşmiyor')
                  return
                }
                handleAlanSil()
              }}
              disabled={!silmeOnayi || silmeOnayi !== alan?.ad || submitLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? 'Siliniyor...' : 'Evet, Sil'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}