import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const alanId = resolvedParams.id
    
    // Query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const classId = searchParams.get('classId') || ''
    const skip = (page - 1) * limit

    // Build where clause with search
    const whereClause: any = {
      OR: [
                  // Aktif staj kaydı olan işletmeler
          {
            stajlar: {
              some: {
                student: {
                  alanId: alanId,
                  ...(classId && { classId })
                },
                status: 'ACTIVE'  // Sadece aktif staj kayıtları
              }
            }
          },
          // Sadece öğrenci ataması olan işletmeler (staj kaydı olmadan)
          {
            students: {
              some: {
                alanId: alanId,
                ...(classId && { classId }),
                stajlar: {
                  none: {
                    status: 'ACTIVE'  // Aktif stajı olmayan ama atanmış öğrenciler
                  }
                }
              }
            }
          }
      ]
    }

    // Add search filter
    if (search) {
      whereClause.AND = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contact: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    // Get total count
    const totalCount = await prisma.companyProfile.count({
      where: whereClause
    })

    // Bu alan için öğrencilerin atandığı işletmeleri getir (hem staj kaydı hem de sadece atama)
    const isletmelerData = await prisma.companyProfile.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        teacherId: true,
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
        },
        // Aktif stajlar (koordinatör öğretmen bilgisi dahil)
        stajlar: {
          where: {
            student: {
              alanId: alanId
            },
            status: 'ACTIVE'  // Sadece aktif stajları getir
          },
          select: {
            id: true,
            teacherId: true,
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
            },
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                className: true,
                number: true
              }
            }
          }
        },
        // Atanan tüm öğrenciler (staj kaydı olmasa da)
        students: {
          where: {
            alanId: alanId
          },
          select: {
            id: true,
            name: true,
            surname: true,
            className: true,
            number: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // İşletme verilerini dönüştür ve öğrenci listelerini birleştir
    const transformedIsletmeler = isletmelerData.map((isletme) => {
      // Staj kayıtları olan öğrenciler
      const stajOgrencileri = isletme.stajlar.map(staj => ({
        id: `staj-${staj.id}`,
        student: staj.student
      }))
      
      // Sadece atanan öğrenciler (staj kaydı olmayan)
      const atanmisOgrenciler = isletme.students
        .filter(student => !isletme.stajlar.some(staj => staj.student.id === student.id))
        .map(student => ({
          id: `assigned-${student.id}`,
          student
        }))
      
      // Tüm öğrencileri birleştir
      const tumStajlar = [...stajOgrencileri, ...atanmisOgrenciler]

      // Koordinatör öğretmeni belirle: Öncelik stajdaki koordinatöre, sonra işletmenin öğretmenine
      let coordinatorTeacher = null
      if (isletme.stajlar.length > 0) {
        // İlk stajın koordinatör öğretmenini al
        const firstInternshipTeacher = isletme.stajlar.find(staj => staj.teacher)?.teacher
        coordinatorTeacher = firstInternshipTeacher || isletme.teacher
      } else {
        coordinatorTeacher = isletme.teacher
      }

      return {
        id: isletme.id,
        ad: isletme.name,
        yetkili: isletme.contact,
        telefon: isletme.phone,
        email: isletme.email,
        adres: isletme.address,
        teacherId: coordinatorTeacher?.id || isletme.teacherId,
        teacher: coordinatorTeacher,
        stajlar: tumStajlar
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      companies: transformedIsletmeler,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('İşletmeler API hatası:', error)
    return NextResponse.json(
      { error: 'İşletmeler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}