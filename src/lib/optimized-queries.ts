import { prisma } from './prisma'

// Robust dekont fetching that works with Prisma ORM
export async function fetchDekontlarOptimized(page: number = 1, itemsPerPage: number = 20, filters: any = {}) {
  try {
    console.log('fetchDekontlarOptimized called with:', { page, itemsPerPage, filters })
    
    const skip = (page - 1) * itemsPerPage
    
    try {
      // Build where clause for filters
      const whereClause: any = {}
      
      if (filters.status && filters.status !== 'all') {
        whereClause.status = filters.status
      }

      // Get total count
      const count = await prisma.dekont.count({ where: whereClause })

      // Get paginated data with relationships
      const data = await prisma.dekont.findMany({
        where: whereClause,
        include: {
          staj: {
            include: {
              student: {
                include: {
                  alan: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              company: {
                select: {
                  name: true
                }
              },
              teacher: {
                select: {
                  name: true,
                  surname: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: skip,
        take: itemsPerPage
      })

      console.log('Prisma query successful:', { data: data?.length, count })
      return { data, error: null, count }
      
    } catch (error) {
      console.error('Prisma query failed:', error)
      return { data: [], error, count: 0 }
    }
    
  } catch (error) {
    console.error('fetchDekontlarOptimized complete failure:', error)
    return { data: [], error, count: 0 }
  }
}

// Optimized teacher list fetching with statistics
export async function fetchOgretmenlerOptimized(searchParams: any) {
  try {
    const page = parseInt(searchParams.page || '1')
    const perPage = parseInt(searchParams.per_page || '10')
    const search = searchParams.search || ''
    const alanFilter = searchParams.alan || ''

    // Calculate offset
    const skip = (page - 1) * perPage

    // Build where clause
    const whereClause: any = {}

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { surname: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    }

    // Add alan filter
    if (alanFilter && alanFilter !== 'all') {
      whereClause.alanId = alanFilter
    }

    // Get total count
    const count = await prisma.teacherProfile.count({ where: whereClause })

    // Get paginated teachers
    const teachers = await prisma.teacherProfile.findMany({
      where: whereClause,
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      skip: skip,
      take: perPage
    })

    if (!teachers || teachers.length === 0) {
      return {
        ogretmenler: [],
        alanlar: [],
        pagination: {
          page,
          perPage,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / perPage)
        }
      }
    }

    // Get statistics for each teacher
    const teacherIds = teachers.map((t: any) => t.id)
    const stajlarStats = await prisma.staj.groupBy({
      by: ['teacherId'],
      where: {
        teacherId: { in: teacherIds }
      },
      _count: {
        id: true
      }
    })

    const companyStats = await prisma.staj.groupBy({
      by: ['teacherId', 'companyId'],
      where: {
        teacherId: { in: teacherIds }
      },
      _count: {
        companyId: true
      }
    })

    // Create stats maps for efficient lookup
    const stajCountMap = new Map(stajlarStats.map((s: any) => [s.teacherId, s._count.id]))
    const companyCountMap = new Map()
    companyStats.forEach((s: any) => {
      const teacherId = s.teacherId
      if (!companyCountMap.has(teacherId)) {
        companyCountMap.set(teacherId, new Set())
      }
      companyCountMap.get(teacherId).add(s.companyId)
    })

    // Process teachers with stats
    const teachersWithStats = teachers.map((teacher: any) => ({
      id: teacher.id,
      ad: teacher.name,
      soyad: teacher.surname,
      email: teacher.email,
      telefon: teacher.phone,
      pin: teacher.pin,
      alan_id: teacher.alanId,
      alanlar: teacher.alan ? { id: teacher.alan.id, ad: teacher.alan.name } : null,
      stajlarCount: stajCountMap.get(teacher.id) || 0,
      koordinatorlukCount: companyCountMap.get(teacher.id)?.size || 0
    }))

    // Get all alanlar for filter dropdown
    const alanlar = await prisma.alan.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return {
      ogretmenler: teachersWithStats,
      alanlar: alanlar.map((a: any) => ({ id: a.id, ad: a.name })),
      pagination: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }

  } catch (error) {
    console.error('fetchOgretmenlerOptimized error:', error)
    throw error
  }
}

// Optimized staj fetching
export async function fetchStajlarOptimized(filters: any = {}) {
  const whereClause: any = {}

  // Apply filters
  if (filters.durum) {
    whereClause.status = filters.durum
  }
  
  if (filters.ogretmen_id) {
    whereClause.teacherId = filters.ogretmen_id
  }

  return await prisma.staj.findMany({
    where: whereClause,
    select: {
      id: true,
      studentId: true,
      companyId: true,
      teacherId: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

// Optimized teacher detail fetching
export async function fetchOgretmenDetayOptimized(ogretmenId: string) {
  try {
    // Get teacher with alan
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: ogretmenId },
      include: {
        alan: {
          select: {
            name: true
          }
        }
      }
    })

    if (!teacher) {
      throw new Error('Öğretmen bulunamadı')
    }

    // Get teacher assignment changes where this teacher was previously assigned
    const teacherChanges = await prisma.teacherAssignmentHistory.findMany({
      where: {
        previousTeacherId: ogretmenId
      },
      select: {
        companyId: true,
        assignedAt: true
      }
    })

    const changedCompanyIds = teacherChanges.map(tc => tc.companyId)

    // Get stajlar with related data (including all statuses)
    const stajlar = await prisma.staj.findMany({
      where: {
        OR: [
          { teacherId: ogretmenId },
          {
            company: {
              teacherId: ogretmenId
            }
          },
          // Include stajlar from companies where this teacher was previously coordinator
          {
            companyId: {
              in: changedCompanyIds
            }
          }
        ]
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            className: true,
            number: true,
            alan: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
            email: true,
            masterTeacherName: true,
            masterTeacherPhone: true,
            teacherId: true
          }
        },
        dekontlar: {
          select: {
            id: true,
            month: true,
            year: true,
            status: true,
            amount: true,
            fileUrl: true,
            rejectReason: true,
            approvedAt: true,
            rejectedAt: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    // Transform to expected format
    const transformedStajlar = stajlar.map((staj: any) => {
      // Check if this staj's company coordinator was changed from this teacher
      const wasCoordinatorChanged = changedCompanyIds.includes(staj.companyId) &&
                                   staj.company.teacherId !== ogretmenId

      return {
        id: staj.id,
        baslangic_tarihi: staj.startDate,
        bitis_tarihi: staj.endDate,
        fesih_tarihi: staj.terminationDate,
        durum: staj.status,
        koordinator_degisen: wasCoordinatorChanged,
        ogrenci_id: staj.studentId,
        isletme_id: staj.companyId,
        ogrenciler: staj.student ? {
          id: staj.student.id,
          ad: staj.student.name,
          soyad: staj.student.surname,
          sinif: staj.student.className,
          no: staj.student.number,
          alan: staj.student.alan ? {
            id: staj.student.alan.id,
            ad: staj.student.alan.name
          } : null
        } : null,
        isletmeler: staj.company ? {
          id: staj.company.id,
          ad: staj.company.name,
          yetkili: staj.company.contact,
          telefon: staj.company.phone,
          email: staj.company.email,
          usta_ogretici_ad: staj.company.masterTeacherName,
          usta_ogretici_telefon: staj.company.masterTeacherPhone
        } : null,
        dekontlar: staj.dekontlar.map((d: any) => ({
          id: d.id,
          ay: d.month,
          yil: d.year,
          onay_durumu: d.status === 'APPROVED' ? 'onaylandi' : d.status === 'REJECTED' ? 'reddedildi' : 'bekliyor',
          miktar: d.amount ? Number(d.amount) : undefined,
          dosya_url: d.fileUrl,
          red_nedeni: d.rejectReason
        }))
      }
    })

    // Get koordinatörlük programı data
    const koordinatorlukProgrami = await prisma.koordinatorlukProgrami.findMany({
      where: {
        ogretmenId: ogretmenId
      },
      orderBy: [
        { gun: 'asc' },
        { saatAraligi: 'asc' }
      ]
    })

    // Transform program data to expected format
    const transformedProgram = koordinatorlukProgrami.map((program: any) => ({
      id: program.id,
      isletme_id: program.isletmeId,
      gun: program.gun,
      saat_araligi: program.saatAraligi
    }))

    return {
      id: teacher.id,
      ad: teacher.name,
      soyad: teacher.surname,
      email: teacher.email,
      telefon: teacher.phone,
      alan_id: teacher.alanId,
      alanlar: teacher.alan ? { ad: teacher.alan.name } : null,
      stajlar: transformedStajlar,
      koordinatorluk_programi: transformedProgram
    }

  } catch (error) {
    console.error('Optimized teacher detail fetch error:', error)
    throw error
  }
}

// Optimized dashboard statistics fetching with timeout protection
export async function fetchDashboardStatsOptimized() {
  try {
    console.log('fetchDashboardStatsOptimized called')
    const startTime = performance.now()
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard stats query timeout after 15 seconds')), 15000)
    })
    
    // Use parallel queries for better performance
    const queryPromise = Promise.all([
      prisma.dekont.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      }),
      prisma.companyProfile.count(),
      prisma.teacherProfile.count(),
      prisma.student.count()
    ])
    
    // Race between query and timeout
    const [dekontStats, companiesCount, teachersCount, studentsCount] = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any[]
    
    const endTime = performance.now()
    console.log(`Dashboard stats fetched in ${(endTime - startTime).toFixed(2)}ms`)
    
    // Process dekont statistics
    const dekontStatsMap = new Map(dekontStats.map((d: any) => [d.status, d._count.id]))
    const totalDekontlar = dekontStats.reduce((sum: number, stat: any) => sum + stat._count.id, 0)
    const bekleyenDekontlar = dekontStatsMap.get('PENDING') || 0
    const onaylananDekontlar = dekontStatsMap.get('APPROVED') || 0
    const rededilenDekontlar = dekontStatsMap.get('REJECTED') || 0
    
    return {
      totalDekontlar,
      bekleyenDekontlar,
      onaylananDekontlar,
      rededilenDekontlar,
      totalIsletmeler: companiesCount,
      totalOgretmenler: teachersCount,
      totalOgrenciler: studentsCount,
      queryTime: endTime - startTime
    }
    
  } catch (error) {
    console.error('fetchDashboardStatsOptimized error:', error)
    // Re-throw with more specific error message
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Dashboard istatistikleri yüklenirken zaman aşımı oluştu. Lütfen tekrar deneyin.')
    }
    throw new Error(`Dashboard istatistikleri yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
  }
}

// Optimized count queries using Prisma count
export async function getEstimatedCount(tableName: string, filters: any = {}) {
  try {
    switch (tableName) {
      case 'dekontlar':
        return await prisma.dekont.count({ where: filters })
      case 'companies':
        return await prisma.companyProfile.count({ where: filters })
      case 'teachers':
        return await prisma.teacherProfile.count({ where: filters })
      case 'students':
        return await prisma.student.count({ where: filters })
      case 'fields':
        return await prisma.alan.count({ where: filters })
      case 'internships':
        return await prisma.staj.count({ where: filters })
      default:
        return 0
    }
  } catch (error) {
    console.error(`Error counting ${tableName}:`, error)
    return 0
  }
}