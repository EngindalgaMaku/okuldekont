import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveEducationYearId } from '@/lib/education-year'

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const educationYearIdParam = searchParams.get('educationYearId')
    const educationYearId = educationYearIdParam || await getActiveEducationYearId()

    // Determine date window for the selected education year
    const year = await prisma.egitimYili.findUnique({ where: { id: educationYearId } })
    if (!year) {
      return NextResponse.json({ error: 'Eğitim yılı bulunamadı' }, { status: 400 })
    }

    // Compute upper bound: prefer endDate; fallback to next year's startDate if available
    let upperBound: Date | undefined = year.endDate || undefined
    if (!upperBound && year.startDate) {
      const nextYear = await prisma.egitimYili.findFirst({
        where: { startDate: { gt: year.startDate } },
        orderBy: { startDate: 'asc' }
      })
      if (nextYear?.startDate) upperBound = nextYear.startDate
    }

    const notifications = await prisma.notification.findMany({
      where: {
        recipient_id: id,
        recipient_type: 'isletme',
        ...(year.startDate ? { created_at: { gte: year.startDate } } : {}),
        ...(upperBound ? { created_at: { gte: year.startDate as Date, lt: upperBound } } : {})
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const response = NextResponse.json(notifications);
    
    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Bildirimler getirme hatası:', error)
    return NextResponse.json({ error: 'Bildirimler getirilemedi' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { notificationId, markAsRead } = body

    if (markAsRead) {
      await prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          is_read: true,
          read_at: new Date()
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error)
    return NextResponse.json({ error: 'Bildirim güncellenemedi' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { markAllAsRead } = body

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: {
          recipient_id: id,
          recipient_type: 'isletme',
          is_read: false
        },
        data: {
          is_read: true,
          read_at: new Date()
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Toplu bildirim güncelleme hatası:', error)
    return NextResponse.json({ error: 'Bildirimler güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { notificationId } = body

    await prisma.notification.delete({
      where: {
        id: notificationId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bildirim silme hatası:', error)
    return NextResponse.json({ error: 'Bildirim silinemedi' }, { status: 500 })
  }
}