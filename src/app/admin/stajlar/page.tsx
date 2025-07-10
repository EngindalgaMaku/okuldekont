'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, FileText, Plus, Search, Filter, Download, Upload, Trash2, Eye, UserCheck, UserX, Calendar, GraduationCap, User, AlertTriangle, ChevronDown, X, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import OgretmenBazliYonetim, { OgretmenStajData } from '@/components/ui/OgretmenBazliYonetim'

interface Staj {
  id: string
  ogrenci_id: string
  isletme_id: string
  ogretmen_id: string
  baslangic_tarihi: string
  bitis_tarihi: string | null
  durum: 'aktif' | 'tamamlandi' | 'feshedildi'
  created_at: string
  sozlesme_url?: string
  fesih_nedeni?: string
  fesih_belgesi_url?: string
  ogrenciler?: {
    id: string
    ad: string
    soyad: string
    no: string
    sinif: string
    alanlar?: {
      ad: string
    } | null
  } | null
  isletmeler?: {
    id: string
    ad: string
    yetkili_kisi: string
  } | null
  ogretmenler?: {
    id: string
    ad: string
    soyad: string
  } | null
  koordinator_ogretmen?: {
    id: string
    ad: string
    soyad: string
  } | null
}

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanlar?: {
    ad: string
  } | null
}

interface Isletme {
  id: string
  ad: string
  yetkili_kisi: string
}

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  alan_id?: string
  alanlar?: {
    ad: string
  } | null
}

interface Alan {
  id: string
  ad: string
}

export default function StajYonetimiPage() {
  const [stajlar, setStajlar] = useState<Staj[]>([])
  const [bostOgrenciler, setBostOgrenciler] = useState<Ogrenci[]>([])
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [ogretmenler, setOgretmenler] = useState<Ogretmen[]>([])
  const [ogretmenBazliData, setOgretmenBazliData] = useState<OgretmenStajData[]>([])
  const [filteredOgretmenBazliData, setFilteredOgretmenBazliData] = useState<OgretmenStajData[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'aktif' | 'bost' | 'tamamlandi' | 'ogretmen'>('aktif')
  
  // Modal states
  const [newStajModalOpen, setNewStajModalOpen] = useState(false)
  const [fesihModalOpen, setFesihModalOpen] = useState(false)
  const [silmeModalOpen, setSilmeModalOpen] = useState(false)
  const [koordinatorModalOpen, setKoordinatorModalOpen] = useState(false)
  const [tarihDuzenleModalOpen, setTarihDuzenleModalOpen] = useState(false)
  const [selectedStaj, setSelectedStaj] = useState<Staj | null>(null)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [belgeModalOpen, setBelgeModalOpen] = useState(false)
  const [belgeType, setBelgeType] = useState<'sozlesme' | 'fesih'>('sozlesme')
  
  // Form states
  const [newStajForm, setNewStajForm] = useState({
    alan_id: '',
    ogrenci_id: '',
    isletme_id: '',
    ogretmen_id: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    sozlesme_dosya: null as File | null
  })
  
  const [tarihDuzenleForm, setTarihDuzenleForm] = useState({
    baslangic_tarihi: '',
    bitis_tarihi: ''
  })
  
  const [fesihForm, setFesihForm] = useState({
    fesih_tarihi: '',
    fesih_nedeni: '',
    fesih_belgesi: null as File | null
  })
  
  const [koordinatorForm, setKoordinatorForm] = useState({
    ogretmen_id: '',
    baslangic_tarihi: '',
    notlar: ''
  })
  
  const [koordinatorAtaLoading, setKoordinatorAtaLoading] = useState(false)
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterIsletme, setFilterIsletme] = useState('')
  const [filterOgretmen, setFilterOgretmen] = useState('')
  const [filterAlan, setFilterAlan] = useState('')
  const [filterSinif, setFilterSinif] = useState('')
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
  
  // Pagination states
  const [currentPageStajlar, setCurrentPageStajlar] = useState(1)
  const [currentPageBost, setCurrentPageBost] = useState(1)
  const itemsPerPage = 10
  
  const { showToast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  // Çoklu aktif staj kontrolü ve düzeltme fonksiyonu
  const checkAndFixDuplicateActiveInternships = async () => {
    try {
      // Aktif stajları öğrenci ID'sine göre grupla
      const activeInternships = stajlar.filter(staj => staj.durum === 'aktif')
      const studentGroups = activeInternships.reduce((groups, staj) => {
        const studentId = staj.ogrenci_id
        if (!groups[studentId]) {
          groups[studentId] = []
        }
        groups[studentId].push(staj)
        return groups
      }, {} as Record<string, Staj[]>)

      // Birden fazla aktif stajı olan öğrencileri bul
      const duplicates = Object.entries(studentGroups).filter(([_, stajlar]) => stajlar.length > 1)

      if (duplicates.length > 0) {
        console.warn('Çoklu aktif staj tespit edildi:', duplicates)
        
        let fixedCount = 0
        for (const [studentId, studentInternships] of duplicates) {
          // En son oluşturulan stajı aktif bırak, diğerlerini feshet
          const sortedInternships = studentInternships.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          
          const keepActive = sortedInternships[0]
          const toTerminate = sortedInternships.slice(1)

          for (const staj of toTerminate) {
            const { error } = await supabase
              .from('stajlar')
              .update({
                durum: 'feshedildi',
                bitis_tarihi: new Date().toISOString().split('T')[0],
                fesih_nedeni: 'Sistem tarafından otomatik feshedildi - Çoklu aktif staj tespit edildi'
              })
              .eq('id', staj.id)
            
            if (!error) {
              fixedCount++
              console.log(`Staj ${staj.id} feshedildi`)
            } else {
              console.error(`Staj ${staj.id} feshedilemedi:`, error)
            }
          }
        }

        if (fixedCount > 0) {
          showToast({
            type: 'success',
            title: 'Çoklu Staj Düzeltildi',
            message: `${fixedCount} adet çoklu aktif staj düzeltildi. Sayfayı yenileyin.`
          })
          
          // Sayfayı otomatik yenile
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          showToast({
            type: 'error',
            title: 'Düzeltme Başarısız',
            message: 'Çoklu stajlar düzeltilemedi. Lütfen manuel olarak kontrol edin.'
          })
        }
      } else {
        showToast({
          type: 'info',
          title: 'Kontrol Tamamlandı',
          message: 'Çoklu aktif staj tespit edilmedi.'
        })
      }
    } catch (error) {
      console.error('Çoklu staj kontrolü hatası:', error)
      showToast({
        type: 'error',
        title: 'Kontrol Hatası',
        message: 'Çoklu staj kontrolü sırasında bir hata oluştu.'
      })
    }
  }

  // Otomatik kontrol kaldırıldı - sadece manuel buton ile çalışacak

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Önce stajları basit şekilde getir
      const { data: stajData, error: stajError } = await supabase
        .from('stajlar')
        .select(`
          *,
          ogrenciler (
            id, ad, soyad, no, sinif,
            alanlar (ad)
          ),
          isletmeler (
            id, ad, yetkili_kisi
          )
        `)
        .order('created_at', { ascending: false })
      
      if (stajError) throw stajError

      // Öğretmen bilgilerini ayrı getir
      const { data: ogretmenData, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .select('id, ad, soyad')

      if (ogretmenError) throw ogretmenError

      // Stajlar ile öğretmen bilgilerini manuel birleştir
      const stajlarWithDetails = stajData?.map(staj => {
        const stajOgretmeni = ogretmenData?.find(og => og.id === staj.ogretmen_id)
        
        return {
          ...staj,
          ogretmenler: stajOgretmeni || null,
          koordinator_ogretmen: stajOgretmeni || null // Koordinatör de stajdaki öğretmenle aynı
        }
      }) || []

      setStajlar(stajlarWithDetails)
      
      // Boşta olan öğrencileri getir (stajı olmayan)
      const { data: tumOgrenciler, error: ogrenciError } = await supabase
        .from('ogrenciler')
        .select(`
          id, ad, soyad, no, sinif,
          alanlar (ad)
        `)
      
      if (ogrenciError) throw ogrenciError
      
      // Aktif stajı olan öğrenci ID'lerini bul
      const aktifStajliOgrenciler = stajData?.filter(s => s.durum === 'aktif').map(s => s.ogrenci_id) || []
      
      // Boşta olan öğrencileri filtrele ve format düzelt
      const bostalar = tumOgrenciler?.filter(o => !aktifStajliOgrenciler.includes(o.id)).map(o => ({
        ...o,
        alanlar: Array.isArray(o.alanlar) ? o.alanlar[0] : o.alanlar
      })) || []
      setBostOgrenciler(bostalar)
      
      console.log('Aktif stajlı öğrenciler:', aktifStajliOgrenciler)
      console.log('Boşta olan öğrenciler:', bostalar.length)
      
      // İşletmeleri getir
      const { data: isletmeData, error: isletmeError } = await supabase
        .from('isletmeler')
        .select('id, ad, yetkili_kisi')
        .order('ad')
      
      if (isletmeError) throw isletmeError
      setIsletmeler(isletmeData || [])
      
      // Öğretmenleri getir (alan bilgisi ile)
      const { data: ogretmenListData, error: ogretmenListError } = await supabase
        .from('ogretmenler')
        .select(`
          id, ad, soyad, alan_id,
          alanlar (ad)
        `)
        .order('ad')
      
      if (ogretmenListError) throw ogretmenListError
      // Öğretmenleri format et
      const formattedOgretmenler = ogretmenListData?.map(ogretmen => ({
        ...ogretmen,
        alanlar: Array.isArray(ogretmen.alanlar) ? ogretmen.alanlar[0] : ogretmen.alanlar
      })) || []
      setOgretmenler(formattedOgretmenler)
      
      // Alanları getir
      const { data: alanData, error: alanError } = await supabase
        .from('alanlar')
        .select('id, ad')
        .order('ad')
      
      if (alanError) throw alanError
      setAlanlar(alanData || [])
      
      // Öğretmen bazlı veri yapısını oluştur
      const ogretmenStajMap: Record<string, OgretmenStajData> = {}
      ogretmenListData?.forEach(ogretmen => {
        ogretmenStajMap[ogretmen.id] = {
          id: ogretmen.id,
          ad: ogretmen.ad,
          soyad: ogretmen.soyad,
          stajlar: []
        }
      })

      stajlarWithDetails.forEach(staj => {
        if (staj.ogretmen_id && ogretmenStajMap[staj.ogretmen_id]) {
          ogretmenStajMap[staj.ogretmen_id].stajlar.push(staj)
        }
      })

      setOgretmenBazliData(Object.values(ogretmenStajMap))

    } catch (error) {
      console.error('Veri yükleme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Veriler yüklenirken bir hata oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewStaj = async () => {
    try {
      console.log('Staj oluşturma başladı, form verileri:', newStajForm)
      console.log('Alan ID:', newStajForm.alan_id)
      console.log('Öğrenci ID:', newStajForm.ogrenci_id)
      console.log('İşletme ID:', newStajForm.isletme_id)
      console.log('Öğretmen ID:', newStajForm.ogretmen_id)
      console.log('Başlangıç:', newStajForm.baslangic_tarihi)
      
      if (!newStajForm.alan_id || !newStajForm.ogrenci_id || !newStajForm.isletme_id || !newStajForm.ogretmen_id || !newStajForm.baslangic_tarihi) {
        console.log('Form validasyon hatası - eksik alanlar:')
        console.log('Alan eksik:', !newStajForm.alan_id)
        console.log('Öğrenci eksik:', !newStajForm.ogrenci_id)
        console.log('İşletme eksik:', !newStajForm.isletme_id)
        console.log('Öğretmen eksik:', !newStajForm.ogretmen_id)
        console.log('Tarih eksik:', !newStajForm.baslangic_tarihi)
        
        showToast({
          type: 'error',
          title: 'Eksik Bilgi',
          message: 'Lütfen tüm gerekli alanları doldurun (alan, öğrenci, işletme, koordinatör ve başlangıç tarihi zorunludur)'
        })
        return
      }

      // Öğrencinin zaten aktif stajı var mı kontrol et
      const aktifStaj = stajlar.find(staj =>
        staj.ogrenci_id === newStajForm.ogrenci_id && staj.durum === 'aktif'
      )

      if (aktifStaj) {
        const ogrenci = bostOgrenciler.find(o => o.id === newStajForm.ogrenci_id) ||
                      stajlar.find(s => s.ogrenci_id === newStajForm.ogrenci_id)?.ogrenciler
        const ogrenciAdi = ogrenci ? `${ogrenci.ad} ${ogrenci.soyad}` : 'Bu öğrenci'
        
        showToast({
          type: 'error',
          title: 'Aktif Staj Mevcut',
          message: `${ogrenciAdi} zaten aktif bir staja sahip. Bir öğrenci aynı anda sadece bir işletmede staj yapabilir.`
        })
        return
      }

      // Aynı öğrenci-işletme kombinasyonu daha önce var mı kontrol et
      const ayniIsletmeStaj = stajlar.find(staj =>
        staj.ogrenci_id === newStajForm.ogrenci_id &&
        staj.isletme_id === newStajForm.isletme_id
      )

      if (ayniIsletmeStaj) {
        const ogrenci = bostOgrenciler.find(o => o.id === newStajForm.ogrenci_id) ||
                      stajlar.find(s => s.ogrenci_id === newStajForm.ogrenci_id)?.ogrenciler
        const isletme = isletmeler.find(i => i.id === newStajForm.isletme_id)
        
        const ogrenciAdi = ogrenci ? `${ogrenci.ad} ${ogrenci.soyad}` : 'Bu öğrenci'
        const isletmeAdi = isletme ? isletme.ad : 'Bu işletme'
        
        showToast({
          type: 'error',
          title: 'Aynı İşletme Ataması',
          message: `${ogrenciAdi} daha önce ${isletmeAdi} işletmesinde staj yapmış. Bir öğrenci aynı işletmede birden fazla staj yapamaz.`
        })
        return
      }

      let sozlesme_url = null

      // Sözleşme dosyası varsa yükle
      if (newStajForm.sozlesme_dosya) {
        const file = newStajForm.sozlesme_dosya
        const fileName = `sozlesme_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const filePath = `sozlesmeler/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('belgeler')
          .getPublicUrl(filePath)

        sozlesme_url = urlData.publicUrl
      }

      // Staj kaydını oluştur
      console.log('Veritabanına insert edilecek veriler:', {
        ogrenci_id: newStajForm.ogrenci_id,
        isletme_id: newStajForm.isletme_id,
        ogretmen_id: newStajForm.ogretmen_id,
        baslangic_tarihi: newStajForm.baslangic_tarihi,
        bitis_tarihi: newStajForm.bitis_tarihi || null,
        durum: 'aktif',
        sozlesme_url
      })
      
      const { error: insertError } = await supabase
        .from('stajlar')
        .insert({
          ogrenci_id: newStajForm.ogrenci_id,
          isletme_id: newStajForm.isletme_id,
          ogretmen_id: newStajForm.ogretmen_id,
          baslangic_tarihi: newStajForm.baslangic_tarihi,
          bitis_tarihi: newStajForm.bitis_tarihi || null,
          durum: 'aktif',
          sozlesme_url
        })

      if (insertError) {
        console.error('Insert hatası:', insertError)
        throw insertError
      }
      
      console.log('Staj başarıyla oluşturuldu')

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Yeni staj kaydı oluşturuldu'
      })

      setNewStajModalOpen(false)
      setNewStajForm({
        alan_id: '',
        ogrenci_id: '',
        isletme_id: '',
        ogretmen_id: '',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        sozlesme_dosya: null
      })
      fetchData()

    } catch (error) {
      console.error('Staj oluşturma hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj kaydı oluşturulurken bir hata oluştu'
      })
    }
  }

  const handleFesih = async () => {
    try {
      if (!selectedStaj || !fesihForm.fesih_tarihi) {
        showToast({
          type: 'error',
          title: 'Eksik Bilgi',
          message: 'Fesih tarihi zorunludur'
        })
        return
      }

      let fesih_belgesi_url = null

      // Fesih belgesi varsa yükle
      if (fesihForm.fesih_belgesi) {
        const file = fesihForm.fesih_belgesi
        const fileName = `fesih_${Date.now()}_${file.name.replace(/\s/g, '_')}`
        const filePath = `fesih_belgeleri/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('belgeler')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('belgeler')
          .getPublicUrl(filePath)

        fesih_belgesi_url = urlData.publicUrl
      }

      // Stajı feshet
      const { error: updateError } = await supabase
        .from('stajlar')
        .update({
          durum: 'feshedildi',
          bitis_tarihi: fesihForm.fesih_tarihi,
          fesih_nedeni: fesihForm.fesih_nedeni,
          fesih_belgesi_url
        })
        .eq('id', selectedStaj.id)

      if (updateError) throw updateError

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj feshedildi'
      })

      setFesihModalOpen(false)
      setFesihForm({
        fesih_tarihi: '',
        fesih_nedeni: '',
        fesih_belgesi: null
      })
      setSelectedStaj(null)
      fetchData()

    } catch (error) {
      console.error('Fesih hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj feshedilirken bir hata oluştu'
      })
    }
  }

  const handleStajSil = async () => {
    try {
      if (!selectedStaj) {
        showToast({
          type: 'error',
          title: 'Hata',
          message: 'Silinecek staj seçilmedi'
        })
        return
      }

      // Önce ilgili dosyaları silmeye çalış
      if (selectedStaj.sozlesme_url) {
        try {
          const fileName = selectedStaj.sozlesme_url.split('/').pop()
          if (fileName) {
            await supabase.storage
              .from('belgeler')
              .remove([`sozlesmeler/${fileName}`])
          }
        } catch (error) {
          console.warn('Sözleşme dosyası silinemedi:', error)
        }
      }

      // Stajı veritabanından sil
      const { error: deleteError } = await supabase
        .from('stajlar')
        .delete()
        .eq('id', selectedStaj.id)

      if (deleteError) throw deleteError

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj kaydı tamamen silindi'
      })

      setSilmeModalOpen(false)
      setSelectedStaj(null)
      fetchData()

    } catch (error) {
      console.error('Staj silme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Staj silinirken bir hata oluştu'
      })
    }
  }

  const handleKoordinatorAta = async () => {
    if (koordinatorAtaLoading) return // Prevent multiple clicks
    
    try {
      setKoordinatorAtaLoading(true)
      console.log('Koordinatör atama başladı')
      console.log('selectedOgrenci:', selectedOgrenci)
      console.log('koordinatorForm:', koordinatorForm)

      if (!selectedOgrenci) {
        console.log('Öğrenci seçilmemiş')
        showToast({
          type: 'error',
          title: 'Öğrenci Seçilmemiş',
          message: 'Lütfen bir öğrenci seçin'
        })
        return
      }
      
      if (!koordinatorForm.ogretmen_id) {
        console.log('Koordinatör seçilmemiş')
        showToast({
          type: 'error',
          title: 'Koordinatör Seçilmemiş',
          message: 'Lütfen bir koordinatör öğretmen seçin'
        })
        return
      }
      
      if (!koordinatorForm.baslangic_tarihi) {
        console.log('Başlangıç tarihi girilmemiş')
        showToast({
          type: 'error',
          title: 'Tarih Eksik',
          message: 'Lütfen koordinatörlük başlangıç tarihini girin'
        })
        return
      }

      // Öğrencinin aktif stajını bul
      const aktifStaj = stajlar.find(staj =>
        staj.ogrenci_id === selectedOgrenci.id && staj.durum === 'aktif'
      )

      console.log('Aktif staj:', aktifStaj)

      if (!aktifStaj) {
        showToast({
          type: 'error',
          title: 'Hata',
          message: 'Bu öğrencinin aktif stajı bulunamadı'
        })
        return
      }

      console.log('Staj güncelleniyor, id:', aktifStaj.id, 'yeni ogretmen_id:', koordinatorForm.ogretmen_id)

      // Staj tablosundaki koordinatör bilgisini güncelle
      const { error: updateStajError } = await supabase
        .from('stajlar')
        .update({ ogretmen_id: koordinatorForm.ogretmen_id })
        .eq('id', aktifStaj.id)

      if (updateStajError) {
        console.error('Staj güncelleme hatası:', updateStajError)
        throw updateStajError
      }

      console.log('Koordinatör ataması başarılı')

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Koordinatör ataması yapıldı'
      })

      setKoordinatorModalOpen(false)
      setKoordinatorForm({
        ogretmen_id: '',
        baslangic_tarihi: '',
        notlar: ''
      })
      setSelectedOgrenci(null)
      fetchData()

    } catch (error) {
      console.error('Koordinatör atama hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: `Koordinatör ataması yapılırken bir hata oluştu: ${(error as Error).message || 'Bilinmeyen hata'}`
      })
    } finally {
      setKoordinatorAtaLoading(false)
    }
  }

  const handleTarihDuzenle = async () => {
    try {
      if (!selectedStaj || !tarihDuzenleForm.baslangic_tarihi) {
        showToast({
          type: 'error',
          title: 'Eksik Bilgi',
          message: 'Başlangıç tarihi zorunludur'
        })
        return
      }

      // Tarihleri güncelle
      const { error: updateError } = await supabase
        .from('stajlar')
        .update({
          baslangic_tarihi: tarihDuzenleForm.baslangic_tarihi,
          bitis_tarihi: tarihDuzenleForm.bitis_tarihi || null
        })
        .eq('id', selectedStaj.id)

      if (updateError) throw updateError

      showToast({
        type: 'success',
        title: 'Başarılı',
        message: 'Staj tarihleri güncellendi'
      })

      setTarihDuzenleModalOpen(false)
      setTarihDuzenleForm({
        baslangic_tarihi: '',
        bitis_tarihi: ''
      })
      setSelectedStaj(null)
      fetchData()

    } catch (error) {
      console.error('Tarih düzenleme hatası:', error)
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Tarihler güncellenirken bir hata oluştu'
      })
    }
  }

  // Filtreleme mantığı
  const filteredStajlar = stajlar.filter(staj => {
    if (activeTab === 'aktif' && staj.durum !== 'aktif') return false
    if (activeTab === 'tamamlandi' && staj.durum !== 'tamamlandi') return false
    
    const searchMatch = searchTerm === '' ||
      staj.ogrenciler?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staj.ogrenciler?.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staj.isletmeler?.ad?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const isletmeMatch = filterIsletme === '' || staj.isletme_id === filterIsletme
    const ogretmenMatch = filterOgretmen === '' || staj.ogretmen_id === filterOgretmen
    
    // Alan bazlı filtreleme (opsiyonel)
    const alanMatch = filterAlan === '' ||
      (staj.ogrenciler?.alanlar?.ad &&
       alanlar.find(alan => alan.id === filterAlan)?.ad === staj.ogrenciler.alanlar.ad)
    
    // Sınıf bazlı filtreleme
    const sinifMatch = filterSinif === '' || staj.ogrenciler?.sinif === filterSinif
    
    return searchMatch && isletmeMatch && ogretmenMatch && alanMatch && sinifMatch
  })

  const filteredBostOgrenciler = bostOgrenciler.filter(ogrenci => {
    const searchMatch = searchTerm === '' ||
      ogrenci.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ogrenci.soyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ogrenci.sinif.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Alan bazlı filtreleme (opsiyonel)
    const alanMatch = filterAlan === '' ||
      (ogrenci.alanlar?.ad &&
       alanlar.find(alan => alan.id === filterAlan)?.ad === ogrenci.alanlar.ad)
    
    // Sınıf bazlı filtreleme
    const sinifMatch = filterSinif === '' || ogrenci.sinif === filterSinif
    
    return searchMatch && alanMatch && sinifMatch
  })

  // Alan bazlı dinamik filtreleme için yardımcı fonksiyonlar
  const getAvailableClasses = () => {
    const allOgrenciler = [...bostOgrenciler, ...stajlar.map(s => s.ogrenciler).filter(Boolean)]
    const classes = new Set<string>()
    
    allOgrenciler.forEach(ogrenci => {
      if (ogrenci && ogrenci.sinif) {
        // Eğer alan filtresi varsa, sadece o alanın sınıflarını dahil et
        if (filterAlan === '' ||
            (ogrenci.alanlar?.ad &&
             alanlar.find(alan => alan.id === filterAlan)?.ad === ogrenci.alanlar.ad)) {
          classes.add(ogrenci.sinif)
        }
      }
    })
    
    return Array.from(classes).sort()
  }

  const getAvailableTeachers = () => {
    return ogretmenler.filter(ogretmen => {
      // Eğer alan filtresi varsa, sadece o alanın öğretmenlerini dahil et
      if (filterAlan === '' ||
          (ogretmen.alanlar?.ad &&
           alanlar.find(alan => alan.id === filterAlan)?.ad === ogretmen.alanlar.ad)) {
        return true
      }
      return false
    })
  }

  const availableClasses = getAvailableClasses()
  const availableTeachers = getAvailableTeachers()

  // Pagination hesaplamaları
  const totalStajlar = filteredStajlar.length
  const totalBostOgrenciler = filteredBostOgrenciler.length
  const totalPagesStajlar = Math.ceil(totalStajlar / itemsPerPage)
  const totalPagesBost = Math.ceil(totalBostOgrenciler / itemsPerPage)

  // Sayfalanmış veriler
  const startIndexStajlar = (currentPageStajlar - 1) * itemsPerPage
  const endIndexStajlar = startIndexStajlar + itemsPerPage
  const paginatedStajlar = filteredStajlar.slice(startIndexStajlar, endIndexStajlar)

  const startIndexBost = (currentPageBost - 1) * itemsPerPage
  const endIndexBost = startIndexBost + itemsPerPage
  const paginatedBostOgrenciler = filteredBostOgrenciler.slice(startIndexBost, endIndexBost)

  // Sayfa değişikliklerinde filtreleri sıfırla
  useEffect(() => {
    setCurrentPageStajlar(1)
  }, [searchTerm, filterIsletme, filterOgretmen, filterAlan, filterSinif])

  useEffect(() => {
    setCurrentPageBost(1)
  }, [searchTerm, filterAlan, filterSinif])

  // Öğretmen bazlı veri için filtreleme
  useEffect(() => {
    let filtered = ogretmenBazliData

    // Arama filtresi (öğretmen adına göre)
    if (searchTerm) {
      filtered = filtered.filter(ogretmen =>
        `${ogretmen.ad} ${ogretmen.soyad}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Alan filtresi (öğretmenin alanına göre)
    if (filterAlan) {
      const alanOgretmenIds = ogretmenler
        .filter(o => o.alan_id === filterAlan)
        .map(o => o.id)
      filtered = filtered.filter(ogretmen => alanOgretmenIds.includes(ogretmen.id))
    }

    setFilteredOgretmenBazliData(filtered)
  }, [ogretmenBazliData, searchTerm, filterAlan, ogretmenler])

  // Modal için alan bazlı öğrenci filtreleme
  const modalOgrenciler = newStajForm.alan_id === ''
    ? bostOgrenciler
    : bostOgrenciler.filter(ogrenci =>
        ogrenci.alanlar?.ad &&
        alanlar.find(alan => alan.id === newStajForm.alan_id)?.ad === ogrenci.alanlar.ad
      )

  // Modal için alan bazlı öğretmen filtreleme
  const modalOgretmenler = newStajForm.alan_id === ''
    ? ogretmenler
    : ogretmenler.filter(ogretmen =>
        ogretmen.alanlar?.ad &&
        alanlar.find(alan => alan.id === newStajForm.alan_id)?.ad === ogretmen.alanlar.ad
      )

  // Modern dropdown bileşeni
  const ModernSelect = ({
    value,
    onChange,
    options,
    placeholder,
    label
  }: {
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
    placeholder: string
    label: string
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    const selectedOption = options.find(opt => opt.value === value)
    
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors"
          >
            <span className="block truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-600 ${
                    value === option.value ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Seçimi temizle butonu */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-8 top-8 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Koordinatörlük Yönetimi</h1>
            <p className="text-indigo-100">Öğrenci staj süreçlerini koordine edin</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={checkAndFixDuplicateActiveInternships}
              className="flex items-center space-x-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Çoklu Staj Kontrolü</span>
            </button>
            <button
              onClick={() => setNewStajModalOpen(true)}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Staj Kaydı</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'aktif', label: 'Aktif Stajlar', count: stajlar.filter(s => s.durum === 'aktif').length },
              { id: 'bost', label: 'Boşta Olan Öğrenciler', count: bostOgrenciler.length },
              { id: 'tamamlandi', label: 'Tamamlanan/Feshedilen', count: stajlar.filter(s => s.durum !== 'aktif').length },
              { id: 'ogretmen', label: 'Öğretmen Bazlı', count: ogretmenler.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-4">
            {/* Arama */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'bost' ? 'Öğrenci ara...' :
                    activeTab === 'ogretmen' ? 'Öğretmen ara...' :
                    'Öğrenci veya işletme ara...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            {/* Filtreler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Alan Filtresi */}
              <ModernSelect
                value={filterAlan}
                onChange={(value) => {
                  setFilterAlan(value)
                  // Alan değiştiğinde sınıf ve öğretmen filtrelerini sıfırla
                  if (value !== filterAlan) {
                    setFilterSinif('')
                    setFilterOgretmen('')
                  }
                }}
                options={[
                  { value: '', label: 'Tüm Alanlar' },
                  ...alanlar.map(alan => ({ value: alan.id, label: alan.ad }))
                ]}
                placeholder="Alan seçin"
                label="Alan"
              />
              
              {/* Sınıf Filtresi */}
              {activeTab !== 'ogretmen' && (
                <ModernSelect
                  value={filterSinif}
                  onChange={setFilterSinif}
                  options={[
                    { value: '', label: 'Tüm Sınıflar' },
                    ...availableClasses.map(sinif => ({ value: sinif, label: sinif }))
                  ]}
                  placeholder="Sınıf seçin"
                  label="Sınıf"
                />
              )}
              
              {activeTab !== 'bost' && activeTab !== 'ogretmen' && (
                <>
                  {/* İşletme Filtresi */}
                  <ModernSelect
                    value={filterIsletme}
                    onChange={setFilterIsletme}
                    options={[
                      { value: '', label: 'Tüm İşletmeler' },
                      ...isletmeler.map(isletme => ({ value: isletme.id, label: isletme.ad }))
                    ]}
                    placeholder="İşletme seçin"
                    label="İşletme"
                  />
                  
                  {/* Koordinatör Filtresi */}
                  <ModernSelect
                    value={filterOgretmen}
                    onChange={setFilterOgretmen}
                    options={[
                      { value: '', label: 'Tüm Koordinatörler' },
                      ...availableTeachers.map(ogretmen => ({
                        value: ogretmen.id,
                        label: `${ogretmen.ad} ${ogretmen.soyad}`
                      }))
                    ]}
                    placeholder="Koordinatör seçin"
                    label="Koordinatör"
                  />
                </>
              )}
            </div>
            
            {/* Aktif Filtreler */}
            {(filterAlan || filterSinif || filterIsletme || filterOgretmen) && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-gray-500">Aktif filtreler:</span>
                {filterAlan && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {alanlar.find(a => a.id === filterAlan)?.ad}
                    <button onClick={() => setFilterAlan('')} className="hover:text-indigo-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterSinif && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                    {filterSinif}
                    <button onClick={() => setFilterSinif('')} className="hover:text-green-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterIsletme && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                    {isletmeler.find(i => i.id === filterIsletme)?.ad}
                    <button onClick={() => setFilterIsletme('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterOgretmen && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                    {ogretmenler.find(o => o.id === filterOgretmen)?.ad} {ogretmenler.find(o => o.id === filterOgretmen)?.soyad}
                    <button onClick={() => setFilterOgretmen('')} className="hover:text-purple-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'ogretmen' ? (
            <OgretmenBazliYonetim data={filteredOgretmenBazliData} />
          ) : activeTab === 'bost' ? (
            // Boşta olan öğrenciler
            <div className="space-y-4">
              {/* Sayfa bilgisi */}
              {totalBostOgrenciler > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    {startIndexBost + 1}-{Math.min(endIndexBost, totalBostOgrenciler)} arası,
                    toplam {totalBostOgrenciler} öğrenci
                  </span>
                  <span>Sayfa {currentPageBost} / {totalPagesBost}</span>
                </div>
              )}

              {filteredBostOgrenciler.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Boşta öğrenci yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Tüm öğrencilerin aktif stajları bulunuyor.</p>
                </div>
              ) : (
                paginatedBostOgrenciler.map((ogrenci) => (
                  <div key={ogrenci.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <User className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {ogrenci.sinif} - No: {ogrenci.no}
                            </span>
                            <span>{ogrenci.alanlar?.ad || 'Alan belirtilmemiş'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            // Öğrencinin alanını otomatik seç
                            const ogrenciAlani = ogrenci.alanlar?.ad ?
                              alanlar.find(alan => alan.ad === ogrenci.alanlar?.ad)?.id || '' : ''
                            
                            setNewStajForm({
                              ...newStajForm,
                              alan_id: ogrenciAlani,
                              ogrenci_id: ogrenci.id,
                              ogretmen_id: '' // Öğretmen seçimini sıfırla
                            })
                            setNewStajModalOpen(true)
                          }}
                          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>İşletme Girişi Yap</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Boşta Öğrenciler Pagination Controls */}
              {totalPagesBost > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPageBost(Math.max(1, currentPageBost - 1))}
                      disabled={currentPageBost === 1}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Önceki</span>
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPagesBost }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPageBost(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPageBost === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPageBost(Math.min(totalPagesBost, currentPageBost + 1))}
                      disabled={currentPageBost === totalPagesBost}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Sonraki</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Staj listesi (Aktif ve Tamamlanan/Feshedilen)
            <div className="space-y-4">
              {/* Sayfa bilgisi */}
              {totalStajlar > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    {startIndexStajlar + 1}-{Math.min(endIndexStajlar, totalStajlar)} arası,
                    toplam {totalStajlar} staj
                  </span>
                  <span>Sayfa {currentPageStajlar} / {totalPagesStajlar}</span>
                </div>
              )}

              {filteredStajlar.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Staj bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'aktif' ? 'Henüz aktif staj bulunmuyor.' : 'Tamamlanan veya feshedilen staj bulunmuyor.'}
                  </p>
                </div>
              ) : (
                paginatedStajlar.map((staj) => (
                  <div key={staj.id} className={`border rounded-lg p-6 ${
                    staj.durum === 'aktif' ? 'bg-green-50 border-green-200' :
                    staj.durum === 'feshedildi' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          staj.durum === 'aktif' ? 'bg-green-100' :
                          staj.durum === 'feshedildi' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <Users className={`h-6 w-6 ${
                            staj.durum === 'aktif' ? 'text-green-600' :
                            staj.durum === 'feshedildi' ? 'text-red-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {staj.ogrenciler?.ad || 'Bilinmiyor'} {staj.ogrenciler?.soyad || ''}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {staj.ogrenciler?.sinif || 'Bilinmiyor'} - No: {staj.ogrenciler?.no || 'Bilinmiyor'}
                            </span>
                            <span>{staj.ogrenciler?.alanlar?.ad || 'Alan belirtilmemiş'}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              {staj.isletmeler?.ad || 'İşletme bilgisi yok'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <UserCheck className="h-4 w-4 mr-1" />
                              <span className="font-medium">Koordinatör:</span>
                              {staj.ogretmenler ?
                                `${staj.ogretmenler.ad} ${staj.ogretmenler.soyad}` :
                                <span className="text-orange-600 font-medium">Atanmamış</span>
                              }
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(staj.baslangic_tarihi).toLocaleDateString('tr-TR')} - {staj.bitis_tarihi ? new Date(staj.bitis_tarihi).toLocaleDateString('tr-TR') : 'Devam ediyor'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {staj.durum === 'aktif' && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                setOpenDropdowns(prev => ({
                                  ...prev,
                                  [staj.id]: !prev[staj.id]
                                }))
                              }}
                              className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {openDropdowns[staj.id] && (
                              <>
                                {/* Backdrop */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))}
                                />
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button
                                    onClick={() => {
                                      console.log('Koordinatör Ata butonu tıklandı')
                                      console.log('staj.ogrenciler:', staj.ogrenciler)
                                      if (staj.ogrenciler) {
                                        console.log('Öğrenci seçiliyor:', staj.ogrenciler)
                                        setSelectedOgrenci(staj.ogrenciler)
                                        setKoordinatorForm({
                                          ogretmen_id: '',
                                          baslangic_tarihi: new Date().toISOString().split('T')[0],
                                          notlar: ''
                                        })
                                        console.log('Modal açılıyor')
                                        setKoordinatorModalOpen(true)
                                        setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                      } else {
                                        console.log('Öğrenci bilgisi bulunamadı!')
                                      }
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    <span>Koordinatör Ata</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedStaj(staj)
                                      setTarihDuzenleForm({
                                        baslangic_tarihi: staj.baslangic_tarihi,
                                        bitis_tarihi: staj.bitis_tarihi || ''
                                      })
                                      setTarihDuzenleModalOpen(true)
                                      setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    <span>Tarih Düzenle</span>
                                  </button>
                                  
                                  <hr className="my-1 border-gray-100" />
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedStaj(staj)
                                      setFesihModalOpen(true)
                                      setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <UserX className="h-4 w-4" />
                                    <span>Staj Feshet</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setSelectedStaj(staj)
                                      setSilmeModalOpen(true)
                                      setOpenDropdowns(prev => ({ ...prev, [staj.id]: false }))
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Staj Sil</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Stajlar Pagination Controls */}
              {totalPagesStajlar > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPageStajlar(Math.max(1, currentPageStajlar - 1))}
                      disabled={currentPageStajlar === 1}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Önceki</span>
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPagesStajlar }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPageStajlar(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPageStajlar === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPageStajlar(Math.min(totalPagesStajlar, currentPageStajlar + 1))}
                      disabled={currentPageStajlar === totalPagesStajlar}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Sonraki</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Yeni Staj Modal */}
      <Modal isOpen={newStajModalOpen} onClose={() => setNewStajModalOpen(false)} title="Yeni Staj Kaydı">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alan <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.alan_id}
              onChange={(e) => setNewStajForm({
                ...newStajForm,
                alan_id: e.target.value,
                ogrenci_id: '', // Alan değiştiğinde öğrenci seçimini sıfırla
                ogretmen_id: '' // Alan değiştiğinde öğretmen seçimini sıfırla
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Alan Seçin</option>
              {alanlar.map((alan) => (
                <option key={alan.id} value={alan.id}>
                  {alan.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.ogrenci_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, ogrenci_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={newStajForm.alan_id === ''}
            >
              <option value="">
                {newStajForm.alan_id === '' ? 'Önce alan seçin' : 'Öğrenci Seçin'}
              </option>
              {modalOgrenciler.map((ogrenci) => (
                <option key={ogrenci.id} value={ogrenci.id}>
                  {ogrenci.ad} {ogrenci.soyad} - {ogrenci.sinif} (No: {ogrenci.no})
                </option>
              ))}
            </select>
            {newStajForm.alan_id === '' && (
              <p className="text-xs text-gray-500 mt-1">Öğrenci listesini görmek için önce alan seçin</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.isletme_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, isletme_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">İşletme Seçin</option>
              {isletmeler.map((isletme) => (
                <option key={isletme.id} value={isletme.id}>
                  {isletme.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinatör Öğretmen <span className="text-red-500">*</span>
            </label>
            <select
              value={newStajForm.ogretmen_id}
              onChange={(e) => setNewStajForm({ ...newStajForm, ogretmen_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={newStajForm.alan_id === ''}
            >
              <option value="">
                {newStajForm.alan_id === '' ? 'Önce alan seçin' : 'Koordinatör Seçin'}
              </option>
              {modalOgretmenler.map((ogretmen) => (
                <option key={ogretmen.id} value={ogretmen.id}>
                  {ogretmen.ad} {ogretmen.soyad}
                </option>
              ))}
            </select>
            {newStajForm.alan_id === '' && (
              <p className="text-xs text-gray-500 mt-1">Koordinatör listesini görmek için önce alan seçin</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newStajForm.baslangic_tarihi}
                onChange={(e) => setNewStajForm({ ...newStajForm, baslangic_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi <span className="text-gray-500">(opsiyonel)</span>
              </label>
              <input
                type="date"
                value={newStajForm.bitis_tarihi}
                onChange={(e) => setNewStajForm({ ...newStajForm, bitis_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Boş bırakılabilir"
              />
              <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa staj devam ediyor olarak görünür</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sözleşme Belgesi
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="sozlesme-dosya"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setNewStajForm({ ...newStajForm, sozlesme_dosya: e.target.files?.[0] || null })}
                className="hidden"
              />
              <label htmlFor="sozlesme-dosya" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {newStajForm.sozlesme_dosya ? newStajForm.sozlesme_dosya.name : 'Sözleşme dosyası seçmek için tıklayın'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                </p>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setNewStajModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleNewStaj}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Staj Kaydı Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* Fesih Modal */}
      <Modal isOpen={fesihModalOpen} onClose={() => setFesihModalOpen(false)} title="Staj Fesih İşlemi">
        {selectedStaj && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Feshedilecek Staj</h3>
              <p className="text-sm text-yellow-700">
                <strong>Öğrenci:</strong> {selectedStaj.ogrenciler?.ad || 'Bilinmiyor'} {selectedStaj.ogrenciler?.soyad || ''}<br />
                <strong>İşletme:</strong> {selectedStaj.isletmeler?.ad || 'İşletme bilgisi yok'}<br />
                <strong>Başlangıç:</strong> {new Date(selectedStaj.baslangic_tarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fesihForm.fesih_tarihi}
                onChange={(e) => setFesihForm({ ...fesihForm, fesih_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Nedeni
              </label>
              <textarea
                value={fesihForm.fesih_nedeni}
                onChange={(e) => setFesihForm({ ...fesihForm, fesih_nedeni: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Fesih nedenini açıklayın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Belgesi
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  id="fesih-dosya"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setFesihForm({ ...fesihForm, fesih_belgesi: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <label htmlFor="fesih-dosya" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {fesihForm.fesih_belgesi ? fesihForm.fesih_belgesi.name : 'Fesih belgesi seçmek için tıklayın'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, JPG, PNG formatları desteklenir
                  </p>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setFesihModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleFesih}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stajı Feshet
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Silme Modal */}
      <Modal isOpen={silmeModalOpen} onClose={() => setSilmeModalOpen(false)} title="Staj Kaydını Sil">
        {selectedStaj && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="font-medium text-red-800">Dikkat! Bu işlem geri alınamaz</h3>
              </div>
              <p className="text-sm text-red-700 mt-2">
                Bu stajın tüm bilgileri kalıcı olarak silinecektir. Sadece yanlışlıkla oluşturulmuş stajları siliniz.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">Silinecek Staj Bilgileri</h3>
              <p className="text-sm text-gray-700">
                <strong>Öğrenci:</strong> {selectedStaj.ogrenciler?.ad || 'Bilinmiyor'} {selectedStaj.ogrenciler?.soyad || ''}<br />
                <strong>İşletme:</strong> {selectedStaj.isletmeler?.ad || 'İşletme bilgisi yok'}<br />
                <strong>Koordinatör:</strong> {selectedStaj.ogretmenler?.ad || 'Bilinmiyor'} {selectedStaj.ogretmenler?.soyad || ''}<br />
                <strong>Başlangıç:</strong> {new Date(selectedStaj.baslangic_tarihi).toLocaleDateString('tr-TR')}<br />
                <strong>Durum:</strong> {selectedStaj.durum === 'aktif' ? 'Aktif' : selectedStaj.durum === 'feshedildi' ? 'Feshedildi' : 'Tamamlandı'}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Uyarı:</strong> Bu işlem şunları silecektir:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>Staj kaydının tüm bilgileri</li>
                <li>Yüklenen sözleşme belgeleri</li>
                <li>Fesih belgeleri (varsa)</li>
                <li>Tüm ilgili dosyalar</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setSilmeModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleStajSil}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Evet, Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Koordinatör Atama Modal */}
      <Modal isOpen={koordinatorModalOpen} onClose={() => setKoordinatorModalOpen(false)} title="Koordinatör Ataması">
        {selectedOgrenci && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-medium text-indigo-800 mb-2">Koordinatör Atanacak Öğrenci</h3>
              <p className="text-sm text-indigo-700">
                <strong>Öğrenci:</strong> {selectedOgrenci.ad} {selectedOgrenci.soyad}<br />
                <strong>Sınıf:</strong> {selectedOgrenci.sinif} - No: {selectedOgrenci.no}<br />
                <strong>Alan:</strong> {selectedOgrenci.alanlar?.ad || 'Alan belirtilmemiş'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koordinatör Öğretmen <span className="text-red-500">*</span>
              </label>
              <select
                value={koordinatorForm.ogretmen_id}
                onChange={(e) => setKoordinatorForm({ ...koordinatorForm, ogretmen_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Koordinatör Seçin</option>
                {ogretmenler
                  .filter(ogretmen =>
                    !selectedOgrenci?.alanlar?.ad ||
                    ogretmen.alanlar?.ad === selectedOgrenci.alanlar.ad
                  )
                  .map((ogretmen) => (
                    <option key={ogretmen.id} value={ogretmen.id}>
                      {ogretmen.ad} {ogretmen.soyad} {ogretmen.alanlar?.ad ? `(${ogretmen.alanlar.ad})` : ''}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koordinatörlük Başlangıç Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={koordinatorForm.baslangic_tarihi}
                onChange={(e) => setKoordinatorForm({ ...koordinatorForm, baslangic_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar
              </label>
              <textarea
                value={koordinatorForm.notlar}
                onChange={(e) => setKoordinatorForm({ ...koordinatorForm, notlar: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Koordinatör ataması ile ilgili notlar..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Bilgi:</strong> Bu atama öğrencinin koordinatör öğretmenini belirler.
                Koordinatör değişikliği gerektiğinde yeni atama yapılabilir.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setKoordinatorModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleKoordinatorAta}
                disabled={koordinatorAtaLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {koordinatorAtaLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{koordinatorAtaLoading ? 'Atanıyor...' : 'Koordinatör Ata'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Tarih Düzenleme Modal */}
      <Modal isOpen={tarihDuzenleModalOpen} onClose={() => setTarihDuzenleModalOpen(false)} title="Staj Tarihlerini Düzenle">
        {selectedStaj && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Düzenlenecek Staj</h3>
              <p className="text-sm text-blue-700">
                <strong>Öğrenci:</strong> {selectedStaj.ogrenciler?.ad || 'Bilinmiyor'} {selectedStaj.ogrenciler?.soyad || ''}<br />
                <strong>İşletme:</strong> {selectedStaj.isletmeler?.ad || 'İşletme bilgisi yok'}<br />
                <strong>Mevcut Başlangıç:</strong> {new Date(selectedStaj.baslangic_tarihi).toLocaleDateString('tr-TR')}<br />
                <strong>Mevcut Bitiş:</strong> {selectedStaj.bitis_tarihi ? new Date(selectedStaj.bitis_tarihi).toLocaleDateString('tr-TR') : 'Devam ediyor'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tarihDuzenleForm.baslangic_tarihi}
                onChange={(e) => setTarihDuzenleForm({ ...tarihDuzenleForm, baslangic_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi <span className="text-gray-500">(opsiyonel)</span>
              </label>
              <input
                type="date"
                value={tarihDuzenleForm.bitis_tarihi}
                onChange={(e) => setTarihDuzenleForm({ ...tarihDuzenleForm, bitis_tarihi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa staj devam ediyor olarak görünür</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Bilgi:</strong> Tarih değişiklikleri staj durumunu etkilemez.
                Sadece başlangıç ve bitiş tarihleri güncellenir.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setTarihDuzenleModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleTarihDuzenle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tarihleri Güncelle
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}