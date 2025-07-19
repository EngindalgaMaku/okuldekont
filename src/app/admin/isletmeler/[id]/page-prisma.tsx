'use client'

import { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import Modal from '@/components/ui/Modal'

interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  pin?: string;
  teacherId?: string;
  teacher?: {
    id: string;
    name: string;
    surname: string;
  };
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

interface CompanyData {
  id: string;
  teacherId: string | null;
  teacher: {
    id: string;
    name: string;
    surname: string;
    alanId: string;
  } | null;
}

interface FieldData {
  id: string;
  alanId: string;
  alan: {
    id: string;
    name: string;
  };
}

export default function IsletmeDetayPagePrisma() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const companyId = params.id as string
  const referrer = searchParams.get('ref')

  const [activeTab, setActiveTab] = useState('temel')
  const [company, setCompany] = useState<Company | null>(null)
  const [internships, setInternships] = useState<Internship[]>([])
  const [companyFields, setCompanyFields] = useState<FieldData[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [terminationModalOpen, setTerminationModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [dekontModalContext, setDekontModalContext] = useState<'student' | 'general'>('student')
  const [fields, setFields] = useState<Field[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [dekontlar, setDekontlar] = useState<Dekont[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [activeStudents, setActiveStudents] = useState<Internship[]>([])
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null)
  
  // Dekont viewing states
  const [dekontViewModalOpen, setDekontViewModalOpen] = useState(false)
  const [selectedInternshipDekontlar, setSelectedInternshipDekontlar] = useState<Dekont[]>([])
  const [selectedDekont, setSelectedDekont] = useState<Dekont | null>(null)
  const [dekontDetailModalOpen, setDekontDetailModalOpen] = useState(false)

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

  const [dekontFormData, setDekontFormData] = useState<{
    date: string;
    month: string;
    description: string;
    amount: string;
    file: File | null;
    selectedStudentId: string;
  }>({
    date: '',
    month: '',
    description: '',
    amount: '',
    file: null,
    selectedStudentId: ''
  })

  // Fetch company information
  async function fetchCompany() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching company:', data.error)
        return
      }

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
    } catch (error) {
      console.error('General error:', error)
    }
  }

  // Fetch internships and students
  async function fetchInternships() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/internships`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching internships:', data.error)
        return
      }

      setInternships(data || [])
    } catch (error) {
      console.error('Internship fetch error:', error)
    }
  }

  // Fetch available students (matching company fields)
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

  // Fetch active students (students doing internships)
  async function fetchActiveStudents() {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/active-students`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error fetching active students:', data.error)
        return
      }

      setActiveStudents(data || [])
    } catch (error) {
      console.error('Active students fetch error:', error)
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
      Promise.all([
        fetchCompany(),
        fetchInternships(), 
        fetchCompanyFields(),
        fetchFields(),
        fetchDocuments(),
        fetchDekontlar(),
        fetchAvailableStudents()
      ]).then(() => {
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
        alert('Update error: ' + errorData.error)
        return
      }

      alert('Company information updated successfully!')
      setEditMode(false)
      fetchCompany()
    } catch (error) {
      console.error('Update error:', error)
      alert('An error occurred.')
    }
  }

  // Add student (select from existing students)
  const handleAddStudent = async () => {
    try {
      // Form validation
      if (!studentFormData.studentId || !studentFormData.startDate) {
        alert('Please fill in all fields!')
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
        alert('Error creating internship: ' + errorData.error)
        return
      }

      alert('Student successfully added to company!')
      setStudentModalOpen(false)
      setStudentFormData({
        studentId: '',
        startDate: ''
      })
      
      // Refresh data
      await Promise.all([fetchInternships(), fetchAvailableStudents()])
    } catch (error) {
      console.error('General internship creation error:', error)
      alert('An unexpected error occurred while adding internship!')
    }
  }

  const tabs = [
    { 
      id: 'temel', 
      name: 'Basic Information', 
      icon: Building
    },
    { 
      id: 'ogrenciler', 
      name: 'Students', 
      icon: GraduationCap,
      count: internships.length
    },
    { 
      id: 'koordinatorler', 
      name: 'Coordinators', 
      icon: UserCheck,
      count: companyFields.length
    },
    { 
      id: 'alanlar', 
      name: 'Internship Fields', 
      icon: BookOpen
    },
    { 
      id: 'belgeler', 
      name: 'Documents', 
      icon: FileText
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Company not found</h2>
          <p className="text-gray-600 mb-6">The specified company does not exist or may have been deleted.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
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
              {referrer?.includes('alanlar') ? 'Back to Field Details' : 'Company List'}
            </button>
            
            <div className="flex gap-3">
              {activeTab === 'temel' && (
                <button
                  onClick={() => editMode ? handleSave() : setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  {editMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </button>
              )}
              
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
                      activityField: (company as any).activityField || '',
                      taxNumber: (company as any).taxNumber || '',
                      bankAccountNo: (company as any).bankAccountNo || '',
                      employeeCount: (company as any).employeeCount || '',
                      stateContributionRequest: (company as any).stateContributionRequest || '',
                      masterTeacherName: (company as any).masterTeacherName || '',
                      masterTeacherPhone: (company as any).masterTeacherPhone || ''
                    })
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
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

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span>{tab.name}</span>
                      {tab.count !== undefined && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive 
                            ? 'bg-indigo-100 text-indigo-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'temel' && (
              <div className="space-y-8">
                {/* Basic Company Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center mb-4">
                    <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                    <h3 className="text-lg font-semibold text-blue-900">Company Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Company Name
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-blue-900 font-medium">
                          {company.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Contact Person
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                          className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="Contact person name"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-blue-900">
                          {company.contact || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center mb-4">
                    <Phone className="h-6 w-6 text-purple-600 mr-3" />
                    <h3 className="text-lg font-semibold text-purple-900">Contact Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Address
                      </label>
                      {editMode ? (
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                          placeholder="Company address"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-purple-900 min-h-[84px]">
                          {company.address || 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                          placeholder="0555 123 45 67"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-purple-900">
                          {company.phone || 'Not specified'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email
                      </label>
                      {editMode ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                          placeholder="example@company.com"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-purple-900">
                          {company.email || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PIN Information */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                  <div className="flex items-center mb-4">
                    <Key className="h-6 w-6 text-indigo-600 mr-3" />
                    <h3 className="text-lg font-semibold text-indigo-900">System Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-indigo-800 mb-2">
                        <Key className="h-4 w-4 inline mr-1" />
                        System PIN Code
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={formData.pin}
                          onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                          maxLength={4}
                          className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono"
                          placeholder="0000"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/70 rounded-lg text-indigo-900 font-mono">
                          {company.pin || 'Not specified'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'ogrenciler' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Students Doing Internships</h3>
                    <p className="text-sm text-gray-600">Total {internships.length} students doing internships at this company</p>
                  </div>
                  <button 
                    onClick={() => setStudentModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </button>
                </div>

                {internships.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Field
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Internship Period
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
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
                                    Terminated: {new Date(internship.terminationDate).toLocaleDateString('tr-TR')}
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
                                  {internship.status === 'ACTIVE' ? 'Active' : 
                                   internship.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {/* Handle view dekontlar */}}
                                    className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-all"
                                    title="View dekontlar"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => {/* Handle add dekont */}}
                                    className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-all"
                                    title="Upload dekont"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => {/* Handle edit internship */}}
                                    className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-all"
                                    title="Edit internship dates"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  
                                  {internship.status === 'ACTIVE' && !internship.terminationDate && (
                                    <button
                                      onClick={() => {/* Handle terminate internship */}}
                                      className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded transition-all"
                                      title="Terminate internship"
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => {/* Handle delete internship */}}
                                    className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-all"
                                    title="Delete internship"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
                    <p className="text-gray-600 mb-6">No students are doing internships at this company.</p>
                    <button 
                      onClick={() => setStudentModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Student
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'koordinatorler' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Coordinator Teacher</h3>
                    <p className="text-sm text-gray-600">Coordinator teacher responsible for the company</p>
                  </div>
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
                          <span className="text-sm text-gray-500">Coordinator Teacher</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No coordinator assigned</h3>
                    <p className="text-gray-600 mb-6">No coordinator teacher has been assigned to this company yet.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'alanlar' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Internship Fields</h3>
                  <p className="text-sm text-gray-600">Internship fields available at this company</p>
                </div>

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
                            <p className="text-sm text-gray-600">Internship Field</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                    <p className="text-gray-600">No internship fields defined for this company.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'belgeler' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                    <p className="text-sm text-gray-600">Total {documents.length} documents uploaded</p>
                  </div>
                  <button
                    onClick={() => setDocumentModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
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
                              title="View document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {/* Handle download document */}}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete document"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                    <p className="text-gray-600 mb-6">No documents have been uploaded for this company.</p>
                    <button 
                      onClick={() => setDocumentModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Document
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Addition Modal - Select from Existing Students */}
      <Modal 
        isOpen={studentModalOpen} 
        onClose={() => setStudentModalOpen(false)}
        title="Add Student to Company"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only students registered in your company's fields who are not currently doing active internships are listed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Student
            </label>
            <select
              value={studentFormData.studentId}
              onChange={(e) => setStudentFormData({...studentFormData, studentId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select student...</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.surname} - {student.number} ({student.className}) - {student.alan.name}
                </option>
              ))}
            </select>
            {availableStudents.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No students available for internship at this company's fields.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
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
              Cancel
            </button>
            <button
              onClick={handleAddStudent}
              disabled={!studentFormData.studentId || !studentFormData.startDate}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Start Internship
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}