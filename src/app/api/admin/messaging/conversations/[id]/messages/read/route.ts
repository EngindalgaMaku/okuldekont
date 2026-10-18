import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/messaging/service'
import { validateAuthAndRole } from '@/middleware/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/admin/messaging/conversations/[id]/messages/read - Mark messages as read - KRİTİK KORUMA
export async function POST(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Mesaj okuma durumu - Sadece kimlik doğrulanmış kullanıcılar
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  try {
    const userId = authResult.user?.id || ''
    
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