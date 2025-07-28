import { useState, useCallback } from 'react'

interface AssignmentRule {
  type: 'COORDINATOR_CONSISTENCY' | 'FIELD_MATCH'
  severity: 'ERROR' | 'WARNING' | 'INFO'
  message: string
  suggestedAction?: string
  existingTeacherId?: string
  existingTeacherName?: string
}

interface RuleCheckResult {
  success: boolean
  rules: AssignmentRule[]
  hasErrors: boolean
  hasWarnings: boolean
  canProceed: boolean
  student?: {
    name: string
    alan: string
  }
  company?: {
    name: string
  }
  existingCoordinator?: {
    id: string
    name: string
    surname: string
    alanId: string
    alan: { name: string }
  } | null
}

interface UseInternshipAssignmentRulesReturn {
  checkAssignmentRules: (studentId: string, companyId: string, teacherId?: string) => Promise<RuleCheckResult | null>
  loading: boolean
  lastResult: RuleCheckResult | null
  getSuggestedTeacher: () => string | null
  showRulesModal: (result: RuleCheckResult, onConfirm: () => void, onCancel: () => void) => void
}

export function useInternshipAssignmentRules(): UseInternshipAssignmentRulesReturn {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<RuleCheckResult | null>(null)

  const checkAssignmentRules = useCallback(async (
    studentId: string, 
    companyId: string, 
    teacherId?: string
  ): Promise<RuleCheckResult | null> => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/internships/assignment-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          companyId,
          teacherId,
          action: 'create'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Kural kontrolü hatası:', error.message)
        return null
      }

      const result = await response.json()
      setLastResult(result)
      
      return result
    } catch (error) {
      console.error('Kural kontrolü hatası:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getSuggestedTeacher = useCallback(() => {
    if (!lastResult?.existingCoordinator) return null
    return lastResult.existingCoordinator.id
  }, [lastResult])

  const showRulesModal = useCallback((
    result: RuleCheckResult, 
    onConfirm: () => void, 
    onCancel: () => void
  ) => {
    // Toast mesajları kaldırıldı - sadece onaylama dialogs kullanılacak
    if (result.hasErrors) {
      // Hata varsa direkt iptal et
      onCancel()
      return
    }

    if (result.hasWarnings) {
      const warningRules = result.rules.filter(r => r.severity === 'WARNING')
      
      // Warning durumunda kullanıcı karar verebilir
      const proceed = window.confirm(
        `⚠️ KURAL UYARISI\n\n${warningRules.map(r => r.message).join('\n\n')}\n\nYine de devam etmek istiyor musunuz?`
      )
      
      if (proceed) {
        onConfirm()
      } else {
        onCancel()
      }
      return
    }

    // Info mesajları varsa direkt devam et
    onConfirm()
  }, [])

  return {
    checkAssignmentRules,
    loading,
    lastResult,
    getSuggestedTeacher,
    showRulesModal
  }
}

// Staj ataması formları için yardımcı hook
export function useInternshipForm(onSubmit?: (data: any) => void) {
  const assignmentRules = useInternshipAssignmentRules()
  const [formData, setFormData] = useState({
    studentId: '',
    companyId: '',
    teacherId: '',
    startDate: '',
    endDate: ''
  })

  const handleStudentOrCompanyChange = useCallback(async (
    field: 'studentId' | 'companyId', 
    value: string
  ) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    // Hem öğrenci hem işletme seçildiyse kural kontrolü yap
    if (newFormData.studentId && newFormData.companyId) {
      const result = await assignmentRules.checkAssignmentRules(
        newFormData.studentId,
        newFormData.companyId,
        newFormData.teacherId
      )

      if (result?.existingCoordinator && !newFormData.teacherId) {
        // Mevcut koordinatörü otomatik seç
        setFormData(prev => ({
          ...prev,
          teacherId: result.existingCoordinator!.id
        }))
      }
    }
  }, [formData, assignmentRules])

  const handleTeacherChange = useCallback(async (teacherId: string) => {
    setFormData(prev => ({ ...prev, teacherId }))

    // Öğrenci ve işletme seçildiyse kural kontrolü yap
    if (formData.studentId && formData.companyId) {
      await assignmentRules.checkAssignmentRules(
        formData.studentId,
        formData.companyId,
        teacherId
      )
    }
  }, [formData.studentId, formData.companyId, assignmentRules])

  const handleSubmit = useCallback(() => {
    if (!formData.studentId || !formData.companyId || !formData.teacherId) {
      return
    }

    if (assignmentRules.lastResult) {
      assignmentRules.showRulesModal(
        assignmentRules.lastResult,
        () => {
          onSubmit?.(formData)
        },
        () => {
          console.log('Staj ataması iptal edildi')
        }
      )
    } else {
      onSubmit?.(formData)
    }
  }, [formData, assignmentRules, onSubmit])

  return {
    formData,
    setFormData,
    handleStudentOrCompanyChange,
    handleTeacherChange,
    handleSubmit,
    ...assignmentRules
  }
}