'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  Building,
  ArrowLeft,
  User,
  Key,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader,
  UserCheck,
  BookOpen,
  MapPin,
  Building2,
  Phone,
  Mail,
  Shield,
  Calendar,
  Hash,
  FileText,
  Receipt,
  Upload,
  Download,
  Eye,
  File,
  AlertCircle,
  History,
  ChevronDown,
  ChevronRight,
  Briefcase,
  CreditCard,
  Users,
  HandHeart,
  UserPlus
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import TerminationModal from '@/components/admin/TerminationModal'
import StudentHistoryView from '@/components/admin/StudentHistoryView'
import { toast } from 'react-hot-toast'
// Remove pin-security import since we'll use API endpoints

interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  pin?: string;
  teacherId?: string;
  taxNumber?: string;
  activityField?: string;
  bankAccountNo?: string;
  employeeCount?: string;
  stateContributionRequest?: string;
  masterTeacherName?: string;
  masterTeacherPhone?: string;
  teacher?: {
    id: string;
    name: string;
    surname: string;
  };
  isLocked?: boolean;
  lockUntil?: string;
  failedAttempts?: number;
}

interface Student {
  id: string;
  name: string;
  surname: string;
  number: string;
  className: string;
  alanId: string;
  companyId?: string;
  alan: {
    name: string;
  };
}

interface Internship {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  terminationDate?: string;
  status: string;
  student: {
    id: string;
    name: string;
    surname: string;
    number: string;
    className: string;
    alan: {
      name: string;
    };
  };
}

interface Field {
  id: string;
  name: string;
}

interface Document {
  id: string;
  companyId: string;
  name: string;
  type: string;
  fileUrl?: string;
  uploadDate: string;
}

interface Dekont {
  id: string;
  companyId: string;
  date: string;
  description: string;
  amount: number;
  month: string;
  studentName?: string;
  fileUrl?: string;
  status?: string;
  internshipId?: string;
  studentId?: string;
}

interface FieldData {
  id: string;
  alanId: string;
  alan: {
    id: string;
    name: string;
  };
}

// Optimize AccordionSection component to prevent re-renders
const AccordionSection = memo(({
  id,
  title,
  icon: Icon,
  children,
  count,
  isOpen,
  onToggle
}: {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-2xl border border-indigo-100 overflow-hidden mb-4">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"
    >
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mr-4">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {count !== undefined && (
            <span className="ml-3 px-2 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
              {count}
            </span>
          )}
        </div>
      </div>
      {isOpen ? (
        <ChevronDown className="h-5 w-5 text-gray-500" />
      ) : (
        <ChevronRight className="h-5 w-5 text-gray-500" />
      )}
    </button>
    
    {isOpen && (
      <div className="px-6 pb-6 border-t border-gray-100">
        {children}
      </div>
    )}
  </div>
))

export default function IsletmeDetayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const companyId = params.id as string
  const referrer = searchParams.get('ref')

  const [openSections, setOpenSections] = useState({
    temel: true,
    iletisim: false,
    teknik: false,
    ustabagci: false,
    ogrenciler: false,
    koordinatorler: false,
    alanlar: false,
    belgeler: false
  })

  // Data loading states for lazy loading
  const [dataLoaded, setDataLoaded] = useState({
    company: false,
    internships: false,
    companyFields: false,
    fields: false,
    documents: false,
    dekontlar: false,
    availableStudents: false
  })

  const [company, setCompany] = useState<Company | null>(null)
  const [internships, setInternships] = useState<Internship[]>([])
  const [companyFields, setCompanyFields] = useState<FieldData[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [terminationModalOpen, setTerminationModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [dekontModalContext, setDekontModalContext] = useState<'student' | 'general'>('student')
  const [fields, setFields] = useState<Field[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [selectedInternship, setSelectedInternship] = useState<{
    id: string;
    student: { name: string; surname: string; };
    company: { name: string; };
    teacher: { name: string; surname: string; };
  } | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [teacherModalOpen, setTeacherModalOpen] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([])
  const [teacherAssignmentLoading, setTeacherAssignmentLoading] = useState(false)
  const [securityStatus, setSecurityStatus] = useState<any>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    contact: '',
    pin: '',
    activityField: '',
    taxNumber: '',
    bankAccountNo: '',
    employeeCount: '',
    stateContributionRequest: '',
    masterTeacherName: '',
    masterTeacherPhone: ''
  })

  const [studentFormData, setStudentFormData] = useState({
    studentId: '',
    startDate: ''
  })

  const [terminationFormData, setTerminationFormData] = useState({
    terminationDate: ''
  })

  const [documentFormData, setDocumentFormData] = useState({
    name: '',
    type: 'sozlesme',
    customType: '',
    file: null as File | null
  })

  const [teacherFormData, setTeacherFormData] = useState({
    teacherId: '',
    reason: '',
    notes: ''
  })

  const toggleSection = async (section: keyof typeof openSections) => {
    const isOpening = !openSections[section]
    
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))

    // Lazy load data when accordion opens
    if (isOpening) {
      switch (section) {
        case 'ogrenciler':
          if (!dataLoaded.internships) {
            await fetchInternships()
            setDataLoaded(prev => ({ ...prev, internships: true }))
          }
          break
        case 'alanlar':
          if (!dataLoaded.companyFields) {
            await Promise.all([
              fetchCompanyFields(),
              fetchFields()
            ])
            setDataLoaded(prev => ({ ...prev, companyFields: true, fields: true }))
          }
          break
        case 'belgeler':
          if (!dataLoaded.documents) {
            await Promise.all([
              fetchDocuments(),
              fetchDekontlar()
            ])
            setDataLoaded(prev => ({ ...prev, documents: true, dekontlar: true }))
          }
          break
      }
    }
  }

  // Cache system for API responses
  const cacheRef = useRef<Record<string, { data: any; timestamp: number }>>({})
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Debounced input handler to prevent focus loss
  const formRef = useRef(formData)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    formRef.current = formData
  }, [formData])

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    // Update ref immediately
    formRef.current = { ...formRef.current, [field]: value }
    
    // Debounce state update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, [field]: value }))
    }, 10)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Cache helper functions
  const getCachedData = (key: string) => {
    const cached = cacheRef.current[key]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const setCachedData = (key: string, data: any) => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now()
    }
  }

  // Fetch company information with cache
  async function fetchCompany() {
    const cacheKey = `company-${companyId}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      setCompany(cachedData)
      setFormData({
        name: cachedData.name || '',
        address: cachedData.address || '',
        phone: cachedData.phone || '',
        email: cachedData.email || '',
        contact: cachedData.contact || '',
        pin: cachedData.pin || '',
        activityField: cachedData.activityField || '',
        taxNumber: cachedData.taxNumber || '',
        bankAccountNo: cachedData.bankAccountNo || '',
        employeeCount: cachedData.employeeCount || '',
        stateContributionRequest: cachedData.stateContributionRequest || '',
        masterTeacherName: cachedData.masterTeacherName || '',
        masterTeacherPhone: cachedData.masterTeacherPhone || ''
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching company:', data.error)
        return
      }

      setCachedData(cacheKey, data)
      setCompany(data)
      setFormData({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        contact: data.contact || '',
        pin: data.pin || '',
        activityField: data.activityField || '',
        taxNumber: data.taxNumber || '',
        bankAccountNo: data.bankAccountNo || '',
        employeeCount: data.employeeCount || '',
        stateContributionRequest: data.stateContributionRequest || '',
        masterTeacherName: data.masterTeacherName || '',
        masterTeacherPhone: data.masterTeacherPhone || ''
      })

      // Fetch security status
      try {
        const response = await fetch('/api/admin/security/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType: 'company', entityId: data.id })
        })
        if (response.ok) {
          const securityData = await response.json()
          setSecurityStatus(securityData)
        }
      } catch (securityError) {
        console.error('Security status fetch error:', securityError)
      }
    } catch (error) {
      console.error('General error:', error)
    }
  }

  // Fetch internships and students with cache
  async function fetchInternships() {
    const cacheKey = `internships-${companyId}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      setInternships(cachedData)
      return
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/internships`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching internships:', data.error)
        return
      }

      setCachedData(cacheKey, data || [])
      setInternships(data || [])
    } catch (error) {
      console.error('Internship fetch error:', error)
    }
  }

  // Fetch available students
  async function fetchAvailableStudents() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/available-students`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching available students:', data.error)
        return
      }

      setAvailableStudents(data || [])
    } catch (error) {
      console.error('Available students fetch error:', error)
    }
  }

  // Fetch company fields
  async function fetchCompanyFields() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/fields`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching company fields:', data.error)
        return
      }

      setCompanyFields(data || [])
    } catch (error) {
      console.error('Company fields fetch error:', error)
    }
  }

  // Fetch fields
  async function fetchFields() {
    try {
      const response = await fetch('/api/admin/fields')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching fields:', data.error)
        return
      }

      setFields(data || [])
    } catch (error) {
      console.error('Fields fetch error:', error)
    }
  }

  // Fetch documents
  async function fetchDocuments() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/documents`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching documents:', data.error)
        return
      }

      setDocuments(data || [])
    } catch (error) {
      console.error('Document fetch error:', error)
    }
  }

  // Fetch dekontlar
  async function fetchDekontlar() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/dekontlar`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching dekontlar:', data.error)
        return
      }

      setDekontlar(data || [])
    } catch (error) {
      console.error('Dekont fetch error:', error)
    }
  }

  useEffect(() => {
    if (companyId) {
      // Only load essential data on initial page load
      fetchCompany().then(() => {
        setDataLoaded(prev => ({ ...prev, company: true }))
        setLoading(false)
      })
    }
  }, [companyId])

  // Update information
  const handleSave = async () => {
    if (!company) return

    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          contact: formData.contact.trim() || null,
          pin: formData.pin.trim() || null,
          activityField: formData.activityField.trim() || null,
          taxNumber: formData.taxNumber.trim() || null,
          bankAccountNo: formData.bankAccountNo.trim() || null,
          employeeCount: formData.employeeCount.trim() || null,
          stateContributionRequest: formData.stateContributionRequest.trim() || null,
          masterTeacherName: formData.masterTeacherName.trim() || null,
          masterTeacherPhone: formData.masterTeacherPhone.trim() || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Güncelleme hatası: ' + errorData.error)
        return
      }

      toast.success('İşletme bilgileri başarıyla güncellendi!')
      setEditMode(false)
      fetchCompany()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Bir hata oluştu.')
    }
  }

  // Handle student modal opening with lazy loading
  const handleOpenStudentModal = async () => {
    if (!dataLoaded.availableStudents) {
      await fetchAvailableStudents()
      setDataLoaded(prev => ({ ...prev, availableStudents: true }))
    }
    setStudentModalOpen(true)
  }

  // Add student (select from existing students)
  const handleAddStudent = async () => {
    try {
      // Form validation
      if (!studentFormData.studentId || !studentFormData.startDate) {
        toast.error('Lütfen tüm alanları doldurun!')
        return
      }

      const response = await fetch(`/api/admin/companies/${companyId}/internships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentFormData.studentId,
          startDate: studentFormData.startDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Staj oluşturma hatası: ' + errorData.error)
        return
      }

      toast.success('Öğrenci başarıyla işletmeye eklendi!')
      setStudentModalOpen(false)
      setStudentFormData({
        studentId: '',
        startDate: ''
      })
      
      // Refresh data
      await Promise.all([fetchInternships(), fetchAvailableStudents()])
      setDataLoaded(prev => ({ ...prev, internships: true, availableStudents: true }))
    } catch (error) {
      console.error('General internship creation error:', error)
      toast.error('Staj eklerken beklenmeyen bir hata oluştu!')
    }
  }

  // Handle termination confirm
  const handleTerminationConfirm = async (data: {
    reason: string;
    notes?: string;
    documentId?: string;
    terminatedBy: string;
  }) => {
    if (!selectedInternship) return

    try {
      const response = await fetch(`/api/admin/internships/${selectedInternship.id}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terminationReason: data.reason,
          terminationNotes: data.notes,
          terminationDocumentId: data.documentId,
          terminatedBy: data.terminatedBy,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fesih işlemi başarısız')
      }

      toast.success('Staj başarıyla fesih edildi!')
      
      // Refresh data
      await Promise.all([fetchInternships(), fetchAvailableStudents()])
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
      throw error // Re-throw to let modal handle it
    }
  }

  // Handle student history
  const handleStudentHistory = (internship: Internship) => {
    setSelectedStudent({
      id: internship.student.id,
      name: internship.student.name,
      surname: internship.student.surname,
      className: internship.student.className,
      number: internship.student.number
    })
    setHistoryModalOpen(true)
  }

  // Handle terminate internship
  const handleTerminateInternship = (internship: Internship) => {
    // Create proper internship object for termination modal
    const terminationInternship = {
      id: internship.id,
      student: {
        name: internship.student.name,
        surname: internship.student.surname
      },
      company: {
        name: company?.name || 'Bilinmeyen Şirket'
      },
      teacher: {
        name: company?.teacher?.name || 'Koordinatör',
        surname: company?.teacher?.surname || 'Atanmamış'
      }
    }
    setSelectedInternship(terminationInternship)
    setTerminationModalOpen(true)
  }

  // Handle delete company
  const handleDeleteCompany = async () => {
    if (!company) return

    // Check confirmation text
    if (deleteConfirmText !== company.name) {
      toast.error('İşletme adını doğru yazmadınız!')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'İşletme silinirken hata oluştu')
      }

      toast.success('İşletme başarıyla silindi!')
      router.push(referrer || '/admin/isletmeler')
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setIsDeleting(false)
      setDeleteConfirmText('')
    }
  }

  // Handle teacher assignment
  const handleOpenTeacherModal = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/assign-teacher`)
      const data = await response.json()
      
      if (response.ok) {
        setAvailableTeachers(data.teachers || [])
        setTeacherFormData({
          teacherId: company?.teacherId || '',
          reason: '',
          notes: ''
        })
        setTeacherModalOpen(true)
      } else {
        toast.error('Koordinatör listesi alınamadı')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  const handleTeacherAssignment = async () => {
    setTeacherAssignmentLoading(true)
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/assign-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: teacherFormData.teacherId || null,
          reason: teacherFormData.reason,
          notes: teacherFormData.notes,
          assignedBy: 'admin' // TODO: Get actual admin user ID
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Koordinatör atama başarısız')
      }

      const result = await response.json()
      toast.success(result.message)
      setTeacherModalOpen(false)
      setTeacherFormData({ teacherId: '', reason: '', notes: '' })
      
      // Refresh company data
      fetchCompany()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setTeacherAssignmentLoading(false)
    }
  }

  // Handle unlock company
  const handleUnlockCompany = async () => {
    setUnlockLoading(true)
    try {
      const response = await fetch('/api/admin/security/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'company', entityId: companyId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Blok açılırken hata oluştu')
      }

      toast.success('İşletme bloğu başarıyla açıldı!')
      
      // Refresh security status
      const statusResponse = await fetch('/api/admin/security/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'company', entityId: companyId })
      })
      
      if (statusResponse.ok) {
        const securityData = await statusResponse.json()
        setSecurityStatus(securityData)
      }
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setUnlockLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">İşletme bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">İşletme bulunamadı</h2>
          <p className="text-gray-600 mb-6">Belirtilen işletme mevcut değil veya silinmiş olabilir.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </button>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(referrer || '/admin/isletmeler')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {referrer?.includes('alanlar') ? 'Alan Detayına Dön' : 'İşletme Listesi'}
            </button>
            
            <div className="flex gap-3">
              {securityStatus?.isLocked && !editMode && (
                <button
                  onClick={handleUnlockCompany}
                  disabled={unlockLoading}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 disabled:opacity-50"
                >
                  {unlockLoading ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Bloğu Aç
                </button>
              )}

              {!editMode && (
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </button>
              )}

              <button
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                {editMode ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </>
                )}
              </button>
              
              {editMode && (
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData({
                      name: company.name || '',
                      address: company.address || '',
                      phone: company.phone || '',
                      email: company.email || '',
                      contact: company.contact || '',
                      pin: company.pin || '',
                      activityField: company.activityField || '',
                      taxNumber: company.taxNumber || '',
                      bankAccountNo: company.bankAccountNo || '',
                      employeeCount: company.employeeCount || '',
                      stateContributionRequest: company.stateContributionRequest || '',
                      masterTeacherName: company.masterTeacherName || '',
                      masterTeacherPhone: company.masterTeacherPhone || ''
                    })
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  İptal
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 p-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mr-6">
                <Building className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {company.name}
                </h1>
                <div className="flex items-center mt-2 space-x-4">
                  {company.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{company.address}</span>
                    </div>
                  )}
                  {company.pin && (
                    <div className="flex items-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                        <Key className="h-3 w-3 mr-1" />
                        <span className="text-xs font-mono font-medium">PIN: {company.pin}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* Temel Bilgiler */}
          <AccordionSection
            id="temel"
            title="Temel Bilgiler"
            icon={Building2}
            isOpen={openSections.temel}
            onToggle={() => toggleSection('temel')}
          >
            <div className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İşletme Adı
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İşletme Yetkilisi
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => handleInputChange('contact', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Yetkili kişi adı soyadı"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.contact || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faaliyet Alanı
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.activityField}
                      onChange={(e) => handleInputChange('activityField', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Örn: Bilişim, İnşaat, Otomotiv"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.activityField || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Çalışan Sayısı
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.employeeCount}
                      onChange={(e) => handleInputChange('employeeCount', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Örn: 50, 100-500"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.employeeCount || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* İletişim Bilgileri */}
          <AccordionSection
            id="iletisim"
            title="İletişim Bilgileri"
            icon={Phone}
            isOpen={openSections.iletisim}
            onToggle={() => toggleSection('iletisim')}
          >
            <div className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Adres
                  </label>
                  {editMode ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="İşletme adresi"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 min-h-[84px]">
                      {company.address || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Telefon
                    </label>
                    {editMode ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0555 123 45 67"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                        {company.phone || 'Belirtilmemiş'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      E-posta
                    </label>
                    {editMode ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="ornek@sirket.com"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                        {company.email || 'Belirtilmemiş'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Usta Öğretici */}
          <AccordionSection
            id="ustabagci"
            title="Usta Öğretici"
            icon={UserPlus}
            isOpen={openSections.ustabagci}
            onToggle={() => toggleSection('ustabagci')}
          >
            <div className="pt-4 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Usta Öğretici:</strong> İşletmede stajyer öğrencilere rehberlik edecek deneyimli personel bilgileri.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Usta Öğretici Ad Soyad
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.masterTeacherName}
                      onChange={(e) => handleInputChange('masterTeacherName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Örn: Ahmet Yılmaz"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.masterTeacherName || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Usta Öğretici Telefon
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.masterTeacherPhone}
                      onChange={(e) => handleInputChange('masterTeacherPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0555 123 45 67"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.masterTeacherPhone || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Teknik & Mali Bilgiler */}
          <AccordionSection
            id="teknik"
            title="Teknik & Mali Bilgiler"
            icon={CreditCard}
            isOpen={openSections.teknik}
            onToggle={() => toggleSection('teknik')}
          >
            <div className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Key className="h-4 w-4 inline mr-1" />
                    Sistem PIN Kodu & Güvenlik
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => handleInputChange('pin', e.target.value)}
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                      placeholder="0000"
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 font-mono">
                        PIN: {company.pin || 'Belirtilmemiş'}
                      </div>
                      {securityStatus && (
                        <div className={`px-4 py-3 rounded-lg ${
                          securityStatus.isLocked
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-green-50 border border-green-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Shield className={`h-4 w-4 mr-2 ${
                                securityStatus.isLocked ? 'text-red-600' : 'text-green-600'
                              }`} />
                              <span className={`text-sm font-medium ${
                                securityStatus.isLocked ? 'text-red-800' : 'text-green-800'
                              }`}>
                                {securityStatus.isLocked ? 'BLOKELİ' : 'AKTİF'}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs ${
                                securityStatus.isLocked ? 'text-red-600' : 'text-green-600'
                              }`}>
                                Kalan deneme: {securityStatus.remainingAttempts}/4
                              </div>
                              {securityStatus.isLocked && securityStatus.lockEndTime && (
                                <div className="text-xs text-red-600">
                                  {new Date(securityStatus.lockEndTime).toLocaleString('tr-TR')} kadar
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="h-4 w-4 inline mr-1" />
                    Vergi Numarası
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1234567890"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.taxNumber || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="h-4 w-4 inline mr-1" />
                    Banka Hesap No
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.bankAccountNo}
                      onChange={(e) => handleInputChange('bankAccountNo', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="TR00 0000 0000 0000 0000 00"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.bankAccountNo || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <HandHeart className="h-4 w-4 inline mr-1" />
                    Devlet Katkı Talebi
                  </label>
                  {editMode ? (
                    <select
                      value={formData.stateContributionRequest}
                      onChange={(e) => handleInputChange('stateContributionRequest', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Seçiniz...</option>
                      <option value="Evet">Evet</option>
                      <option value="Hayır">Hayır</option>
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                      {company.stateContributionRequest || 'Belirtilmemiş'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Öğrenciler */}
          <AccordionSection
            id="ogrenciler"
            title="Staj Yapan Öğrenciler"
            icon={GraduationCap}
            count={internships.length}
            isOpen={openSections.ogrenciler}
            onToggle={() => toggleSection('ogrenciler')}
          >
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Toplam {internships.length} öğrenci bu işletmede staj yapıyor</p>
                <button
                  onClick={handleOpenStudentModal}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Öğrenci Ekle
                </button>
              </div>

              {internships.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                            Staj Dönemi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {internships.map((internship) => (
                          <tr key={internship.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {internship.student.name} {internship.student.surname}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    No: {internship.student.number} • {internship.student.className}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{internship.student.alan.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(internship.startDate).toLocaleDateString('tr-TR')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(internship.endDate).toLocaleDateString('tr-TR')}
                              </div>
                              {internship.terminationDate && (
                                <div className="text-sm text-red-600">
                                  Fesih: {new Date(internship.terminationDate).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                internship.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : internship.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {internship.status === 'ACTIVE' ? 'Aktif' : 
                                 internship.status === 'COMPLETED' ? 'Tamamlandı' : 'İptal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleStudentHistory(internship)}
                                  className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded transition-all"
                                  title="Öğrenci geçmişini görüntüle"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                                
                                {internship.status === 'ACTIVE' && !internship.terminationDate && (
                                  <button
                                    onClick={() => handleTerminateInternship(internship)}
                                    className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded transition-all"
                                    title="Stajı feshet"
                                  >
                                    <AlertCircle className="h-4 w-4" />
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
              ) : (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz öğrenci yok</h3>
                  <p className="text-gray-600 mb-6">Bu işletmede staj yapan öğrenci bulunmuyor.</p>
                  <button 
                    onClick={() => setStudentModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Öğrenciyi Ekle
                  </button>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Koordinatörler */}
          <AccordionSection
            id="koordinatorler"
            title="Koordinatör Öğretmen"
            icon={UserCheck}
            isOpen={openSections.koordinatorler}
            onToggle={() => toggleSection('koordinatorler')}
          >
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">İşletmeden sorumlu koordinatör öğretmen</p>
                <button
                  onClick={handleOpenTeacherModal}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {company.teacher ? 'Koordinatör Değiştir' : 'Koordinatör Ata'}
                </button>
              </div>

              {company.teacher ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                        <UserCheck className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{company.teacher.name} {company.teacher.surname}</h4>
                        <span className="text-sm text-gray-500">Koordinatör Öğretmen</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Koordinatör atanmamış</h3>
                  <p className="text-gray-600 mb-6">Bu işletmeye henüz bir koordinatör öğretmen atanmamış.</p>
                  <button
                    onClick={handleOpenTeacherModal}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Koordinatör Ata
                  </button>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Alanlar */}
          <AccordionSection
            id="alanlar"
            title="Staj Alanları"
            icon={BookOpen}
            count={companyFields.length}
            isOpen={openSections.alanlar}
            onToggle={() => toggleSection('alanlar')}
          >
            <div className="pt-4 space-y-6">
              <p className="text-sm text-gray-600">Bu işletmede yapılabilecek staj alanları</p>

              {companyFields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companyFields.map((field) => (
                    <div key={field.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{field.alan.name}</h4>
                          <p className="text-sm text-gray-600">Staj Alanı</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz alan yok</h3>
                  <p className="text-gray-600">Bu işletme için staj alanı tanımlanmamış.</p>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Belgeler */}
          <AccordionSection
            id="belgeler"
            title="Belgeler"
            icon={FileText}
            count={documents.length}
            isOpen={openSections.belgeler}
            onToggle={() => toggleSection('belgeler')}
          >
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Toplam {documents.length} belge yüklendi</p>
                <button
                  onClick={() => setDocumentModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Belge Ekle
                </button>
              </div>

              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{document.name}</h4>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {document.type}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(document.uploadDate).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {/* Handle view document */}}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Belgeyi görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* Handle download document */}}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                            title="Belgeyi indir"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="Belgeyi sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz belge yok</h3>
                  <p className="text-gray-600 mb-6">Bu işletme için henüz belge yüklenmemiş.</p>
                  <button 
                    onClick={() => setDocumentModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Belgeyi Ekle
                  </button>
                </div>
              )}
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* Student Addition Modal */}
      <Modal 
        isOpen={studentModalOpen} 
        onClose={() => setStudentModalOpen(false)}
        title="İşletmeye Öğrenci Ekle"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Sadece işletmenizin alanlarında kayıtlı olan ve şu anda aktif stajda olmayan öğrenciler listelenmektedir.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci Seç
            </label>
            <select
              value={studentFormData.studentId}
              onChange={(e) => setStudentFormData({...studentFormData, studentId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Öğrenci seçiniz...</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.surname} - {student.number} ({student.className}) - {student.alan.name}
                </option>
              ))}
            </select>
            {availableStudents.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Bu işletmenin alanlarında staja uygun öğrenci bulunmuyor.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşe Başlama Tarihi
            </label>
            <input
              type="date"
              value={studentFormData.startDate}
              onChange={(e) => setStudentFormData({...studentFormData, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setStudentModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleAddStudent}
              disabled={!studentFormData.studentId || !studentFormData.startDate}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Staj Başlat
            </button>
          </div>
        </div>
      </Modal>

      {/* Termination Modal */}
      <TerminationModal
        isOpen={terminationModalOpen}
        onClose={() => setTerminationModalOpen(false)}
        internship={selectedInternship}
        onConfirm={handleTerminationConfirm}
      />

      {/* Student History Modal */}
      <StudentHistoryView
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        student={selectedStudent}
      />

      {/* Delete Company Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteConfirmText('')
        }}
        title="İşletmeyi Sil"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  ⚠️ Dikkat: Bu işlem geri alınamaz!
                </h3>
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Silinecek veriler:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>İşletme bilgileri (ad, adres, telefon, email, vb.)</li>
                    <li>Tüm staj kayıtları ({internships.length} adet)</li>
                    <li>Yüklenen belgeler ({documents.length} adet)</li>
                    <li>Dekont kayıtları ({dekontlar.length} adet)</li>
                    <li>İlgili tüm geçmiş kayıtları</li>
                  </ul>
                  <p className="mt-3 font-semibold">
                    Bu veriler kalıcı olarak silinecek ve kurtarılamayacaktır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Önemli:</strong> Eğer bu işletmede aktif stajyer öğrenciler varsa,
                  önce onların stajlarını sonlandırmanız önerilir.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                "{company?.name}" işletmesini silmek istediğinizden emin misiniz?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Bu işlemi onaylamak için aşağıya işletme adını tam olarak yazın.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silme işlemini onaylamak için "<strong>{company?.name}</strong>" yazın:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`${company?.name} yazın`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoComplete="off"
              />
              {deleteConfirmText && deleteConfirmText !== company?.name && (
                <p className="text-sm text-red-600 mt-1">
                  İşletme adı eşleşmiyor. Tam olarak "{company?.name}" yazmalısınız.
                </p>
              )}
              {deleteConfirmText === company?.name && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ İşletme adı doğrulandı. Silme butonu aktif edildi.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                setDeleteModalOpen(false)
                setDeleteConfirmText('')
              }}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isDeleting}
            >
              İptal Et
            </button>
            <button
              onClick={handleDeleteCompany}
              disabled={isDeleting || deleteConfirmText !== company?.name}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
            >
              {isDeleting ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  KALICI OLARAK SİL
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Teacher Assignment Modal */}
      <Modal
        isOpen={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        title={company?.teacher ? 'Koordinatör Değiştir' : 'Koordinatör Ata'}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {company?.teacher ? 'Koordinatör Değiştirme' : 'Koordinatör Atama'}
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  {company?.teacher ? (
                    <>
                      <strong>Mevcut:</strong> {company.teacher.name} {company.teacher.surname}
                      <br />
                      Yeni koordinatör seçin veya kaldırmak için "Koordinatörü Kaldır" seçeneğini işaretleyin.
                    </>
                  ) : (
                    'Bu işletme için bir koordinatör öğretmen seçin. Koordinatör atama işlemi opsiyoneldir ve daha sonra değiştirilebilir.'
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinatör Öğretmen Seç
            </label>
            <select
              value={teacherFormData.teacherId}
              onChange={(e) => setTeacherFormData({...teacherFormData, teacherId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Koordinatörü Kaldır / Seçiniz...</option>
              {availableTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.surname}
                  {teacher.alan ? ` (${teacher.alan.name})` : ''}
                </option>
              ))}
            </select>
            {availableTeachers.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Aktif koordinatör öğretmen bulunamadı.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Atama/Değiştirme Nedeni
            </label>
            <input
              type="text"
              value={teacherFormData.reason}
              onChange={(e) => setTeacherFormData({...teacherFormData, reason: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Örn: İlk atama, koordinatör değişimi, iş yükü dengelemesi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ek Notlar (Opsiyonel)
            </label>
            <textarea
              value={teacherFormData.notes}
              onChange={(e) => setTeacherFormData({...teacherFormData, notes: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Koordinatör ataması/değişimi ile ilgili ek bilgiler..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setTeacherModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={teacherAssignmentLoading}
            >
              İptal
            </button>
            <button
              onClick={handleTeacherAssignment}
              disabled={teacherAssignmentLoading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
            >
              {teacherAssignmentLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  {teacherFormData.teacherId ?
                    (company?.teacher ? 'Değiştir' : 'Ata') :
                    'Kaldır'
                  }
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}