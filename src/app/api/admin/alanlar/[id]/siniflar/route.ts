import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const alanId = resolvedParams.id

    // Sınıfları getir
    const siniflarData = await prisma.class.findMany({
      where: { alanId: alanId },
      select: {
        id: true,
        name: true,
        dal: true,
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Sınıfları dönüştür
    const siniflar = siniflarData.map((sinif) => ({
      ...sinif,
      ad: sinif.name,
      ogrenci_sayisi: sinif._count.students
    }))

    return NextResponse.json(siniflar)
  } catch (error) {
    console.error('Sınıflar API hatası:', error)
    return NextResponse.json(
      { error: 'Sınıflar yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}