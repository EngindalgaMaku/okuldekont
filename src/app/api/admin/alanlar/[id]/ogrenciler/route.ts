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

    // Öğrencileri sayfalı olarak getir (aktif stajlar dahil)
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
          },
          stajlar: {
            where: {
              status: 'ACTIVE'
            },
            select: {
              id: true,
              companyId: true,
              teacherId: true,
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
              },
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
            },
            take: 1
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
    const transformedOgrenciler = ogrencilerData.map((ogrenci) => {
      // Aktif staj varsa öncelik ver, yoksa student.company'yi kullan
      const activeInternship = ogrenci.stajlar?.[0]
      const currentCompany = activeInternship?.company || ogrenci.company
      
      // Koordinatör öğretmeni al (öncelik staj koordinatörüne)
      const coordinatorTeacher = activeInternship?.teacher || currentCompany?.teacher
      
      return {
        id: ogrenci.id,
        ad: ogrenci.name,
        soyad: ogrenci.surname,
        no: ogrenci.number || '',
        sinif: ogrenci.className,
        alanId: ogrenci.alanId,
        company: currentCompany ? {
          id: currentCompany.id,
          name: currentCompany.name,
          contact: currentCompany.contact,
          teacher: coordinatorTeacher ? {
            id: coordinatorTeacher.id,
            name: coordinatorTeacher.name,
            surname: coordinatorTeacher.surname,
            alanId: coordinatorTeacher.alanId,
            alan: coordinatorTeacher.alan
          } : null
        } : null
      }
    })

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