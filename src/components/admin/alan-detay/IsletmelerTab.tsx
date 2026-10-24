'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Search, Phone, Mail, MapPin, Users, ChevronDown, ChevronUp, UserCheck, UserX } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface IsletmeStaj {
  id: string
  student: {
    id: string
    name: string
    surname: string
    className: string
    number?: string
  }
}

interface Teacher {
  id: string
  name: string
  surname: string
  alanId: string
  alan: {
    id: string
    name: string
  }
}

interface Isletme {
  id: string
  ad: string
  yetkili: string
  telefon?: string
  email?: string
  adres?: string
  teacherId?: string
  teacher?: Teacher
  stajlar?: IsletmeStaj[]
}

interface Sinif {
  id: string
  name: string
}

interface Props {
  alanId: string
  initialIsletmeListesi: Isletme[]
  initialTotalCount?: number
  initialTotalPages?: number
  initialCurrentPage?: number
  siniflar?: Sinif[]
  onCountChange?: (count: number) => void
}

export default function IsletmelerTab({ 
  alanId, 
  initialIsletmeListesi, 
  initialTotalCount = 0,
  initialTotalPages = 1,
  initialCurrentPage = 1,
  siniflar = [],
  onCountChange 
}: Props) {
  const router = useRouter()
  
  // State management
  const [isletmeler, setIsletmeler] = useState<Isletme[]>(initialIsletmeListesi)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [currentPage, setCurrentPage] = useState(initialCurrentPage)
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [isletmeModalOpen, setIsletmeModalOpen] = useState(false)
  const [teacherAssignmentModal, setTeacherAssignmentModal] = useState(false)
  const [selectedIsletme, setSelectedIsletme] = useState<Isletme | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Teacher assignment states
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [assignmentReason, setAssignmentReason] = useState('')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSinif, setSelectedSinif] = useState('')
  
  // Expand/collapse states - default collapsed
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Toggle card expansion
  const toggleCardExpansion = (isletmeId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [isletmeId]: !prev[isletmeId]
    }))
  }
  
  // Form data
  const initialFormState = {
    ad: '',
    yetkili: '',
    telefon: '',
    email: '',
    adres: '',
    pin: '2025',
    usta_ogretici_ad: '',
    usta_ogretici_telefon: ''
  }
  const [isletmeFormData, setIsletmeFormData] = useState(initialFormState)

  // Fetch companies for this field with pagination
  const fetchIsletmeler = async (page: number = 1, search: string = '', classId: string = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(classId && { classId })
      })
      
      const response = await fetch(`/api/admin/alanlar/${alanId}/isletmeler?${params}`)
      if (!response.ok) throw new Error('İşletmeler getirilemedi')
      
      const data = await response.json()
      setIsletmeler(data.companies || [])
      setTotalCount(data.pagination?.totalCount || 0)
      setTotalPages(data.pagination?.totalPages || 1)
      setCurrentPage(page)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle search and class filter with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchIsletmeler(1, searchTerm, selectedSinif)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedSinif])

  // Notify parent about count changes
  useEffect(() => {
    if (onCountChange) {
      onCountChange(totalCount)
    }
  }, [totalCount, onCountChange])

  // Fetch available teachers for assignment
  const fetchAvailableTeachers = async (companyId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/assign-teacher`)
      if (!response.ok) throw new Error('Koordinatör listesi getirilemedi')
      
      const data = await response.json()
      setAvailableTeachers(data.teachers || [])
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    }
  }

  // Handle teacher assignment modal
  const handleTeacherAssignment = async (isletme: Isletme) => {
    setSelectedIsletme(isletme)
    setSelectedTeacherId(isletme.teacherId || '')
    setAssignmentReason('')
    setTeacherAssignmentModal(true)
    await fetchAvailableTeachers(isletme.id)
  }

  // Assign or change teacher
  const handleAssignTeacher = async () => {
    if (!selectedIsletme) return
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/companies/${selectedIsletme.id}/assign-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId || null,
          reason: assignmentReason.trim() || 'Yönetici tarafından atandı',
          assignedBy: 'admin'
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Koordinatör atama işlemi başarısız')
      }
      
      const result = await response.json()
      toast.success(result.message || 'Koordinatör atama işlemi başarıyla tamamlandı')
      setTeacherAssignmentModal(false)
      setSelectedIsletme(null)
      fetchIsletmeler(currentPage, searchTerm, selectedSinif) // Refresh the companies list
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Add company
  const handleIsletmeEkle = async () => {
    if (!isletmeFormData.ad.trim() || !isletmeFormData.yetkili.trim()) {
      toast.error('İşletme adı ve yetkili kişi alanları zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isletmeFormData.ad.trim(),
          contact: isletmeFormData.yetkili.trim(),
          phone: isletmeFormData.telefon.trim() || null,
          email: isletmeFormData.email.trim() || null,
          address: isletmeFormData.adres.trim() || null,
          pin: isletmeFormData.pin,
          usta_ogretici_ad: isletmeFormData.usta_ogretici_ad.trim() || null,
          usta_ogretici_telefon: isletmeFormData.usta_ogretici_telefon.trim() || null
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'İşletme eklenirken hata oluştu')
      }
      
      toast.success('İşletme başarıyla eklendi!')
      setIsletmeModalOpen(false)
      setIsletmeFormData(initialFormState)
      fetchIsletmeler(1, searchTerm, selectedSinif)
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitLoading(false)
    }
  }


  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          İşletmeler ({totalCount})
        </h2>
        <button
          onClick={() => {
            setIsletmeFormData(initialFormState)
            setIsletmeModalOpen(true)
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Yeni İşletme Ekle</span>
          <span className="sm:hidden">Yeni İşletme</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <div className="text-sm text-blue-700">
              <strong>Bilgi:</strong> Eklediğiniz işletmeler alan öğrencisine atanana kadar burada görünmez.
              Sadece bu alanda staj yapan öğrencilerin bulunduğu işletmeler listelenir.
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="İşletme, yetkili kişi, telefon veya e-posta ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* Class Filter */}
          <div className="sm:w-56">
            <select
              value={selectedSinif}
              onChange={(e) => setSelectedSinif(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tüm Sınıflar</option>
              {siniflar.map((sinif) => (
                <option key={sinif.id} value={sinif.id}>
                  {sinif.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Company List - Full Width Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      ) : isletmeler.length > 0 ? (
        <div className="space-y-4">
          {isletmeler.map((isletme: any) => {
            const isExpanded = expandedCards[isletme.id] || false
            return (
              <div key={isletme.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                {/* Card Header - Always Visible */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/isletmeler/${isletme.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer truncate block"
                        >
                          {isletme.ad}
                        </Link>
                        <p className="text-sm text-gray-600 truncate">
                          Yetkili: {isletme.yetkili}
                        </p>
                        {isletme.teacher && (
                          <p className="text-xs text-green-600 truncate">
                            Koordinatör: {isletme.teacher.name} {isletme.teacher.surname}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{isletme.stajlar?.length || 0} öğrenci</span>
                      </div>
                      
                      <button
                        onClick={() => handleTeacherAssignment(isletme)}
                        className={`p-2 rounded-lg transition-colors ${
                          isletme.teacher
                            ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            : 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                        }`}
                        title={isletme.teacher ? 'Koordinatörü Değiştir' : 'Koordinatör Ata'}
                      >
                        {isletme.teacher ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                      </button>
                      
                      
                      <button
                        onClick={() => toggleCardExpansion(isletme.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title={isExpanded ? "Daralt" : "Genişlet"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900">İletişim Bilgileri</h4>
                        <div className="space-y-2">
                          {isletme.telefon && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                              <a
                                href={`tel:${isletme.telefon}`}
                                className="truncate hover:text-indigo-600 transition-colors"
                              >
                                {isletme.telefon}
                              </a>
                            </div>
                          )}
                          {isletme.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                              <a
                                href={`mailto:${isletme.email}`}
                                className="truncate hover:text-indigo-600 transition-colors"
                              >
                                {isletme.email}
                              </a>
                            </div>
                          )}
                          {isletme.adres && (
                            <div className="flex items-start text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                              <span className="flex-1 break-words">{isletme.adres}</span>
                            </div>
                          )}
                          {!isletme.telefon && !isletme.email && !isletme.adres && (
                            <p className="text-sm text-gray-400 italic">İletişim bilgisi bulunmuyor</p>
                          )}
                        </div>
                      </div>

                      {/* Student List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Stajyer Öğrenciler ({isletme.stajlar?.length || 0})
                        </h4>
                        {isletme.stajlar && isletme.stajlar.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {isletme.stajlar.map((staj: IsletmeStaj) => (
                              <div
                                key={staj.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm bg-white rounded-lg p-3 border border-gray-100 gap-2"
                              >
                                <span className="font-medium text-gray-900">
                                  {staj.student.name} {staj.student.surname}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded self-start sm:self-auto">
                                  {staj.student.className}{staj.student.number ? ` - No: ${staj.student.number}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Henüz stajyer öğrenci yok</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">İşletme bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Arama kriterlerinize uygun işletme bulunamadı.'
              : 'Bu alan için henüz stajyer öğrenci olan işletme bulunmuyor.'
            }
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
          <div className="flex flex-1 justify-between sm:hidden">
                            <button
                  onClick={() => fetchIsletmeler(currentPage - 1, searchTerm, selectedSinif)}
                  disabled={currentPage <= 1 || loading}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <button
                  onClick={() => fetchIsletmeler(currentPage + 1, searchTerm, selectedSinif)}
                  disabled={currentPage >= totalPages || loading}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{Math.min((currentPage - 1) * 10 + 1, totalCount)}</span>
                {' '}-{' '}
                <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span>
                {' '}arası, toplam{' '}
                <span className="font-medium">{totalCount}</span>
                {' '}sonuç gösteriliyor
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                                  <button
                    onClick={() => fetchIsletmeler(currentPage - 1, searchTerm, selectedSinif)}
                    disabled={currentPage <= 1 || loading}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                  <span className="sr-only">Önceki</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchIsletmeler(pageNum, searchTerm, selectedSinif)}
                      disabled={loading}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        pageNum === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                                  <button
                    onClick={() => fetchIsletmeler(currentPage + 1, searchTerm, selectedSinif)}
                    disabled={currentPage >= totalPages || loading}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                  <span className="sr-only">Sonraki</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      <Modal isOpen={isletmeModalOpen} onClose={() => setIsletmeModalOpen(false)} title="Yeni İşletme Ekle">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-sm">
              <div className="font-medium">🔒 PIN Bilgisi:</div>
              <div className="mt-1">Varsayılan PIN: <strong>2025</strong></div>
              <div className="text-xs mt-1 text-blue-600">Bu PINi default bırakırsanız işletme ilk girişte PINi değiştirir.</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İşletme Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={isletmeFormData.ad}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="İşletme adını girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yetkili Kişi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={isletmeFormData.yetkili}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, yetkili: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Yetkili kişi adını girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={isletmeFormData.telefon}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, telefon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Telefon numarası"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={isletmeFormData.email}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="E-posta adresi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
            <textarea
              value={isletmeFormData.adres}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, adres: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="İşletme adresi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usta Öğretici Adı</label>
            <input
              type="text"
              value={isletmeFormData.usta_ogretici_ad}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, usta_ogretici_ad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Usta öğretici adını girin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usta Öğretici Telefon</label>
            <input
              type="tel"
              value={isletmeFormData.usta_ogretici_telefon}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, usta_ogretici_telefon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Usta öğretici telefon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="text"
              value={isletmeFormData.pin}
              onChange={(e) => setIsletmeFormData({ ...isletmeFormData, pin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="2025"
            />
            <div className="text-xs text-gray-500 mt-1">
              Bu PINi default bırakırsanız işletme ilk girişte PINi değiştirir
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setIsletmeModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleIsletmeEkle}
              disabled={submitLoading}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </div>
      </Modal>


      {/* Teacher Assignment Modal */}
      <Modal
        isOpen={teacherAssignmentModal}
        onClose={() => setTeacherAssignmentModal(false)}
        title={selectedIsletme?.teacher ? 'Koordinatörü Değiştir' : 'Koordinatör Ata'}
      >
        <div className="space-y-4">
          {selectedIsletme && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-800 text-sm">
                <div className="font-medium">🏢 İşletme: {selectedIsletme.ad}</div>
                <div className="mt-1">Yetkili: {selectedIsletme.yetkili}</div>
                {selectedIsletme.teacher && (
                  <div className="mt-1 text-green-600">
                    Mevcut Koordinatör: {selectedIsletme.teacher.name} {selectedIsletme.teacher.surname}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Koordinatör Öğretmen
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Koordinatör seçin (opsiyonel)</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.surname} - {teacher.alan?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atama Nedeni (Opsiyonel)
            </label>
            <textarea
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Koordinatör atama/değiştirme nedeni..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setTeacherAssignmentModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleAssignTeacher}
              disabled={submitLoading}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitLoading ? 'İşleniyor...' : selectedIsletme?.teacher ? 'Değiştir' : 'Ata'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}