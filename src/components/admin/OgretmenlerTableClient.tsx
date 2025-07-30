'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, Info, Building2, Send, Bell, Shield, Unlock, BarChart3, Calendar, Loader2, ChevronDown, ChevronRight, Eye, History } from 'lucide-react'
import Link from 'next/link'
import QuickPinButton from './QuickPinButton'
import Modal from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'

interface Ogretmen {
  id: string
  ad: string
  soyad: string
  email?: string
  telefon?: string
  pin?: string
  alan_id?: number
  alanlar?: any
  stajlarCount?: number
  koordinatorlukCount?: number
}

interface Props {
  ogretmenler: Ogretmen[]
}

interface TeacherStatistics {
  teacherId: string
  teacherName: string
  totalCompanies: number
  totalStudents: number
  terminatedInternships: number
  completedInternships: number
  transferredToOthers: number
  companies: Array<{
    id: string
    name: string
    contact?: string
    phone?: string
    masterTeacherName?: string
    masterTeacherPhone?: string
    studentCount: number
    activeStudents: number
  }>
  students: Array<{
    id: string
    internshipId: string
    name: string
    email?: string
    number?: string
    fieldName?: string
    companyName?: string
    companyContact?: string
    companyPhone?: string
    masterTeacherName?: string
    masterTeacherPhone?: string
    startDate?: string
    endDate?: string
    terminationDate?: string
    status: string
  }>
  teacherChanges: Array<{
    id: string
    companyName: string
    newTeacherName: string
    assignedAt: string
    reason?: string
  }>
}

export default function OgretmenlerTableClient({ ogretmenler }: Props) {
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [mesajModalOpen, setMesajModalOpen] = useState(false)
  const [mesajData, setMesajData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH'
  })
  const [sending, setSending] = useState(false)
  const [securityStatuses, setSecurityStatuses] = useState<Record<string, any>>({})
  const [unlockingTeachers, setUnlockingTeachers] = useState<Set<string>>(new Set())
  const [statisticsModalOpen, setStatisticsModalOpen] = useState(false)
  const [statisticsData, setStatisticsData] = useState<TeacherStatistics | null>(null)
  const [loadingStatistics, setLoadingStatistics] = useState(false)
  const [activeAccordion, setActiveAccordion] = useState<'companies' | 'students' | 'changes' | null>(null)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(ogretmenler.map(t => t.id))
    } else {
      setSelectedTeachers([])
    }
  }

  const handleSelectTeacher = (teacherId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacherId])
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId))
    }
  }

  const handleSendMesaj = async () => {
    if (!mesajData.title.trim() || !mesajData.content.trim()) {
      toast.error('Başlık ve içerik zorunludur!')
      return
    }

    if (selectedTeachers.length === 0) {
      toast.error('Lütfen en az bir öğretmen seçin!')
      return
    }

    setSending(true)
    try {
      // Seçili öğretmenlere mesaj gönder
      const notifications = selectedTeachers.map(teacherId => ({
        recipient_id: teacherId,
        recipient_type: 'ogretmen',
        title: mesajData.title,
        content: mesajData.content,
        priority: mesajData.priority,
        sent_by: 'Admin',
        is_read: false
      }))

      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications)
      })

      if (!response.ok) {
        throw new Error('API isteği başarısız')
      }

      toast.success(`${selectedTeachers.length} öğretmene mesaj başarıyla gönderildi!`)
      setMesajModalOpen(false)
      setMesajData({ title: '', content: '', priority: 'NORMAL' })
      setSelectedTeachers([])
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      toast.error('Mesaj gönderilirken hata oluştu!')
    } finally {
      setSending(false)
    }
  }

  // Fetch security statuses for all teachers
  useEffect(() => {
    const fetchSecurityStatuses = async () => {
      const statuses: Record<string, any> = {}
      await Promise.all(
        ogretmenler.map(async (ogretmen) => {
          try {
            const response = await fetch('/api/admin/security/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entityType: 'teacher', entityId: ogretmen.id })
            })
            if (response.ok) {
              const status = await response.json()
              statuses[ogretmen.id] = status
            }
          } catch (error) {
            // Ignore errors for individual teachers
          }
        })
      )
      setSecurityStatuses(statuses)
    }

    if (ogretmenler.length > 0) {
      fetchSecurityStatuses()
    }
  }, [ogretmenler])

  // Handle unlock teacher
  const handleUnlockTeacher = async (teacherId: string) => {
    setUnlockingTeachers(prev => new Set(prev).add(teacherId))
    try {
      const response = await fetch('/api/admin/security/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'teacher', entityId: teacherId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Blok açılırken hata oluştu')
      }

      toast.success('Öğretmen bloğu başarıyla açıldı!')
      
      // Refresh security status for this teacher
      const statusResponse = await fetch('/api/admin/security/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'teacher', entityId: teacherId })
      })
      
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        setSecurityStatuses(prev => ({ ...prev, [teacherId]: status }))
      }
    } catch (error: any) {
      toast.error(error.message || 'Blok açılırken hata oluştu.')
    } finally {
      setUnlockingTeachers(prev => {
        const newSet = new Set(prev)
        newSet.delete(teacherId)
        return newSet
      })
    }
  }

  // Handle view teacher statistics
  const handleViewStatistics = async (teacher: Ogretmen) => {
    setLoadingStatistics(true)
    setStatisticsModalOpen(true)
    setStatisticsData(null)
    setActiveAccordion(null) // Accordion'u sıfırla

    try {
      const response = await fetch(`/api/admin/teachers/${teacher.id}/statistics`)
      
      if (!response.ok) {
        throw new Error('İstatistikler alınırken hata oluştu')
      }

      const data = await response.json()
      setStatisticsData(data)
    } catch (error: any) {
      console.error('İstatistik alma hatası:', error)
      toast.error(error.message || 'İstatistikler alınırken hata oluştu')
      setStatisticsModalOpen(false)
    } finally {
      setLoadingStatistics(false)
    }
  }

  // Handle accordion toggle
  const toggleAccordion = (section: 'companies' | 'students' | 'changes') => {
    setActiveAccordion(activeAccordion === section ? null : section)
  }

  const isAllSelected = ogretmenler.length > 0 && selectedTeachers.length === ogretmenler.length
  const isPartiallySelected = selectedTeachers.length > 0 && selectedTeachers.length < ogretmenler.length

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Bulk Actions */}
        {selectedTeachers.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <span className="text-xs sm:text-sm text-blue-700">
                {selectedTeachers.length} öğretmen seçildi
              </span>
              <button
                onClick={() => setMesajModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                Mesaj Gönder
              </button>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="block md:hidden">
          <div className="p-3 bg-gray-50 border-b">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isPartiallySelected
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700">Tümünü Seç</span>
            </label>
          </div>
          <div className="divide-y divide-gray-200">
            {ogretmenler.map((ogretmen: Ogretmen) => (
              <div key={ogretmen.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.includes(ogretmen.id)}
                    onChange={(e) => handleSelectTeacher(ogretmen.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                     <div className="flex items-start justify-between">
                       <div className="flex-1 min-w-0 pr-2">
                         <h3 className="text-sm font-medium text-gray-900 truncate">
                           <Link
                             href={`/admin/ogretmenler/${ogretmen.id}`}
                             className="hover:text-blue-600"
                           >
                             {ogretmen.ad} {ogretmen.soyad}
                           </Link>
                         </h3>
                         <div className="mt-1 space-y-1">
                           {ogretmen.alanlar && (
                             <p className="text-xs text-gray-600 truncate">
                               <span className="font-medium">Alan:</span>{' '}
                               {Array.isArray(ogretmen.alanlar)
                                 ? ogretmen.alanlar[0]?.ad || 'Bilinmiyor'
                                 : (ogretmen.alanlar as any)?.ad || 'Bilinmiyor'
                               }
                             </p>
                           )}
                           {ogretmen.email && (
                             <div className="flex items-center gap-1 text-xs text-gray-600 min-w-0">
                               <Mail className="w-3 h-3 flex-shrink-0" />
                               <span className="truncate min-w-0">{ogretmen.email}</span>
                             </div>
                           )}
                           {ogretmen.telefon && (
                             <div className="flex items-center gap-1 text-xs text-gray-600">
                               <Phone className="w-3 h-3 flex-shrink-0" />
                               <a 
                                 href={`tel:${ogretmen.telefon}`}
                                 className="truncate text-blue-600 hover:text-blue-800 hover:underline"
                               >
                                 {ogretmen.telefon}
                               </a>
                             </div>
                           )}
                           <div className="flex items-center gap-3 text-xs text-gray-600 mt-2 flex-wrap">
                             <button
                               onClick={() => handleViewStatistics(ogretmen)}
                               className="flex items-center gap-1 flex-shrink-0 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                               title="İstatistikleri Görüntüle"
                             >
                               <Building2 className="w-3 h-3" />
                               {ogretmen.koordinatorlukCount} işletme
                             </button>
                             <button
                               onClick={() => handleViewStatistics(ogretmen)}
                               className="flex items-center gap-1 flex-shrink-0 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                               title="İstatistikleri Görüntüle"
                             >
                               <User className="w-3 h-3" />
                               {ogretmen.stajlarCount} öğrenci
                             </button>
                           </div>
                         </div>
                       </div>
                      <div className="flex flex-col gap-2 ml-2">
                        <Link
                          href={`/admin/temporal/teacher-history?teacherId=${ogretmen.id}`}
                          className="text-purple-600 hover:text-purple-900 p-2 rounded-md hover:bg-purple-50"
                          title="Öğretmen Geçmişi"
                        >
                          <History className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/ogretmenler/${ogretmen.id}`}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <QuickPinButton
                          ogretmen={{
                            id: ogretmen.id,
                            ad: ogretmen.ad,
                            soyad: ogretmen.soyad
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isPartiallySelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Öğretmen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alan
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İstatistikler
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ogretmenler.map((ogretmen: Ogretmen) => (
                <tr key={ogretmen.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(ogretmen.id)}
                      onChange={(e) => handleSelectTeacher(ogretmen.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <Link
                            href={`/admin/ogretmenler/${ogretmen.id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {ogretmen.ad} {ogretmen.soyad}
                          </Link>
                        </div>
                        <div className="space-y-1 mt-1">
                          {ogretmen.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {ogretmen.email}
                            </div>
                          )}
                          {ogretmen.telefon && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              <a 
                                href={`tel:${ogretmen.telefon}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {ogretmen.telefon}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ogretmen.alanlar ? (
                      <div className="text-sm text-gray-900">
                        {Array.isArray(ogretmen.alanlar)
                          ? ogretmen.alanlar[0]?.ad || 'Bilinmiyor'
                          : (ogretmen.alanlar as any)?.ad || 'Bilinmiyor'
                        }
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-center space-y-1">
                      <button
                        onClick={() => handleViewStatistics(ogretmen)}
                        className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer block w-full"
                        title="İstatistikleri Görüntüle"
                      >
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {ogretmen.koordinatorlukCount} işletme
                      </button>
                      <button
                        onClick={() => handleViewStatistics(ogretmen)}
                        className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer block w-full"
                        title="İstatistikleri Görüntüle"
                      >
                        <User className="w-3 h-3 inline mr-1" />
                        {ogretmen.stajlarCount} öğrenci
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/admin/temporal/teacher-history?teacherId=${ogretmen.id}`}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                        title="Öğretmen Geçmişi"
                      >
                        <History className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/ogretmenler/${ogretmen.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Detayları Görüntüle"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <QuickPinButton
                        ogretmen={{
                          id: ogretmen.id,
                          ad: ogretmen.ad,
                          soyad: ogretmen.soyad
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mesaj Gönderme Modalı */}
      <Modal
        isOpen={mesajModalOpen}
        onClose={() => setMesajModalOpen(false)}
        title="Seçili Öğretmenlere Mesaj Gönder"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Bell className="h-5 w-5" />
              <span className="font-medium">
                {selectedTeachers.length} öğretmene mesaj gönderilecek
              </span>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Seçili öğretmenler: {ogretmenler
                .filter(o => selectedTeachers.includes(o.id))
                .map(o => `${o.ad} ${o.soyad}`)
                .join(', ')
              }
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={mesajData.title}
              onChange={(e) => setMesajData({...mesajData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mesaj başlığını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçerik <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mesajData.content}
              onChange={(e) => setMesajData({...mesajData, content: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mesaj içeriğini girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öncelik
            </label>
            <select
              value={mesajData.priority}
              onChange={(e) => setMesajData({...mesajData, priority: e.target.value as 'LOW' | 'NORMAL' | 'HIGH'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LOW">Düşük</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Yüksek</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setMesajModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={sending}
            >
              İptal
            </button>
            <button
              onClick={handleSendMesaj}
              disabled={sending}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50"
            >
              {sending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Öğretmen İstatistikleri Modalı */}
      <Modal
        isOpen={statisticsModalOpen}
        onClose={() => setStatisticsModalOpen(false)}
        title="Öğretmen İstatistikleri"
      >
        {loadingStatistics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">İstatistikler yükleniyor...</span>
          </div>
        ) : statisticsData ? (
          <div className="space-y-6">
            {/* Öğretmen Bilgileri */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{statisticsData.teacherName}</h3>
                  <p className="text-sm text-gray-600">Öğretmen İstatistikleri</p>
                </div>
              </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Toplam İşletme</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">{statisticsData.totalCompanies}</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Aktif Öğrenci</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">{statisticsData.totalStudents}</p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Fesih Olan</span>
                </div>
                <p className="text-2xl font-bold text-red-900 mt-1">{statisticsData.terminatedInternships}</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Başkasına Verilen</span>
                </div>
                <p className="text-2xl font-bold text-orange-900 mt-1">{statisticsData.transferredToOthers}</p>
              </div>
            </div>

            {/* İşletmeler Accordion */}
            {statisticsData.companies.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleAccordion('companies')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Koordinatörlüğündeki İşletmeler ({statisticsData.companies.length})
                    </h4>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                    activeAccordion === 'companies' ? 'rotate-90' : ''
                  }`} />
                </button>
                
                <div className={`border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
                  activeAccordion === 'companies' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşletme Adı
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İletişim
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Toplam Öğrenci
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statisticsData.companies.map((company) => (
                          <tr key={company.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                            {company.contact && (
                              <div className="text-sm text-gray-600">{company.contact}</div>
                            )}
                            {company.phone && (
                              <div className="text-sm text-blue-600">
                                <a href={`tel:${company.phone}`} className="hover:underline">
                                  {company.phone}
                                </a>
                              </div>
                            )}
                            {company.masterTeacherName && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Usta: </span>
                                {company.masterTeacherName}
                              </div>
                            )}
                            {company.masterTeacherPhone && (
                              <div className="text-sm text-blue-600">
                                <a href={`tel:${company.masterTeacherPhone}`} className="hover:underline">
                                  {company.masterTeacherPhone}
                                </a>
                              </div>
                            )}
                          </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-medium text-gray-900">{company.studentCount}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Öğrenciler Accordion */}
            {statisticsData.students.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleAccordion('students')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Sorumlu Olduğu Öğrenciler ({statisticsData.students.length})
                    </h4>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                    activeAccordion === 'students' ? 'rotate-90' : ''
                  }`} />
                </button>
                
                <div className={`border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
                  activeAccordion === 'students' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Öğrenci Bilgileri
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşletme & İletişim
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarihler
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statisticsData.students.map((student) => (
                          <tr key={`${student.id}_${student.internshipId}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                {student.number && (
                                  <div className="text-xs text-gray-600">No: {student.number}</div>
                                )}
                                {student.fieldName && (
                                  <div className="text-xs text-blue-600 font-medium">{student.fieldName}</div>
                                )}
                                {student.email && (
                                  <div className="text-xs text-gray-500">{student.email}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">{student.companyName || '-'}</div>
                                {student.companyContact && (
                                  <div className="text-xs text-gray-600">{student.companyContact}</div>
                                )}
                                {student.companyPhone && (
                                  <div className="text-xs text-blue-600">
                                    <a href={`tel:${student.companyPhone}`} className="hover:underline">
                                      {student.companyPhone}
                                    </a>
                                  </div>
                                )}
                                {student.masterTeacherName && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Usta: </span>
                                    {student.masterTeacherName}
                                  </div>
                                )}
                                {student.masterTeacherPhone && (
                                  <div className="text-xs text-blue-600">
                                    <a href={`tel:${student.masterTeacherPhone}`} className="hover:underline">
                                      {student.masterTeacherPhone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-sm text-gray-600">
                                {student.startDate && (
                                  <div className="font-medium">
                                    {new Date(student.startDate).toLocaleDateString('tr-TR')}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  {student.status === 'TERMINATED' && student.terminationDate ? (
                                    <span className="text-red-600">
                                      Fesih: {new Date(student.terminationDate).toLocaleDateString('tr-TR')}
                                    </span>
                                  ) : student.endDate ? (
                                    <span>
                                      Bitiş: {new Date(student.endDate).toLocaleDateString('tr-TR')}
                                    </span>
                                  ) : (
                                    <span className="text-green-600">Devam ediyor</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                student.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                student.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                student.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {student.status === 'ACTIVE' ? 'Aktif' :
                                 student.status === 'COMPLETED' ? 'Tamamlandı' :
                                 student.status === 'TERMINATED' ? 'Fesih' :
                                 student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Öğretmen Değişiklikleri Accordion */}
            {statisticsData.teacherChanges && statisticsData.teacherChanges.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleAccordion('changes')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      Başkasına Verilen Koordinatörlükler ({statisticsData.teacherChanges.length})
                    </h4>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                    activeAccordion === 'changes' ? 'rotate-90' : ''
                  }`} />
                </button>
                
                <div className={`border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
                  activeAccordion === 'changes' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşletme Adı
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Yeni Koordinatör
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Değişiklik Tarihi
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sebep
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statisticsData.teacherChanges.map((change) => (
                          <tr key={change.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{change.companyName}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{change.newTeacherName}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="text-sm text-gray-600">
                                {new Date(change.assignedAt).toLocaleDateString('tr-TR')}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-600">{change.reason || 'Belirtilmemiş'}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Veri yoksa mesaj */}
            {statisticsData.companies.length === 0 && statisticsData.students.length === 0 &&
             statisticsData.teacherChanges.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz veri yok</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bu öğretmene ait işletme veya öğrenci kaydı bulunmuyor.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">İstatistik yüklenemedi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Öğretmen istatistikleri alınırken bir hata oluştu.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}