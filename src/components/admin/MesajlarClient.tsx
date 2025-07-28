'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Search, 
  Plus, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  Settings,
  Users,
  Archive,
  Trash2,
  Reply,
  Edit,
  Check,
  CheckCheck,
  Circle,
  ArrowLeft,
  X,
  User
} from 'lucide-react'
import { ConversationSummary, MessageWithSender, ConversationDetails } from '@/lib/messaging/types'

interface MesajlarClientProps {
  gidenMesajlar: any[]
  sablonlar: any[]
  isletmeler: any[]
  ogretmenler: any[]
  onRefresh: () => void
}

interface ConversationListProps {
  conversations: ConversationSummary[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

interface MessageListProps {
  messages: MessageWithSender[]
  currentUserId: string
  onSendMessage: (content: string) => void
  onReply: (messageId: string) => void
  isLoading: boolean
}

interface ConversationHeaderProps {
  conversation: ConversationDetails | null
  onBack: () => void
  onCall?: () => void
  onVideoCall?: () => void
  onSettings?: () => void
}

function ConversationList({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation, 
  searchTerm, 
  onSearchChange 
}: ConversationListProps) {
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Mesajlar
          </h1>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Konuşmalarda ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageSquare className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-sm">Henüz konuşmanız yok</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🖱️ Konuşmaya tıklandı:', conversation.id, conversation.title)
                onSelectConversation(conversation.id)
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200 shadow-sm' : ''
              } active:bg-gray-100`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`relative flex-shrink-0`}>
                  {conversation.avatar ? (
                    <img
                      src={conversation.avatar}
                      alt={conversation.title || 'Konuşma'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      {conversation.isGroup ? (
                        <Users className="h-6 w-6 text-white" />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                  )}
                  
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.title || 'Adsız Konuşma'}
                    </h3>
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMessage.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {conversation.unreadCount > 0 && (
                        <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {conversation.lastMessage && (
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        <span className="font-medium">{conversation.lastMessage.senderName}:</span>{' '}
                        {conversation.lastMessage.content || 'Dosya gönderildi'}
                      </p>
                    </div>
                  )}
                  
                  {conversation.isGroup && (
                    <p className="text-xs text-gray-500 mt-1">
                      {conversation.participantCount} kişi
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ConversationHeader({ conversation, onBack, onCall, onVideoCall, onSettings }: ConversationHeaderProps) {
  if (!conversation) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          {/* Avatar */}
          <div className="relative">
            {conversation.avatar ? (
              <img
                src={conversation.avatar}
                alt={conversation.title || 'Konuşma'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                {conversation.isGroup ? (
                  <Users className="h-5 w-5 text-white" />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h2 className="font-semibold text-gray-900">
              {conversation.title || 'Adsız Konuşma'}
            </h2>
            <p className="text-sm text-gray-500">
              {conversation.isGroup 
                ? `${conversation.participants.length} kişi`
                : 'Aktif'
              }
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onCall && (
            <button
              onClick={onCall}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
          
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Video className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={onSettings}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn, onReply }: { 
  message: MessageWithSender, 
  isOwn: boolean,
  onReply: (messageId: string) => void 
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 px-3">{message.sender.name}</p>
        )}
        
        <div className={`relative rounded-lg px-4 py-2 ${
          isOwn 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}>
          {message.parent && (
            <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
              isOwn 
                ? 'bg-blue-700 border-blue-300' 
                : 'bg-gray-50 border-gray-300'
            }`}>
              <p className="font-medium">{message.parent.senderName}</p>
              <p className="truncate">{message.parent.content}</p>
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
            isOwn ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <span>
              {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {isOwn && (
              message.isRead ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )
            )}
          </div>
        </div>
      </div>

      {/* Message Actions */}
      {showActions && (
        <div className={`flex items-center gap-1 mx-2 ${isOwn ? 'order-1' : 'order-3'}`}>
          <button
            onClick={() => onReply(message.id)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Reply className="h-4 w-4" />
          </button>
          {isOwn && (
            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function MessageList({ messages, currentUserId, onSendMessage, onReply, isLoading }: MessageListProps) {
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
      setReplyingTo(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId)
    onReply(messageId)
  }

  const replyingMessage = replyingTo ? messages.find(m => m.id === replyingTo) : null

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Henüz mesaj yok</p>
            <p className="text-sm">Konuşmayı başlatmak için bir mesaj gönderin</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender.id === currentUserId}
                onReply={handleReply}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {replyingMessage && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Yanıtlanan mesaj:</p>
                <p className="text-sm font-medium">{replyingMessage.sender.name}</p>
                <p className="text-sm text-gray-600 truncate">{replyingMessage.content}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>

          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Smile className="h-5 w-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MesajlarClient({ 
  gidenMesajlar = [], 
  sablonlar = [], 
  isletmeler = [], 
  ogretmenler = [],
  onRefresh 
}: MesajlarClientProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetails | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileConversations, setShowMobileConversations] = useState(true)

  const currentUserId = 'temp-user-id' // TODO: Get from auth context

  // Mock data for demonstration
  useEffect(() => {
    console.log('🔄 Mock veriler yükleniyor...')
    const mockConversations: ConversationSummary[] = [
      {
        id: '1',
        title: 'Ahmet Yılmaz',
        type: 'DIRECT',
        isGroup: false,
        participantCount: 2,
        lastMessage: {
          id: '1',
          content: 'Merhaba, staj durumu hakkında bilgi alabilir miyim?',
          messageType: 'TEXT',
          senderName: 'Ahmet Yılmaz',
          createdAt: new Date().toISOString()
        },
        lastMessageAt: new Date().toISOString(),
        unreadCount: 2,
        isArchived: false,
        isActive: true
      },
      {
        id: '2',
        title: 'ABC Şirketi',
        type: 'DIRECT',
        isGroup: false,
        participantCount: 2,
        lastMessage: {
          id: '2',
          content: 'Öğrencilerimizin devam durumu çok iyi',
          messageType: 'TEXT',
          senderName: 'ABC Şirketi',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
        isArchived: false,
        isActive: true
      },
      {
        id: '3',
        title: 'Öğretmenler Grubu',
        type: 'GROUP',
        isGroup: true,
        participantCount: 8,
        lastMessage: {
          id: '3',
          content: 'Toplantı yarın saat 14:00\'te',
          messageType: 'TEXT',
          senderName: 'Mehmet Öz',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
        unreadCount: 1,
        isArchived: false,
        isActive: true
      }
    ]
    setConversations(mockConversations)
    console.log('✅ Mock veriler yüklendi:', mockConversations.length, 'konuşma')
  }, [])

  // Responsive handling
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  const handleSelectConversation = async (conversationId: string) => {
    console.log('🔥 Konuşma seçiliyor:', conversationId)
    
    try {
      setSelectedConversationId(conversationId)
      setIsLoading(true)
      
      if (isMobile) {
        setShowMobileConversations(false)
      }

      // Mock conversation details
      const selectedConv = conversations.find(c => c.id === conversationId)
      console.log('📝 Seçilen konuşma:', selectedConv)
      
      const mockConversation: ConversationDetails = {
        id: conversationId,
        title: selectedConv?.title || 'Konuşma',
        type: 'DIRECT',
        isGroup: selectedConv?.isGroup || false,
        participants: [],
        currentUserRole: 'MEMBER',
        canInvite: false,
        canLeave: false,
        canArchive: false,
        isArchived: false,
        createdAt: new Date().toISOString()
      }

      // Mock messages based on conversation
      const mockMessages: MessageWithSender[] = [
        {
          id: `msg-${Date.now()}-1`,
          conversationId,
          content: conversationId === '1' ? 'Merhaba! Staj sürecimiz nasıl gidiyor?' :
                   conversationId === '2' ? 'Öğrencilerimizin devam durumu çok iyi' :
                   'Toplantı yarın saat 14:00\'te',
          messageType: 'TEXT',
          parentId: undefined,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          sender: {
            id: 'other-user',
            email: 'sender@example.com',
            name: selectedConv?.title || 'Kullanıcı',
            role: 'USER'
          },
          readBy: [],
          isRead: true
        },
        {
          id: `msg-${Date.now()}-2`,
          conversationId,
          content: 'Çok iyi gidiyor, teşekkür ederim!',
          messageType: 'TEXT',
          parentId: undefined,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(Date.now() - 82800000).toISOString(),
          updatedAt: new Date(Date.now() - 82800000).toISOString(),
          sender: {
            id: currentUserId,
            email: 'teacher@example.com',
            name: 'Ben (Öğretmen)',
            role: 'TEACHER'
          },
          readBy: [{ userId: 'other-user', userName: selectedConv?.title || 'Kullanıcı', readAt: new Date().toISOString() }],
          isRead: true
        },
        {
          id: `msg-${Date.now()}-3`,
          conversationId,
          content: 'Bu hafta için herhangi bir problem var mı?',
          messageType: 'TEXT',
          parentId: undefined,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          sender: {
            id: currentUserId,
            email: 'teacher@example.com',
            name: 'Ben (Öğretmen)',
            role: 'TEACHER'
          },
          readBy: [],
          isRead: false
        }
      ]

      console.log('✅ Konuşma başarıyla yüklendi:', mockConversation.title, 'Mesaj sayısı:', mockMessages.length)
      setSelectedConversation(mockConversation)
      setMessages(mockMessages)
      
    } catch (error) {
      console.error('❌ Konuşma yüklenirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) return

    const newMessage: MessageWithSender = {
      id: Date.now().toString(),
      conversationId: selectedConversationId,
      content,
      messageType: 'TEXT',
      parentId: undefined,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        email: 'teacher@example.com',
        name: 'Öğretmen',
        role: 'TEACHER'
      },
      readBy: [],
      isRead: false
    }

    setMessages(prev => [...prev, newMessage])
  }

  const handleReply = (messageId: string) => {
    // Reply logic handled in MessageList component
  }

  const handleBack = () => {
    setShowMobileConversations(true)
    setSelectedConversationId(null)
    setSelectedConversation(null)
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Conversations Sidebar */}
      <div className={`${
        isMobile 
          ? showMobileConversations ? 'w-full' : 'hidden'
          : 'w-80'
      } flex-shrink-0`}>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${
        isMobile && showMobileConversations ? 'hidden' : ''
      }`}>
        {selectedConversation ? (
          <>
            <ConversationHeader
              conversation={selectedConversation}
              onBack={handleBack}
            />
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
              onReply={handleReply}
              isLoading={isLoading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center p-8">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-16 w-16 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Mesajlaşma Merkezi
              </h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Öğretmenler, şirketler ve öğrenciler arasında güvenli iletişim kurabilirsiniz.
                Başlamak için sol taraftan bir konuşma seçin.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Yeni Konuşma
                </button>
                <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Konuşma Ara
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}