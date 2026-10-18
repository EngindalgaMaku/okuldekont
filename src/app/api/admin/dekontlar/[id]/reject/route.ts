import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reddetme nedeni gereklidir' },
        { status: 400 }
      )
    }

    // Dekont'u reddet
    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectReason: reason.trim(),
        approvedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Dekont başarıyla reddedildi',
      dekont: updatedDekont
    })

  } catch (error) {
    console.error('Dekont reddetme hatası:', error)
    return NextResponse.json(
      { error: 'Dekont reddetme işlemi başarısız' },
      { status: 500 }
    )
  }
}