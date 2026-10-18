import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Belgeyi onayla
    const updatedBelge = await prisma.belge.update({
      where: { id },
      data: {
        status: 'APPROVED',
        onaylanmaTarihi: new Date(),
        redNedeni: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Belge başarıyla onaylandı',
      belge: updatedBelge
    })

  } catch (error) {
    console.error('Belge onaylama hatası:', error)
    return NextResponse.json(
      { error: 'Belge onaylama işlemi başarısız' },
      { status: 500 }
    )
  }
}