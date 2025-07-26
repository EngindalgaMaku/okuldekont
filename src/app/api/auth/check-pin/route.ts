import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordPinAttempt, checkSecurityStatus } from '@/lib/pin-security'

export async function POST(request: Request) {
  try {
    const { type, entityId, pin } = await request.json()

    if (!type || !entityId || !pin) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    // Get client IP and user agent for security tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Map type to entity type for security system
    const entityType = type === 'ogretmen' ? 'teacher' : 'company'

    // Check security status first
    const securityStatus = await checkSecurityStatus(entityType, entityId)
    
    if (securityStatus.isLocked) {
      const lockEndTime = securityStatus.lockEndTime
      const now = new Date()
      const remainingMinutes = lockEndTime ? Math.ceil((lockEndTime.getTime() - now.getTime()) / (1000 * 60)) : 30
      
      return NextResponse.json({
        error: `Hesabınız güvenlik nedeniyle bloke edilmiştir. ${remainingMinutes} dakika sonra tekrar deneyebilirsiniz.`,
        isLocked: true,
        lockEndTime: lockEndTime,
        remainingMinutes
      }, { status: 423 }) // 423 Locked
    }

    let pinValid = false
    let entityData = null

    // Check if it's a teacher login
    if (type === 'ogretmen') {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, surname: true, pin: true, mustChangePin: true }
      })

      if (!teacher) {
        return NextResponse.json(
          { error: 'Öğretmen bulunamadı' },
          { status: 404 }
        )
      }

      if (teacher.pin === pin) {
        pinValid = true
        entityData = {
          id: teacher.id,
          name: teacher.name,
          surname: teacher.surname,
          mustChangePin: teacher.mustChangePin
        }
      }
    }

    // Check if it's a company login
    if (type === 'isletme') {
      const company = await prisma.companyProfile.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, pin: true, mustChangePin: true }
      })

      if (!company) {
        return NextResponse.json(
          { error: 'İşletme bulunamadı' },
          { status: 404 }
        )
      }

      if (company.pin === pin) {
        pinValid = true
        entityData = {
          id: company.id,
          name: company.name,
          mustChangePin: company.mustChangePin
        }
      }
    }

    // Record the PIN attempt
    const attemptResult = await recordPinAttempt(
      entityType,
      entityId,
      pinValid,
      ipAddress,
      userAgent
    )

    if (pinValid) {
      return NextResponse.json({
        success: true,
        [type === 'ogretmen' ? 'teacher' : 'company']: entityData
      })
    } else {
      return NextResponse.json({
        error: attemptResult.message,
        remainingAttempts: attemptResult.securityStatus.remainingAttempts,
        isLocked: attemptResult.securityStatus.isLocked
      }, { status: 401 })
    }

  } catch (error) {
    console.error('PIN check error:', error)
    return NextResponse.json(
      { error: 'Sistem hatası oluştu' },
      { status: 500 }
    )
  }
}