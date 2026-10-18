import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Check if user is admin
    const admin = await prisma.adminProfile.findUnique({
      where: { email: session.user.email }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    const { issueId, issueType } = await request.json()

    if (!issueId || !issueType) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    let fixResult = { success: false, message: '', affectedRecords: 0 }

    switch (issueType) {
      case 'SURESI_GECMIS_AKTIF':
        // Süresi geçmiş aktif stajları tamamlandı olarak işaretle
        const today = new Date().toISOString().split('T')[0]
        const updateResult = await prisma.staj.updateMany({
          where: {
            status: 'ACTIVE',
            endDate: {
              lt: new Date(today)
            }
          },
          data: {
            status: 'COMPLETED',
            lastModifiedBy: admin.userId,
            lastModifiedAt: new Date()
          }
        })

        fixResult = {
          success: true,
          message: `${updateResult.count} adet süresi geçmiş staj tamamlandı olarak işaretlendi.`,
          affectedRecords: updateResult.count
        }
        break

      case 'EKSIK_KOORDINATOR':
        // Bu durumda otomatik düzeltme yapamayız çünkü hangi öğretmenin atanacağına karar veremeyiz
        fixResult = {
          success: false,
          message: 'Eksik koordinatör ataması manuel olarak yapılmalıdır.',
          affectedRecords: 0
        }
        break

      case 'COKLU_KOORDINATOR':
        // Bu da manuel müdahale gerektirir
        fixResult = {
          success: false,
          message: 'Çoklu koordinatör sorunu manuel olarak çözülmelidir.',
          affectedRecords: 0
        }
        break

      case 'HATALI_ATAMA':
        // Bu da manuel müdahale gerektirir
        fixResult = {
          success: false,
          message: 'Hatalı alan ataması manuel olarak düzeltilmelidir.',
          affectedRecords: 0
        }
        break

      case 'AYNI_ISLETME_COKLU_ALAN':
        // Bu bir uyarı durumu, otomatik düzeltme gerektirmez
        fixResult = {
          success: false,
          message: 'Bu durum bir uyarıdır, otomatik düzeltme gerektirmez.',
          affectedRecords: 0
        }
        break

      default:
        return NextResponse.json({ error: 'Bilinmeyen tutarsızlık tipi' }, { status: 400 })
    }

    // Düzeltme geçmişini kaydet
    if (fixResult.success && fixResult.affectedRecords > 0) {
      await prisma.systemSetting.upsert({
        where: { key: 'last_consistency_fix' },
        update: { 
          value: JSON.stringify({
            issueType,
            fixedAt: new Date(),
            fixedBy: admin.userId,
            affectedRecords: fixResult.affectedRecords
          })
        },
        create: {
          key: 'last_consistency_fix',
          value: JSON.stringify({
            issueType,
            fixedAt: new Date(),
            fixedBy: admin.userId,
            affectedRecords: fixResult.affectedRecords
          })
        }
      })
    }

    return NextResponse.json({
      success: fixResult.success,
      message: fixResult.message,
      affectedRecords: fixResult.affectedRecords
    })

  } catch (error) {
    console.error('Tutarsızlık düzeltme hatası:', error)
    return NextResponse.json(
      { error: 'Tutarsızlık düzeltilirken hata oluştu' },
      { status: 500 }
    )
  }
}