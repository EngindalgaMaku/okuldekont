import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Dekont'u onayla
    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
        rejectReason: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Dekont başarıyla onaylandı',
      dekont: updatedDekont
    })

  } catch (error) {
    console.error('Dekont onaylama hatası:', error)
    return NextResponse.json(
      { error: 'Dekont onaylama işlemi başarısız' },
      { status: 500 }
    )
  }
}