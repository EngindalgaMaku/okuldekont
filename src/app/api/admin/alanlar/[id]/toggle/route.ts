import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Alan ID gereklidir' },
        { status: 400 }
      )
    }

    // Get current field
    const currentField = await prisma.alan.findUnique({
      where: { id }
    })

    if (!currentField) {
      return NextResponse.json(
        { error: 'Alan bulunamadı' },
        { status: 404 }
      )
    }

    // Toggle active status
    const updatedField = await prisma.alan.update({
      where: { id },
      data: {
        active: !currentField.active
      }
    })

    return NextResponse.json({
      success: true,
      field: updatedField
    })
  } catch (error) {
    console.error('Alan aktiflik durumu değiştirilirken hata:', error)
    return NextResponse.json(
      { error: 'Alan aktiflik durumu değiştirilemedi' },
      { status: 500 }
    )
  }
}