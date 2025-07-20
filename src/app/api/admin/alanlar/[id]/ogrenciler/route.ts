import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const alanId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const itemsPerPage = 10
    const skip = (page - 1) * itemsPerPage

    // Öğrencileri sayfalı olarak getir (optimize edilmiş)
    const [ogrencilerData, totalCount] = await Promise.all([
      prisma.student.findMany({
        where: { alanId: alanId },
        select: {
          id: true,
          name: true,
          surname: true,
          number: true,
          className: true,
          alanId: true,
          company: {
            select: {
              id: true,
              name: true,
              contact: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  alanId: true,
                  alan: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: skip,
        take: itemsPerPage
      }),
      prisma.student.count({
        where: { alanId: alanId }
      })
    ])

    // Öğrenci verilerini dönüştür
    const transformedOgrenciler = ogrencilerData.map((ogrenci) => ({
      id: ogrenci.id,
      ad: ogrenci.name,
      soyad: ogrenci.surname,
      no: ogrenci.number || '',
      sinif: ogrenci.className,
      alanId: ogrenci.alanId,
      company: ogrenci.company ? {
        id: ogrenci.company.id,
        name: ogrenci.company.name,
        contact: ogrenci.company.contact,
        teacher: ogrenci.company.teacher ? {
          id: ogrenci.company.teacher.id,
          name: ogrenci.company.teacher.name,
          surname: ogrenci.company.teacher.surname,
          alanId: ogrenci.company.teacher.alanId,
          alan: ogrenci.company.teacher.alan
        } : null
      } : null
    }))

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    return NextResponse.json({
      data: transformedOgrenciler,
      total: totalCount,
      currentPage: page,
      totalPages: totalPages
    })
  } catch (error) {
    console.error('Öğrenciler API hatası:', error)
    return NextResponse.json(
      { error: 'Öğrenciler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}