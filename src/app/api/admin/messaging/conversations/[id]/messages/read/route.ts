import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/messaging/service'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/admin/messaging/conversations/[id]/messages/read - Mark messages as read
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    // TODO: Add authentication middleware to get userId
    const userId = request.headers.get('x-user-id') || 'temp-user-id'
    
    const body = await request.json()
    const messageIds = body.messageIds // Optional: specific message IDs to mark as read

    // Validate messageIds if provided
    if (messageIds && (!Array.isArray(messageIds) || messageIds.some((id: any) => typeof id !== 'string'))) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'messageIds must be an array of strings' 
        },
        { status: 400 }
      )
    }

    const result = await messagingService.markMessagesAsRead(
      id,
      userId,
      messageIds
    )

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/admin/messaging/conversations/[id]/messages/read:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Mesajlar okundu olarak işaretlenemedi' 
      },
      { status: 500 }
    )
  }
}