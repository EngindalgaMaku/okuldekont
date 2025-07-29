import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/messaging/service'
import { validateAuthAndRole } from '@/middleware/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/admin/messaging/conversations/[id] - Get conversation details - SADECE AUTHENTİCATED USERS
export async function GET(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Özel konuşma detaylarını koruma
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user?.id || ''
    const { id } = await params
    
    const result = await messagingService.getConversationDetails(id, userId)

    if (!result.success) {
      return NextResponse.json(result, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/admin/messaging/conversations/[id]:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşma detayları alınırken hata oluştu' 
      },
      { status: 500 }
    )
  }
}

// PUT /api/admin/messaging/conversations/[id] - Update conversation - SADECE AUTHENTİCATED USERS
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Sadece kimlik doğrulanmış kullanıcılar konuşma güncelleyebilir
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user?.id || ''
    const { id } = await params
    
    const body = await request.json()
    
    // Basic validation
    const allowedFields = ['title', 'description', 'avatar', 'isArchived']
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = body[key]
        return obj
      }, {})

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Güncellenecek geçerli alan bulunamadı' 
        },
        { status: 400 }
      )
    }

    // TODO: Implement update conversation functionality in service
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşma güncelleme henüz implementasyona eklenmedi' 
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error in PUT /api/admin/messaging/conversations/[id]:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşma güncellenirken hata oluştu' 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/messaging/conversations/[id] - Leave/delete conversation - SADECE AUTHENTİCATED USERS
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // KRİTİK: Sadece kimlik doğrulanmış kullanıcılar konuşmadan ayrılabilir
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.user?.id || ''
    const { id } = await params
    
    // TODO: Implement leave conversation functionality in service
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşmadan ayrılma henüz implementasyona eklenmedi' 
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error in DELETE /api/admin/messaging/conversations/[id]:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Konuşmadan ayrılırken hata oluştu' 
      },
      { status: 500 }
    )
  }
}