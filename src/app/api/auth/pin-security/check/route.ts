import { NextRequest, NextResponse } from 'next/server'
import { checkSecurityStatus } from '@/lib/pin-security'

export async function POST(request: NextRequest) {
  try {
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

    const securityStatus = await checkSecurityStatus(entityType, entityId)

    return NextResponse.json({ securityStatus })
  } catch (error) {
    console.error('PIN güvenlik kontrolü hatası:', error)
    return NextResponse.json(
      { error: 'Güvenlik kontrolü sırasında hata oluştu' },
      { status: 500 }
    )
  }
}