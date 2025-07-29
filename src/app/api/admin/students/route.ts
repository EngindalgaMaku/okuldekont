import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  // Auth check
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const alanId = searchParams.get('alanId') || ''
    const sinif = searchParams.get('sinif') || ''
    const status = searchParams.get('status') || ''
    const itemsPerPage = 12
    const skip = (page - 1) * itemsPerPage

    // Build where clause
    const whereClause: any = {}
    
    // Search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          surname: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          number: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Alan filter
    if (alanId && alanId !== 'all') {
      whereClause.alanId = alanId
    }

    // Sınıf filter
    if (sinif && sinif !== 'all') {
      whereClause.className = sinif
    }

    // Status filter
    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          whereClause.stajlar = {
            some: {
              status: 'ACTIVE'
            }
          }
          break
        case 'unassigned':
          whereClause.AND = [
            {
              OR: [
                { companyId: null },
                { companyId: '' }
              ]
            },
            {
              stajlar: {
                none: {
                  status: 'ACTIVE'
                }
              }
            }
          ]
          break
        case 'terminated':
          whereClause.stajlar = {
            some: {
              status: 'TERMINATED'
            }
          }
          break
        case 'completed':
          whereClause.stajlar = {
            some: {
              status: 'COMPLETED'
            }
          }
          break
      }
    }

    // Get students with pagination
    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          surname: true,
          number: true,
          className: true,
          alanId: true,
          alan: {
            select: {
              id: true,
              name: true
            }
          },
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
              status: true,
              startDate: true,
              endDate: true,
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
        orderBy: [
          { name: 'asc' },
          { surname: 'asc' }
        ],
        skip: skip,
        take: itemsPerPage
      }),
      prisma.student.count({
        where: whereClause
      })
    ])

    // Transform data to match expected format
    const transformedStudents = students.map((student) => {
      // Use active internship if available, otherwise fall back to student.company
      const activeInternship = student.stajlar?.[0]
      const currentCompany = activeInternship?.company || student.company
      const coordinatorTeacher = activeInternship?.teacher || currentCompany?.teacher

      return {
        id: student.id,
        ad: student.name,
        soyad: student.surname,
        no: student.number || '',
        sinif: student.className,
        alanId: student.alanId,
        alan: student.alan,
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
        } : null,
        internshipStatus: activeInternship ? {
          id: activeInternship.id,
          status: activeInternship.status,
          startDate: activeInternship.startDate,
          endDate: activeInternship.endDate
        } : null
      }
    })

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    return NextResponse.json({
      students: transformedStudents,
      totalCount,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    })

  } catch (error) {
    console.error('Students API error:', error)
    return NextResponse.json(
      { error: 'Öğrenciler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}