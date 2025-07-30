'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Plus, Edit, Search, Filter, ChevronLeft, ChevronRight, UserPlus, UserMinus, History, Users, Minus, ChevronDown, Eye } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import StudentAssignmentModal from '@/components/admin/StudentAssignmentModal'
import StudentHistoryView from '@/components/admin/StudentHistoryView'
import StudentHistoryModal from '@/components/admin/StudentHistoryModal'
import { toast } from 'react-hot-toast'

interface Ogrenci {
  id: string
  ad: string
  soyad: string
  no: string
  sinif: string
  alanId: string
  alan?: {
    id: string
    name: string
  }
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

interface Alan {
  id: string
  ad: string
  aciklama: string
  aktif: boolean
  ogretmen_sayisi: number
  ogrenci_sayisi: number
}

interface Sinif {
  id: string
  ad: string
  alan_id?: string
}

interface SearchParams {
  page?: string
  search?: string
  alanId?: string
  sinif?: string
  status?: string
  per_page?: string
}

interface OgrencilerServerProps {
  searchParams: SearchParams
}

export default function OgrencilerServer({ searchParams }: OgrencilerServerProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  
  // State management
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [alanlar, setAlanlar] = useState<Alan[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [totalOgrenciler, setTotalOgrenciler] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [ogrenciModalOpen, setOgrenciModalOpen] = useState(false)
  const [topluOgrenciModalOpen, setTopluOgrenciModalOpen] = useState(false)
  const [viewOgrenciModal, setViewOgrenciModal] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [studentHistoryModalOpen, setStudentHistoryModalOpen] = useState(false)
  const [terminationModalOpen, setTerminationModalOpen] = useState(false)
  const [selectedOgrenci, setSelectedOgrenci] = useState<Ogrenci | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlan, setSelectedAlan] = useState<string>('all')
  const [selectedSinif, setSelectedSinif] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name') // 'name' or 'number'
  
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
    email: '',
    // Alan
    alanId: ''
  }
  const [ogrenciFormData, setOgrenciFormData] = useState(initialFormState)
  const [editOgrenciFormData, setEditOgrenciFormData] = useState(initialFormState)
  
  // Bulk form data
  const [topluOgrenciler, setTopluOgrenciler] = useState([{
    ad: '',
    soyad: '',
    no: '',
    sinif: '',
    alanId: '',
    tcKimlik: '',
    telefon: '',
    veliAdi: '',
    veliTelefon: '',
    email: ''
  }])

  // CSV Upload states
  const [csvUploadModalOpen, setCsvUploadModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [csvLoading, setCsvLoading] = useState(false)

  // Get initial values from URL params
  const page = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  const alanId = searchParams.alanId || ''
  const sinif = searchParams.sinif || ''
  const status = searchParams.status || ''
  const perPage = parseInt(searchParams.per_page || '12')

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

  // Fetch initial data (alanlar and siniflar)
  const fetchInitialData = async () => {
    try {
      const [alanlarResponse, siniflarResponse] = await Promise.all([
        fetch('/api/admin/alanlar'),
        fetch('/api/admin/classes')
      ])

      if (alanlarResponse.ok) {
        const alanlarData = await alanlarResponse.json()
        if (Array.isArray(alanlarData)) {
          setAlanlar(alanlarData)
        } else if (alanlarData.success && alanlarData.data) {
          setAlanlar(alanlarData.data)
        } else {
          setAlanlar([])
        }
      }

      if (siniflarResponse.ok) {
        const siniflarData = await siniflarResponse.json()
        if (siniflarData.success && siniflarData.data) {
          setSiniflar(siniflarData.data)
        } else {
          setSiniflar([])
        }
      }
    } catch (error) {
      console.error('Initial data fetch error:', error)
      toast.error('Başlangıç verileri yüklenirken hata oluştu')
    }
  }

  // Fetch filtered students
  const fetchOgrenciler = async (page: number = 1, search: string = '', alanFilter: string = 'all', sinifFilter: string = 'all', statusFilter: string = 'all') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(search && { search }),
        ...(alanFilter !== 'all' && { alanId: alanFilter }),
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
      const newParams = new URLSearchParams(urlSearchParams)
      newParams.set('page', page.toString())
      if (search) newParams.set('search', search)
      else newParams.delete('search')
      if (alanFilter !== 'all') newParams.set('alanId', alanFilter)
      else newParams.delete('alanId')
      if (sinifFilter !== 'all') newParams.set('sinif', sinifFilter)
      else newParams.delete('sinif')
      if (statusFilter !== 'all') newParams.set('status', statusFilter)
      else newParams.delete('status')
      if (sortBy !== 'name') newParams.set('sort', sortBy)
      else newParams.delete('sort')
      
      router.push(`/admin/ogrenciler?${newParams.toString()}`, { scroll: false })
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Initialize filters from URL params
  useEffect(() => {
    setSearchTerm(search)
    setSelectedAlan(alanId)
    setSelectedSinif(sinif)
    setSelectedStatus(status)
    setCurrentPage(page)
    // Initialize sort from URL or default to 'name'
    const urlSort = urlSearchParams.get('sort') || 'name'
    setSortBy(urlSort)
  }, [search, alanId, sinif, status, page, urlSearchParams])

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData()
  }, [])

  // Fetch students when component mounts and when filters change
  useEffect(() => {
    fetchOgrenciler(page, search, alanId, sinif, status)
  }, [page, search, alanId, sinif, status, perPage])

  // Handle search and filters with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== search || selectedAlan !== alanId || selectedSinif !== sinif || selectedStatus !== status || sortBy !== (urlSearchParams.get('sort') || 'name')) {
        fetchOgrenciler(1, searchTerm, selectedAlan, selectedSinif, selectedStatus)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedAlan, selectedSinif, selectedStatus, sortBy])

  // Sort students
  const sortedOgrenciler = [...ogrenciler].sort((a, b) => {
    if (sortBy === 'number') {
      const numA = parseInt(a.no) || 0
      const numB = parseInt(b.no) || 0
      return numA - numB
    } else {
      // Sort by name (default)
      const nameA = `${a.ad} ${a.soyad}`.toLowerCase()
      const nameB = `${b.ad} ${b.soyad}`.toLowerCase()
      return nameA.localeCompare(nameB, 'tr')
    }
  })

  // Add student
  const handleOgrenciEkle = async () => {
    if (!ogrenciFormData.ad.trim() || !ogrenciFormData.soyad.trim() || !ogrenciFormData.no.trim() || !ogrenciFormData.sinif || !ogrenciFormData.alanId) {
      toast.error('Ad, soyad, numara, sınıf ve alan alanları zorunludur!')
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
          tcNo: ogrenciFormData.tcKimlik.trim() || null,
          phone: ogrenciFormData.telefon.trim() || null,
          parentName: ogrenciFormData.veliAdi.trim() || null,
          parentPhone: ogrenciFormData.veliTelefon.trim() || null,
          email: ogrenciFormData.email.trim() || null,
          alanId: ogrenciFormData.alanId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci eklenirken hata oluştu')
      }
      
      toast.success('Öğrenci başarıyla eklendi!')
      setOgrenciModalOpen(false)
      setOgrenciFormData(initialFormState)
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Bulk student add functions
  const handleSatirEkle = () => {
    setTopluOgrenciler([...topluOgrenciler, {
      ad: '',
      soyad: '',
      no: '',
      sinif: '',
      alanId: '',
      tcKimlik: '',
      telefon: '',
      veliAdi: '',
      veliTelefon: '',
      email: ''
    }])
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
      if (!ogrenci.alanId.trim()) hatalar.push(`${i + 1}. satır: Alan gereklidir`)
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
            className: ogrenci.sinif.trim(),
            alanId: ogrenci.alanId.trim(),
            tcNo: ogrenci.tcKimlik.trim() || null,
            phone: ogrenci.telefon.trim() || null,
            parentName: ogrenci.veliAdi.trim() || null,
            parentPhone: ogrenci.veliTelefon.trim() || null,
            email: ogrenci.email.trim() || null
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Öğrenciler eklenirken hata oluştu')
      }

      const result = await response.json()
      toast.success(result.message || 'Öğrenciler başarıyla eklendi!')
      setTopluOgrenciModalOpen(false)
      setTopluOgrenciler([{
        ad: '',
        soyad: '',
        no: '',
        sinif: '',
        alanId: '',
        tcKimlik: '',
        telefon: '',
        veliAdi: '',
        veliTelefon: '',
        email: ''
      }])
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // CSV Upload Functions
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      parseCSVFile(file)
    }
  }

  const parseCSVFile = async (file: File) => {
    setCsvLoading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('CSV dosyası en az 2 satır içermelidir (başlık + 1 veri)')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const rowData: any = { rowNumber: index + 2 }
        
        headers.forEach((header, i) => {
          rowData[header] = values[i] || ''
        })
        
        return rowData
      })

      setCsvPreview(data)
    } catch (error) {
      toast.error('CSV dosyası okunurken hata oluştu')
    } finally {
      setCsvLoading(false)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvPreview.length) {
      toast.error('Önce CSV dosyası yükleyin')
      return
    }

    setCsvLoading(true)
    try {
      const students = csvPreview.map(row => ({
        name: row['Ad'] || row['ad'] || row['NAME'] || '',
        surname: row['Soyad'] || row['soyad'] || row['SURNAME'] || '',
        number: row['No'] || row['no'] || row['Numara'] || row['NUMBER'] || '',
        className: row['Sınıf'] || row['sinif'] || row['CLASS'] || '',
        alanId: row['Alan ID'] || row['alan_id'] || row['alanId'] || '',
        tcNo: row['TC'] || row['tc'] || row['TC Kimlik'] || null,
        phone: row['Telefon'] || row['telefon'] || row['PHONE'] || null,
        parentName: row['Veli Adı'] || row['veli_adi'] || row['PARENT_NAME'] || null,
        parentPhone: row['Veli Telefon'] || row['veli_telefon'] || row['PARENT_PHONE'] || null,
        email: row['Email'] || row['email'] || row['EMAIL'] || null
      }))

      // Validation
      const hatalar: string[] = []
      students.forEach((student, index) => {
        if (!student.name.trim()) hatalar.push(`${index + 2}. satır: Ad gereklidir`)
        if (!student.surname.trim()) hatalar.push(`${index + 2}. satır: Soyad gereklidir`)
        if (!student.number.trim()) hatalar.push(`${index + 2}. satır: Numara gereklidir`)
        if (!student.className.trim()) hatalar.push(`${index + 2}. satır: Sınıf gereklidir`)
        if (!student.alanId.trim()) hatalar.push(`${index + 2}. satır: Alan ID gereklidir`)
      })

      if (hatalar.length > 0) {
        toast.error(`Validasyon hatası: ${hatalar[0]}`)
        return
      }

      const response = await fetch('/api/admin/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'CSV yükleme başarısız')
      }

      const result = await response.json()
      toast.success(`${students.length} öğrenci başarıyla eklendi!`)
      setCsvUploadModalOpen(false)
      setCsvFile(null)
      setCsvPreview([])
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setCsvLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Ad', 'Soyad', 'No', 'Sınıf', 'Alan ID', 'TC', 'Telefon', 'Veli Adı', 'Veli Telefon', 'Email'],
      ['Ahmet', 'Yılmaz', '1001', '12A', 'alan-id-1', '12345678901', '05551234567', 'Mehmet Yılmaz', '05559876543', 'ahmet@email.com'],
      ['Ayşe', 'Demir', '1002', '12B', 'alan-id-2', '12345678902', '05551234568', 'Fatma Demir', '05559876544', 'ayse@email.com']
    ]
    
    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'ogrenci_ornegi.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // View student - fetch full data
  const handleOgrenciGoruntule = async (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
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
          cinsiyet: '', // studentData.gender || '',
          dogumTarihi: '', // studentData.birthDate ? studentData.birthDate.split('T')[0] : '',
          tcKimlik: studentData.tcNo || '',
          telefon: studentData.phone || '',
          veliAdi: studentData.parentName || '',
          veliTelefon: studentData.parentPhone || '',
          email: studentData.email || '',
          alanId: studentData.alanId || ogrenci.alanId
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
          email: '',
          alanId: ogrenci.alanId
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
        email: '',
        alanId: ogrenci.alanId
      })
    } finally {
      setSubmitLoading(false)
      setViewOgrenciModal(true)
    }
  }

  const handleOgrenciGuncelle = async () => {
    if (!selectedOgrenci || !editOgrenciFormData.ad.trim() || !editOgrenciFormData.soyad.trim() || !editOgrenciFormData.sinif) {
      toast.error('Ad, soyad ve sınıf alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      // Get current student data for comparison
      const currentResponse = await fetch(`/api/admin/students/${selectedOgrenci.id}`)
      let currentData: any = {}
      
      if (currentResponse.ok) {
        currentData = await currentResponse.json()
      }

      // Prepare update data
      const updateData = {
        name: editOgrenciFormData.ad.trim(),
        surname: editOgrenciFormData.soyad.trim(),
        number: editOgrenciFormData.no.trim(),
        className: editOgrenciFormData.sinif,
        tcNo: editOgrenciFormData.tcKimlik.trim() || null,
        phone: editOgrenciFormData.telefon.trim() || null,
        parentName: editOgrenciFormData.veliAdi.trim() || null,
        parentPhone: editOgrenciFormData.veliTelefon.trim() || null,
        email: editOgrenciFormData.email.trim() || null
      }

      const response = await fetch(`/api/admin/students/${selectedOgrenci.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Öğrenci güncellenirken hata oluştu')
      }

      // Create history records for changed fields
      const fieldMappings = [
        { current: currentData.name, new: updateData.name, field: 'name', type: 'PERSONAL_INFO_UPDATE' },
        { current: currentData.surname, new: updateData.surname, field: 'surname', type: 'PERSONAL_INFO_UPDATE' },
        { current: currentData.number, new: updateData.number, field: 'number', type: 'SCHOOL_INFO_UPDATE' },
        { current: currentData.className, new: updateData.className, field: 'className', type: 'SCHOOL_INFO_UPDATE' },
        { current: currentData.tcNo, new: updateData.tcNo, field: 'tcNo', type: 'PERSONAL_INFO_UPDATE' },
        { current: currentData.phone, new: updateData.phone, field: 'phone', type: 'CONTACT_INFO_UPDATE' },
        { current: currentData.parentName, new: updateData.parentName, field: 'parentName', type: 'PARENT_INFO_UPDATE' },
        { current: currentData.parentPhone, new: updateData.parentPhone, field: 'parentPhone', type: 'PARENT_INFO_UPDATE' },
        { current: currentData.email, new: updateData.email, field: 'email', type: 'CONTACT_INFO_UPDATE' }
      ]

      // Create history records for each changed field
      for (const mapping of fieldMappings) {
        if (mapping.current !== mapping.new) {
          await createStudentHistoryRecord(
            selectedOgrenci.id,
            mapping.field,
            mapping.current,
            mapping.new,
            mapping.type
          )
        }
      }
      
      // Show success message and close modal
      toast.success('Öğrenci başarıyla güncellendi!')
      setViewOgrenciModal(false)
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
      
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete student from modal
  const handleModalOgrenciSil = () => {
    if (!selectedOgrenci) return
    setConfirmationText('')
    // We'll handle delete confirmation within the modal
  }

  const handleModalOgrenciSilOnayla = async () => {
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
      setViewOgrenciModal(false)
      setSelectedOgrenci(null)
      setConfirmationText('')
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
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
    fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
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
      fetchOgrenciler(currentPage, searchTerm, selectedAlan, selectedSinif, selectedStatus)
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

  // Personal history functions
  const handleOgrenciKisiselGecmis = (ogrenci: Ogrenci) => {
    setSelectedOgrenci(ogrenci)
    setStudentHistoryModalOpen(true)
  }

  // Create history record helper function
  const createStudentHistoryRecord = async (
    studentId: string,
    fieldName: string,
    previousValue: any,
    newValue: any,
    changeType: string = 'PERSONAL_INFO_UPDATE'
  ) => {
    try {
      await fetch('/api/admin/student-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          changeType,
          fieldName,
          previousValue,
          newValue,
          changedBy: 'admin-user-temp', // Temporary admin user ID
          reason: 'Öğrenci bilgileri güncellendi'
        })
      })
    } catch (error) {
      console.error('History record creation failed:', error)
    }
  }

  // Pagination
  const handlePageChange = (page: number) => {
    fetchOgrenciler(page, searchTerm, selectedAlan, selectedSinif, selectedStatus)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Öğrenciler
          </h1>
          <p className="text-gray-600 mt-1">
            Tüm alanlardan öğrencileri görüntüleyin ve yönetin ({totalOgrenciler})
          </p>
        </div>
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
                    setTopluOgrenciler([{
                      ad: '',
                      soyad: '',
                      no: '',
                      sinif: '',
                      alanId: '',
                      tcKimlik: '',
                      telefon: '',
                      veliAdi: '',
                      veliTelefon: '',
                      email: ''
                    }])
                    setTopluOgrenciModalOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                >
                  <Users className="h-4 w-4 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">Toplu Öğrenci Ekle</div>
                    <div className="text-xs text-gray-500">Manuel form ile birden fazla öğrenci</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setCsvFile(null)
                    setCsvPreview([])
                    setCsvUploadModalOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <svg className="h-4 w-4 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <div className="text-left">
                    <div className="font-medium">CSV/Excel Yükleme</div>
                    <div className="text-xs text-gray-500">Dosyadan toplu öğrenci yükleme</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          {/* Search */}
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
          
          {/* Filter row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Alan filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedAlan}
                onChange={(e) => setSelectedAlan(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
              >
                <option value="all">Tüm Alanlar</option>
                {Array.isArray(alanlar) && alanlar.map((alan) => (
                  <option key={alan.id} value={alan.id}>
                    {alan.ad}
                  </option>
                ))}
              </select>
            </div>

            {/* Sınıf filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedSinif}
                onChange={(e) => setSelectedSinif(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
              >
                <option value="all">Tüm Sınıflar</option>
                {Array.isArray(siniflar) && siniflar.map((sinif) => (
                  <option key={sinif.id} value={sinif.ad}>
                    {sinif.ad}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
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

            {/* Sort filter */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
              >
                <option value="name">Ada Göre (A-Z)</option>
                <option value="number">Numaraya Göre</option>
              </select>
            </div>
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
                      Alan
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
                  {sortedOgrenciler.map((ogrenci) => (
                    <tr key={ogrenci.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ogrenci.ad} {ogrenci.soyad}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ogrenci.sinif} - No: {ogrenci.no || 'Belirtilmemiş'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {ogrenci.alan?.name || 'Alan Belirtilmemiş'}
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
                          <button
                            onClick={() => handleOgrenciGecmis(ogrenci)}
                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Staj Geçmişini Görüntüle"
                          >
                            <History className="h-4 w-4" />
                          </button>
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
                            onClick={() => handleOgrenciGoruntule(ogrenci)}
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
            {sortedOgrenciler.map((ogrenci) => (
              <div key={ogrenci.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {/* Student Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {ogrenci.ad} {ogrenci.soyad}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ogrenci.sinif} - No: {ogrenci.no || 'Belirtilmemiş'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOgrenciGecmis(ogrenci)}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Staj Geçmişi"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOgrenciGoruntule(ogrenci)}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Detayları Görüntüle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Alan</div>
                    <div className="text-sm text-gray-900">{ogrenci.alan?.name || 'Alan Belirtilmemiş'}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-medium text-gray-500">İşletme</div>
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

                  {ogrenci.company?.teacher && (
                    <div>
                      <div className="text-xs font-medium text-gray-500">Koordinatör Öğretmen</div>
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          {ogrenci.company.teacher.name} {ogrenci.company.teacher.surname}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {ogrenci.company.teacher.alan?.name || 'Alan Belirtilmemiş'}
                        </div>
                      </div>
                    </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                        <span className="font-medium">{((currentPage - 1) * perPage) + 1}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(currentPage * perPage, totalOgrenciler)}</span>
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
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
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
            {searchTerm || selectedAlan !== 'all' || selectedSinif !== 'all' || selectedStatus !== 'all'
              ? 'Arama kriterlerinize uygun öğrenci bulunamadı.'
              : 'Sistemde henüz öğrenci kaydı bulunmuyor.'
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
                  Alan <span className="text-red-500">*</span>
                </label>
                <select
                  value={ogrenciFormData.alanId}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, alanId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Alan Seçin</option>
                  {Array.isArray(alanlar) && alanlar.map((alan) => (
                    <option key={alan.id} value={alan.id}>
                      {alan.ad}
                    </option>
                  ))}
                </select>
              </div>
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
                  {Array.isArray(siniflar) && siniflar.map((sinif) => (
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
                  placeholder="Veli adı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veli Soyadı</label>
                <input
                  type="text"
                  value={ogrenciFormData.veliAdi}
                  onChange={(e) => setOgrenciFormData({ ...ogrenciFormData, veliAdi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Veli soyadı"
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

      {/* View/Edit Student Modal - Kapsamlı 12 Alanlı Form */}
      {viewOgrenciModal && selectedOgrenci && (
        <Modal isOpen={viewOgrenciModal} onClose={() => {
          setViewOgrenciModal(false)
          setConfirmationText('')
        }} title="✏️ Öğrenci Düzenle">
          <div className="space-y-6">
            {/* Header with History Button */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedOgrenci.ad} {selectedOgrenci.soyad} - Bilgileri Düzenle
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedOgrenci.sinif} - No: {selectedOgrenci.no}
                </p>
              </div>
              <button
                onClick={() => handleOgrenciKisiselGecmis(selectedOgrenci)}
                className="inline-flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md"
                title="Kişisel Bilgi Geçmişini Görüntüle"
              >
                <History className="h-4 w-4 mr-2" />
                Kişisel Bilgi Geçmişi
              </button>
            </div>
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
                    {Array.isArray(siniflar) && siniflar.map((sinif) => (
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

            {confirmationText === '' && (
              <div className="flex justify-between space-x-3 pt-4 border-t">
                <button
                  onClick={() => setViewOgrenciModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  ✖️ Kapat
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleModalOgrenciSil}
                    className="px-6 py-3 text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors font-medium"
                  >
                    🗑️ Sil
                  </button>
                  <button
                    onClick={handleOgrenciGuncelle}
                    disabled={submitLoading}
                    className="px-6 py-3 text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
                  >
                    {submitLoading ? '⏳ Güncelleniyor...' : '✅ Güncelle'}
                  </button>
                </div>
              </div>
            )}

            {/* Delete Confirmation Section */}
            {confirmationText !== '' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 text-sm">
                    <div className="font-semibold mb-2">⚠️ VERİ KAYBI UYARISI</div>
                    <div className="mb-2">
                      <strong>"{selectedOgrenci?.ad} {selectedOgrenci?.soyad}"</strong> adlı öğrenciyi kalıcı olarak silmek üzeresiniz.
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="text-yellow-800 text-xs">
                        <div className="font-semibold mb-1">Bu işlem geri alınamaz ve aşağıdaki veriler kaybolacak:</div>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Öğrenci kişisel bilgileri</li>
                          <li>Staj kayıtları</li>
                          <li>Dekont geçmişi</li>
                          <li>İlişkili tüm belgeler</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Silme işlemini onaylamak için aşağıdaki kutuya "<span className="font-bold text-red-600">onay</span>" yazın:
                      </div>
                      <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="onay yazın..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                        autoComplete="off"
                      />
                      {confirmationText && confirmationText !== 'onay' && (
                        <div className="text-red-500 text-xs mt-1">
                          Lütfen tam olarak "onay" yazın
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirmationText('')}
                    disabled={submitLoading}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleModalOgrenciSilOnayla}
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
            )}
          </div>
        </Modal>
      )}


      {/* Student Assignment Modal */}
      <StudentAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        student={selectedOgrenci}
        alanId={selectedOgrenci?.alanId || ''}
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">TC Kimlik</label>
                    <input
                      type="text"
                      value={ogrenci.tcKimlik}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'tcKimlik', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="TC Kimlik No"
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={ogrenci.telefon}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'telefon', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="05XX XXX XX XX"
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
                      {Array.isArray(siniflar) && siniflar.map((sinif) => (
                        <option key={sinif.id} value={sinif.ad}>
                          {sinif.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Veli Adı</label>
                    <input
                      type="text"
                      value={ogrenci.veliAdi}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'veliAdi', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Veli adı"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Veli Telefon</label>
                    <input
                      type="tel"
                      value={ogrenci.veliTelefon}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'veliTelefon', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Alan *</label>
                    <select
                      value={ogrenci.alanId}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'alanId', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Alan Seçin</option>
                      {Array.isArray(alanlar) && alanlar.map((alan) => (
                        <option key={alan.id} value={alan.id}>
                          {alan.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-posta</label>
                    <input
                      type="email"
                      value={ogrenci.email}
                      onChange={(e) => handleTopluFormDegisiklik(index, 'email', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="ornek@email.com"
                    />
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

      {/* Student Personal History Modal */}
      <StudentHistoryModal
        isOpen={studentHistoryModalOpen}
        onClose={() => setStudentHistoryModalOpen(false)}
        student={selectedOgrenci ? {
          id: selectedOgrenci.id,
          name: selectedOgrenci.ad,
          surname: selectedOgrenci.soyad,
          className: selectedOgrenci.sinif,
          number: selectedOgrenci.no
        } : null}
      />

      {/* CSV Upload Modal */}
      <Modal isOpen={csvUploadModalOpen} onClose={() => {
        setCsvUploadModalOpen(false)
        setCsvFile(null)
        setCsvPreview([])
      }} title="📄 CSV/Excel Dosyasından Öğrenci Yükleme">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-sm">
              <div className="font-medium mb-2">💡 CSV Dosya Formatı:</div>
              <div className="text-xs space-y-1">
                <div>• İlk satır sütun başlıkları olmalıdır</div>
                <div>• Zorunlu sütunlar: Ad, Soyad, No, Sınıf, Alan ID</div>
                <div>• Opsiyonel: TC, Telefon, Veli Adı, Veli Telefon, Email</div>
                <div>• CSV dosyası UTF-8 kodlamasında olmalıdır</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Örnek CSV İndir
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Dosyası Seçin
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCsvFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {csvLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Dosya işleniyor...</p>
            </div>
          )}

          {csvPreview.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Önizleme ({csvPreview.length} öğrenci)
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">Ad</th>
                      <th className="px-2 py-1 text-left">Soyad</th>
                      <th className="px-2 py-1 text-left">No</th>
                      <th className="px-2 py-1 text-left">Sınıf</th>
                      <th className="px-2 py-1 text-left">Alan ID</th>
                      <th className="px-2 py-1 text-left">TC</th>
                      <th className="px-2 py-1 text-left">Telefon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvPreview.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 py-1">{index + 1}</td>
                        <td className="px-2 py-1">{row['Ad'] || row['ad'] || '-'}</td>
                        <td className="px-2 py-1">{row['Soyad'] || row['soyad'] || '-'}</td>
                        <td className="px-2 py-1">{row['No'] || row['no'] || '-'}</td>
                        <td className="px-2 py-1">{row['Sınıf'] || row['sinif'] || '-'}</td>
                        <td className="px-2 py-1">{row['Alan ID'] || row['alan_id'] || '-'}</td>
                        <td className="px-2 py-1">{row['TC'] || row['tc'] || '-'}</td>
                        <td className="px-2 py-1">{row['Telefon'] || row['telefon'] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvPreview.length > 10 && (
                  <div className="p-2 text-xs text-gray-500 text-center bg-gray-50">
                    ... ve {csvPreview.length - 10} öğrenci daha
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setCsvUploadModalOpen(false)
                setCsvFile(null)
                setCsvPreview([])
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleCsvUpload}
              disabled={csvLoading || !csvPreview.length}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {csvLoading ? 'Yükleniyor...' : `${csvPreview.length} Öğrenciyi Ekle`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}