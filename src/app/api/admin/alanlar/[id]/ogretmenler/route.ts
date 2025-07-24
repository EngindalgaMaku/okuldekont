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

    // Her öğretmen için gerçek sayıları hesapla
    const ogretmenler = await Promise.all(
      ogretmenlerData.map(async (ogretmen) => {
        // Bu öğretmenin koordinatörlüğünü yaptığı aktif stajları al
        const activeInternships = await prisma.staj.findMany({
          where: {
            teacherId: ogretmen.id,
            student: {
              alanId: alanId
            },
            status: 'ACTIVE'
          },
          select: {
            studentId: true,
            companyId: true
          }
        })

        // Bu öğretmenin işletmeye atandığı stajları da al
        const companyAssignedInternships = await prisma.staj.findMany({
          where: {
            company: {
              teacherId: ogretmen.id
            },
            student: {
              alanId: alanId
            },
            status: 'ACTIVE'
          },
          select: {
            studentId: true,
            companyId: true
          }
        })

        // Tüm stajları birleştir ve duplicate'ları çıkar
        const allInternships = [...activeInternships, ...companyAssignedInternships]
        const uniqueStudents = Array.from(new Set(allInternships.map(i => i.studentId)))
        const uniqueCompanies = Array.from(new Set(allInternships.map(i => i.companyId)))

        return {
          ...ogretmen,
          ad: ogretmen.name,
          soyad: ogretmen.surname,
          ogrenci_sayisi: uniqueStudents.length,
          isletme_sayisi: uniqueCompanies.length
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