import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { unlockEntity } from '@/lib/pin-security'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Admin yetkisi gerekli.' },
        { status: 403 }
      )
    }

    const { entityType, entityId } = await request.json()

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType ve entityId gereklidir' },
        { status: 400 }
      )
    }

    if (entityType !== 'teacher' && entityType !== 'company') {
      return NextResponse.json(
        { error: 'entityType teacher veya company olmalıdır' },
        { status: 400 }
      )
    }

    await unlockEntity(entityType, entityId)

    return NextResponse.json({ 
      success: true, 
      message: 'Bloke başarıyla açıldı' 
    })
  } catch (error) {
    console.error('PIN bloke açma hatası:', error)
    return NextResponse.json(
      { error: 'Bloke açma sırasında hata oluştu' },
      { status: 500 }
    )
  }
}