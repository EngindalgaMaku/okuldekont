import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Öğretmene ait stajlar üzerinden işletmeleri getir
    const internships = await prisma.internship.findMany({
      where: {
        teacherId: id,
        status: 'aktif'
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Tekrar eden işletmeleri filtrele
    const companiesMap = new Map()
    internships.forEach((internship: any) => {
      if (internship.company) {
        companiesMap.set(internship.company.id, {
          id: internship.company.id,
          ad: internship.company.name
        })
      }
    })

    const companies = Array.from(companiesMap.values())

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Öğretmene ait işletmeleri çekme hatası:', error)
    return NextResponse.json(
      { error: 'Öğretmene ait işletmeler çekilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}