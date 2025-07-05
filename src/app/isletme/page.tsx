'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, FileText, LogOut, User, Upload, Plus, Download, Eye, Search, Filter, Receipt, Loader, GraduationCap, Calendar, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import Modal from '@/components/ui/Modal'
import { User as AuthUser } from '@supabase/supabase-js'

interface Isletme {
  id: string
  ad: string
  yetkili_kisi: string
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
  ay: string
  yil: number | string
  staj_id: string | number
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
}

type ActiveTab = 'ogrenciler' | 'dekontlar' | 'belgeler'

export default function PanelPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isletme, setIsletme] = useState<Isletme | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('ogrenciler')
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [belgeler, setBelgeler] = useState<Belge[]>([])
  const [filteredBelgeler, setFilteredBelgeler] = useState<Belge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [dekontViewModalOpen, setDekontViewModalOpen] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [dekontDetailModalOpen, setDekontDetailModalOpen] = useState(false)

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
  const [belgeViewModal, setBelgeViewModal] = useState(false)
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null)

  // Dekont yönetimi için state'ler
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  // Silme onay modalı için
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteDekont, setPendingDeleteDekont] = useState<Dekont | null>(null);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      console.log('Kullanıcı bilgileri:', user)
      console.log('Kullanıcı metadata:', user.user_metadata)
      setUser(user)

      if (!user.user_metadata?.isletme_id) {
        console.error('İşletme ID bulunamadı')
        router.push('/')
        return
      }

      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('*')
        .eq('id', user.user_metadata.isletme_id)
        .single()

      if (isletmeError) {
        console.error('İşletme verisi getirme hatası:', isletmeError)
        console.error('İşletme ID:', user.user_metadata.isletme_id)
        router.push('/')
        return
      }

      if (!isletmeData) {
        console.error('İşletme bulunamadı')
        router.push('/')
        return
      }

      console.log('İşletme verisi:', isletmeData)
      setIsletme(isletmeData)

      // İşletmenin öğrencilerini getir
      const { data: ogrenciData, error: ogrenciError } = await supabase
        .from('stajlar')
        .select(`
          id,
          baslangic_tarihi,
          bitis_tarihi,
          ogrenciler (
            id,
            ad,
            soyad,
            sinif,
            no,
            alanlar (
              ad
            )
          ),
          ogretmenler (
            ad,
            soyad
          )
        `)
        .eq('isletme_id', isletmeData.id)
        .eq('durum', 'aktif')

      if (ogrenciError) {
        console.error('Öğrenci verisi getirme hatası:', ogrenciError)
      } else if (ogrenciData) {
        const formattedOgrenciler = ogrenciData.map((staj: any) => ({
          id: staj.ogrenciler.id,
          staj_id: staj.id,
          ad: staj.ogrenciler.ad,
          soyad: staj.ogrenciler.soyad,
          sinif: staj.ogrenciler.sinif,
          no: staj.ogrenciler.no,
          alanlar: staj.ogrenciler.alanlar,
          baslangic_tarihi: staj.baslangic_tarihi,
          bitis_tarihi: staj.bitis_tarihi,
          ogretmen_ad: staj.ogretmenler.ad,
          ogretmen_soyad: staj.ogretmenler.soyad
        }))
        setOgrenciler(formattedOgrenciler)
      }

      // İşletmenin tüm dekontlarını getir
      const { data: dekontData, error: dekontError } = await supabase
        .from('dekontlar')
        .select(`
          *,
          stajlar (
            isletme_id,
            ogrenciler (
              id,
              ad,
              soyad,
              sinif,
              alan_id,
              alanlar (
                ad
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      console.log('Dekont verisi:', dekontData)
      console.log('Dekont hatası:', dekontError)

      if (dekontError) {
        console.error('Dekontları getirme hatası:', dekontError)
      } else if (dekontData) {
        const isletmeDekontlari = dekontData.filter(
          dekont => dekont.stajlar?.isletme_id === isletmeData.id
        )

        console.log('İşletme dekontları:', isletmeDekontlari)

        const formattedDekontlar = isletmeDekontlari.map((dekont: any) => ({
          id: dekont.id.toString(),
          staj_id: dekont.staj_id.toString(),
          miktar: dekont.miktar ? parseFloat(dekont.miktar) : null,
          onay_durumu: dekont.onay_durumu || 'bekliyor',
          aciklama: dekont.aciklama || '',
          dosya_url: dekont.dekont_dosyasi || dekont.dosya_url || dekont.file_url || null,
          ay: dekont.ay?.toString() || '',
          yil: dekont.yil?.toString() || '',
          gonderen: dekont.gonderen || 'isletme',
          odeme_tarihi: dekont.odeme_tarihi || null,
          ogrenci_adi: `${dekont.stajlar?.ogrenciler?.ad || ''} ${dekont.stajlar?.ogrenciler?.soyad || ''}`.trim(),
          stajlar: dekont.stajlar ? {
            ogrenciler: {
              ad: dekont.stajlar.ogrenciler.ad || '',
              soyad: dekont.stajlar.ogrenciler.soyad || '',
              sinif: dekont.stajlar.ogrenciler.sinif?.toString() || '',
              no: dekont.stajlar.ogrenciler.no?.toString() || '',
              alanlar: dekont.stajlar.ogrenciler.alanlar ? {
                ad: dekont.stajlar.ogrenciler.alanlar.ad || ''
              } : undefined
            }
          } : undefined,
          created_at: dekont.created_at
        }))

        setDekontlar(formattedDekontlar)
      }

      // İşletmenin belgelerini getir
      const { data: belgeData, error: belgeError } = await supabase
        .from('belgeler')
        .select('*')
        .eq('isletme_id', isletmeData.id)
        .order('yukleme_tarihi', { ascending: false })

      if (belgeError) {
        console.error('Belgeleri getirme hatası:', belgeError)
      } else if (belgeData) {
        setBelgeler(belgeData)
        setFilteredBelgeler(belgeData)
      }
    } catch (error) {
      console.error('Veri getirme hatası:', error)
    } finally {
      setLoading(false)
    }
  }, [router, egitimYili])

  useEffect(() => {
    fetchData()
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
    if (!belgeFormData.ad.trim()) {
      alert('Belge adı gereklidir!')
      return
    }

    const belgeTuru = belgeFormData.tur === 'other' ? belgeFormData.customTur : belgeFormData.tur

    if (!belgeTuru.trim()) {
      alert('Belge türü gereklidir!')
      return
    }

    if (!belgeFormData.dosya) {
      alert('Dosya seçimi zorunludur!')
      return
    }

    if (!user || !isletme) {
      alert('Kullanıcı veya işletme bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    try {
      const file = belgeFormData.dosya;
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const filePath = `${isletme.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('belgeler')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Dosya yükleme hatası:', uploadError);
        alert(`Dosya yüklenirken bir hata oluştu: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('belgeler')
        .getPublicUrl(filePath);

      const dosyaUrl = urlData.publicUrl;

      // Belgeler tablosuna kaydet
      const { data: insertData, error: insertError } = await supabase
        .from('belgeler')
        .insert({
          isletme_id: isletme.id,
          ad: belgeFormData.ad,
          tur: belgeTuru,
          dosya_url: dosyaUrl,
          user_id: user.id
        })
        .select()

      if (insertError) {
        console.error('Veritabanı ekleme hatası:', insertError);
        alert(`Belge bilgisi veritabanına kaydedilirken bir hata oluştu: ${insertError.message}`);
        
        await supabase.storage.from('belgeler').remove([filePath]);
        return;
      }

      setBelgeler(prev => [...prev, insertData[0]]);
      setBelgeModalOpen(false)
      setBelgeFormData({ ad: '', tur: 'sozlesme', customTur: '', dosya: null })
    } catch (error: any) {
      console.error('Belge ekleme sırasında beklenmedik hata:', error);
      alert(`Bir hata oluştu: ${error.message}`);
    }
  }

  const handleBelgeSil = async (belge: Belge) => {
    if (!belge.dosya_url) {
      alert("Bu belge için silinecek bir dosya bulunamadı.");
      return;
    }
    
    if (confirm(`'${belge.ad}' adlı belgeyi kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      try {
        const urlParts = belge.dosya_url.split('/belgeler/');
        if (urlParts.length < 2) {
          throw new Error("Geçersiz dosya URL formatı. Yol çıkarılamadı.");
        }
        const filePath = urlParts[1];
        
        const { error: storageError } = await supabase.storage.from('belgeler').remove([filePath]);
        if (storageError && storageError.message !== 'The resource was not found') {
          console.error("Depolama silme hatası:", storageError);
          alert(`Dosya depolamadan silinirken bir hata oluştu: ${storageError.message}`);
        }

        const { error: dbError } = await supabase.from('belgeler').delete().eq('id', belge.id);
        if (dbError) {
          throw new Error(`Veritabanı silme hatası: ${dbError.message}`);
        }

        setBelgeler(belgeler.filter(b => b.id !== belge.id));
        if (selectedBelge && selectedBelge.id === belge.id) {
          setBelgeViewModal(false);
          setSelectedBelge(null);
        }
      } catch (error: any) {
        console.error('Belge silinirken beklenmedik hata:', error);
        alert(`Bir hata oluştu: ${error.message}`);
      }
    }
  };

  // Belge Görüntüleme
  const handleBelgeView = (belge: Belge) => {
    setSelectedBelge(belge)
    setBelgeViewModal(true)
  }

  const formatBelgeTur = (tur: string) => {
    switch (tur) {
      case 'sozlesme': return 'Sözleşme'
      case 'fesih_belgesi': return 'Fesih Belgesi'
      case 'usta_ogretici_belgesi': return 'Usta Öğretici Belgesi'
      default: return tur
    }
  }

  const handleDekontEkle = async () => {
    try {
      if (!selectedOgrenci) {
        alert('Lütfen öğrenci seçiniz')
        return
      }


      let dosyaUrl = null;

      // Dosya seçilmediyse uyarı ver ve gönderme
      if (!dekontFormData.dosya) {
        alert('Lütfen bir dekont dosyası seçiniz!');
        return;
      }

      // Ay adları ve ay adı değişkenini fonksiyon başına taşı
      const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const ayAdi = aylar[dekontFormData.ay - 1];
      // Aynı öğrenci ve ay için daha önce dekont var mı kontrolü
      const mevcutDekontlar = dekontlar.filter(d => {
        // d.staj_id hem string hem number olabilir, hepsini stringe çevir
        return String(d.staj_id) === String(selectedOgrenci?.staj_id) && d.ay === ayAdi && String(d.yil) === String(dekontFormData.yil);
      });
      let ekDekontIndex = 0;
      if (mevcutDekontlar.length > 0) {
        ekDekontIndex = mevcutDekontlar.length;
        alert(`Seçili öğrenci için ${ayAdi} ${dekontFormData.yil} döneminde zaten dekont var. Yüklediğiniz dosya ek dekont olarak kaydedilecektir.`);
      }

      // Dosya yükleme işlemi
      if (dekontFormData.dosya) {
        const file = dekontFormData.dosya;
        const fileExt = file.name.split('.').pop();
        // Dosya ismi: ayAdi-(ekN)-ogrenciId-timestamp.ext
        let fileName = `${ayAdi.toLowerCase()}`;
        if (ekDekontIndex > 0) {
          fileName += `-ek${ekDekontIndex+1}`;
        }
        fileName += `-${selectedOgrenci.id}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        // Dosyayı yükle
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dekontlar')
          .upload(filePath, file);

        // Hata veya uploadData'nın durumu detaylı loglansın
        console.log('Supabase uploadData:', uploadData);
        console.log('Supabase uploadError:', uploadError);

        if (uploadError) {
          alert(`Dekont dosyası yüklenirken bir hata oluştu!\n\nHata: ${uploadError.message}`);
          return;
        }

        if (!uploadData?.path) {
          alert('Dekont dosyası yüklenemedi. uploadData.path boş döndü. Supabase Storage policy ayarlarını ve kota durumunu kontrol edin.');
          return;
        }

      // Public URL almayı dene (bucket public ise)
      const { data: urlData } = supabase.storage
        .from('dekontlar')
        .getPublicUrl(uploadData.path);

      // Eğer public URL yoksa, signed URL oluştur
      let signedUrl = null;
      if (!urlData?.publicUrl) {
        // 1 saatlik signed URL oluştur
        const { data: signedData, error: signedError } = await supabase.storage
          .from('dekontlar')
          .createSignedUrl(uploadData.path, 60 * 60);
        if (signedError || !signedData?.signedUrl) {
          console.error('Signed URL alınamadı:', signedError);
          // Yüklenen dosyayı sil
          await supabase.storage
            .from('dekontlar')
            .remove([uploadData.path]);
          alert('Dekont dosyası için erişim linki oluşturulamadı. Lütfen tekrar deneyiniz.');
          return;
        }
        signedUrl = signedData.signedUrl;
        dosyaUrl = signedUrl;
        console.log('Signed URL:', signedUrl);
        alert(`Yüklenen dosya path: ${uploadData.path}\nSigned URL: ${signedUrl}\n\nNot: Bu link süreli ve gizlidir. Bucket public değilse sadece bu link ile erişim olur.`);
      } else {
        dosyaUrl = urlData.publicUrl;
        console.log('Public URL:', urlData.publicUrl);
      }
      }

      // Ay adını al
      // aylar ve ayAdi yukarıda tanımlı, tekrar tanımlama

      try {
        // Dekontlar tablosuna kaydet
        const { data: dekontData, error: dbError } = await supabase
          .from('dekontlar')
          .insert({
            staj_id: selectedOgrenci!.staj_id,
            ogrenci_id: selectedOgrenci!.id,
            isletme_id: isletme!.id,
            odeme_tarihi: new Date().toISOString().split('T')[0],
            ay: ayAdi,
            yil: dekontFormData.yil,
            aciklama: dekontFormData.aciklama || null,
            miktar: dekontFormData.miktar ? parseFloat(dekontFormData.miktar) : null,
            dosya_url: dosyaUrl,
            onay_durumu: 'bekliyor'
          })
          .select()
          .single()

        if (dbError) {
          // Veritabanı hatası durumunda yüklenen dosyayı sil
          if (dosyaUrl) {
            const urlParts = dosyaUrl.split('/dekontlar/');
            if (urlParts.length === 2) {
              const filePath = urlParts[1];
              await supabase.storage
                .from('dekontlar')
                .remove([filePath]); // Doğru: sadece path
            }
          }
          
          console.error('Dekont veritabanı kaydı hatası:', dbError)
          alert('Dekont kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.')
          return
        }

        alert('Dekont başarıyla eklendi!')
        // Yeni dekontu state'e ekle (fetchData çağırmadan)
        if (dekontData) {
          setDekontlar(prev => [
            {
              id: dekontData.id.toString(),
              staj_id: dekontData.staj_id.toString(),
              miktar: dekontData.miktar ? parseFloat(dekontData.miktar) : null,
              onay_durumu: dekontData.onay_durumu || 'bekliyor',
              aciklama: dekontData.aciklama || '',
              dosya_url: dekontData.dekont_dosyasi || dekontData.dosya_url || dekontData.file_url || null,
              ay: dekontData.ay?.toString() || '',
              yil: dekontData.yil?.toString() || '',
              gonderen: dekontData.gonderen || 'isletme',
              odeme_tarihi: dekontData.odeme_tarihi || null,
              ogrenci_adi: selectedOgrenci ? `${selectedOgrenci.ad} ${selectedOgrenci.soyad}` : '',
              stajlar: dekontData.stajlar ? {
                ogrenciler: dekontData.stajlar.ogrenciler ? {
                  ad: dekontData.stajlar.ogrenciler.ad || '',
                  soyad: dekontData.stajlar.ogrenciler.soyad || '',
                  sinif: dekontData.stajlar.ogrenciler.sinif?.toString() || '',
                  no: dekontData.stajlar.ogrenciler.no?.toString() || '',
                  alanlar: dekontData.stajlar.ogrenciler.alanlar ? {
                    ad: dekontData.stajlar.ogrenciler.alanlar.ad || ''
                  } : undefined
                } : undefined
              } : undefined,
              created_at: dekontData.created_at
            },
            ...prev
          ])
        }
        setDekontModalOpen(false)
        setSelectedOgrenci(null)
        setDekontFormData({ 
          ay: new Date().getMonth() + 1, 
          yil: new Date().getFullYear(), 
          aciklama: '', 
          miktar: '', 
          dosya: null 
        })
        setActiveTab('dekontlar')
        // fetchData() çağrısı kaldırıldı, performans için sadece state güncelleniyor
      } catch (error) {
        // Hata durumunda dosyayı temizle
        if (dosyaUrl) {
          const urlParts = dosyaUrl.split('/dekontlar/');
          if (urlParts.length === 2) {
            const filePath = urlParts[1];
            await supabase.storage
              .from('dekontlar')
              .remove([filePath]); // Doğru: sadece path
          }
        }
        console.error('Beklenmeyen hata:', error)
        alert('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.')
      }

      setDekontModalOpen(false)
      setSelectedOgrenci(null)
      setDekontFormData({ 
        ay: new Date().getMonth() + 1, 
        yil: new Date().getFullYear(), 
        aciklama: '', 
        miktar: '', 
        dosya: null 
      })
      setActiveTab('dekontlar') // Dekont listesi sekmesine geç
      if(isletme) fetchData() // Veriyi yeniden yükle
    } catch (error) {
      console.error('Dekont eklenirken hata:', error)
      console.error('Dekont ekleme hatası:', error)
      alert('Dekont eklenirken bir hata oluştu!')
    }
  }

  // Öğrenci dekontlarını görüntüleme fonksiyonu
  const handleViewDekontlar = async (ogrenci: Ogrenci) => {
    try {
      const { data: stajData, error: stajError } = await supabase
        .from('stajlar')
        .select('id')
        .eq('ogrenci_id', ogrenci.id)
        .eq('isletme_id', isletme?.id)

      if (stajError) {
        console.error('Staj verisi getirme hatası:', stajError)
        return
      }

      const stajIds = stajData.map(staj => staj.id)

      const { data: dekontData, error: dekontError } = await supabase
        .from('dekontlar')
        .select(`
          *,
          stajlar (
            *,
            ogrenciler (
              *,
              alanlar (
                ad
              )
            )
          )
        `)
        .in('staj_id', stajIds)
        .order('created_at', { ascending: false })

      if (dekontError) {
        console.error('Dekontları getirme hatası:', dekontError)
      } else if (dekontData) {
        const formattedDekontlar: Dekont[] = dekontData.map((dekont: any) => ({
          id: dekont.id.toString(),
          staj_id: dekont.staj_id.toString(),
          miktar: dekont.miktar ? parseFloat(dekont.miktar) : null,
          onay_durumu: dekont.onay_durumu || 'bekliyor',
          aciklama: dekont.aciklama || '',
          dosya_url: dekont.dekont_dosyasi || dekont.dosya_url || dekont.file_url || null,
          ay: dekont.ay?.toString() || '',
          yil: dekont.yil?.toString() || '',
          gonderen: dekont.gonderen || 'isletme',
          odeme_tarihi: dekont.odeme_tarihi || null,
          ogrenci_adi: `${dekont.stajlar?.ogrenciler?.ad || ''} ${dekont.stajlar?.ogrenciler?.soyad || ''}`.trim(),
          stajlar: dekont.stajlar ? {
            ogrenciler: dekont.stajlar.ogrenciler ? {
              ad: dekont.stajlar.ogrenciler.ad || '',
              soyad: dekont.stajlar.ogrenciler.soyad || '',
              sinif: dekont.stajlar.ogrenciler.sinif?.toString() || '',
              ogrenci_no: dekont.stajlar.ogrenciler.id?.toString() || '',
              alanlar: dekont.stajlar.ogrenciler.alanlar ? {
                ad: dekont.stajlar.ogrenciler.alanlar.ad || ''
              } : undefined
            } : undefined
          } : undefined
        }))
        setDekontlar(formattedDekontlar)
        setSelectedOgrenci(ogrenci)
        setDekontViewModalOpen(true)
      }
    } catch (error) {
      console.error('Dekont görüntüleme hatası:', error)
    }
  }

  const handleDekontDetay = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setDekontDetailModalOpen(true)
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
    localStorage.removeItem('isletme')
    router.push('/')
  }

  // Sayfa değiştirme fonksiyonu
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

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
    // Bu durum normalde useEffect'teki yönlendirme ile engellenir,
    // ancak bir güvenlik katmanı olarak tutulabilir.
    return null 
  }

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
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-lg hover:bg-opacity-30 transition-all duration-200"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5 text-white" />
              <span className="sr-only">Çıkış Yap</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
              {[
                { id: 'ogrenciler', icon: Users, label: 'Öğrenciler' },
                { id: 'dekontlar', icon: Receipt, label: 'Dekontlar' },
                { id: 'belgeler', icon: FileText, label: 'Belgeler' }
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
                      {tab.label}
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
          <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 p-6 divide-y divide-gray-200">
            {activeTab === 'ogrenciler' && (
              <div className="space-y-6">
                {ogrenciler.map((ogrenci) => (
                  <div key={ogrenci.id} className="pt-6 first:pt-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </h3>
                          <div className="flex items-center space-x-3 mt-2 text-sm">
                            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium min-w-[80px] text-center">
                              {ogrenci.sinif}
                            </div>
                            <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium">
                              No: {ogrenci.no}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOgrenci(ogrenci)
                          setDekontModalOpen(true)
                        }}
                        className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Dekont Yükle
                      </button>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg font-medium">
                          {ogrenci.alanlar?.ad || "Alan bilgisi yok"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">İşe Başlama:</span>{' '}
                        {new Date(ogrenci.baslangic_tarihi).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">Koordinatör:</span>{' '}
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg font-medium ml-1">
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
                {/* Silme uyarısı (sadece bir kez) */}
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-yellow-900 text-sm">
                  <span className="font-semibold">Dekontu yanlış yüklediyseniz silebilirsiniz.</span> Uyarı: Onaylanmış dekontlarda silme işlemi yoktur.
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Dekontlar</h2>
                  <button
                    onClick={() => setDekontModalOpen(true)}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    title="Yeni Dekont"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
                  </div>
                ) : dekontlar.length === 0 ? (
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
                                <span>{
                                  (() => {
                                    // Aynı öğrenci, ay ve yıl için kaçıncı ek olduğunu bul
                                    const sameDekonts = dekontlar.filter(d =>
                                      String(d.staj_id) === String(dekont.staj_id) &&
                                      d.ay === dekont.ay &&
                                      String(d.yil) === String(dekont.yil)
                                    );
                                    // Yüklenme tarihine göre sırala (en eski ilk)
                                    const sorted = [...sameDekonts].sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
                                    const ekIndex = sorted.findIndex(d => d.id == dekont.id);
                                    return dekont.ay + (ekIndex > 0 ? ` (ek-${ekIndex+1})` : '') + ' ' + dekont.yil;
                                  })()
                                }</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {dekont.dosya_url && (
                                <a
                                  href={dekont.dosya_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Dekontu İndir"
                                >
                                  <Download className="h-5 w-5" />
                                </a>
                              )}
                              {/* Sadece bekliyor ise sil */}
                              {dekont.onay_durumu === 'bekliyor' && (
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
                          {/* Alt köşeler: miktar (sol), yüklenme tarihi (sağ) */}
                          <div className="flex justify-between items-end mt-2">
                            {/* Sol alt: Miktar */}
                            {dekont.miktar && (
                              <span className="text-xs font-bold text-green-600">
                                Miktar: {dekont.miktar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                            )}
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
                              <p className="text-sm text-gray-500">{formatBelgeTur(belge.tur)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {belge.dosya_url && (
                              <button
                                onClick={() => window.open(belge.dosya_url, '_blank')}
                                className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4 mr-1.5" />
                                İndir
                              </button>
                            )}
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

      {/* Silme Onay Modali */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Dekontu Sil">
        <div className="space-y-4">
          <p className="text-gray-800 text-base">Bu dekontu silmek istediğinize emin misiniz?</p>
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
                if (!pendingDeleteDekont) return;
                // Dosya varsa storage'dan sil
                if (pendingDeleteDekont.dosya_url) {
                  const urlParts = pendingDeleteDekont.dosya_url.split('/dekontlar/');
                  if (urlParts.length === 2) {
                    const filePath = urlParts[1];
                    await supabase.storage.from('dekontlar').remove([filePath]);
                  }
                }
                // Veritabanından sil
                await supabase.from('dekontlar').delete().eq('id', pendingDeleteDekont.id);
                setDekontlar(prev => prev.filter(d => d.id !== pendingDeleteDekont.id));
                setDeleteConfirmOpen(false);
                setPendingDeleteDekont(null);
              }}
            >
              Evet, Sil
            </button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <Modal isOpen={dekontModalOpen} onClose={() => setDekontModalOpen(false)} title="Yeni Dekont Ekle">
        <div className="space-y-6">
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
                  <option value="1">Ocak</option>
                  <option value="2">Şubat</option>
                  <option value="3">Mart</option>
                  <option value="4">Nisan</option>
                  <option value="5">Mayıs</option>
                  <option value="6">Haziran</option>
                  <option value="7">Temmuz</option>
                  <option value="8">Ağustos</option>
                  <option value="9">Eylül</option>
                  <option value="10">Ekim</option>
                  <option value="11">Kasım</option>
                  <option value="12">Aralık</option>
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
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(yil => (
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
              Dekont Dosyası (Opsiyonel)
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

      <Modal isOpen={belgeModalOpen} onClose={() => setBelgeModalOpen(false)} title="Yeni Belge Ekle">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Adı
            </label>
            <input
              type="text"
              value={belgeFormData.ad}
              onChange={(e) => setBelgeFormData({...belgeFormData, ad: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Belge adını giriniz"
            />
          </div>

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
              <option value="other">Diğer (Manuel Giriş)</option>
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Belge türünü yazınız"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosya Seçin <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="belge-dosya"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setBelgeFormData({...belgeFormData, dosya: e.target.files?.[0] || null})}
                className="hidden"
                required
              />
              <label htmlFor="belge-dosya" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {belgeFormData.dosya ? belgeFormData.dosya.name : 'Dosya seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setBelgeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleBelgeEkle}
              className="px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors shadow-sm"
            >
              Belge Ekle
            </button>
          </div>
        </div>
      </Modal>

      {/* Dekontları Görüntüleme Modalı */}
      <Modal isOpen={dekontViewModalOpen} onClose={() => setDekontViewModalOpen(false)} title={`${selectedOgrenci?.ad} ${selectedOgrenci?.soyad} - Dekontlar`}>
        <div className="space-y-4">
          {selectedOgrenci && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Öğrenci Bilgileri</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Ad Soyad:</span>
                  <p className="text-blue-900">{selectedOgrenci.ad} {selectedOgrenci.soyad}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Sınıf:</span>
                  <p className="text-blue-900">{selectedOgrenci.sinif} {selectedOgrenci.no && `- No: ${selectedOgrenci.no}`}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Alan:</span>
                  <p className="text-blue-900">{selectedOgrenci.alanlar?.ad || "Alan bilgisi yok"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              Dekont Listesi ({dekontlar.length} adet)
            </h4>
          </div>

          {dekontlar.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dekontlar.map((dekont) => (
                <div 
                  key={dekont.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-indigo-50/30 hover:border-indigo-200 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 ease-in-out cursor-pointer"
                  onClick={() => handleDekontDetay(dekont)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {dekont.odeme_tarihi ? new Date(dekont.odeme_tarihi).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            }) : '-'}
                          </h5>
                          {dekont.ay && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {dekont.ay} Ayı
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOnayDurumuRenk(dekont.onay_durumu)}`}>
                          {getOnayDurumuText(dekont.onay_durumu)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{dekont.aciklama}</p>
                      <p className="text-lg font-bold text-green-600">
                        {dekont.miktar ? dekont.miktar.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY'
                        }) : 'Tutar belirtilmemiş'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz dekont yok</h3>
              <p className="text-gray-500">Bu öğrenci için henüz dekont yüklenmemiş.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Dekont Detay Modalı */}
      <Modal isOpen={dekontDetailModalOpen} onClose={() => setDekontDetailModalOpen(false)} title="Dekont Detayı">
        {selectedDekont && (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Tarih:</span>
                  <p className="text-gray-900 mt-1">
                    {selectedDekont.odeme_tarihi ? new Date(selectedDekont.odeme_tarihi).toLocaleDateString('tr-TR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Tutar:</span>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {selectedDekont.miktar ? selectedDekont.miktar.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: 'TRY'
                    }) : 'Tutar belirtilmemiş'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Onay Durumu:</span>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOnayDurumuRenk(selectedDekont.onay_durumu)}`}>
                  {getOnayDurumuText(selectedDekont.onay_durumu)}
                </span>
              </div>
            </div>

            {selectedDekont.aciklama && (
              <div>
                <span className="text-sm font-medium text-gray-700">Açıklama:</span>
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedDekont.aciklama}</p>
                </div>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-gray-700">Dekont Dosyası:</span>
              <div className="bg-gray-50 rounded-lg p-4 mt-2">
                {selectedDekont.dosya_url ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">Dekont Belgesi</span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => window.open(selectedDekont.dosya_url, '_blank')}
                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = selectedDekont.dosya_url!
                          link.download = `dekont_${selectedDekont.id}.pdf`
                          link.click()
                        }}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                        title="Dosyayı indir"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Bu dekont için dosya yüklenmemiş</p>
                    <p className="text-xs text-gray-400 mt-1">Dosya yükleme özelliği geliştirilmektedir</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-2">
              {selectedDekont.onay_durumu === 'bekliyor' && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Bu dekontu silmek istediğinize emin misiniz?')) return;
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
                    setDekontDetailModalOpen(false);
                    setSelectedDekont(null);
                  }}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sil
                </button>
              )}
              <button
                onClick={() => {
                  setDekontDetailModalOpen(false)
                  setSelectedDekont(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </Modal>

      <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4 fixed bottom-0 left-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                N
              </div>
              <span className="text-sm">&copy; {new Date().getFullYear()} {okulAdi}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 