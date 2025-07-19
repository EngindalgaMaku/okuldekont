import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const notifications = await request.json()

    if (!Array.isArray(notifications)) {
      return NextResponse.json(
        { error: 'Notification data must be an array' },
        { status: 400 }
      )
    }

    await prisma.notification.createMany({
      data: notifications
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications gönderilirken hata:', error)
    return NextResponse.json(
      { error: 'Notifications gönderilemedi' },
      { status: 500 }
    )
  }
}