import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/messaging/service'
import { SendMessageRequest } from '@/lib/messaging/types'
import { validateAuthAndRole } from '@/middleware/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

function validateSendMessage(data: any): SendMessageRequest {
  if (!data.conversationId) {
    throw new Error('conversationId is required')
  }
  
  if (!data.messageType || !['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM', 'ANNOUNCEMENT', 'LOCATION'].includes(data.messageType)) {
    throw new Error('Invalid messageType')
  }

  if (!data.content && !data.attachments) {
    throw new Error('Either content or attachments must be provided')
  }

  return {
    conversationId: data.conversationId,
    content: data.content,
    messageType: data.messageType,
    attachments: data.attachments,
    parentId: data.parentId
  }
}

function parseQuery(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1') || 1
  const pageSize = parseInt(searchParams.get('pageSize') || '50') || 50
  return { page, pageSize }
}

// GET /api/admin/messaging/conversations/[id]/messages - Get messages in conversation - KRİTİK KORUMA
export async function GET(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Özel mesajları okuma - Sadece kimlik doğrulanmış kullanıcılar
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user?.id || ''
    const { id } = await params
    
    // Log private message access for security monitoring
    console.log(`🔒 MESSAGING: ${authResult.user?.role} ${authResult.user?.email} accessing conversation ${id}`, {
      timestamp: new Date().toISOString()
    })
    
    const { searchParams } = new URL(request.url)
    const query = parseQuery(searchParams)

    const result = await messagingService.getMessages(
      id,
      userId,
      query.page,
      query.pageSize
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/admin/messaging/conversations/[id]/messages:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Mesajlar alınırken hata oluştu',
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/messaging/conversations/[id]/messages - Send message - KRİTİK KORUMA
export async function POST(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Mesaj gönderme - Sadece kimlik doğrulanmış kullanıcılar
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user?.id || ''
    const { id } = await params
    
    // Log message sending for security monitoring
    console.log(`🔒 MESSAGING: ${authResult.user?.role} ${authResult.user?.email} sending message to conversation ${id}`, {
      timestamp: new Date().toISOString()
    })
    
    const body = await request.json()
    
    // Add conversationId from URL params
    body.conversationId = id
    
    const validatedData = validateSendMessage(body)

    const result = await messagingService.sendMessage(userId, validatedData)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/messaging/conversations/[id]/messages:', error)
    
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Mesaj gönderilirken hata oluştu' 
      },
      { status: 500 }
    )
  }
}