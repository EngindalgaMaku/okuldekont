import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/messaging/service'
import { CreateConversationRequest } from '@/lib/messaging/types'

function validateCreateConversation(data: any): CreateConversationRequest {
  if (!data.type || !['DIRECT', 'GROUP', 'BROADCAST', 'SYSTEM'].includes(data.type)) {
    throw new Error('Invalid conversation type')
  }
  
  if (!Array.isArray(data.participantIds) || data.participantIds.length === 0) {
    throw new Error('participantIds must be a non-empty array')
  }

  return {
    type: data.type,
    title: data.title,
    description: data.description,
    participantIds: data.participantIds,
    isGroup: data.isGroup
  }
}

function parseQuery(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1') || 1
  const pageSize = parseInt(searchParams.get('pageSize') || '20') || 20
  return { page, pageSize }
}

// GET /api/admin/messaging/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to get userId
    const userId = request.headers.get('x-user-id') || 'temp-user-id'
    
    const { searchParams } = new URL(request.url)
    const query = parseQuery(searchParams)

    const result = await messagingService.getUserConversations(
      userId,
      query.page,
      query.pageSize
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/admin/messaging/conversations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşmalar alınırken hata oluştu',
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/messaging/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to get userId
    const userId = request.headers.get('x-user-id') || 'temp-user-id'
    
    const body = await request.json()
    const validatedData = validateCreateConversation(body)

    // Ensure current user is in participants
    if (!validatedData.participantIds.includes(userId)) {
      validatedData.participantIds.push(userId)
    }

    const result = await messagingService.createConversation(userId, validatedData)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/messaging/conversations:', error)
    
    if (error instanceof Error && error.message.includes('Invalid')) {
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
        error: 'Konuşma oluşturulurken hata oluştu'
      },
      { status: 500 }
    )
  }
}