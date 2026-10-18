import { NextRequest, NextResponse } from 'next/server'
import { checkSecurityStatus } from '@/lib/pin-security'

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

    const securityStatus = await checkSecurityStatus(entityType, entityId)
    
    return NextResponse.json(securityStatus)
  } catch (error: any) {
    console.error('Security status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Güvenlik durumu kontrol edilemedi' },
      { status: 500 }
    )
  }
}