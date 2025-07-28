'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Calendar, AlertTriangle, X, Search, ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import TerminationModal from './TerminationModal'
import { toast } from 'react-hot-toast'
import { useInternshipAssignmentRules } from '@/hooks/useInternshipAssignmentRules'

interface Company {
  id: string
  name: string
  contact: string
  teacher?: {
    id: string
    name: string
    surname: string
  } | null
}

interface Teacher {
  id: string
  name: string
  surname: string
  alan?: {
    name: string
  }
}

interface Student {
  id: string
  ad: string
  soyad: string
  sinif: string
  no: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  alanId: string
  onAssignmentComplete: () => void
}

export default function StudentAssignmentModal({
  isOpen,
  onClose,
  student,
  alanId,
  onAssignmentComplete
}: Props) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showTerminationModal, setShowTerminationModal] = useState(false)
  const [activeInternship, setActiveInternship] = useState<any>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [showAllTeachers, setShowAllTeachers] = useState(false)
  const [assignmentRulesResult, setAssignmentRulesResult] = useState<any>(null)
  const [coordinatorRuleWarning, setCoordinatorRuleWarning] = useState<string | null>(null)
  const [coordinatorAutoSelected, setCoordinatorAutoSelected] = useState<string | null>(null)
  
  // Assignment rules hook
  const { checkAssignmentRules, getSuggestedTeacher, showRulesModal, lastResult } = useInternshipAssignmentRules()
  
  const [formData, setFormData] = useState({
    companyId: '',
    teacherId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })

  // Fetch companies and teachers when modal opens
  useEffect(() => {
    if (isOpen && student) {
      fetchData()
    }
  }, [isOpen, student])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch companies - tüm işletmeleri getir (sayfalama olmadan)
      const companiesRes = await fetch('/api/admin/companies?per_page=1000')
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json()
        setCompanies(companiesData.data || [])
      }

      // Fetch teachers - varsayılan olarak sadece alan öğretmenleri
      await fetchTeachers(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = async (companyId: string) => {
    setFormData({
      ...formData,
      companyId,
      teacherId: '' // Önce temizle, sonra kural kontrolü sonucuna göre set et
    })
    
    // Validate assignment when company is selected
    if (student && companyId) {
      await validateAssignment(companyId)
      
      // Assignment rules kontrolü yap
      const rulesResult = await checkAssignmentRules(student.id, companyId)
      setAssignmentRulesResult(rulesResult)
      
      // Eğer mevcut koordinatör varsa otomatik seç
      if (rulesResult?.existingCoordinator) {
        setFormData(prev => ({
          ...prev,
          teacherId: rulesResult.existingCoordinator!.id
        }))
        
        // Inline bildirim göster
        setCoordinatorAutoSelected(
          `${rulesResult.existingCoordinator.name} ${rulesResult.existingCoordinator.surname}`
        )
        
        // 3 saniye sonra bildirim kaybolsun
        setTimeout(() => setCoordinatorAutoSelected(null), 3000)
      }
    } else {
      setValidationResult(null)
      setAssignmentRulesResult(null)
    }
  }

  const validateAssignment = async (companyId: string) => {
    if (!student) return
    
    try {
      const response = await fetch(`/api/admin/students/${student.id}/validate-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      })

      if (response.ok) {
        const result = await response.json()
        setValidationResult(result.validation)
        
        // If there are active internships, get the first one for termination
        if (result.validation.activeInternships?.length > 0) {
          setActiveInternship(result.validation.activeInternships[0])
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleTermination = async (terminationData: any) => {
    if (!activeInternship) return

    try {
      const response = await fetch(`/api/admin/internships/${activeInternship.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terminationData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fesih işlemi başarısız')
      }

      toast.success('Staj başarıyla fesih edildi!')
      setShowTerminationModal(false)
      setValidationResult(null)
      setActiveInternship(null)
      
      // Re-validate after termination
      if (formData.companyId) {
        await validateAssignment(formData.companyId)
      }
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const handleSubmit = async () => {
    if (!student || !formData.companyId) {
      toast.error('Lütfen bir işletme seçin')
      return
    }

    // Koordinatör seçimi artık opsiyonel - öğrenciler koordinatör atanmadan önce staja başlayabilir

    // Assignment rules kontrolü yap
    if (formData.teacherId) {
      const finalRulesCheck = await checkAssignmentRules(
        student.id,
        formData.companyId,
        formData.teacherId
      )

      if (finalRulesCheck && (finalRulesCheck.hasErrors || finalRulesCheck.hasWarnings)) {
        // Kuralları göster ve kullanıcı kararına göre devam et
        showRulesModal(
          finalRulesCheck,
          () => performAssignment(), // Devam et
          () => {} // İptal et
        )
        return
      }
    }

    // Kural sorunu yoksa direkt ata
    await performAssignment()
  }

  const performAssignment = async () => {
    if (!student) {
      toast.error('Öğrenci bilgisi bulunamadı')
      return
    }
    
    setSubmitting(true)
    try {
      // Assign student to company
      const response = await fetch(`/api/admin/students/${student.id}/assign-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: formData.companyId,
          teacherId: formData.teacherId || null,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Atama işlemi başarısız')
      }

      toast.success('Öğrenci başarıyla işletmeye atandı!')
      onAssignmentComplete()
      onClose()
      resetForm()
    } catch (error: any) {
      toast.error(`Hata: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchTeachers = async (includeAllTeachers: boolean = false) => {
    try {
      const url = includeAllTeachers
        ? '/api/admin/teachers?per_page=1000'
        : `/api/admin/fields/${alanId}/teachers`
      
      const teachersRes = await fetch(url)
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json()
        // API response farklı olabilir, veriyi normalize et
        const normalizedTeachers = includeAllTeachers
          ? (teachersData.data || teachersData || [])
          : (teachersData || [])
        setTeachers(normalizedTeachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      companyId: '',
      teacherId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    })
    setCompanySearch('')
    setShowCompanyDropdown(false)
    setShowAllTeachers(false)
    setValidationResult(null)
    setCoordinatorRuleWarning(null)
    setCoordinatorAutoSelected(null)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const selectedCompany = companies.find(c => c.id === formData.companyId)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Öğrenci Atama">
      <div className="space-y-6">
        {/* Student Info */}
        {student && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Öğrenci Bilgileri</h3>
            <div className="text-sm text-blue-800">
              <p><span className="font-medium">Ad Soyad:</span> {student.ad} {student.soyad}</p>
              <p><span className="font-medium">Sınıf:</span> {student.sinif}</p>
              <p><span className="font-medium">No:</span> {student.no || 'Belirtilmemiş'}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Veriler yükleniyor...</p>
          </div>
        ) : (
          <>
            {/* Company Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline h-4 w-4 mr-1" />
                İşletme Seçin
              </label>
              
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value)
                    setShowCompanyDropdown(true)
                    if (e.target.value.length === 0) {
                      setFormData({ ...formData, companyId: '' })
                      setValidationResult(null)
                    }
                  }}
                  onFocus={() => {
                    setShowCompanyDropdown(true)
                  }}
                  onClick={() => {
                    setShowCompanyDropdown(true)
                  }}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="İşletme ara veya listeden seç..."
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Selected Company Display */}
              {formData.companyId && !showCompanyDropdown && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-900">
                      <strong>Seçilen:</strong> {companies.find(c => c.id === formData.companyId)?.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, companyId: '' })
                        setCompanySearch('')
                        setValidationResult(null)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Dropdown */}
              {showCompanyDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {(() => {
                    // Eğer arama boşsa veya 2 karakterden azsa, tüm işletmeleri göster
                    const filteredCompanies = companySearch.length >= 2
                      ? companies.filter(company =>
                          company.name.toLowerCase().includes(companySearch.toLowerCase()) ||
                          company.contact.toLowerCase().includes(companySearch.toLowerCase())
                        )
                      : companies
                    
                    if (filteredCompanies.length === 0) {
                      return (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {companySearch.length >= 2
                            ? `"${companySearch}" için sonuç bulunamadı`
                            : 'İşletme bulunamadı'
                          }
                        </div>
                      )
                    }
                    
                    return filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          handleCompanyChange(company.id)
                          setCompanySearch(company.name)
                          setShowCompanyDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {company.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {company.contact}
                        </div>
                      </button>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Coordinator Teacher */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Koordinatör Öğretmen (Opsiyonel)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Koordinatör sonradan atanabilir. Öğrenciler koordinatör olmadan da staja başlayabilir.
              </p>
              
              {/* Alan dışı öğretmenler checkbox */}
              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showAllTeachers}
                    onChange={async (e) => {
                      setShowAllTeachers(e.target.checked)
                      await fetchTeachers(e.target.checked)
                      // Seçili öğretmen alan dışıysa ve checkbox kaldırıldıysa, seçimi temizle
                      if (!e.target.checked && formData.teacherId) {
                        const currentTeacher = teachers.find(t => t.id === formData.teacherId)
                        if (currentTeacher && currentTeacher.alan?.name && !currentTeacher.alan.name.includes(alanId)) {
                          setFormData({ ...formData, teacherId: '' })
                        }
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Alan dışı öğretmenleri de göster
                  </span>
                </label>
              </div>
              
              <select
                value={formData.teacherId}
                onChange={async (e) => {
                  const newTeacherId = e.target.value
                  setFormData({ ...formData, teacherId: newTeacherId })
                  
                  // Koordinatör değiştirildiğinde kural kontrolü yap
                  if (student && formData.companyId && newTeacherId) {
                    const rulesCheck = await checkAssignmentRules(
                      student.id,
                      formData.companyId,
                      newTeacherId
                    )
                    
                    if (rulesCheck?.hasWarnings) {
                      // Koordinatör kuralı uyarısını inline göster
                      const warningRules = rulesCheck.rules.filter(r => r.severity === 'WARNING')
                      if (warningRules.length > 0) {
                        setCoordinatorRuleWarning(warningRules[0].message)
                      }
                    } else {
                      setCoordinatorRuleWarning(null)
                    }
                  } else {
                    setCoordinatorRuleWarning(null)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.companyId}
              >
                <option value="">Koordinatör Seçin (Opsiyonel)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} {teacher.surname}
                    {teacher.alan?.name && ` (${teacher.alan.name})`}
                  </option>
                ))}
              </select>
              
              {/* Koordinatör kural uyarısı */}
              {coordinatorRuleWarning && (
                <div className="mt-3 bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-800">
                        ⚠️ Koordinatör Kuralı Uyarısı
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        {coordinatorRuleWarning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Bitiş Tarihi (Opsiyonel)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={formData.startDate}
                />
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="space-y-3">
                {validationResult.errors?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Atama Engellenmiş</h3>
                        <div className="mt-1 text-sm text-red-700">
                          {validationResult.errors.map((error: string, index: number) => (
                            <p key={index}>{error}</p>
                          ))}
                        </div>
                        {validationResult.requiresTermination && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setShowTerminationModal(true)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Mevcut Stajı Fesih Et
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {validationResult.warnings?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Uyarılar</h3>
                        <div className="mt-1 text-sm text-yellow-700">
                          {validationResult.warnings.map((warning: string, index: number) => (
                            <p key={index}>{warning}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {validationResult.canAssign && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Atama Onaylandı</h3>
                        <div className="mt-1 text-sm text-green-700">
                          Öğrenci seçilen şirkete atanabilir.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || !formData.companyId}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Atanıyor...</span>
              </div>
            ) : (
              'Ata'
            )}
          </button>
        </div>
      </div>

      {/* Termination Modal */}
      <TerminationModal
        isOpen={showTerminationModal}
        onClose={() => setShowTerminationModal(false)}
        onConfirm={handleTermination}
        internship={activeInternship ? {
          id: activeInternship.id,
          student: {
            name: student?.ad || '',
            surname: student?.soyad || ''
          },
          company: {
            name: activeInternship.company?.name || 'Bilinmeyen Şirket'
          },
          teacher: {
            name: activeInternship.teacher?.name || 'Bilinmeyen',
            surname: activeInternship.teacher?.surname || 'Öğretmen'
          }
        } : null}
      />
    </Modal>
  )
}