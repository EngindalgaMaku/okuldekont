'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Users, FileText, LogOut, Building2, Upload, Eye, Filter, Calendar, CreditCard, User, Search, Loader2, Download, Trash2, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEgitimYili } from '@/lib/context/EgitimYiliContext'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import DekontBildirim from '@/components/ui/DekontBildirim'
import { Dekont, Ogretmen, Isletme, Stajyer, IsletmeBelgesi, ActiveTab } from '@/types/ogretmen'
import { getStatusIcon, getStatusText, getStatusClass } from '@/utils/dekontHelpers'

export default function OgretmenPage() {
  const router = useRouter()
  const { egitimYili, okulAdi } = useEgitimYili()
  const [ogretmen, setOgretmen] = useState<Ogretmen | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('isletmeler')
  const [isletmeler, setIsletmeler] = useState<Isletme[]>([])
  const [stajyerler, setStajyerler] = useState<Stajyer[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([])
  const [loading, setLoading] = useState(true)
  const [belgeler, setBelgeler] = useState<IsletmeBelgesi[]>([])
  const [belgelerLoading, setBelgelerLoading] = useState(false)

  // Dekont yükleme için state'ler
  const [selectedStajyer, setSelectedStajyer] = useState('')
  const [miktar, setMiktar] = useState('')
  const [odemeTarihi, setOdemeTarihi] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dekontDosyasi, setDekontDosyasi] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Dekont filtreleme
  const [dekontSearchTerm, setDekontSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewModal, setViewModal] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [belgelerModal, setBelgelerModal] = useState(false)
  const [belgeYuklemeModal, setBelgeYuklemeModal] = useState(false)
  const [belgeFile, setBelgeFile] = useState<File | null>(null)
  const [belgeAciklama, setBelgeAciklama] = useState('')
  const [belgeYuklemeLoading, setBelgeYuklemeLoading] = useState(false)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false)
  const [dekontToDelete, setDekontToDelete] = useState<Dekont | null>(null)
  const [ekDekontBilgisi, setEkDekontBilgisi] = useState<{ count: number; message: string } | null>(null)

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const storedOgretmen = localStorage.getItem('ogretmen')
    if (!storedOgretmen) {
      router.push('/')
      return
    }
    setOgretmen(JSON.parse(storedOgretmen))
    fetchData()
  }, [])

  useEffect(() => {
    if (!odemeTarihi || !selectedStajyer || !dekontlar.length) {
      setEkDekontBilgisi(null);
      return;
    }

    const [year, month] = odemeTarihi.split('-').map(Number);
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthName = monthNames[month - 1];

    const ekDekontSayisi = dekontlar.filter(d =>
      d.staj_id.toString() === selectedStajyer &&
      d.yil === year &&
      d.ay.startsWith(monthName)
    ).length;

    if (ekDekontSayisi > 0) {
      setEkDekontBilgisi({
        count: ekDekontSayisi,
        message: `Bu öğrenci için ${monthName} ${year} dönemine ait ${ekDekontSayisi} adet dekont zaten mevcut. Yeni bir dekont eklerseniz, bu "(Ek ${ekDekontSayisi})" olarak kaydedilecektir.`
      });
    } else {
      setEkDekontBilgisi(null);
    }
  }, [odemeTarihi, selectedStajyer, dekontlar]);

  // Dekont filtreleme
  useEffect(() => {
    let filtered = dekontlar

    if (dekontSearchTerm) {
      filtered = filtered.filter(dekont => 
        dekont.stajlar?.ogrenciler?.ad?.toLowerCase().includes(dekontSearchTerm.toLowerCase()) ||
        dekont.stajlar?.ogrenciler?.soyad?.toLowerCase().includes(dekontSearchTerm.toLowerCase()) ||
        dekont.isletmeler?.ad?.toLowerCase().includes(dekontSearchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(dekont => dekont.onay_durumu === statusFilter)
    }

    setFilteredDekontlar(filtered)
  }, [dekontlar, dekontSearchTerm, statusFilter])

  const fetchData = async () => {
    setLoading(true)
    const storedOgretmen = JSON.parse(localStorage.getItem('ogretmen') || '{}')

    // İşletmeleri getir
    const { data: isletmeData } = await supabase
      .from('isletmeler')
      .select(`
        id,
        ad,
        yetkili_kisi,
        stajlar (count)
      `)
      .eq('ogretmen_id', storedOgretmen.id)

    if (isletmeData) {
      const formattedIsletmeler = isletmeData.map((isletme: any) => ({
        id: isletme.id,
        ad: isletme.ad,
        yetkili_kisi: isletme.yetkili_kisi,
        ogrenci_sayisi: isletme.stajlar[0]?.count || 0
      }))
      setIsletmeler(formattedIsletmeler)
    }

    // Stajyerleri getir
    const { data: stajData } = await supabase
      .from('stajlar')
      .select(`
        id,
        baslangic_tarihi,
        bitis_tarihi,
        isletmeler (
          id,
          ad,
          yetkili_kisi
        ),
        ogrenciler (
          id,
          ad,
          soyad,
          sinif,
          alanlar (ad),
          no
        )
      `)
      .eq('ogretmen_id', storedOgretmen.id)
      .eq('durum', 'aktif')

    if (stajData) {
      const formattedStajyerler = stajData.map((staj: any) => ({
        id: staj.ogrenciler.id,
        ad: staj.ogrenciler.ad,
        soyad: staj.ogrenciler.soyad,
        sinif: staj.ogrenciler.sinif,
        alan: staj.ogrenciler.alanlar.ad,
        no: staj.ogrenciler.no,
        isletme: {
          id: staj.isletmeler.id,
          ad: staj.isletmeler.ad,
          yetkili_kisi: staj.isletmeler.yetkili_kisi
        },
        baslangic_tarihi: staj.baslangic_tarihi,
        bitis_tarihi: staj.bitis_tarihi,
        staj_id: staj.id
      }))
      setStajyerler(formattedStajyerler)
    }

    // Dekontları getir
    fetchDekontlar()
    setLoading(false)
  }

  const fetchDekontlar = async () => {
    const storedOgretmen = JSON.parse(localStorage.getItem('ogretmen') || '{}')
    
    const { data: dekontData } = await supabase
      .from('dekontlar')
      .select(`
        *,
        stajlar (
          ogrenciler (
            ad,
            soyad,
            sinif,
            no
          )
        ),
        isletmeler (ad)
      `)
      .eq('ogretmen_id', storedOgretmen.id)
      .order('created_at', { ascending: false })

    if (dekontData) {
      const formattedData = await Promise.all(dekontData.map(async (item) => {
        let yukleyen_adi = 'Bilinmiyor';
        if (item.yukleyen_rolu === 'ogretmen' && item.yukleyen_id) {
          const { data: ogretmenData } = await supabase.from('ogretmenler').select('ad, soyad').eq('id', item.yukleyen_id).single();
          if (ogretmenData) {
            yukleyen_adi = `${ogretmenData.ad} ${ogretmenData.soyad}`;
          }
        } else if (item.yukleyen_rolu === 'isletme' && item.yukleyen_id) {
          const { data: isletmeData } = await supabase.from('isletmeler').select('ad').eq('id', item.yukleyen_id).single();
          if (isletmeData) {
            yukleyen_adi = isletmeData.ad;
          }
        }
        
        return {
          id: item.id,
          isletme_id: item.isletme_id,
          staj_id: item.staj_id,
          odeme_tarihi: item.odeme_tarihi,
          tutar: item.miktar,
          dosya_url: item.dosya_url,
          aciklama: item.aciklama,
          ay: item.ay,
          yil: item.yil || new Date().getFullYear(),
          onay_durumu: item.onay_durumu,
          created_at: item.created_at,
          yukleyen_rolu: item.yukleyen_rolu,
          yukleyen_id: item.yukleyen_id,
          yukleyen_adi: yukleyen_adi,
          stajlar: {
            ogrenciler: item.stajlar?.ogrenciler
              ? {
                  ad: item.stajlar.ogrenciler.ad,
                  soyad: item.stajlar.ogrenciler.soyad,
                  sinif: item.stajlar.ogrenciler.sinif,
                  no: item.stajlar.ogrenciler.no
                }
              : null
          },
          isletmeler: {
            ad: item.isletmeler?.ad
          }
        };
      }));
      setDekontlar(formattedData)
      setFilteredDekontlar(formattedData)
    }
  }

  const handleDekontSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dekontDosyasi || !ogretmen) return
    setUploadLoading(true)

    try {
      const selectedStajyerData = stajyerler.find(s => s.staj_id.toString() === selectedStajyer)
      if (!selectedStajyerData) throw new Error('Stajyer bulunamadı')

      const [year, month] = odemeTarihi.split('-').map(Number);
      const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
      const monthName = monthNames[month - 1];

      const ekDekontSayisi = dekontlar.filter(d =>
        d.staj_id.toString() === selectedStajyer &&
        d.yil === year &&
        d.ay.startsWith(monthName)
      ).length;

      let finalMonthName = monthName;
      if (ekDekontSayisi > 0) {
        const proceed = window.confirm(`Bu öğrenci için ${monthName} ${year} dönemine ait ${ekDekontSayisi} adet dekont zaten mevcut. Yeni bir dekont eklerseniz, bu "(Ek ${ekDekontSayisi})" olarak kaydedilecektir. Devam etmek istiyor musunuz?`);
        if (!proceed) {
          setUploadLoading(false);
          return;
        }
        finalMonthName = `${monthName} (Ek ${ekDekontSayisi})`;
      }

      // 1. Dosyayı Supabase Storage'a yükle
      const dosyaAdi = `dekont_${Date.now()}_${dekontDosyasi.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dekontlar')
        .upload(dosyaAdi, dekontDosyasi)

      if (uploadError) {
        throw uploadError
      }

      // 2. Veritabanına kaydet
      const { error: insertError } = await supabase
        .from('dekontlar')
        .insert({
          staj_id: parseInt(selectedStajyer),
          isletme_id: selectedStajyerData.isletme.id,
          ogretmen_id: ogretmen.id,
          miktar: miktar ? parseFloat(miktar) : null,
          odeme_tarihi: `${odemeTarihi}-01`,
          dosya_url: uploadData.path,
          onay_durumu: 'bekliyor',
          ay: finalMonthName,
          yil: year,
          yukleyen_rolu: 'ogretmen',
          yukleyen_id: ogretmen.id.toString()
        })

      if (insertError) {
        await supabase.storage.from('dekontlar').remove([uploadData.path])
        throw insertError
      }

      // Form sıfırla
      setSelectedStajyer('')
      setMiktar('')
      setOdemeTarihi(new Date().toISOString().slice(0, 7))
      setDekontDosyasi(null)
      setUploadModal(false)
      
      fetchDekontlar()

      setNotification({ message: 'Dekont başarıyla yüklendi', type: 'success' })
      setTimeout(() => {
        setNotification(null)
      }, 3000)

    } catch (error: any) {
      console.error('Dekont gönderme hatası:', error)
      const errorMessage = error.message || 'Bilinmeyen bir hata oluştu.';
      setNotification({ message: `Dekont gönderilemedi: ${errorMessage}`, type: 'error' })
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('dekontlar')
        .createSignedUrl(filePath, 60); // 60 saniye geçerli bir URL oluştur

      if (error) {
        throw error;
      }

      if (data) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Download error:', error.message);
      setNotification({ message: `Dosya indirilemedi: ${error.message}`, type: 'error' });
    }
  };

  const handleView = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setViewModal(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('ogretmen')
    router.push('/')
  }

  const handleBelgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!belgeFile || !selectedIsletme || !ogretmen) return
    setBelgeYuklemeLoading(true)

    try {
      // Dosya yükleme işlemi (gerçek uygulamada Supabase Storage kullanılır)
      let dosyaUrl = `belge_${Date.now()}_${belgeFile.name}`

      const { error } = await supabase
        .from('belgeler')
        .insert({
          isletme_id: selectedIsletme.id,
          ogretmen_id: ogretmen.id,
          dosya_url: dosyaUrl,
          aciklama: belgeAciklama,
          yuklenme_tarihi: new Date().toISOString()
        })

      if (error) throw error

      // Form sıfırla
      setBelgeFile(null)
      setBelgeAciklama('')
      setBelgeYuklemeModal(false)
      
      // Başarı mesajı göster
      setNotification({ message: 'Belge başarıyla yüklendi', type: 'success' })
      setTimeout(() => {
        setNotification(null)
      }, 3000)

    } catch (error) {
      console.error('Belge yükleme hatası:', error)
      setNotification({ message: 'Belge yüklenirken hata oluştu!', type: 'error' })
    } finally {
      setBelgeYuklemeLoading(false)
    }
  }

  const fetchBelgeler = async (isletmeId: number) => {
    setBelgelerLoading(true)
    try {
      const { data, error } = await supabase
        .from('belgeler')
        .select('*')
        .eq('isletme_id', isletmeId)
        .order('yuklenme_tarihi', { ascending: false })

      if (error) throw error
      setBelgeler(data || [])
    } catch (error) {
      console.error('Belgeleri getirme hatası:', error)
      setNotification({ message: 'Belgeler yüklenirken hata oluştu!', type: 'error' })
    } finally {
      setBelgelerLoading(false)
    }
  }

  const handleDeleteDekont = async () => {
    if (!dekontToDelete) return;

    if (dekontToDelete.onay_durumu === 'onaylandi') {
      setNotification({ message: 'Onaylanmış dekontlar silinemez.', type: 'error' });
      setConfirmDeleteModal(false);
      return;
    }

    try {
      if (dekontToDelete.dosya_url) {
        await supabase.storage.from('dekontlar').remove([dekontToDelete.dosya_url]);
      }

      const { error: dbError } = await supabase
        .from('dekontlar')
        .delete()
        .eq('id', dekontToDelete.id);

      if (dbError) throw dbError;

      setDekontlar(prev => prev.filter(d => d.id !== dekontToDelete.id));
      setNotification({ message: 'Dekont başarıyla silindi.', type: 'success' });

    } catch (error: any) {
      console.error('Dekont silme hatası:', error);
      setNotification({ message: `Dekont silinirken bir hata oluştu: ${error.message}`, type: 'error' });
    } finally {
      setConfirmDeleteModal(false);
      setDekontToDelete(null);
    }
  };

  if (loading || !ogretmen) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <header className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 text-white shadow-xl mx-6 mt-6 mb-8 rounded-2xl overflow-hidden">
        <div className="py-6 px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{ogretmen.ad} {ogretmen.soyad}</h1>
                <p className="text-sm text-blue-100 font-medium">Koordinatör Öğretmen</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 h-10 w-10 rounded-full transition-all duration-200"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white p-2 rounded-xl shadow-md mb-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('isletmeler')}
              className={`flex-1 flex justify-center items-center gap-2 p-3 rounded-lg font-medium text-sm transition-colors ${activeTab === 'isletmeler' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Building2 className="h-5 w-5" />
              <span>İşletmeler ({isletmeler.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dekontlar')}
              className={`flex-1 flex justify-center items-center gap-2 p-3 rounded-lg font-medium text-sm transition-colors ${activeTab === 'dekontlar' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <FileText className="h-5 w-5" />
              <span>Dekont Listesi ({dekontlar.length})</span>
            </button>
          </nav>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md">
          {activeTab === 'isletmeler' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isletmeler.map(isletme => (
                  <div key={isletme.id} className="group bg-white rounded-2xl shadow-md hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
                    {/* Header */}
                    <div className="bg-gray-50 border-b border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 rounded-xl">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 leading-tight">{isletme.ad}</h3>
                            <p className="text-gray-500 text-sm font-medium">İşletme</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedIsletme(isletme)
                            setBelgelerModal(true)
                            fetchBelgeler(isletme.id)
                          }}
                          className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-200 shadow-sm"
                          title="Belgeler"
                        >
                          <FileText className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 text-sm">Yetkili: {isletme.yetkili_kisi}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                          Öğrenciler
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {stajyerler.filter((stajyer: Stajyer) => stajyer.isletme.id === isletme.id).length} Öğrenci
                        </span>
                      </div>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {stajyerler
                          .filter((stajyer: Stajyer) => stajyer.isletme.id === isletme.id)
                          .map(ogrenci => (
                            <div key={ogrenci.id} className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 border border-gray-200 transition-all duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg mt-1">
                                      <User className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800">{ogrenci.ad} {ogrenci.soyad}</p>
                                      <div className="text-sm text-gray-600 mt-1">
                                        <div className="flex items-center gap-x-3">
                                          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium">
                                            {ogrenci.sinif}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs">
                                            No: {ogrenci.no}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 pt-1">
                                          <Briefcase className="h-3 w-3 text-gray-400" />
                                          <span>{ogrenci.alan}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedStajyer(ogrenci.staj_id.toString())
                                    setDekontDosyasi(null)
                                    setMiktar('')
                                    setOdemeTarihi(new Date().toISOString().slice(0,7))
                                    setUploadSuccess(false)
                                    setEkDekontBilgisi(null)
                                    setUploadModal(true)
                                  }}
                                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                  title="Dekont Yükle"
                                >
                                  <Upload className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {stajyerler.filter((stajyer: Stajyer) => stajyer.isletme.id === isletme.id).length === 0 && (
                        <div className="text-center py-8">
                          <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-sm">Henüz öğrenci atanmamış</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dekontlar' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow">
                <div className="w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Öğrenci, işletme ara..."
                      value={dekontSearchTerm}
                      onChange={(e) => setDekontSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="bekliyor">Bekleyenler</option>
                    <option value="onaylandi">Onaylananlar</option>
                    <option value="reddedildi">Reddedilenler</option>
                  </select>
                </div>
              </div>

              {/* Mobil için kart görünümü, masaüstü için tablo */}
              <div className="block sm:hidden">
                {filteredDekontlar.map(dekont => (
                  <div key={dekont.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 mb-6">
                    {/* Header */}
                    <div className="bg-gray-50 border-b border-gray-100 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{dekont.stajlar?.ogrenciler?.ad} {dekont.stajlar?.ogrenciler?.soyad}</h3>
                          <p className="text-sm text-gray-600">
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium mr-2">
                              {dekont.stajlar?.ogrenciler?.sinif}
                            </span>
                            No: {dekont.stajlar?.ogrenciler?.no}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${getStatusClass(dekont.onay_durumu)}`}>
                          {getStatusIcon(dekont.onay_durumu)}
                          {getStatusText(dekont.onay_durumu)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            İşletme:
                          </span>
                          <span className="font-semibold text-gray-800">{dekont.isletmeler?.ad}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-2">
                            <Upload className="h-4 w-4 text-gray-400" />
                            Yükleyen:
                          </span>
                          <span className="font-medium text-gray-700">{dekont.yukleyen_adi}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Dönem:
                          </span>
                          <span className="font-semibold text-gray-800">{dekont.ay} {dekont.yil}</span>
                        </div>
                        {dekont.tutar && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                              Tutar:
                            </span>
                            <span className="font-semibold text-green-600">{dekont.tutar} TL</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex justify-end gap-2">
                      <button
                        onClick={() => dekont.dosya_url ? handleDownload(dekont.dosya_url) : alert('Dosya henüz yüklenmemiş!')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                        title="Dekontu İndir"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm font-medium">İndir</span>
                      </button>
                      {dekont.onay_durumu !== 'onaylandi' && (
                        <button
                          onClick={() => {
                            setDekontToDelete(dekont);
                            setConfirmDeleteModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                          title="Dekontu Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Masaüstü için tablo görünümü */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full bg-white shadow rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-semibold text-left">Öğrenci</th>
                      <th className="p-3 font-semibold text-left">İşletme</th>
                      <th className="p-3 font-semibold text-left">Dönem</th>
                      <th className="p-3 font-semibold text-left">Yükleyen</th>
                      <th className="p-3 font-semibold text-left">Durum</th>
                      <th className="p-3 font-semibold text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDekontlar.map(dekont => (
                      <tr key={dekont.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-semibold text-gray-800">{dekont.stajlar?.ogrenciler?.ad} {dekont.stajlar?.ogrenciler?.soyad}</div>
                          <div className="text-sm text-gray-500">{dekont.stajlar?.ogrenciler?.sinif} - <span className="font-medium">No: </span>{dekont.stajlar?.ogrenciler?.no}</div>
                        </td>
                        <td className="p-3">{dekont.isletmeler?.ad}</td>
                        <td className="p-3">{dekont.ay} {dekont.yil}</td>
                        <td className="p-3">{dekont.yukleyen_adi}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${getStatusClass(dekont.onay_durumu)}`}>
                            {getStatusIcon(dekont.onay_durumu)}
                            {getStatusText(dekont.onay_durumu)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => dekont.dosya_url ? handleDownload(dekont.dosya_url) : alert('Dosya henüz yüklenmemiş!')}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                              title="Dekontu İndir"
                            >
                              <Download className="h-4 w-4" />
                              <span className="text-sm font-medium">İndir</span>
                            </button>
                             {dekont.onay_durumu !== 'onaylandi' && (
                              <button
                                onClick={() => {
                                  setDekontToDelete(dekont);
                                  setConfirmDeleteModal(true);
                                }}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                                title="Dekontu Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} {okulAdi}</p>
        </div>
      </footer>

      {viewModal && selectedDekont && (
        <Modal 
          isOpen={viewModal} 
          onClose={() => setViewModal(false)}
          title="Dekont Detayları"
        >
          <div className="space-y-4 p-2">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-gray-100 p-4 rounded-lg">
                 <h4 className="font-semibold mb-2">Öğrenci Bilgileri</h4>
                 <p>{selectedDekont.stajlar?.ogrenciler?.ad} {selectedDekont.stajlar?.ogrenciler?.soyad}</p>
                 <p className="text-sm text-gray-600">{selectedDekont.stajlar?.ogrenciler?.sinif} - <span className="font-medium">No: </span>{selectedDekont.stajlar?.ogrenciler?.no}</p>
               </div>
               <div className="bg-gray-100 p-4 rounded-lg">
                 <h4 className="font-semibold mb-2">İşletme Bilgileri</h4>
                 <p>{selectedDekont.isletmeler?.ad}</p>
               </div>
               <div className="bg-gray-100 p-4 rounded-lg">
                 <h4 className="font-semibold mb-2">Dekont Bilgileri</h4>
                 <div className="space-y-1">
                   <div className="flex justify-between">
                     <span>Dönem:</span>
                     <span className="font-medium">{selectedDekont.ay} {selectedDekont.yil}</span>
                   </div>
                   <div className="flex justify-between mt-1">
                     <span>Tutar:</span>
                     <span className="font-medium">{selectedDekont.tutar ? `${selectedDekont.tutar} TL` : '-'}</span>
                   </div>
                   <div className="flex justify-between mt-1">
                     <span>Durum:</span>
                     <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${getStatusClass(selectedDekont.onay_durumu)}`}>
                       {getStatusIcon(selectedDekont.onay_durumu)}
                       {getStatusText(selectedDekont.onay_durumu)}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                 <h4 className="font-semibold mb-2">Ödeme Detayları</h4>
                 <div className="flex justify-between">
                   <span>Dönem:</span>
                   <span className="font-medium">{new Date(selectedDekont.odeme_tarihi).toLocaleDateString()}</span>
                 </div>
                  <div className="flex justify-between mt-1">
                   <span>Tutar:</span>
                   <span className="font-medium">{selectedDekont.miktar ? `${selectedDekont.miktar} TL` : 'Belirtilmemiş'}</span>
                 </div>
                 <div className="flex justify-between mt-1">
                   <span>Yüklenme Tarihi:</span>
                   <span className="font-medium">{new Date(selectedDekont.created_at).toLocaleDateString()}</span>
                 </div>
               </div>
             <div className="bg-gray-100 p-4 rounded-lg">
                 <h4 className="font-semibold mb-2">Onay Durumu</h4>
                  <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-sm font-medium ${getStatusClass(selectedDekont.onay_durumu)}`}>
                  {getStatusIcon(selectedDekont.onay_durumu)}
                  {getStatusText(selectedDekont.onay_durumu)}
                </span>
              </div>

             {selectedDekont.dekont_dosyasi && (
               <button
                 onClick={() => handleDownload(selectedDekont.dekont_dosyasi!)}
                 className="w-full flex justify-center items-center gap-2 mt-4 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
               >
                 <Download className="h-4 w-4"/>
                 Dekontu İndir
               </button>
             )}
          </div>
        </Modal>
      )}

      {uploadModal && (
        <Modal 
          isOpen={uploadModal} 
          onClose={() => {
            setUploadModal(false);
            setEkDekontBilgisi(null);
          }}
          title="Yeni Dekont Yükle"
        >
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleDekontSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dekont Ayı</label>
                  <input
                    type="month"
                    value={odemeTarihi}
                    onChange={(e) => setOdemeTarihi(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {ekDekontBilgisi && (
                    <div className="mt-2 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg">
                      <p className="text-sm font-medium">{ekDekontBilgisi.message}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (Opsiyonel)</label>
                  <input
                    type="number"
                    value={miktar}
                    onChange={(e) => setMiktar(e.target.value)}
                    placeholder="Örn: 1500.50"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dekont Dosyası</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Dosya yükle</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setDekontDosyasi(e.target.files ? e.target.files[0] : null)} accept=".pdf,.png,.jpg,.jpeg" required />
                      </label>
                      <p className="pl-1">veya sürükleyip bırakın</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, JPEG</p>
                  </div>
                </div>
                {dekontDosyasi && <p className="text-sm text-gray-500 mt-2">Seçilen dosya: {dekontDosyasi.name}</p>}
              </div>
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {uploadLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Dekontu Gönder'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Belgeler Modalı */}
      {belgelerModal && selectedIsletme && (
        <Modal
          isOpen={belgelerModal}
          onClose={() => setBelgelerModal(false)}
          title={`${selectedIsletme.ad} - Belgeler`}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Yüklenen Belgeler</h3>
              <button
                onClick={() => {
                  setBelgelerModal(false)
                  setBelgeYuklemeModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Yeni Belge Yükle</span>
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {belgelerLoading ? (
                <div className="py-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </div>
              ) : belgeler.length > 0 ? (
                belgeler.map(belge => (
                  <div key={belge.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{belge.aciklama}</p>
                      <p className="text-sm text-gray-500">{new Date(belge.yuklenme_tarihi).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(belge.dosya_url)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="İndir"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-gray-500">
                  Henüz belge yüklenmemiş
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Belge Yükleme Modalı */}
      {belgeYuklemeModal && selectedIsletme && (
        <Modal
          isOpen={belgeYuklemeModal}
          onClose={() => setBelgeYuklemeModal(false)}
          title="Yeni Belge Yükle"
        >
          <form onSubmit={handleBelgeSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input
                type="text"
                value={belgeAciklama}
                onChange={(e) => setBelgeAciklama(e.target.value)}
                placeholder="Belge açıklaması"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Belge Dosyası</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="belge-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Dosya yükle</span>
                      <input id="belge-upload" name="belge-upload" type="file" className="sr-only" onChange={(e) => setBelgeFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,.xls,.xlsx" required />
                    </label>
                    <p className="pl-1">veya sürükleyip bırakın</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX</p>
                </div>
              </div>
              {belgeFile && <p className="text-sm text-gray-500 mt-2">Seçilen dosya: {belgeFile.name}</p>}
            </div>
            <button
              type="submit"
              disabled={belgeYuklemeLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {belgeYuklemeLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Belgeyi Yükle'}
            </button>
          </form>
        </Modal>
      )}

      {confirmDeleteModal && (
        <ConfirmModal
          isOpen={confirmDeleteModal}
          onClose={() => setConfirmDeleteModal(false)}
          onConfirm={handleDeleteDekont}
          title="Dekontu Sil"
          description="Bu dekontu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        />
      )}
    </div>
  )
} 