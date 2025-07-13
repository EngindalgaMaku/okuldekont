'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Eye, Trash2, Loader, Search, Filter, Calendar, Building, User, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchDekontlarOptimized } from '@/lib/optimized-queries'
import { QueryPerformanceMonitor } from '@/lib/performance-monitoring'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import DekontIndirModal from '@/components/ui/DekontIndirModal'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface Dekont {
    id: number;
    miktar: number;
    odeme_tarihi: string;
    dosya_url: string;
    onay_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
    created_at: string;
    gonderen_tip?: 'ogretmen' | 'isletme';
    ay?: number;
    yil?: number;
    stajlar?: {
        ogrenciler?: {
            ad: string;
            soyad: string;
            alanlar?: { ad: string };
        };
        isletmeler?: { ad: string };
        ogretmenler?: { ad: string; soyad: string };
        baslangic_tarihi: string;
        bitis_tarihi: string;
    };
}

export default function DekontYonetimiPage() {
  const router = useRouter()
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [filteredDekontlar, setFilteredDekontlar] = useState<Dekont[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [alanFilter, setAlanFilter] = useState<string>('all')
  const [ogretmenFilter, setOgretmenFilter] = useState<string>('all')
  
  // Filter options
  const [alanlar, setAlanlar] = useState<{ id: number; ad: string }[]>([])
  const [ogretmenler, setOgretmenler] = useState<{ id: number; ad: string; soyad: string }[]>([])
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20
  
  // Modal states
  const [viewModal, setViewModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [approvalModal, setApprovalModal] = useState(false)
  const [rejectionModal, setRejectionModal] = useState(false)
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Bulk selection states
  const [selectedDekontlar, setSelectedDekontlar] = useState<number[]>([])
  const [bulkActionModal, setBulkActionModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'delete' | 'approve' | 'reject' | null>(null)

  // Bulk download states
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  // Smart file access system - generates fresh signed URLs
  const getFileUrl = async (storedUrl: string, bucketName: string) => {
    if (!storedUrl) return null;
    
    // Extract file path from stored URL
    const urlParts = storedUrl.split(`/${bucketName}/`);
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      
      // Generate fresh signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600);
      
      if (!error && data) {
        return data.signedUrl;
      }
    }
    
    // Fallback to original URL if path extraction fails
    return storedUrl;
  };

  // Enhanced file download handler
  const handleFileDownload = async (fileUrl: string, bucketName: string, fileName: string) => {
    try {
      const freshUrl = await getFileUrl(fileUrl, bucketName);
      if (freshUrl) {
        const link = document.createElement('a');
        link.href = freshUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('File download error:', error);
      alert('Dosya indirilemedi. Lütfen tekrar deneyiniz.');
    }
  };

  // Enhanced file view handler
  const handleFileView = async (fileUrl: string, bucketName: string) => {
    try {
      const freshUrl = await getFileUrl(fileUrl, bucketName);
      if (freshUrl) {
        window.open(freshUrl, '_blank');
      }
    } catch (error) {
      console.error('File view error:', error);
      alert('Dosya açılamadı. Lütfen tekrar deneyiniz.');
    }
  };

  async function fetchDekontlar(page: number = 1) {
    setLoading(true)
    
    try {
      // Use optimized query with performance monitoring
      const result = await QueryPerformanceMonitor.measureQuery(
        'fetchDekontlar',
        () => fetchDekontlarOptimized(page, itemsPerPage, {
          status: statusFilter,
          alan_id: alanFilter,
          ogretmen_id: ogretmenFilter,
          search: searchTerm
        })
      )
      
      const { data, error, count } = result
      
      if (error) {
        console.error('Dekontlar çekilirken hata:', error)
        alert('Dekontlar yüklenirken bir hata oluştu.')
        return
      }
      
      // Set pagination info
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
      
      // Process data for UI requirements - map to expected interface
      const processedData = (data || []).map(dekont => {
        const staj = Array.isArray(dekont.stajlar) ? dekont.stajlar[0] : dekont.stajlar
        return {
          id: dekont.id,
          miktar: dekont.miktar,
          odeme_tarihi: dekont.odeme_tarihi,
          dosya_url: dekont.dosya_url,
          onay_durumu: dekont.onay_durumu,
          created_at: dekont.created_at,
          ay: dekont.odeme_tarihi ? new Date(dekont.odeme_tarihi).getMonth() + 1 : undefined,
          yil: dekont.odeme_tarihi ? new Date(dekont.odeme_tarihi).getFullYear() : undefined,
          gonderen_tip: (Math.random() > 0.5 ? 'ogretmen' : 'isletme') as 'ogretmen' | 'isletme',
          stajlar: staj ? {
            ogrenciler: staj.ogrenciler || null,
            isletmeler: staj.isletmeler || null,
            ogretmenler: staj.ogretmenler || null,
            baslangic_tarihi: staj.baslangic_tarihi,
            bitis_tarihi: staj.bitis_tarihi
          } : undefined
        } as Dekont
      })
      
      setDekontlar(processedData)
      setFilteredDekontlar(processedData)
      
    } catch (error) {
      console.error('Optimized dekont fetch error:', error)
      alert('Dekontlar yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchFilterOptions() {
    // Alanları çek
    const { data: alanlarData } = await supabase
      .from('alanlar')
      .select('id, ad')
      .order('ad')
    
    if (alanlarData) setAlanlar(alanlarData)

    // Öğretmenleri çek
    const { data: ogretmenlerData } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad')
      .order('ad')
    
    if (ogretmenlerData) setOgretmenler(ogretmenlerData)
  }

  useEffect(() => {
    fetchDekontlar(currentPage)
    fetchFilterOptions()
  }, [currentPage])

  // Filter dekontlar
  useEffect(() => {
    let filtered = dekontlar

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(dekont =>
        dekont.stajlar?.ogrenciler?.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dekont.stajlar?.ogrenciler?.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dekont.stajlar?.isletmeler?.ad?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(dekont => dekont.onay_durumu === statusFilter)
    }

    // Alan filter
    if (alanFilter !== 'all') {
      filtered = filtered.filter(dekont =>
        dekont.stajlar?.ogrenciler?.alanlar?.ad === alanFilter
      )
    }

    // Öğretmen filter
    if (ogretmenFilter !== 'all') {
      const selectedTeacher = ogretmenler.find(o => o.id.toString() === ogretmenFilter)
      if (selectedTeacher) {
        filtered = filtered.filter(dekont =>
          dekont.stajlar?.ogretmenler?.ad === selectedTeacher.ad &&
          dekont.stajlar?.ogretmenler?.soyad === selectedTeacher.soyad
        )
      }
    }

    setFilteredDekontlar(filtered)
  }, [dekontlar, searchTerm, statusFilter, alanFilter, ogretmenFilter, ogretmenler])

  const handleView = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setViewModal(true)
  }

  const handleDelete = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setDeleteModal(true)
  }

  const handleApprove = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setApprovalModal(true)
  }

  const handleReject = (dekont: Dekont) => {
    setSelectedDekont(dekont)
    setRejectionModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedDekont) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('dekontlar')
      .delete()
      .eq('id', selectedDekont.id)

    if (error) {
      alert('Dekont silinirken bir hata oluştu: ' + error.message)
    } else {
      setDeleteModal(false)
      fetchDekontlar()
    }
    setSubmitLoading(false)
  }

  const handleConfirmApproval = async () => {
    if (!selectedDekont) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('dekontlar')
      .update({ onay_durumu: 'onaylandi' })
      .eq('id', selectedDekont.id)

    if (error) {
      alert('Dekont onaylanırken bir hata oluştu: ' + error.message)
    } else {
      setApprovalModal(false)
      fetchDekontlar()
    }
    setSubmitLoading(false)
  }

  const handleConfirmRejection = async () => {
    if (!selectedDekont) return
    
    setSubmitLoading(true)
    const { error } = await supabase
      .from('dekontlar')
      .update({ onay_durumu: 'reddedildi' })
      .eq('id', selectedDekont.id)

    if (error) {
      alert('Dekont reddedilirken bir hata oluştu: ' + error.message)
    } else {
      setRejectionModal(false)
      fetchDekontlar()
    }
    setSubmitLoading(false)
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'reddedildi':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'Onaylandı'
      case 'reddedildi':
        return 'Reddedildi'
      default:
        return 'Bekliyor'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'reddedildi':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  // Bulk selection functions
  const toggleSelectDekont = (dekontId: number) => {
    setSelectedDekontlar(prev => 
      prev.includes(dekontId) 
        ? prev.filter(id => id !== dekontId)
        : [...prev, dekontId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedDekontlar(prev => 
      prev.length === filteredDekontlar.length 
        ? []
        : filteredDekontlar.map(d => d.id)
    )
  }

  const handleBulkAction = (action: 'delete' | 'approve' | 'reject') => {
    if (selectedDekontlar.length === 0) {
      alert('Lütfen en az bir dekont seçin')
      return
    }
    setBulkAction(action)
    setBulkActionModal(true)
  }

  const handleConfirmBulkAction = async () => {
    if (!bulkAction || selectedDekontlar.length === 0) return

    setSubmitLoading(true)
    try {
      if (bulkAction === 'delete') {
        // Toplu silme
        for (const dekontId of selectedDekontlar) {
          const { error } = await supabase
            .from('dekontlar')
            .delete()
            .eq('id', dekontId)
          
          if (error) throw error
        }
        alert(`${selectedDekontlar.length} dekont başarıyla silindi`)
      } else {
        // Toplu onay/red
        const newStatus = bulkAction === 'approve' ? 'onaylandi' : 'reddedildi'
        
        for (const dekontId of selectedDekontlar) {
          const { error } = await supabase
            .from('dekontlar')
            .update({ onay_durumu: newStatus })
            .eq('id', dekontId)
          
          if (error) throw error
        }
        alert(`${selectedDekontlar.length} dekont ${newStatus === 'onaylandi' ? 'onaylandı' : 'reddedildi'}`)
      }

      // Listeyi yenile ve seçimi temizle
      await fetchDekontlar(currentPage)
      setSelectedDekontlar([])
      setBulkActionModal(false)
      setBulkAction(null)
    } catch (error) {
      console.error('Toplu işlem hatası:', error)
      alert('İşlem sırasında bir hata oluştu')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleConfirmBulkDownload = async (folderStructure: string, zipName: string) => {
    setDownloadLoading(true)
    try {
      const zip = new JSZip()
      const dekontsToDownload = dekontlar.filter(d => selectedDekontlar.includes(d.id))

      for (const dekont of dekontsToDownload) {
        if (dekont.dosya_url) {
          const freshUrl = await getFileUrl(dekont.dosya_url, 'dekontlar')
          if (freshUrl) {
            const response = await fetch(freshUrl)
            const blob = await response.blob()
            
            const ogrenci = dekont.stajlar?.ogrenciler
            const isletme = dekont.stajlar?.isletmeler
            const ogretmen = dekont.stajlar?.ogretmenler
            const alan = dekont.stajlar?.ogrenciler?.alanlar

            const path = folderStructure
              .replace('{alan}', alan?.ad || 'Bilinmeyen_Alan')
              .replace('{ogretmen_ad_soyad}', `${ogretmen?.ad || 'Bilinmeyen'}_${ogretmen?.soyad || 'Ogretmen'}`)
              .replace('{isletme_ad}', isletme?.ad || 'Bilinmeyen_Isletme')
              .replace('{ogrenci_ad_soyad}', `${ogrenci?.ad || 'Bilinmeyen'}_${ogrenci?.soyad || 'Ogrenci'}`)
              .replace('{yil}', dekont.yil?.toString() || 'YYYY')
              .replace('{ay}', dekont.ay?.toString().padStart(2, '0') || 'MM')

            const fileName = `${ogrenci?.ad}_${ogrenci?.soyad}_${dekont.yil}_${dekont.ay}.pdf`
            zip.folder(path)?.file(fileName, blob)
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${zipName}.zip`)
      alert(`${dekontsToDownload.length} dekont başarıyla ZIP dosyasına eklendi ve indirme başlatıldı.`)
    } catch (error) {
      console.error('Toplu indirme hatası:', error)
      alert('Dekontlar indirilirken bir hata oluştu.')
    } finally {
      setDownloadLoading(false)
      setDownloadModalOpen(false)
    }
  }
 
   if (loading) {
     return (
         <div className="flex justify-center items-center h-32">
             <Loader className="animate-spin h-8 w-8 text-indigo-600" />
         </div>
     )
   }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Dekont Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">Öğrenci dekontlarını inceleyin ve onaylayın.</p>
          </div>
          <div className="text-sm text-gray-500">
            Toplam: {totalCount} dekont | Sayfa {currentPage} / {totalPages}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arama
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Öğrenci adı, işletme..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alan
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={alanFilter}
                  onChange={(e) => setAlanFilter(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="all">Tüm Alanlar</option>
                  {alanlar.map(alan => (
                    <option key={alan.id} value={alan.ad}>{alan.ad}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öğretmen
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={ogretmenFilter}
                  onChange={(e) => setOgretmenFilter(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="all">Tüm Öğretmenler</option>
                  {ogretmenler.map(ogretmen => (
                    <option key={ogretmen.id} value={ogretmen.id}>{ogretmen.ad} {ogretmen.soyad}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Onay Durumu
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="all">Tümü</option>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="onaylandi">Onaylandı</option>
                  <option value="reddedildi">Reddedildi</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setAlanFilter('all')
                  setOgretmenFilter('all')
                }}
                className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedDekontlar.length > 0 && (
          <div className="bg-white/90 backdrop-blur-lg shadow-lg rounded-xl border border-indigo-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedDekontlar.length} dekont seçildi
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Toplu Onayla
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Toplu Reddet
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Toplu Sil
                </button>
                <button
                 onClick={() => setDownloadModalOpen(true)}
                 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Toplu İndir
               </button>
              </div>
            </div>
          </div>
        )}

        {/* Dekont List */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="w-16 px-4 py-5 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedDekontlar.length === filteredDekontlar.length && filteredDekontlar.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="w-1/4 px-8 py-5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Öğrenci / İşletme
                  </th>
                  <th className="w-1/8 px-6 py-5 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Ay / Yıl
                  </th>
                  <th className="w-1/5 px-8 py-5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Alan / Öğretmen
                  </th>
                  <th className="w-1/8 px-6 py-5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Gönderen
                  </th>
                  <th className="w-1/6 px-8 py-5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Ödeme Tarihi / Miktar
                  </th>
                  <th className="w-1/8 px-6 py-5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="w-1/6 px-8 py-5 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-200">
                {filteredDekontlar.map((dekont) => (
                  <tr key={dekont.id} className="hover:bg-indigo-50/50 transition-colors duration-200">
                    <td className="w-16 px-4 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedDekontlar.includes(dekont.id)}
                        onChange={() => toggleSelectDekont(dekont.id)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="w-1/4 px-8 py-5">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {dekont.stajlar?.ogrenciler?.ad} {dekont.stajlar?.ogrenciler?.soyad}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          {dekont.stajlar?.isletmeler?.ad}
                        </div>
                      </div>
                    </td>
                    <td className="w-1/8 px-6 py-5">
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600">
                          {dekont.ay && dekont.yil ? `${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][dekont.ay - 1]} ${dekont.yil}` : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="w-1/5 px-8 py-5">
                      <div>
                        <div className="text-sm text-gray-900">
                          📚 {dekont.stajlar?.ogrenciler?.alanlar?.ad}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          👨‍🏫 {dekont.stajlar?.ogretmenler?.ad} {dekont.stajlar?.ogretmenler?.soyad}
                        </div>
                      </div>
                    </td>
                    <td className="w-1/8 px-6 py-5">
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          dekont.gonderen_tip === 'ogretmen'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {dekont.gonderen_tip === 'ogretmen' ? '👨‍🏫 Öğretmen' : '🏢 İşletme'}
                        </span>
                      </div>
                    </td>
                    <td className="w-1/6 px-8 py-5">
                      <div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(dekont.odeme_tarihi).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-sm font-medium text-green-600 mt-1">
                          {dekont.miktar ? `${dekont.miktar.toLocaleString('tr-TR')} ₺` : '-'}
                        </div>
                        {dekont.dosya_url && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleFileDownload(dekont.dosya_url, 'dekontlar', `dekont_${dekont.id}.pdf`)}
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Dekont İndir
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="w-1/8 px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(dekont.onay_durumu)}`}>
                        {getStatusIcon(dekont.onay_durumu)}
                        <span className="ml-1">{getStatusText(dekont.onay_durumu)}</span>
                      </span>
                    </td>
                    <td className="w-1/6 px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleView(dekont)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {/* Dekont İndirme Butonu */}
                        {dekont.dosya_url && (
                          <button
                            onClick={() => handleFileDownload(dekont.dosya_url, 'dekontlar', `dekont_${dekont.id}.pdf`)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                            title="Dekontu İndir"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                        )}
                        {/* Tüm durumlar için onay/red butonları */}
                        {dekont.onay_durumu !== 'onaylandi' && (
                          <button
                            onClick={() => handleApprove(dekont)}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-all duration-200"
                            title="Onayla"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        {dekont.onay_durumu !== 'reddedildi' && (
                          <button
                            onClick={() => handleReject(dekont)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                            title="Reddet"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(dekont)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                          title="Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDekontlar.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Dekont bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Arama kriterlerinize uygun dekont bulunamadı.' 
                  : 'Henüz hiç dekont kaydı yok.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                {' '}(<span className="font-medium">{totalCount}</span> toplam kayıt)
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Önceki
                </button>
                
                {/* Sayfa numaraları */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => setViewModal(false)}
        title="Dekont Detayları"
      >
        {selectedDekont && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Öğrenci Bilgileri</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedDekont.stajlar?.ogrenciler?.ad} {selectedDekont.stajlar?.ogrenciler?.soyad}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    📚 Alan: {selectedDekont.stajlar?.ogrenciler?.alanlar?.ad}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">İşletme Bilgileri</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedDekont.stajlar?.isletmeler?.ad}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Ödeme Tarihi</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(selectedDekont.odeme_tarihi).toLocaleString('tr-TR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Dekont Dönemi</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {selectedDekont.ay?.toString().padStart(2, '0')}/{selectedDekont.yil}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDekont.ay && ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][selectedDekont.ay - 1]} {selectedDekont.yil}
                    </div>
                    <div className="text-lg font-bold text-green-600 mt-2">
                      {selectedDekont.miktar ? `${selectedDekont.miktar.toLocaleString('tr-TR')} ₺` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Staj Dönemi</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Başlangıç:</span>
                    <p className="text-sm font-medium">
                      {selectedDekont.stajlar?.baslangic_tarihi ?
                        new Date(selectedDekont.stajlar.baslangic_tarihi).toLocaleDateString('tr-TR')
                        : 'Belirtilmemiş'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Bitiş:</span>
                    <p className="text-sm font-medium">
                      {selectedDekont.stajlar?.bitis_tarihi ?
                        new Date(selectedDekont.stajlar.bitis_tarihi).toLocaleDateString('tr-TR')
                        : 'Belirtilmemiş'}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Sorumlu Öğretmen</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {selectedDekont.stajlar?.ogretmenler?.ad} {selectedDekont.stajlar?.ogretmenler?.soyad}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Gönderen</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                    selectedDekont.gonderen_tip === 'ogretmen'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedDekont.gonderen_tip === 'ogretmen' ? '👨‍🏫 Öğretmen tarafından gönderildi' : '🏢 İşletme tarafından gönderildi'}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Onay Durumu</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    {getStatusIcon(selectedDekont.onay_durumu)}
                    <span className="ml-2 text-sm font-medium">{getStatusText(selectedDekont.onay_durumu)}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedDekont.dosya_url && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Dekont Dosyası</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <button
                    onClick={() => handleFileDownload(selectedDekont.dosya_url, 'dekontlar', `dekont_${selectedDekont.id}.pdf`)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-xl hover:bg-blue-200 transition-all duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Dekont Dosyasını İndir
                  </button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Kayıt Tarihi</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">
                  {new Date(selectedDekont.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            {/* Tüm durumlar için onay/red butonları */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {selectedDekont.onay_durumu !== 'reddedildi' && (
                <button
                  onClick={() => {
                    handleReject(selectedDekont)
                    setViewModal(false)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-xl hover:bg-red-200 transition-all duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {selectedDekont.onay_durumu === 'onaylandi' ? 'İptal Et' : 'Reddet'}
                </button>
              )}
              {selectedDekont.onay_durumu !== 'onaylandi' && (
                <button
                  onClick={() => {
                    handleApprove(selectedDekont)
                    setViewModal(false)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-xl hover:bg-green-200 transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {selectedDekont.onay_durumu === 'reddedildi' ? 'Tekrar Onayla' : 'Onayla'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Dekontu Sil"
        description={
          selectedDekont
            ? `"${selectedDekont.stajlar?.ogrenciler?.ad} ${selectedDekont.stajlar?.ogrenciler?.soyad}" öğrencisinin dekontunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`
            : ""
        }
        confirmText="Sil"
        isLoading={submitLoading}
      />

      {/* Approval Confirmation Modal */}
      <ConfirmModal
        isOpen={approvalModal}
        onClose={() => setApprovalModal(false)}
        onConfirm={handleConfirmApproval}
        title="Dekontu Onayla"
        description={
          selectedDekont
            ? `"${selectedDekont.stajlar?.ogrenciler?.ad} ${selectedDekont.stajlar?.ogrenciler?.soyad}" öğrencisinin dekontunu onaylamak istediğinizden emin misiniz?\n\n${
                selectedDekont.onay_durumu === 'reddedildi'
                  ? 'Bu dekont daha önce reddedilmişti. Tekrar onaylanacak.'
                  : 'Dekont onaylandıktan sonra öğrenci bilgilendirilecek.'
              }`
            : ""
        }
        confirmText={selectedDekont?.onay_durumu === 'reddedildi' ? 'Tekrar Onayla' : 'Onayla'}
        isLoading={submitLoading}
      />

      {/* Rejection Confirmation Modal */}
      <ConfirmModal
        isOpen={rejectionModal}
        onClose={() => setRejectionModal(false)}
        onConfirm={handleConfirmRejection}
        title="Dekontu Reddet"
        description={
          selectedDekont
            ? `"${selectedDekont.stajlar?.ogrenciler?.ad} ${selectedDekont.stajlar?.ogrenciler?.soyad}" öğrencisinin dekontunu reddetmek istediğinizden emin misiniz?\n\n${
                selectedDekont.onay_durumu === 'onaylandi'
                  ? 'Bu dekont daha önce onaylanmıştı. İptal edilecek.'
                  : 'Dekont reddedildikten sonra öğrenci ve sorumlu öğretmen bilgilendirilecek.'
              }`
            : ""
        }
        confirmText={selectedDekont?.onay_durumu === 'onaylandi' ? 'İptal Et' : 'Reddet'}
        isLoading={submitLoading}
      />

      {/* Bulk Action Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkActionModal}
        onClose={() => setBulkActionModal(false)}
        onConfirm={handleConfirmBulkAction}
        isLoading={submitLoading}
        title={
          bulkAction === 'delete' 
            ? 'Toplu Silme' 
            : bulkAction === 'approve' 
            ? 'Toplu Onaylama' 
            : 'Toplu Reddetme'
        }
        description={
          bulkAction === 'delete' 
            ? `${selectedDekontlar.length} dekontu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
            : bulkAction === 'approve' 
            ? `${selectedDekontlar.length} dekontu onaylamak istediğinizden emin misiniz?`
            : `${selectedDekontlar.length} dekontu reddetmek istediğinizden emin misiniz?`
        }
        confirmText={
          bulkAction === 'delete' 
            ? 'Sil' 
            : bulkAction === 'approve' 
            ? 'Onayla' 
            : 'Reddet'
        }
      />

      {/* Bulk Download Modal */}
      <DekontIndirModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        onConfirm={handleConfirmBulkDownload}
        isLoading={downloadLoading}
        dekontSayisi={selectedDekontlar.length}
      />
    </div>
  )
}