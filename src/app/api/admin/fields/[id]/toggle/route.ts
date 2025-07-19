import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce mevcut durumu al
    const field = await prisma.field.findUnique({
      where: { id },
      select: { active: true }
    })

    if (!field) {
      return NextResponse.json(
        { error: 'Alan bulunamadı' },
        { status: 404 }
      )
    }

    // Durumu tersine çevir
    const updatedField = await prisma.field.update({
      where: { id },
      data: { active: !field.active }
    })

    return NextResponse.json({ success: true, field: updatedField })
  } catch (error) {
    console.error('Alan aktiflik durumu değiştirilirken hata:', error)
    return NextResponse.json(
      { error: 'Alan aktiflik durumu değiştirilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}