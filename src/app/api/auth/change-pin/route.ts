import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordPinAttempt, checkSecurityStatus } from '@/lib/pin-security'

export async function POST(request: NextRequest) {
  try {
    const { type, entityId, currentPin, newPin } = await request.json()

    if (!type || !entityId || !currentPin || !newPin) {
      return NextResponse.json(
        { error: 'Tüm alanlar gereklidir' },
        { status: 400 }
      )
    }

    if (newPin.length !== 4) {
      return NextResponse.json(
        { error: 'Yeni PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN sadece rakamlardan oluşmalıdır' },
        { status: 400 }
      )
    }

    if (currentPin === newPin) {
      return NextResponse.json(
        { error: 'Yeni PIN mevcut PIN ile aynı olamaz' },
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

    let currentPinValid = false
    let entityExists = false

    // Verify current PIN and update
    if (type === 'ogretmen') {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: entityId },
        select: { id: true, pin: true, mustChangePin: true }
      })

      if (!teacher) {
        return NextResponse.json(
          { error: 'Öğretmen bulunamadı' },
          { status: 404 }
        )
      }

      entityExists = true
      currentPinValid = teacher.pin === currentPin

      if (currentPinValid) {
        await prisma.teacherProfile.update({
          where: { id: entityId },
          data: {
            pin: newPin,
            mustChangePin: false // PIN değişikliği sonrası zorlamayı kapat
          }
        })
      }
    } else if (type === 'isletme') {
      const company = await prisma.companyProfile.findUnique({
        where: { id: entityId },
        select: { id: true, pin: true, mustChangePin: true }
      })

      if (!company) {
        return NextResponse.json(
          { error: 'İşletme bulunamadı' },
          { status: 404 }
        )
      }

      entityExists = true
      currentPinValid = company.pin === currentPin

      if (currentPinValid) {
        await prisma.companyProfile.update({
          where: { id: entityId },
          data: {
            pin: newPin,
            mustChangePin: false // PIN değişikliği sonrası zorlamayı kapat
          }
        })
      }
    } else {
      return NextResponse.json(
        { error: 'Geçersiz kullanıcı tipi' },
        { status: 400 }
      )
    }

    // Record the PIN verification attempt
    if (entityExists) {
      await recordPinAttempt(
        entityType,
        entityId,
        currentPinValid,
        ipAddress,
        userAgent
      )
    }

    if (currentPinValid) {
      return NextResponse.json({
        success: true,
        message: 'PIN başarıyla değiştirildi'
      })
    } else {
      return NextResponse.json({
        error: 'Mevcut PIN hatalı'
      }, { status: 401 })
    }

  } catch (error) {
    console.error('PIN change error:', error)
    return NextResponse.json(
      { error: 'Sistem hatası oluştu' },
      { status: 500 }
    )
  }
}