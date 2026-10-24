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

    // Belgeyi reddet
    const updatedBelge = await prisma.belge.update({
      where: { id },
      data: {
        status: 'REJECTED',
        redNedeni: reason.trim(),
        onaylanmaTarihi: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Belge başarıyla reddedildi',
      belge: updatedBelge
    })

  } catch (error) {
    console.error('Belge reddetme hatası:', error)
    return NextResponse.json(
      { error: 'Belge reddetme işlemi başarısız' },
      { status: 500 }
    )
  }
}