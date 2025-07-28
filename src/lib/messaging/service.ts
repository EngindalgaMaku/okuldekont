import { PrismaClient } from '@prisma/client'
import {
  CreateConversationRequest,
  SendMessageRequest,
  ConversationSummary,
  MessageWithSender,
  ConversationDetails,
  ConversationParticipant,
  UserPresence,
  MessageSearchResult,
  ApiResponse,
  PaginatedResponse
} from './types'

const prisma = new PrismaClient() as any

export class MessagingService {
  // Create a new conversation
  async createConversation(
    userId: string,
    request: CreateConversationRequest
  ): Promise<ApiResponse<{ conversationId: string }>> {
    try {
      // Validate participants
      const users = await prisma.user.findMany({
        where: { id: { in: request.participantIds } },
        select: { id: true }
      })

      if (users.length !== request.participantIds.length) {
        return {
          success: false,
          error: 'Bazı kullanıcılar bulunamadı'
        }
      }

      // Check if direct conversation already exists
      if (request.type === 'DIRECT' && request.participantIds.length === 2) {
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            type: 'DIRECT',
            participants: {
              every: {
                userId: { in: request.participantIds }
              }
            }
          },
          include: {
            participants: true
          }
        })

        if (existingConversation && existingConversation.participants.length === 2) {
          return {
            success: true,
            data: { conversationId: existingConversation.id }
          }
        }
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          title: request.title,
          type: request.type,
          isGroup: request.isGroup || request.type === 'GROUP',
          description: request.description,
          createdBy: userId,
          participants: {
            create: request.participantIds.map((participantId: string, index: number) => ({
              userId: participantId,
              role: participantId === userId ? 'OWNER' : 'MEMBER'
            }))
          }
        }
      })

      return {
        success: true,
        data: { conversationId: conversation.id }
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      return {
        success: false,
        error: 'Konuşma oluşturulurken hata oluştu'
      }
    }
  }

  // Get user's conversations
  async getUserConversations(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<ConversationSummary>> {
    try {
      const skip = (page - 1) * pageSize

      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } }
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  email: true,
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } }
                }
              }
            }
          },
          _count: {
            select: {
              messages: {
                where: {
                  readReceipts: {
                    none: { userId: userId }
                  }
                }
              }
            }
          }
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: pageSize
      })

      const totalCount = await prisma.conversation.count({
        where: {
          participants: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        }
      })

      const data: ConversationSummary[] = conversations.map((conv: any) => {
        const lastMessage = conv.messages[0]
        const otherParticipant = conv.participants.find((p: any) => p.userId !== userId)
        
        const getDisplayName = (user: any) => {
          if (user.adminProfile?.name) return user.adminProfile.name
          if (user.teacherProfile) return `${user.teacherProfile.name} ${user.teacherProfile.surname}`
          if (user.companyProfile?.name) return user.companyProfile.name
          return user.email
        }

        const getSenderName = (sender: any) => {
          if (sender.adminProfile?.name) return sender.adminProfile.name
          if (sender.teacherProfile) return `${sender.teacherProfile.name} ${sender.teacherProfile.surname}`
          if (sender.companyProfile?.name) return sender.companyProfile.name
          return sender.email
        }

        return {
          id: conv.id,
          title: conv.title || (conv.type === 'DIRECT' && otherParticipant ? 
            getDisplayName(otherParticipant.user) : 'Grup Konuşması'),
          type: conv.type,
          isGroup: conv.isGroup,
          avatar: conv.avatar,
          participantCount: conv.participants.length,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            senderName: getSenderName(lastMessage.sender),
            createdAt: lastMessage.createdAt.toISOString()
          } : undefined,
          lastMessageAt: conv.lastMessageAt?.toISOString(),
          unreadCount: conv._count.messages,
          isArchived: conv.isArchived,
          isActive: true
        }
      })

      return {
        data,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore: page * pageSize < totalCount
        }
      }
    } catch (error) {
      console.error('Error getting user conversations:', error)
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      }
    }
  }

  // Send a message
  async sendMessage(
    userId: string,
    request: SendMessageRequest
  ): Promise<ApiResponse<MessageWithSender>> {
    try {
      // Check if user is participant
      const participation = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: request.conversationId,
          userId: userId,
          isActive: true
        }
      })

      if (!participation) {
        return {
          success: false,
          error: 'Bu konuşmaya mesaj gönderme yetkiniz yok'
        }
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: request.conversationId,
          senderId: userId,
          content: request.content,
          messageType: request.messageType,
          attachments: request.attachments,
          parentId: request.parentId
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              adminProfile: { select: { name: true } },
              teacherProfile: { select: { name: true, surname: true } },
              companyProfile: { select: { name: true } }
            }
          },
          parent: {
            include: {
              sender: {
                select: {
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } }
                }
              }
            }
          }
        }
      })

      // Update conversation last message time
      await prisma.conversation.update({
        where: { id: request.conversationId },
        data: { lastMessageAt: new Date() }
      })

      // Mark as read for sender
      await prisma.messageRead.create({
        data: {
          messageId: message.id,
          userId: userId
        }
      })

      const getDisplayName = (user: any) => {
        if (user.adminProfile?.name) return user.adminProfile.name
        if (user.teacherProfile) return `${user.teacherProfile.name} ${user.teacherProfile.surname}`
        if (user.companyProfile?.name) return user.companyProfile.name
        return user.email
      }

      const result: MessageWithSender = {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        attachments: message.attachments as any,
        parentId: message.parentId,
        isEdited: message.isEdited,
        editedAt: message.editedAt?.toISOString(),
        isDeleted: message.isDeleted,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        sender: {
          id: message.sender.id,
          email: message.sender.email,
          name: getDisplayName(message.sender),
          role: message.sender.role
        },
        parent: message.parent ? {
          id: message.parent.id,
          content: message.parent.content,
          senderName: getDisplayName(message.parent.sender)
        } : undefined,
        readBy: [{
          userId: userId,
          userName: getDisplayName(message.sender),
          readAt: new Date().toISOString()
        }],
        isRead: true
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return {
        success: false,
        error: 'Mesaj gönderilirken hata oluştu'
      }
    }
  }

  // Get messages in a conversation
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<MessageWithSender>> {
    try {
      // Check if user is participant
      const participation = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: conversationId,
          userId: userId,
          isActive: true
        }
      })

      if (!participation) {
        return {
          data: [],
          pagination: {
            page: 1,
            pageSize: 50,
            totalCount: 0,
            totalPages: 0,
            hasMore: false
          }
        }
      }

      const skip = (page - 1) * pageSize

      const messages = await prisma.message.findMany({
        where: {
          conversationId: conversationId,
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              adminProfile: { select: { name: true } },
              teacherProfile: { select: { name: true, surname: true } },
              companyProfile: { select: { name: true } }
            }
          },
          parent: {
            include: {
              sender: {
                select: {
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } }
                }
              }
            }
          },
          readReceipts: {
            include: {
              user: {
                select: {
                  id: true,
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      })

      const totalCount = await prisma.message.count({
        where: {
          conversationId: conversationId,
          isDeleted: false
        }
      })

      const getDisplayName = (user: any) => {
        if (user.adminProfile?.name) return user.adminProfile.name
        if (user.teacherProfile) return `${user.teacherProfile.name} ${user.teacherProfile.surname}`
        if (user.companyProfile?.name) return user.companyProfile.name
        return user.email
      }

      const data: MessageWithSender[] = messages.map((message: any) => ({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        attachments: message.attachments as any,
        parentId: message.parentId,
        isEdited: message.isEdited,
        editedAt: message.editedAt?.toISOString(),
        isDeleted: message.isDeleted,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        sender: {
          id: message.sender.id,
          email: message.sender.email,
          name: getDisplayName(message.sender),
          role: message.sender.role
        },
        parent: message.parent ? {
          id: message.parent.id,
          content: message.parent.content,
          senderName: getDisplayName(message.parent.sender)
        } : undefined,
        readBy: message.readReceipts.map((receipt: any) => ({
          userId: receipt.user.id,
          userName: getDisplayName(receipt.user),
          readAt: receipt.readAt.toISOString()
        })),
        isRead: message.readReceipts.some((receipt: any) => receipt.userId === userId)
      }))

      return {
        data: data.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore: page * pageSize < totalCount
        }
      }
    } catch (error) {
      console.error('Error getting messages:', error)
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      }
    }
  }

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds?: string[]
  ): Promise<ApiResponse<{ markedCount: number }>> {
    try {
      // Check if user is participant
      const participation = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: conversationId,
          userId: userId,
          isActive: true
        }
      })

      if (!participation) {
        return {
          success: false,
          error: 'Bu konuşmaya erişim yetkiniz yok'
        }
      }

      let whereClause: any = {
        message: {
          conversationId: conversationId
        },
        userId: userId
      }

      if (messageIds && messageIds.length > 0) {
        whereClause.messageId = { in: messageIds }
      }

      // Get unread messages
      const unreadMessages = await prisma.message.findMany({
        where: {
          conversationId: conversationId,
          ...(messageIds ? { id: { in: messageIds } } : {}),
          readReceipts: {
            none: { userId: userId }
          }
        },
        select: { id: true }
      })

      // Create read receipts
      if (unreadMessages.length > 0) {
        await prisma.messageRead.createMany({
          data: unreadMessages.map((msg: any) => ({
            messageId: msg.id,
            userId: userId
          })),
          skipDuplicates: true
        })

        // Update participant's last read timestamp
        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: conversationId,
              userId: userId
            }
          },
          data: {
            lastReadAt: new Date()
          }
        })
      }

      return {
        success: true,
        data: { markedCount: unreadMessages.length }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return {
        success: false,
        error: 'Mesajlar okundu olarak işaretlenemedi'
      }
    }
  }

  // Update user presence
  async updateUserPresence(
    userId: string,
    status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE' | 'INVISIBLE',
    customStatus?: string
  ): Promise<ApiResponse<UserPresence>> {
    try {
      const presence = await prisma.userPresence.upsert({
        where: { userId },
        update: {
          status,
          customStatus,
          lastSeenAt: new Date()
        },
        create: {
          userId,
          status,
          customStatus,
          lastSeenAt: new Date()
        }
      })

      return {
        success: true,
        data: {
          userId: presence.userId,
          status: presence.status,
          lastSeenAt: presence.lastSeenAt.toISOString(),
          customStatus: presence.customStatus,
          isTyping: presence.isTyping,
          typingIn: presence.typingIn
        }
      }
    } catch (error) {
      console.error('Error updating user presence:', error)
      return {
        success: false,
        error: 'Kullanıcı durumu güncellenemedi'
      }
    }
  }

  // Get conversation details
  async getConversationDetails(
    conversationId: string,
    userId: string
  ): Promise<ApiResponse<ConversationDetails>> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        },
        include: {
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  adminProfile: { select: { name: true } },
                  teacherProfile: { select: { name: true, surname: true } },
                  companyProfile: { select: { name: true } },
                  presence: true
                }
              }
            }
          }
        }
      })

      if (!conversation) {
        return {
          success: false,
          error: 'Konuşma bulunamadı'
        }
      }

      const currentUserParticipant = conversation.participants.find((p: any) => p.userId === userId)
      if (!currentUserParticipant) {
        return {
          success: false,
          error: 'Bu konuşmaya erişim yetkiniz yok'
        }
      }

      const getDisplayName = (user: any) => {
        if (user.adminProfile?.name) return user.adminProfile.name
        if (user.teacherProfile) return `${user.teacherProfile.name} ${user.teacherProfile.surname}`
        if (user.companyProfile?.name) return user.companyProfile.name
        return user.email
      }

      const participants: ConversationParticipant[] = conversation.participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt.toISOString(),
        lastReadAt: p.lastReadAt?.toISOString(),
        isActive: p.isActive,
        user: {
          id: p.user.id,
          email: p.user.email,
          name: getDisplayName(p.user),
          role: p.user.role,
          presence: p.user.presence ? {
            status: p.user.presence.status,
            lastSeenAt: p.user.presence.lastSeenAt.toISOString(),
            customStatus: p.user.presence.customStatus
          } : undefined
        }
      }))

      const result: ConversationDetails = {
        id: conversation.id,
        title: conversation.title,
        type: conversation.type,
        isGroup: conversation.isGroup,
        description: conversation.description,
        avatar: conversation.avatar,
        isArchived: conversation.isArchived,
        createdAt: conversation.createdAt.toISOString(),
        participants,
        currentUserRole: currentUserParticipant.role,
        canInvite: ['OWNER', 'ADMIN'].includes(currentUserParticipant.role),
        canLeave: conversation.type !== 'DIRECT',
        canArchive: ['OWNER', 'ADMIN'].includes(currentUserParticipant.role)
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Error getting conversation details:', error)
      return {
        success: false,
        error: 'Konuşma detayları alınamadı'
      }
    }
  }
}

export const messagingService = new MessagingService()