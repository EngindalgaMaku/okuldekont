import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const alanId = resolvedParams.id

    // Öğretmenler ve onların staj bilgilerini getir (optimize edilmiş)
    const ogretmenlerData = await prisma.teacherProfile.findMany({
      where: { alanId: alanId },
      select: {
        id: true,
        name: true,
        surname: true,
        phone: true,
        email: true,
        pin: true,
        active: true,
        _count: {
          select: {
            stajlar: {
              where: {
                student: {
                  alanId: alanId
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Her öğretmen için company sayısını ayrıca hesapla
    const ogretmenler = await Promise.all(
      ogretmenlerData.map(async (ogretmen) => {
        const companyCount = await prisma.companyProfile.count({
          where: {
            teacherId: ogretmen.id,
            stajlar: {
              some: {
                student: {
                  alanId: alanId
                }
              }
            }
          }
        })

        return {
          ...ogretmen,
          ad: ogretmen.name,
          soyad: ogretmen.surname,
          ogrenci_sayisi: ogretmen._count.stajlar,
          isletme_sayisi: companyCount
        }
      })
    )

    return NextResponse.json(ogretmenler)
  } catch (error) {
    console.error('Öğretmenler API hatası:', error)
    return NextResponse.json(
      { error: 'Öğretmenler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}