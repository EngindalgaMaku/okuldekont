import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetFailedAttempts } from '@/lib/pin-security'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { pin } = await request.json()

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    // Öğretmen PIN güncelleme
    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id },
      data: { pin }
    })

    // PIN güvenlik sistemini resetle (bloke kaldır ve denemeleri temizle)
    await resetFailedAttempts('teacher', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PIN güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'PIN güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { pin } = await request.json()

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    // Öğretmen PIN güncelleme
    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id },
      data: { pin }
    })

    // PIN güvenlik sistemini resetle (bloke kaldır ve denemeleri temizle)
    await resetFailedAttempts('teacher', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PIN güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'PIN güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}