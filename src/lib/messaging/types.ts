// Messaging System Types
export interface CreateConversationRequest {
  type: 'DIRECT' | 'GROUP' | 'BROADCAST' | 'SYSTEM'
  title?: string
  description?: string
  participantIds: string[]
  isGroup?: boolean
}

export interface SendMessageRequest {
  conversationId: string
  content?: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM' | 'ANNOUNCEMENT' | 'LOCATION'
  attachments?: MessageAttachment[]
  parentId?: string // For replies
}

export interface MessageAttachment {
  id: string
  type: 'image' | 'file' | 'audio' | 'video'
  url: string
  filename: string
  size: number
  mimeType: string
  thumbnail?: string
}

export interface ConversationSummary {
  id: string
  title?: string
  type: 'DIRECT' | 'GROUP' | 'BROADCAST' | 'SYSTEM'
  isGroup: boolean
  avatar?: string
  participantCount: number
  lastMessage?: {
    id: string
    content?: string
    messageType: string
    senderName: string
    createdAt: string
  }
  lastMessageAt?: string
  unreadCount: number
  isArchived: boolean
  isActive: boolean
}

export interface MessageWithSender {
  id: string
  conversationId: string
  content?: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM' | 'ANNOUNCEMENT' | 'LOCATION'
  attachments?: MessageAttachment[]
  parentId?: string
  isEdited: boolean
  editedAt?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  sender: {
    id: string
    email: string
    name?: string
    avatar?: string
    role: 'USER' | 'ADMIN' | 'TEACHER' | 'COMPANY'
  }
  parent?: {
    id: string
    content?: string
    senderName: string
  }
  readBy: Array<{
    userId: string
    userName: string
    readAt: string
  }>
  isRead: boolean
}

export interface ConversationParticipant {
  id: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt: string
  lastReadAt?: string
  isActive: boolean
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
    role: 'USER' | 'ADMIN' | 'TEACHER' | 'COMPANY'
    presence?: {
      status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE' | 'INVISIBLE'
      lastSeenAt: string
      customStatus?: string
    }
  }
}

export interface ConversationDetails {
  id: string
  title?: string
  type: 'DIRECT' | 'GROUP' | 'BROADCAST' | 'SYSTEM'
  isGroup: boolean
  description?: string
  avatar?: string
  isArchived: boolean
  createdAt: string
  participants: ConversationParticipant[]
  currentUserRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  canInvite: boolean
  canLeave: boolean
  canArchive: boolean
}

export interface UserPresence {
  userId: string
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE' | 'INVISIBLE'
  lastSeenAt: string
  customStatus?: string
  isTyping: boolean
  typingIn?: string
}

export interface TypingIndicator {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
}

export interface MessageSearchResult {
  messages: MessageWithSender[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface NotificationSettings {
  muteAll: boolean
  muteUntil?: string
  soundEnabled: boolean
  desktopNotifications: boolean
  emailNotifications: boolean
  mentionOnly: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
}

// Event Types for Real-time
export interface MessageEvent {
  type: 'MESSAGE_SENT' | 'MESSAGE_EDITED' | 'MESSAGE_DELETED' | 'MESSAGE_READ'
  conversationId: string
  message: MessageWithSender
  userId: string
}

export interface PresenceEvent {
  type: 'USER_ONLINE' | 'USER_OFFLINE' | 'USER_TYPING' | 'USER_STOPPED_TYPING'
  userId: string
  conversationId?: string
  presence: UserPresence
}

export interface ConversationEvent {
  type: 'CONVERSATION_CREATED' | 'CONVERSATION_UPDATED' | 'USER_JOINED' | 'USER_LEFT'
  conversationId: string
  userId: string
  data: any
}

// Error Types
export interface MessagingError {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'SERVER_ERROR'
  message: string
  details?: any
}