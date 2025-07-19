import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fieldIds = searchParams.get('fieldIds')?.split(',') || []

    if (fieldIds.length === 0) {
      return NextResponse.json({ teachers: [] })
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        alanId: {
          in: fieldIds
        }
      },
      select: {
        id: true,
        name: true,
        surname: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error('Öğretmenleri çekme hatası:', error)
    return NextResponse.json(
      { error: 'Öğretmenler çekilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}