'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, Send, Bell, Building, Search, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import IsletmeRow from './IsletmeRow'

interface Isletme {
  id: string
  ad: string
  yetkili_kisi?: string
  telefon?: string
  email?: string
}

interface Props {
  isletmeler: Isletme[]
  fullIsletmeler: any[]
  searchParams: any
  pagination: any
}

export default function IsletmelerClient({ isletmeler, fullIsletmeler, searchParams, pagination }: Props) {
  const [selectedIsletmeler, setSelectedIsletmeler] = useState<string[]>([])
  const [mesajModalOpen, setMesajModalOpen] = useState(false)
  const [mesajData, setMesajData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high'
  })
  const [sending, setSending] = useState(false)

  const createSearchURL = (newParams: any) => {
    const params = new URLSearchParams()
    
    // Keep existing params and override with new ones
    const current = {
      page: searchParams.page || '1',
      search: searchParams.search || '',
      filter: searchParams.filter || 'aktif',
      per_page: searchParams.per_page || '10',
      ...newParams
    }

    // Only add non-empty params
    Object.entries(current).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'aktif') {
        params.set(key, String(value))
      }
    })

    return `/admin/isletmeler?${params.toString()}`
  }

  const handleSelectAll = () => {
    if (selectedIsletmeler.length === fullIsletmeler.length) {
      setSelectedIsletmeler([])
    } else {
      setSelectedIsletmeler(fullIsletmeler.map(i => i.id))
    }
  }

  const handleSelectOne = (isletmeId: string) => {
    setSelectedIsletmeler(prev =>
      prev.includes(isletmeId)
        ? prev.filter(id => id !== isletmeId)
        : [...prev, isletmeId]
    )
  }

  const handleSendMesaj = async () => {
    if (!mesajData.title.trim() || !mesajData.content.trim()) {
      alert('Başlık ve içerik zorunludur!')
      return
    }

    if (selectedIsletmeler.length === 0) {
      alert('Lütfen en az bir işletme seçin!')
      return
    }

    setSending(true)
    try {
      // Seçili işletmelere mesaj gönder
      const notifications = selectedIsletmeler.map(isletmeId => ({
        recipient_id: isletmeId,
        recipient_type: 'isletme',
        title: mesajData.title,
        content: mesajData.content,
        priority: mesajData.priority,
        sent_by: 'Admin',
        is_read: false
      }))

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) {
        console.error('Mesaj gönderme hatası:', error)
        alert('Mesajlar gönderilirken bir hata oluştu!')
        return
      }

      alert(`${selectedIsletmeler.length} işletmeye mesaj başarıyla gönderildi!`)
      setMesajModalOpen(false)
      setMesajData({ title: '', content: '', priority: 'normal' })
      setSelectedIsletmeler([])
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      alert('Bir hata oluştu!')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-[95%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                İşletme Yönetimi
              </h1>
              <p className="text-gray-600 mt-2">Staj yapacak işletmeleri yönetin ve bilgilerini güncelleyin.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/admin/isletmeler/yeni"
                className="inline-flex items-center p-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                title="Yeni İşletme Ekle"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border border-indigo-100 overflow-hidden">
            {/* Search and Filters */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                {/* Search Form */}
                <form action="/admin/isletmeler" method="GET" className="flex items-center gap-2 flex-1 max-w-md">
                  {/* Hidden inputs to preserve other params */}
                  {searchParams.filter && <input type="hidden" name="filter" value={searchParams.filter} />}
                  {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
                  
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="search"
                      defaultValue={searchParams.search || ''}
                      placeholder="İşletme adı, yetkili, telefon, koordinatör veya aktif öğrenci ara..."
                      className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/70"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Ara
                  </button>
                </form>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    {pagination.total} işletme gösteriliyor
                  </span>
                  
                  {/* Filter Form */}
                  <form action="/admin/isletmeler" method="GET" className="flex items-center gap-2">
                    {/* Preserve other params */}
                    {searchParams.search && <input type="hidden" name="search" value={searchParams.search} />}
                    {searchParams.per_page && <input type="hidden" name="per_page" value={searchParams.per_page} />}
                    
                    <select
                      name="filter"
                      defaultValue={searchParams.filter || 'aktif'}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="aktif">Aktif İşletmeler</option>
                      <option value="tum">Tüm İşletmeler</option>
                    </select>
                  </form>

                  {/* Active filters display */}
                  {searchParams.search && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                        Arama: "{searchParams.search}"
                      </span>
                      <Link
                        href={createSearchURL({ search: undefined })}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Temizle
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected businesses action bar */}
            {selectedIsletmeler.length > 0 && (
              <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-indigo-700">
                      {selectedIsletmeler.length} işletme seçildi
                    </span>
                    <button
                      onClick={() => handleSelectAll()}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Seçimi temizle
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMesajModalOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Mesaj Gönder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            {fullIsletmeler.length > 0 ? (
              <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div>
                    Toplam <span className="font-medium text-gray-900">{pagination.total}</span> kayıttan{' '}
                    <span className="font-medium text-gray-900">
                      {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)}
                    </span> arası gösteriliyor
                  </div>
                  <div>
                    Sayfa {pagination.page} / {pagination.totalPages}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {!searchParams.search && !searchParams.filter ? 'Henüz işletme eklenmemiş' : 'Arama kriterlerinize uygun işletme bulunamadı'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {!searchParams.search && !searchParams.filter
                    ? 'İlk işletmenizi eklemek için yukarıdaki "Yeni İşletme Ekle" butonunu kullanın.'
                    : 'Farklı arama terimleri deneyin.'
                  }
                </p>
                {searchParams.search && (
                  <Link
                    href={createSearchURL({ search: undefined })}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Aramayı Temizle
                  </Link>
                )}
              </div>
            )}
            
            {fullIsletmeler.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="w-12 px-3 py-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleSelectAll()}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Tümünü seç/seçimi kaldır"
                            >
                              {selectedIsletmeler.length === fullIsletmeler.length && fullIsletmeler.length > 0 ? (
                                <CheckSquare className="h-4 w-4 text-indigo-600" />
                              ) : selectedIsletmeler.length > 0 ? (
                                <Square className="h-4 w-4 text-indigo-400" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          İşletme
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Koordinatör
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Aktif Öğrenciler
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Detay
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/60 divide-y divide-gray-200">
                      {fullIsletmeler.map((isletme) => (
                        <IsletmeRow
                          key={isletme.id}
                          isletme={isletme}
                          isSelected={selectedIsletmeler.includes(isletme.id)}
                          onSelectionChange={(id, selected) => {
                            handleSelectOne(id)
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Toplam <span className="font-medium text-gray-900">{pagination.total}</span> kayıttan{' '}
                        <span className="font-medium text-gray-900">
                          {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)}
                        </span> arası gösteriliyor
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* First Page */}
                        {pagination.page > 1 && (
                          <Link
                            href={createSearchURL({ page: '1' })}
                            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="İlk sayfa"
                          >
                            <ChevronsLeft className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {/* Previous Page */}
                        {pagination.page > 1 && (
                          <Link
                            href={createSearchURL({ page: (pagination.page - 1).toString() })}
                            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Önceki sayfa"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {/* Page Numbers */}
                        <div className="flex space-x-1">
                          {(() => {
                            const startPage = Math.max(1, pagination.page - 2)
                            const endPage = Math.min(pagination.totalPages, pagination.page + 2)
                            const pages = []

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <Link
                                  key={i}
                                  href={createSearchURL({ page: i.toString() })}
                                  className={`inline-flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    i === pagination.page
                                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {i}
                                </Link>
                              )
                            }

                            return pages
                          })()}
                        </div>
                        
                        {/* Next Page */}
                        {pagination.page < pagination.totalPages && (
                          <Link
                            href={createSearchURL({ page: (pagination.page + 1).toString() })}
                            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Sonraki sayfa"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {/* Last Page */}
                        {pagination.page < pagination.totalPages && (
                          <Link
                            href={createSearchURL({ page: pagination.totalPages.toString() })}
                            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Son sayfa"
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mesaj Gönderme Modalı */}
      <Modal
        isOpen={mesajModalOpen}
        onClose={() => setMesajModalOpen(false)}
        title="Seçili İşletmelere Mesaj Gönder"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Bell className="h-5 w-5" />
              <span className="font-medium">
                {selectedIsletmeler.length} işletmeye mesaj gönderilecek
              </span>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Seçili işletmeler: {isletmeler
                .filter(i => selectedIsletmeler.includes(i.id))
                .map(i => i.ad)
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
              onChange={(e) => setMesajData({...mesajData, priority: e.target.value as 'low' | 'normal' | 'high'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
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