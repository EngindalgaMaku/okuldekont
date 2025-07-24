'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, Info, Building2, Send, Bell, Shield, Unlock } from 'lucide-react'
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
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
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
                               <span className="truncate">{ogretmen.telefon}</span>
                             </div>
                           )}
                           <div className="flex items-center gap-3 text-xs text-gray-600 mt-2 flex-wrap">
                             <span className="flex items-center gap-1 flex-shrink-0">
                               <Building2 className="w-3 h-3" />
                               {ogretmen.koordinatorlukCount} işletme
                             </span>
                             <span className="flex items-center gap-1 flex-shrink-0">
                               <User className="w-3 h-3" />
                               {ogretmen.stajlarCount} öğrenci
                             </span>
                           </div>
                         </div>
                       </div>
                      <div className="flex flex-col gap-2 ml-2">
                        <Link
                          href={`/admin/ogretmenler/${ogretmen.id}`}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                          title="Detayları Görüntüle"
                        >
                          <Info className="w-4 h-4" />
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
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
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
                              {ogretmen.telefon}
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
                      <div className="text-sm text-gray-400">Atanmamış</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-center space-y-1">
                      <div className="text-xs text-gray-600">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {ogretmen.koordinatorlukCount} işletme
                      </div>
                      <div className="text-xs text-gray-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {ogretmen.stajlarCount} öğrenci
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/admin/ogretmenler/${ogretmen.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Detayları Görüntüle"
                      >
                        <Info className="w-4 h-4" />
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
    </>
  )
}