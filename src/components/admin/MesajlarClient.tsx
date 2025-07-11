'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageCircle, Users, FileText, Eye, Trash2, Plus, Edit3, Search, Filter, Clock, CheckCircle2, MessageSquare, Save, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'

// TypeScript interfaces
interface Notification {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high'
  sent_by: string
  recipient_type: 'isletme' | 'ogretmen'
  recipient_id: string
  is_read: boolean
  read_at?: string
  created_at: string
  isletme?: {
    id: string
    ad: string
    yetkili_kisi: string
  }
  ogretmen?: {
    id: string
    ad: string
    soyad: string
  }
}

interface MessageFileText {
  id: string
  title: string
  content: string
  category: string
  created_at: string
}

interface Business {
  id: string
  ad: string
  yetkili_kisi: string
}

interface Teacher {
  id: string
  ad: string
  soyad: string
  email: string
}

interface MesajlarClientProps {
  gidenMesajlar: Notification[]
  sablonlar: MessageFileText[]
  isletmeler: Business[]
  ogretmenler: Teacher[]
  onRefresh: () => void
}

const priorityColors = {
  low: 'bg-green-100 text-green-700',
  normal: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
}

const priorityLabels = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek'
}

export default function MesajlarClient({ 
  gidenMesajlar = [], 
  sablonlar = [], 
  isletmeler = [], 
  ogretmenler = [],
  onRefresh 
}: MesajlarClientProps) {
  const [activeTab, setActiveTab] = useState<'giden' | 'sablonlar' | 'yeni'>('giden')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRecipient, setFilterRecipient] = useState<'all' | 'isletme' | 'ogretmen'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all')
  
  // Modal states
  const [templateModalOpen, setFileTextModalOpen] = useState(false)
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false)
  const [messageDetailModalOpen, setMessageDetailModalOpen] = useState(false)
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Notification | null>(null)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  
  // Form states
  const [templateForm, setFileTextForm] = useState({
    title: '',
    content: '',
    category: ''
  })
  
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    recipientType: 'isletme' as 'isletme' | 'ogretmen',
    selectedRecipients: [] as string[],
    useFileText: false,
    selectedFileText: ''
  })

  // Filter messages
  const filteredMessages = gidenMesajlar.filter(message => {
    const matchesSearch = message.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRecipient = filterRecipient === 'all' || message.recipient_type === filterRecipient
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'read' && message.is_read) ||
                         (filterStatus === 'unread' && !message.is_read)
    
    return matchesSearch && matchesRecipient && matchesStatus
  })

  // Get message statistics
  const stats = {
    total: gidenMesajlar.length,
    read: gidenMesajlar.filter(m => m.is_read).length,
    unread: gidenMesajlar.filter(m => !m.is_read).length,
    business: gidenMesajlar.filter(m => m.recipient_type === 'isletme').length,
    teacher: gidenMesajlar.filter(m => m.recipient_type === 'ogretmen').length
  }

  const handleCreateFileText = async () => {
    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      alert('Başlık ve içerik zorunludur!')
      return
    }

    try {
      const { error } = await supabase
        .from('mesaj_sablonlari')
        .insert({
          title: templateForm.title,
          content: templateForm.content,
          category: templateForm.category || 'Genel'
        })

      if (error) {
        console.error('Şablon oluşturma hatası:', error)
        alert('Şablon tablosu henüz oluşturulmamış. Lütfen sistem yöneticisine başvurun.')
        return
      }

      setFileTextForm({ title: '', content: '', category: '' })
      setFileTextModalOpen(false)
      onRefresh()
      alert('Şablon başarıyla oluşturuldu!')
    } catch (error) {
      console.error('Şablon oluşturma hatası:', error)
      alert('Şablon tablosu henüz oluşturulmamış. Lütfen sistem yöneticisine başvurun.')
    }
  }

  const handleSendMessage = async () => {
    console.log('🔥 handleSendMessage çağrıldı')
    console.log('📝 messageForm:', messageForm)
    
    if (!messageForm.title.trim() || !messageForm.content.trim()) {
      console.log('❌ Başlık veya içerik boş')
      alert('Başlık ve içerik zorunludur!')
      return
    }

    if (messageForm.selectedRecipients.length === 0) {
      console.log('❌ Alıcı seçilmemiş')
      alert('En az bir alıcı seçmelisiniz!')
      return
    }

    console.log('✅ Validasyon geçti, mesaj gönderiliyor...')
    try {
      // Dinamik değişkenleri değiştir
      const notifications = messageForm.selectedRecipients.map(recipientId => {
        let personalizedTitle = messageForm.title
        let personalizedContent = messageForm.content
        
        if (messageForm.recipientType === 'isletme') {
          // İşletme için değişkenler
          const business = isletmeler.find(b => b.id === recipientId)
          if (business) {
            personalizedTitle = personalizedTitle.replace(/{isletmeyetkilisi}/g, business.yetkili_kisi)
            personalizedContent = personalizedContent.replace(/{isletmeyetkilisi}/g, business.yetkili_kisi)
            personalizedTitle = personalizedTitle.replace(/{isletmeadi}/g, business.ad)
            personalizedContent = personalizedContent.replace(/{isletmeadi}/g, business.ad)
          }
        } else if (messageForm.recipientType === 'ogretmen') {
          // Öğretmen için değişkenler
          const teacher = ogretmenler.find(t => t.id === recipientId)
          if (teacher) {
            const fullName = `${teacher.ad} ${teacher.soyad}`
            personalizedTitle = personalizedTitle.replace(/{ogretmenadi}/g, fullName)
            personalizedContent = personalizedContent.replace(/{ogretmenadi}/g, fullName)
          }
        }
        
        return {
          title: personalizedTitle,
          content: personalizedContent,
          priority: messageForm.priority,
          sent_by: 'Okul İdaresi',
          recipient_type: messageForm.recipientType,
          recipient_id: recipientId,
          is_read: false
        }
      })

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) {
        console.error('Mesaj gönderme hatası:', error)
        alert('Mesaj gönderilirken bir hata oluştu!')
        return
      }

      setMessageForm({
        title: '',
        content: '',
        priority: 'normal',
        recipientType: 'isletme',
        selectedRecipients: [],
        useFileText: false,
        selectedFileText: ''
      })
      setNewMessageModalOpen(false)
      onRefresh()
      alert('Mesaj başarıyla gönderildi!')
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  const handleFileTextSelect = (templateId: string) => {
    const template = sablonlar.find(t => t.id === templateId)
    if (template) {
      setMessageForm(prev => ({
        ...prev,
        title: template.title,
        content: template.content,
        selectedFileText: templateId
      }))
    }
  }

  const handleDeleteFileText = async (templateId: string) => {
    if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('mesaj_sablonlari')
        .delete()
        .eq('id', templateId)

      if (error) {
        console.error('Şablon silme hatası:', error)
        alert('Şablon tablosu bulunamadı. Lütfen sistem yöneticisine başvurun.')
        return
      }

      onRefresh()
      alert('Şablon başarıyla silindi!')
    } catch (error) {
      console.error('Şablon silme hatası:', error)
      alert('Şablon tablosu bulunamadı. Lütfen sistem yöneticisine başvurun.')
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteConfirmModalOpen(true)
  }

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', messageToDelete)

      if (error) {
        console.error('Mesaj silme hatası:', error)
        alert('Mesaj silinirken bir hata oluştu!')
        return
      }

      setDeleteConfirmModalOpen(false)
      setMessageToDelete(null)
      onRefresh()
    } catch (error) {
      console.error('Mesaj silme hatası:', error)
      alert('Bir hata oluştu!')
    }
  }

  const toggleRecipientSelection = (recipientId: string) => {
    setMessageForm(prev => ({
      ...prev,
      selectedRecipients: prev.selectedRecipients.includes(recipientId)
        ? prev.selectedRecipients.filter(id => id !== recipientId)
        : [...prev.selectedRecipients, recipientId]
    }))
  }

  const selectAllRecipients = () => {
    const allIds = messageForm.recipientType === 'isletme' 
      ? isletmeler.map(i => i.id)
      : ogretmenler.map(o => o.id)
    
    setMessageForm(prev => ({
      ...prev,
      selectedRecipients: prev.selectedRecipients.length === allIds.length ? [] : allIds
    }))
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Toplam Mesaj</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Okundu</p>
              <p className="text-2xl font-bold text-green-600">{stats.read}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Okunmadı</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.unread}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">İşletmeler</p>
              <p className="text-2xl font-bold text-purple-600">{stats.business}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-indigo-900">Öğretmenler</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.teacher}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'giden', label: 'Giden Mesajlar', icon: Send, count: stats.total },
            // Şablon özelliği geçici olarak devre dışı - tablo henüz oluşturulmamış
            // { id: 'sablonlar', label: 'Mesaj Şablonları', icon: FileText, count: sablonlar.length },
            { id: 'yeni', label: 'Yeni Mesaj', icon: Plus, count: null }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
                {tab.count !== null && (
                  <span className="bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'giden' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Mesajlarda ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={filterRecipient}
                onChange={(e) => setFilterRecipient(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tüm Alıcılar</option>
                <option value="isletme">İşletmeler</option>
                <option value="ogretmen">Öğretmenler</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="read">Okundu</option>
                <option value="unread">Okunmadı</option>
              </select>
            </div>

            {/* Messages List */}
            <div className="space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Mesaj Bulunamadı</h3>
                  <p className="mt-2 text-sm text-gray-500">Henüz mesaj gönderilmemiş veya arama kriterlerine uygun mesaj yok.</p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedMessage(message)
                      setMessageDetailModalOpen(true)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{message.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[message.priority]}`}>
                            {priorityLabels[message.priority]}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            message.is_read ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {message.is_read ? 'Okundu' : 'Okunmadı'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">{message.content}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            Alıcı: {message.recipient_type === 'isletme' ? message.isletme?.ad : `${message.ogretmen?.ad} ${message.ogretmen?.soyad}`}
                          </span>
                          <span>
                            {new Date(message.created_at).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMessage(message)
                            setMessageDetailModalOpen(true)
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Mesajı Görüntüle"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMessage(message.id)
                          }}
                          className="p-2 text-red-400 hover:text-red-600"
                          title="Mesajı Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sablonlar' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Mesaj Şablonları</h2>
              <button
                onClick={() => setFileTextModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Yeni Şablon
              </button>
            </div>

            <div className="grid gap-4">
              {sablonlar.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Şablon Bulunamadı</h3>
                  <p className="mt-2 text-sm text-gray-500">Henüz mesaj şablonu oluşturulmamış.</p>
                </div>
              ) : (
                sablonlar.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{template.title}</h3>
                        <p className="text-gray-600 mb-3">{template.content}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {template.category || 'Genel'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(template.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setMessageForm(prev => ({
                              ...prev,
                              title: template.title,
                              content: template.content
                            }))
                            setActiveTab('yeni')
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Şablonu Kullan"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFileText(template.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Şablonu Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'yeni' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Yeni Mesaj Gönder</h2>
            
            <div className="grid gap-6">
              {/* Şablon özelliği geçici olarak devre dışı - tablo henüz oluşturulmamış */}
              
              {/* Dinamik Değişkenler Bilgi Kutusu */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Dinamik Değişkenler</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Mesajlarınızda aşağıdaki değişkenleri kullanabilirsiniz. Gönderilirken otomatik olarak kişi bilgileriyle değiştirilir:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-2">
                    <span className="font-medium text-purple-700">İşletmeler için:</span>
                    <div className="mt-1 space-y-1">
                      <div><code className="bg-gray-100 px-1 rounded">{`{isletmeyetkilisi}`}</code> - Yetkili kişi adı</div>
                      <div><code className="bg-gray-100 px-1 rounded">{`{isletmeadi}`}</code> - İşletme adı</div>
                    </div>
                  </div>
                  <div className="bg-white rounded p-2">
                    <span className="font-medium text-green-700">Öğretmenler için:</span>
                    <div className="mt-1">
                      <div><code className="bg-gray-100 px-1 rounded">{`{ogretmenadi}`}</code> - Öğretmen adı soyadı</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mesaj Başlığı *
                </label>
                <input
                  type="text"
                  value={messageForm.title}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örnek: Sayın {isletmeyetkilisi}, dekont hatırlatması"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mesaj İçeriği *
                </label>
                <textarea
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örnek: Sayın {isletmeyetkilisi}, işletmeniz için gerekli belgeler..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öncelik
                </label>
                <select
                  value={messageForm.priority}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alıcı Türü
                </label>
                <select
                  value={messageForm.recipientType}
                  onChange={(e) => {
                    setMessageForm(prev => ({ 
                      ...prev, 
                      recipientType: e.target.value as any,
                      selectedRecipients: []
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="isletme">İşletmeler</option>
                  <option value="ogretmen">Öğretmenler</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Alıcılar *
                  </label>
                  <button
                    type="button"
                    onClick={selectAllRecipients}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {messageForm.selectedRecipients.length === (messageForm.recipientType === 'isletme' ? isletmeler : ogretmenler).length 
                      ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                  </button>
                </div>
                
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {messageForm.recipientType === 'isletme' ? (
                    isletmeler.map((business) => (
                      <label key={business.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={messageForm.selectedRecipients.includes(business.id)}
                          onChange={() => toggleRecipientSelection(business.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {business.ad} ({business.yetkili_kisi})
                        </span>
                      </label>
                    ))
                  ) : (
                    ogretmenler.map((teacher) => (
                      <label key={teacher.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={messageForm.selectedRecipients.includes(teacher.id)}
                          onChange={() => toggleRecipientSelection(teacher.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {teacher.ad} {teacher.soyad} ({teacher.email})
                        </span>
                      </label>
                    ))
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  {messageForm.selectedRecipients.length} alıcı seçildi
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendMessage}
                  disabled={!messageForm.title || !messageForm.content || messageForm.selectedRecipients.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                  Mesaj Gönder
                </button>
                
                {/* Şablon olarak kaydet butonu geçici olarak devre dışı - tablo henüz oluşturulmamış */}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FileText Modal */}
      <Modal isOpen={templateModalOpen} onClose={() => setFileTextModalOpen(false)} title="Yeni Şablon Oluştur">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon Başlığı *
            </label>
            <input
              type="text"
              value={templateForm.title}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Şablon başlığını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <input
              type="text"
              value={templateForm.category}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kategori (opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon İçeriği *
            </label>
            <textarea
              value={templateForm.content}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Şablon içeriğini girin"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setFileTextModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleCreateFileText}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Şablon Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* Message Detail Modal */}
      <Modal 
        isOpen={messageDetailModalOpen} 
        onClose={() => setMessageDetailModalOpen(false)} 
        title="Mesaj Detayları"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-medium text-gray-900">{selectedMessage.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[selectedMessage.priority]}`}>
                  {priorityLabels[selectedMessage.priority]}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedMessage.is_read ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedMessage.is_read ? 'Okundu' : 'Okunmadı'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Alıcı:</span>
                  <p className="text-gray-900">
                    {selectedMessage.recipient_type === 'isletme' 
                      ? selectedMessage.isletme?.ad 
                      : `${selectedMessage.ogretmen?.ad} ${selectedMessage.ogretmen?.soyad}`}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Gönderim Tarihi:</span>
                  <p className="text-gray-900">
                    {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
                {selectedMessage.is_read && selectedMessage.read_at && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Okunma Tarihi:</span>
                    <p className="text-gray-900">
                      {new Date(selectedMessage.read_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Mesaj İçeriği:</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  setMessageDetailModalOpen(false)
                  handleDeleteMessage(selectedMessage.id)
                }}
                className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Mesajı Sil
              </button>
              <button
                onClick={() => setMessageDetailModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Save as FileText Modal */}
      <Modal 
        isOpen={newMessageModalOpen} 
        onClose={() => setNewMessageModalOpen(false)} 
        title="Mesajı Şablon Olarak Kaydet"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon Başlığı *
            </label>
            <input
              type="text"
              value={templateForm.title || messageForm.title}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Şablon başlığını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <input
              type="text"
              value={templateForm.category}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Kategori (opsiyonel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon İçeriği *
            </label>
            <textarea
              value={templateForm.content || messageForm.content}
              onChange={(e) => setFileTextForm(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Şablon içeriğini girin"
              readOnly
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setNewMessageModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => {
                setFileTextForm(prev => ({
                  ...prev,
                  title: prev.title || messageForm.title,
                  content: prev.content || messageForm.content
                }))
                handleCreateFileText()
                setNewMessageModalOpen(false)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Şablon Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModalOpen}
        onClose={() => {
          setDeleteConfirmModalOpen(false)
          setMessageToDelete(null)
        }}
        title="Mesaj Silme Onayı"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ⚠️ DİKKAT!
              </h3>
              <p className="text-gray-600">
                Bu mesajı silmek istediğinize emin misiniz?
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="space-y-2 text-sm text-yellow-800">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                <span>Mesaj kalıcı olarak silinecektir</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                <span>Alıcının panelinden de otomatik olarak kaldırılacaktır</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                <span>Bu işlem geri alınamaz</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setDeleteConfirmModalOpen(false)
                setMessageToDelete(null)
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={confirmDeleteMessage}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Evet, Sil
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}