'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, UserPlus, UserMinus, History, Users, Minus, ChevronDown, Eye } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import StudentAssignmentModal from '@/components/admin/StudentAssignmentModal'
import StudentHistoryView from '@/components/admin/StudentHistoryView'
import StudentChangeHistoryView from '@/components/admin/StudentChangeHistoryView'
import { toast } from 'react-hot-toast'

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanId: string
  company?: {
    id: string
    name: string
    contact: string
    teacher?: {
      id: string
      name: string
      surname: string
      alanId?: string
      alan?: {
        id: string
        name: string
      }
    } | null
  } | null
}

interface Sinif {
  id: string
  ad: string
}

interface Props {
  alanId: string
  siniflar: Sinif[]
  initialOgrenciler: Ogrenci[]
  initialTotalOgrenciler: number
  initialTotalPages: number
  initialCurrentPage: number
  onDataChange?: (tabName?: string) => void
}

export default function OgrencilerTab({
  alanId,
  siniflar,
  initialOgrenciler,
  initialTotalOgrenciler,
  initialTotalPages,
  initialCurrentPage,
  onDataChange
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(initialOgrenciler)
  const [totalOgrenciler, setTotalOgrenciler] = useState(initialTotalOgrenciler)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [currentPage, setCurrentPage] = useState(initialCurrentPage)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [topluOgrenciModalOpen, setTopluOgrenciModalOpen] = useState(false)
  const [editOgrenciModal, setEditOgrenciModal] = useState(false)
  const [deleteOgrenciModal, setDeleteOgrenciModal] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [terminationModalOpen, setTerminationModalOpen] = useState(false)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Edit modal tab state
  const [editModalActiveTab, setEditModalActiveTab] = useState<'edit' | 'history' | 'change-history'>('edit')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSinif, setSelectedSinif] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Deletion confirmation state
  const [confirmationText, setConfirmationText] = useState('')
  
  // Termination form state
  const [terminationData, setTerminationData] = useState({
    reason: '',
    notes: '',
    terminationDate: new Date().toISOString().split('T')[0]
  })
  
  // Form data - Kapsamlı 11 alanlı form
  const initialFormState = {
    // Kişisel Bilgiler
    ad: '',
    soyad: '',
    cinsiyet: '',
    dogumTarihi: '',
    tcKimlik: '',
    telefon: '',
    // Okul Bilgileri
    sinif: '',
    no: '',
    // Veli Bilgileri
    veliAdi: '',
    veliTelefon: '',
    email: ''
  }
  const [ogrenciFormData, setOgrenciFormData] = useState(initialFormState)
  const [editOgrenciFormData, setEditOgrenciFormData] = useState(initialFormState)
  
  // Bulk form data
  const [topluOgrenciler, setTopluOgrenciler] = useState([{ ad: '', soyad: '', no: '', sinif: '' }])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch filtered students
  const fetchOgrenciler = async (page: number = 1, search: string = '', sinifFilter: string = 'all', statusFilter: string = 'all') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        alanId,
        page: page.toString(),
        ...(search && { search }),
        ...(sinifFilter !== 'all' && { sinif: sinifFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const response = await fetch(`/api/admin/students?${params}`)
      if (!response.ok) throw new Error('Öğrenciler getirilemedi')
      
      const data = await response.json()
      setOgrenciler(data.students || [])
      setTotalOgrenciler(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
      setCurrentPage(page)
      
      // Update URL without refresh
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', page.toString())
      if (search) newParams.set('search', search)
      else newParams.delete('search')
      if (sinifFilter !== 'all') newParams.set('sinif', sinifFilter)
      else newParams.delete('sinif')
      if (statusFilter !== 'all') newParams.set('status', statusFilter)
      else newParams.delete('status')
      
      router.push(`?${newParams.toString()}`, { scroll: false })
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle search and filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || selectedSinif !== 'all' || selectedStatus !== 'all') {
        fetchOgrenciler(1, searchTerm, selectedSinif, selectedStatus)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedSinif, selectedStatus])

  // Add student
  const handleOgrenciEkle = async () => {
    if (!ogrenciFormData.ad.trim() || !ogrenciFormData.soyad.trim() || !ogrenciFormData.no.trim() || !ogrenciFormData.sinif) {
      toast.error('Ad, soyad, numara ve sınıf alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ogrenciFormData.ad.trim(),
          surname: ogrenciFormData.soyad.trim(),
          number: ogrenciFormData.no.trim(),
          className: ogrenciFormData.sinif,
          // gender: ogrenciFormData.cinsiyet || null, // Henüz schema'da yok
          // birthDate: ogrenciFormData.dogumTarihi || null,
          tcNo: ogrenciFormData.tcKimlik.trim() || null,
          phone: ogrenciFormData.telefon.trim() || null,
          parentName: ogrenciFormData.veliAdi.trim() || null,
          // parentSurname: ogrenciFormData.veliSoyadi.trim() || null, // Henüz schema'da yok
          parentPhone: ogrenciFormData.veliTelefon.trim() || null,
          email: ogrenciFormData.email.trim() || null,
          alanId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci eklenirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla eklendi!')
      setOgrenciModalOpen(false)
      setOgrenciFormData(initialFormState)
      fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Bulk student add functions
  const handleSatirEkle = () => {
    setTopluOgrenciler([...topluOgrenciler, { ad: '', soyad: '', no: '', sinif: '' }])
  }

  const handleSatirSil = (index: number) => {
    if (topluOgrenciler.length > 1) {
      const yeniListe = topluOgrenciler.filter((_, i) => i !== index)
      setTopluOgrenciler(yeniListe)
    }
  }

  const handleTopluFormDegisiklik = (index: number, field: string, value: string) => {
    const yeniListe = [...topluOgrenciler]
    yeniListe[index] = { ...yeniListe[index], [field]: value }
    setTopluOgrenciler(yeniListe)
  }

  const handleTopluOgrenciEkle = async () => {
    // Validation
    const hatalar = []
    for (let i = 0; i < topluOgrenciler.length; i++) {
      const ogrenci = topluOgrenciler[i]
      if (!ogrenci.ad.trim()) hatalar.push(`${i + 1}. satır: Ad gereklidir`)
      if (!ogrenci.soyad.trim()) hatalar.push(`${i + 1}. satır: Soyad gereklidir`)
      if (!ogrenci.no.trim()) hatalar.push(`${i + 1}. satır: Okul numarası gereklidir`)
      if (!ogrenci.sinif.trim()) hatalar.push(`${i + 1}. satır: Sınıf gereklidir`)
    }

    if (hatalar.length > 0) {
      toast.error(hatalar[0]) // Show first error
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: topluOgrenciler.map(ogrenci => ({
            name: ogrenci.ad.trim(),
            surname: ogrenci.soyad.trim(),
            number: ogrenci.no.trim(),
            className: ogrenci.sinif.trim()
          })),
          alanId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Öğrenciler eklenirken hata oluştu')
      }

      const result = await response.json()
      toast.success(result.message || 'Öğrenciler başarıyla eklendi!')
      setTopluOgrenciModalOpen(false)
      setTopluOgrenciler([{ ad: '', soyad: '', no: '', sinif: '' }])
      fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Edit student - fetch full data
  const handleOgrenciDuzenle = async (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setEditModalActiveTab('edit') // Initialize with edit tab
    setSubmitLoading(true)
    
    try {
      // API'den tam öğrenci verisini çek
      const response = await fetch(`/api/admin/students/${ogrenci.id}`)
      if (response.ok) {
        const studentData = await response.json()
        setEditOgrenciFormData({
          ad: studentData.name || ogrenci.ad,
          soyad: studentData.surname || ogrenci.soyad,
          no: studentData.number || ogrenci.no,
          sinif: studentData.className || ogrenci.sinif,
          cinsiyet: '', // studentData.gender || '', // Henüz schema'da yok
          dogumTarihi: '', // studentData.birthDate ? studentData.birthDate.split('T')[0] : '',
          tcKimlik: studentData.tcNo || '',
          telefon: studentData.phone || '',
          veliAdi: studentData.parentName || '',
          veliTelefon: studentData.parentPhone || '',
          email: studentData.email || ''
        })
      } else {
        // Fallback to basic data
        setEditOgrenciFormData({
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          no: ogrenci.no,
          sinif: ogrenci.sinif,
          cinsiyet: '',
          dogumTarihi: '',
          tcKimlik: '',
          telefon: '',
          veliAdi: '',
          veliTelefon: '',
          email: ''
        })
      }
    } catch (error) {
      console.error('Error fetching student details:', error)
      setEditOgrenciFormData({
        ad: ogrenci.ad,
        soyad: ogrenci.soyad,
        no: ogrenci.no,
        sinif: ogrenci.sinif,
        cinsiyet: '',
        dogumTarihi: '',
        tcKimlik: '',
        telefon: '',
        veliAdi: '',
        veliTelefon: '',
        email: ''
      })
    } finally {
      setSubmitLoading(false)
      setEditOgrenciModal(true)
    }
  }

  const handleOgrenciGuncelle = async () => {
    if (!selectedOgrenci || !editOgrenciFormData.ad.trim() || !editOgrenciFormData.soyad.trim() || !editOgrenciFormData.sinif) {
      toast.error('Ad, soyad ve sınıf alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students/${selectedOgrenci.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editOgrenciFormData.ad.trim(),
          surname: editOgrenciFormData.soyad.trim(),
          number: editOgrenciFormData.no.trim(),
          className: editOgrenciFormData.sinif,
          // gender: editOgrenciFormData.cinsiyet || null, // Henüz schema'da yok
          // birthDate: editOgrenciFormData.dogumTarihi || null,
          tcNo: editOgrenciFormData.tcKimlik.trim() || null,
          phone: editOgrenciFormData.telefon.trim() || null,
          parentName: editOgrenciFormData.veliAdi.trim() || null,
          // parentSurname: editOgrenciFormData.veliSoyadi.trim() || null, // Henüz schema'da yok
          parentPhone: editOgrenciFormData.veliTelefon.trim() || null,
          email: editOgrenciFormData.email.trim() || null
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci güncellenirken hata oluştu')
      }
      
      // Show success message
      toast.success('Öğrenci başarıyla güncellendi! Modal 2 saniye sonra kapanacak...')
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setEditOgrenciModal(false)
        setSelectedOgrenci(null)
        fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
      }, 2000)
      
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete student
  const handleOgrenciSil = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setConfirmationText('') // Reset confirmation text
    setDeleteOgrenciModal(true)
  }

  const handleOgrenciSilOnayla = async () => {
    if (!selectedOgrenci || confirmationText !== 'onay') return
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students?id=${selectedOgrenci.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci silinirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla silindi!')
      setDeleteOgrenciModal(false)
      setSelectedOgrenci(null)
      setConfirmationText('')
      fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Assignment functions
  const handleOgrenciAta = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setAssignmentModalOpen(true)
  }

  const handleAssignmentComplete = () => {
    fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
    // İşletmeler tabını da yenile (öğrenci atandığında işletme listesi değişir)
    if (onDataChange) {
      onDataChange('isletmeler')
    }
  }

  const handleOgrenciFesih = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setTerminationData({ reason: '', notes: '', terminationDate: new Date().toISOString().split('T')[0] })
    setTerminationModalOpen(true)
  }

  const handleFesihOnayla = async () => {
    if (!selectedOgrenci) return

    if (!terminationData.reason.trim()) {
      toast.error('Fesih nedeni zorunludur!')
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/students/${selectedOgrenci.id}/assign-company`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: terminationData.reason.trim(),
          notes: terminationData.notes.trim() || null,
          terminationDate: terminationData.terminationDate
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fesih işlemi başarısız')
      }

      toast.success('Staj başarıyla fesih edildi!')
      setTerminationModalOpen(false)
      setSelectedOgrenci(null)
      setTerminationData({ reason: '', notes: '', terminationDate: new Date().toISOString().split('T')[0] })
      fetchOgrenciler(currentPage, searchTerm, selectedSinif, selectedStatus)
      // İşletmeler tabını da yenile (öğrenci çıkarıldığında işletme listesi değişir)
      if (onDataChange) {
        onDataChange('isletmeler')
      }
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // History functions
  const handleOgrenciGecmis = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setHistoryModalOpen(true)
  }

  // Pagination
  const handlePageChange = (page: number) => {
    fetchOgrenciler(page, searchTerm, selectedSinif, selectedStatus)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Öğrenciler ({totalOgrenciler})
        </h2>
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Öğrenci Ekle</span>
            <span className="sm:hidden">Ekle</span>
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
              <div className="py-2">
                <button
                  onClick={() => {
                    setOgrenciFormData(initialFormState)
                    setOgrenciModalOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-3 text-indigo-500" />
                  <div className="text-left">
                    <div className="font-medium">Yeni Öğrenci Ekle</div>
                    <div className="text-xs text-gray-500">Tek öğrenci kayıt formu</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setTopluOgrenciler([{ ad: '', soyad: '', no: '', sinif: '' }])
                    setTopluOgrenciModalOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                >
                  <Users className="h-4 w-4 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">Toplu Öğrenci Ekle</div>
                    <div className="text-xs text-gray-500">Birden fazla öğrenci ekle</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Öğrenci ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedSinif}
              onChange={(e) => setSelectedSinif(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
              <option value="all">Tüm Sınıflar</option>
              {siniflar.map((sinif) => (
                <option key={sinif.id} value={sinif.ad}>
                  {sinif.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif Stajda</option>
              <option value="unassigned">Atanmamış</option>
              <option value="terminated">Fesih Edilmiş</option>
              <option value="completed">Tamamlanmış</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      ) : ogrenciler.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Öğrenci
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşletme
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Koordinatör Öğretmen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ogrenciler.map((ogrenci) => (
                    <tr key={ogrenci.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {ogrenci.ad} {ogrenci.soyad}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ogrenci.sinif} - No: {ogrenci.no || 'Belirtilmemiş'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ogrenci.company ? (
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">{ogrenci.company.name}</div>
                            <div className="text-gray-500">{ogrenci.company.contact}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ogrenci.company?.teacher ? (
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {ogrenci.company.teacher.name} {ogrenci.company.teacher.surname}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {ogrenci.company.teacher.alan?.name || 'Alan Belirtilmemiş'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {ogrenci.company ? (
                            <button
                              onClick={() => handleOgrenciFesih(ogrenci)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Stajı Fesih Et"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOgrenciAta(ogrenci)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="İşletmeye Ata"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOgrenciDuzenle(ogrenci)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Öğrenci Detayları"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {ogrenciler.map((ogrenci) => (
              <div key={ogrenci.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {/* Student Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {ogrenci.ad} {ogrenci.soyad}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ogrenci.sinif} - No: {ogrenci.no || 'Belirtilmemiş'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOgrenciDuzenle(ogrenci)}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Öğrenci Detayları"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Company Info */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">İşletme</div>
                  {ogrenci.company ? (
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">{ogrenci.company.name}</div>
                      <div className="text-gray-500 text-xs">{ogrenci.company.contact}</div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      -
                    </span>
                  )}
                </div>

                {/* Teacher Info */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-1">Koordinatör Öğretmen</div>
                  {ogrenci.company?.teacher ? (
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        {ogrenci.company.teacher.name} {ogrenci.company.teacher.surname}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {ogrenci.company.teacher.alan?.name || 'Alan Belirtilmemiş'}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      -
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  {ogrenci.company ? (
                    <button
                      onClick={() => handleOgrenciFesih(ogrenci)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Stajı Fesih Et
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOgrenciAta(ogrenci)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      İşletmeye Ata
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
              <div className="px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Önceki
                    </button>
                    <span className="text-sm text-gray-700 flex items-center">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sonraki
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{((currentPage - 1) * 10) + 1}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(currentPage * 10, totalOgrenciler)}</span>
                        {' / '}
                        <span className="font-medium">{totalOgrenciler}</span>
                        {' sonuç'}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Öğrenci bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedSinif !== 'all' || selectedStatus !== 'all'
              ? 'Arama kriterlerinize uygun öğrenci bulunamadı.'
              : 'Bu alan için henüz öğrenci eklenmemiş.'
            }
          </p>
        </div>
      )}

      {/* Add Student Modal - Kapsamlı 12 Alanlı Form */}
      <Modal isOpen={ogrenciModalOpen} onClose={() => setOgrenciModalOpen(false)} title="🎓 Yeni Öğrenci Ekle">
        <div className="space-y-6">
          {/* Kişisel Bilgiler Bölümü */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              👤 Kişisel Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ogrenciFormData.ad}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, ad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Öğrenci adı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ogrenciFormData.soyad}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, soyad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Öğrenci soyadı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cinsiyet</label>
                <select
                  value={ogrenciFormData.cinsiyet}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, cinsiyet: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="Erkek">Erkek</option>
                  <option value="Kız">Kız</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                <input
                  type="date"
                  value={ogrenciFormData.dogumTarihi}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, dogumTarihi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
                <input
                  type="text"
                  value={ogrenciFormData.tcKimlik}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, tcKimlik: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="11 haneli TC kimlik numarası"
                  maxLength={11}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={ogrenciFormData.telefon}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, telefon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>
          </div>

          {/* Okul Bilgileri Bölümü */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              🏫 Okul Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sınıf <span className="text-red-500">*</span>
                </label>
                <select
                  value={ogrenciFormData.sinif}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, sinif: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Sınıf Seçin</option>
                  {siniflar.map((sinif) => (
                    <option key={sinif.id} value={sinif.ad}>
                      {sinif.ad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Okul Numarası <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ogrenciFormData.no}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Örn: 1234"
                />
              </div>
            </div>
          </div>

          {/* Veli Bilgileri Bölümü */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
              👨‍👩‍👧‍👦 Veli Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veli Adı</label>
                <input
                  type="text"
                  value={ogrenciFormData.veliAdi}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, veliAdi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Veli adı soyadı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veli Telefon</label>
                <input
                  type="tel"
                  value={ogrenciFormData.veliTelefon}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, veliTelefon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={ogrenciFormData.email}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setOgrenciModalOpen(false)}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              ✖️ İptal
            </button>
            <button
              onClick={handleOgrenciEkle}
              disabled={submitLoading}
              className="px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
            >
              {submitLoading ? '⏳ Ekleniyor...' : '✅ Öğrenci Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal - Tabbed Interface */}
      {editOgrenciModal && selectedOgrenci && (
        <Modal
          isOpen={editOgrenciModal}
          onClose={() => {
            setEditOgrenciModal(false)
            setEditModalActiveTab('edit')
          }}
          title={`🎓 ${selectedOgrenci.ad} ${selectedOgrenci.soyad}`}
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setEditModalActiveTab('edit')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    editModalActiveTab === 'edit'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Edit className="h-4 w-4 inline-block mr-2" />
                  Bilgileri Düzenle
                </button>
                <button
                  onClick={() => setEditModalActiveTab('history')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    editModalActiveTab === 'history'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <History className="h-4 w-4 inline-block mr-2" />
                  Staj Geçmişi
                </button>
                <button
                  onClick={() => setEditModalActiveTab('change-history')}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    editModalActiveTab === 'change-history'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Edit className="h-4 w-4 inline-block mr-2" />
                  İşlem Geçmişi
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {editModalActiveTab === 'edit' ? (
              <>
                {/* Kişisel Bilgiler Bölümü */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    👤 Kişisel Bilgiler
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editOgrenciFormData.ad}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, ad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Öğrenci adı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Soyad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editOgrenciFormData.soyad}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, soyad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Öğrenci soyadı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cinsiyet</label>
                      <select
                        value={editOgrenciFormData.cinsiyet}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, cinsiyet: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seçiniz</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kız">Kız</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                      <input
                        type="date"
                        value={editOgrenciFormData.dogumTarihi}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, dogumTarihi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
                      <input
                        type="text"
                        value={editOgrenciFormData.tcKimlik}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, tcKimlik: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="11 haneli TC kimlik numarası"
                        maxLength={11}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={editOgrenciFormData.telefon}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, telefon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                  </div>
                </div>

                {/* Okul Bilgileri Bölümü */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    🏫 Okul Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sınıf <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editOgrenciFormData.sinif}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, sinif: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Sınıf Seçin</option>
                        {siniflar.map((sinif) => (
                          <option key={sinif.id} value={sinif.ad}>
                            {sinif.ad}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Okul Numarası <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editOgrenciFormData.no}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, no: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Örn: 1234"
                      />
                    </div>
                  </div>
                </div>

                {/* Veli Bilgileri Bölümü */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                    👨‍👩‍👧‍👦 Veli Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Veli Adı</label>
                      <input
                        type="text"
                        value={editOgrenciFormData.veliAdi}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, veliAdi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Veli adı soyadı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Veli Telefon</label>
                      <input
                        type="tel"
                        value={editOgrenciFormData.veliTelefon}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, veliTelefon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                      <input
                        type="email"
                        value={editOgrenciFormData.email}
                        onChange={(e) => setEditOgrenciFormData({ ...editOgrenciFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="ornek@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button
                    onClick={() => handleOgrenciSil(selectedOgrenci!)}
                    className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    🗑️ Öğrenciyi Sil
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setEditOgrenciModal(false)
                        setEditModalActiveTab('edit')
                      }}
                      className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      ✖️ İptal
                    </button>
                    <button
                      onClick={handleOgrenciGuncelle}
                      disabled={submitLoading}
                      className="px-6 py-3 text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
                    >
                      {submitLoading ? '⏳ Güncelleniyor...' : '✅ Öğrenci Güncelle'}
                    </button>
                  </div>
                </div>
              </>
            ) : editModalActiveTab === 'history' ? (
              /* Staj History Tab Content */
              <div className="min-h-[500px]">
                <StudentHistoryView
                  isOpen={true}
                  onClose={() => {}} // Empty since it's embedded in modal
                  student={{
                    id: selectedOgrenci.id,
                    name: selectedOgrenci.ad,
                    surname: selectedOgrenci.soyad,
                    className: selectedOgrenci.sinif,
                    number: selectedOgrenci.no
                  }}
                  embedded={true} // Add embedded prop to remove modal wrapper
                />
              </div>
            ) : (
              /* Change History Tab Content */
              <div className="min-h-[500px]">
                <StudentChangeHistoryView
                  studentId={selectedOgrenci.id}
                  embedded={true}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteOgrenciModal} onClose={() => {
        setDeleteOgrenciModal(false)
        setConfirmationText('')
      }} title="⚠️ ÖNEMLİ: Öğrenci Kaydını Sil">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="text-red-600">⚠️</div>
                <div className="text-red-800 font-semibold">VERİ KAYBI UYARISI</div>
              </div>
            </div>
            <div className="text-gray-700">
              <strong>"{selectedOgrenci?.ad} {selectedOgrenci?.soyad}"</strong> adlı öğrenciyi kalıcı olarak silmek üzeresiniz.
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-yellow-800 text-sm">
                <div className="font-semibold mb-2">Bu işlem geri alınamaz ve aşağıdaki veriler kaybolacak:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Öğrenci kişisel bilgileri</li>
                  <li>Staj kayıtları</li>
                  <li>Dekont geçmişi</li>
                  <li>İlişkili tüm belgeler</li>
                </ul>
              </div>
            </div>
            <div className="text-red-600 font-semibold mb-4">
              Bu işlemi onaylamak için devam etmek istediğinizden emin misiniz?
            </div>
            
            {/* Confirmation Input */}
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Silme işlemini onaylamak için aşağıdaki kutuya "<span className="font-bold text-red-600">onay</span>" yazın:
              </div>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="onay yazın..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoComplete="off"
              />
              {confirmationText && confirmationText !== 'onay' && (
                <div className="text-red-500 text-xs mt-1">
                  Lütfen tam olarak "onay" yazın
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setDeleteOgrenciModal(false)
                setConfirmationText('')
              }}
              disabled={submitLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleOgrenciSilOnayla}
              disabled={submitLoading || confirmationText !== 'onay'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Siliniyor...</span>
                </div>
              ) : (
                'EVET, SİL'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Student Assignment Modal */}
      <StudentAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        student={selectedOgrenci}
        alanId={alanId}
        onAssignmentComplete={handleAssignmentComplete}
      />

      {/* Bulk Student Add Modal */}
      <Modal isOpen={topluOgrenciModalOpen} onClose={() => setTopluOgrenciModalOpen(false)} title="Toplu Öğrenci Ekle">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-sm">
              <div className="font-medium">💡 Nasıl Kullanılır:</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Her satıra bir öğrenci bilgilerini girin</li>
                <li>Yeni satır eklemek için "+" butonunu kullanın</li>
                <li>Satırı silmek için "-" butonunu kullanın</li>
                <li>Tüm alanlar zorunludur</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topluOgrenciler.map((ogrenci, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Öğrenci {index + 1}</span>
                  <button
                    onClick={() => handleSatirSil(index)}
                    disabled={topluOgrenciler.length === 1}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Bu satırı sil"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ad *</label>
                    <input
                      type="text"
                      value={ogrenci.ad}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'ad', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Öğrenci adı"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Soyad *</label>
                    <input
                      type="text"
                      value={ogrenci.soyad}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'soyad', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Öğrenci soyadı"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Okul No *</label>
                    <input
                      type="text"
                      value={ogrenci.no}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'no', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Örn: 1234"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sınıf *</label>
                    <select
                      value={ogrenci.sinif}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'sinif', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Seçin</option>
                      {siniflar.map((sinif) => (
                        <option key={sinif.id} value={sinif.ad}>
                          {sinif.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSatirEkle}
              className="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Yeni Satır Ekle
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setTopluOgrenciModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleTopluOgrenciEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : `${topluOgrenciler.length} Öğrenciyi Ekle`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Termination Modal */}
      <Modal isOpen={terminationModalOpen} onClose={() => {
        setTerminationModalOpen(false)
        setSelectedOgrenci(null)
        setTerminationData({ reason: '', notes: '', terminationDate: new Date().toISOString().split('T')[0] })
      }} title="⚠️ Stajı Fesih Et">
        <div className="space-y-4">
          {selectedOgrenci && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-800 text-sm">
                <div className="font-medium">🎓 Öğrenci: {selectedOgrenci.ad} {selectedOgrenci.soyad}</div>
                <div className="mt-1">🏢 İşletme: {selectedOgrenci.company?.name}</div>
                {selectedOgrenci.company?.teacher && (
                  <div className="mt-1">👨‍🏫 Koordinatör: {selectedOgrenci.company.teacher.name} {selectedOgrenci.company.teacher.surname}</div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fesih Nedeni <span className="text-red-500">*</span>
            </label>
            <select
              value={terminationData.reason}
              onChange={(e) => setTerminationData({ ...terminationData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Fesih nedeni seçin</option>
              <option value="İşletme isteği">İşletme isteği</option>
              <option value="Disiplin sorunu">Disiplin sorunu</option>
              <option value="Devamsızlık">Devamsızlık</option>
              <option value="Sağlık sorunu">Sağlık sorunu</option>
              <option value="Akademik yetersizlik">Akademik yetersizlik</option>
              <option value="İş güvenliği sorunu">İş güvenliği sorunu</option>
              <option value="İşletme koşullarının uygun olmaması">İşletme koşullarının uygun olmaması</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fesih Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={terminationData.terminationDate}
              onChange={(e) => setTerminationData({ ...terminationData, terminationDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama/Notlar (Opsiyonel)
            </label>
            <textarea
              value={terminationData.notes}
              onChange={(e) => setTerminationData({ ...terminationData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Fesih ile ilgili detayları buraya yazabilirsiniz..."
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-yellow-800 text-sm">
              <div className="font-medium mb-1">⚠️ DİKKAT:</div>
              <div>Bu işlem staj geçmişine kaydedilecek ve geri alınamaz.</div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setTerminationModalOpen(false)
                setSelectedOgrenci(null)
                setTerminationData({ reason: '', notes: '', terminationDate: new Date().toISOString().split('T')[0] })
              }}
              disabled={submitLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleFesihOnayla}
              disabled={submitLoading || !terminationData.reason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Fesih Ediliyor...</span>
                </div>
              ) : (
                'Stajı Fesih Et'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Student History Modal */}
      <StudentHistoryView
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        student={selectedOgrenci ? {
          id: selectedOgrenci.id,
          name: selectedOgrenci.ad,
          surname: selectedOgrenci.soyad,
          className: selectedOgrenci.sinif,
          number: selectedOgrenci.no
        } : null}
      />
    </div>
  )
}