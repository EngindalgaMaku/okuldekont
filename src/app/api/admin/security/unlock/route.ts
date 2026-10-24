import { NextRequest, NextResponse } from 'next/server'
import { unlockEntity } from '@/lib/pin-security'

export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId } = await request.json()

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'EntityType ve entityId gerekli' },
        { status: 400 }
      )
    }

    if (entityType !== 'teacher' && entityType !== 'company') {
      return NextResponse.json(
        { error: 'Geçersiz entity type' },
        { status: 400 }
      )
    }

    await unlockEntity(entityType, entityId)
    
    return NextResponse.json({ 
      success: true, 
      message: `${entityType === 'teacher' ? 'Öğretmen' : 'İşletme'} bloğu başarıyla açıldı` 
    })
  } catch (error: any) {
    console.error('Security unlock error:', error)
    return NextResponse.json(
      { error: error.message || 'Blok açılırken hata oluştu' },
      { status: 500 }
    )
  }
}