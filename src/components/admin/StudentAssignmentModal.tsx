'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Calendar, AlertTriangle, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import TerminationModal from './TerminationModal'
import { toast } from 'react-hot-toast'

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
      // Fetch companies
      const companiesRes = await fetch('/api/admin/companies')
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json()
        setCompanies(companiesData.data || [])
      }

      // Fetch teachers for this field
      const teachersRes = await fetch(`/api/admin/fields/${alanId}/teachers`)
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json()
        setTeachers(teachersData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = async (companyId: string) => {
    const selectedCompany = companies.find(c => c.id === companyId)
    setFormData({
      ...formData,
      companyId,
      teacherId: selectedCompany?.teacher?.id || ''
    })
    
    // Validate assignment when company is selected
    if (student && companyId) {
      await validateAssignment(companyId)
    } else {
      setValidationResult(null)
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

  const resetForm = () => {
    setFormData({
      companyId: '',
      teacherId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    })
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline h-4 w-4 mr-1" />
                İşletme Seçin
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">İşletme Seçin</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} - {company.contact}
                  </option>
                ))}
              </select>
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
              {selectedCompany?.teacher ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Otomatik Seçildi:</span>{' '}
                    {selectedCompany.teacher.name} {selectedCompany.teacher.surname}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Bu işletmenin kayıtlı koordinatör öğretmeni
                  </p>
                </div>
              ) : (
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.companyId}
                >
                  <option value="">Öğretmen Seçin</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.surname}
                      {teacher.alan?.name && ` (${teacher.alan.name})`}
                    </option>
                  ))}
                </select>
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