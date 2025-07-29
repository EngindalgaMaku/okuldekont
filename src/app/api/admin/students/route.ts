import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import { validateAndSanitize, validateStudent, sanitizeString } from '@/lib/validation'

export async function GET(request: Request) {
  // KRİTİK KVKK KORUMA: Öğrenci kişisel verileri - SADECE ADMIN ve TEACHER
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: ${authResult.user?.role} ${authResult.user?.email} accessing student personal data`, {
    timestamp: new Date().toISOString(),
    action: 'VIEW_STUDENT_DATA'
  })

  try {
    const { searchParams } = new URL(request.url)
    const alanId = searchParams.get('alanId')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const sinif = searchParams.get('sinif')
    const status = searchParams.get('status') // New status filter
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build where clause
    const whereClause: any = {}

    // Add alanId filter only if provided
    if (alanId) {
      whereClause.alanId = alanId
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Add class filter
    if (sinif && sinif !== 'all') {
      whereClause.className = sinif
    }

    // Add status-based filtering
    if (status && status !== 'all') {
      if (status === 'active') {
        // Students with active internships
        whereClause.stajlar = {
          some: {
            status: 'ACTIVE'
          }
        }
      } else if (status === 'terminated') {
        // Students with terminated internships (but no active ones)
        whereClause.AND = [
          {
            stajlar: {
              some: {
                status: {
                  in: ['TERMINATED', 'CANCELLED']
                }
              }
            }
          },
          {
            NOT: {
              stajlar: {
                some: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        ]
      } else if (status === 'completed') {
        // Students with completed internships (but no active ones)
        whereClause.AND = [
          {
            stajlar: {
              some: {
                status: 'COMPLETED'
              }
            }
          },
          {
            NOT: {
              stajlar: {
                some: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        ]
      } else if (status === 'unassigned') {
        // Students with no internships or all inactive
        whereClause.OR = [
          {
            stajlar: {
              none: {}
            }
          },
          {
            NOT: {
              stajlar: {
                some: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        ]
      }
    }

    // Get total count
    const totalCount = await prisma.student.count({
      where: whereClause
    })

    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit

    // Get students with related data including internships and coordinator teacher
    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        alan: true,
        company: {
          include: {
            teacher: {
              include: {
                alan: true
              }
            }
          }
        },
        stajlar: {
          include: {
            teacher: {
              include: {
                alan: true
              }
            },
            company: {
              include: {
                teacher: {
                  include: {
                    alan: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        class: true
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    // Transform data to match expected interface with internship status info
    const transformedStudents = students.map(student => {
      const activeInternship = student.stajlar.find((i: any) => i.status === 'ACTIVE')
      const latestInternship = student.stajlar[0] // Most recent due to ordering
      
      // Determine coordinator teacher: prioritize internship coordinator over company teacher
      let coordinatorTeacher = null
      if (activeInternship?.teacher) {
        coordinatorTeacher = activeInternship.teacher
      } else if (activeInternship?.company?.teacher) {
        coordinatorTeacher = activeInternship.company.teacher
      } else if (student.company?.teacher) {
        coordinatorTeacher = student.company.teacher
      }
      
      return {
        id: student.id,
        ad: student.name, // Match the component interface
        soyad: student.surname,
        no: student.number || '',
        sinif: student.className,
        alanId: student.alanId,
        alan: student.alan,
        // Show active company if exists, otherwise show company from student record (legacy)
        company: activeInternship?.company ? {
          id: activeInternship.company.id,
          name: activeInternship.company.name,
          contact: activeInternship.company.contact,
          teacher: coordinatorTeacher ? {
            id: coordinatorTeacher.id,
            name: coordinatorTeacher.name,
            surname: coordinatorTeacher.surname,
            alanId: coordinatorTeacher.alanId,
            alan: coordinatorTeacher.alan
          } : null
        } : (student.company ? {
          id: student.company.id,
          name: student.company.name,
          contact: student.company.contact,
          teacher: coordinatorTeacher ? {
            id: coordinatorTeacher.id,
            name: coordinatorTeacher.name,
            surname: coordinatorTeacher.surname,
            alanId: coordinatorTeacher.alanId,
            alan: coordinatorTeacher.alan
          } : null
        } : null),
        // Add internship status information
        internshipStatus: activeInternship?.status || latestInternship?.status || 'UNASSIGNED',
        latestInternship: latestInternship ? {
          id: latestInternship.id,
          status: latestInternship.status,
          startDate: latestInternship.startDate,
          endDate: latestInternship.endDate,
          terminationDate: latestInternship.terminationDate,
          terminationReason: (latestInternship as any).terminationReason,
          company: latestInternship.company
        } : null
      }
    })

    return NextResponse.json({
      students: transformedStudents,
      totalCount,
      totalPages,
      currentPage: page
    })
  } catch (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json(
      { error: 'Öğrenciler getirilemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // KRİTİK KVKK KORUMA: Öğrenci oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} creating student with personal data`, {
    timestamp: new Date().toISOString(),
    action: 'CREATE_STUDENT_DATA'
  })

  try {
    const requestData = await request.json()
    
    // INPUT VALIDATION & SANITIZATION
    const validationResult = validateAndSanitize(requestData, validateStudent)
    if (!validationResult.success) {
      console.warn(`🛡️ VALIDATION: Student creation failed`, {
        error: validationResult.error,
        adminId: authResult.user?.id
      })
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    const {
      name,
      surname,
      className,
      number,
      tcNo,
      phone,
      email,
      gender,
      birthDate,
      parentName,
      parentSurname,
      parentPhone,
      alanId
    } = validationResult.data

    const student = await prisma.student.create({
      data: {
        name: sanitizeString(name),
        surname: sanitizeString(surname),
        className: sanitizeString(className),
        number: number ? sanitizeString(number) : null,
        tcNo: tcNo ? sanitizeString(tcNo) : null,
        phone: phone ? sanitizeString(phone) : null,
        email: email ? sanitizeString(email) : null,
        gender: gender ? sanitizeString(gender) : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        parentName: parentName ? sanitizeString(parentName) : null,
        parentSurname: parentSurname ? sanitizeString(parentSurname) : null,
        parentPhone: parentPhone ? sanitizeString(parentPhone) : null,
        alanId
      },
      include: {
        alan: true,
        company: {
          include: {
            teacher: {
              include: {
                alan: true
              }
            }
          }
        },
        class: true
      }
    })

    return NextResponse.json({
      id: student.id,
      ad: student.name,
      soyad: student.surname,
      no: student.number || '',
      sinif: student.className,
      alanId: student.alanId,
      company: student.company ? {
        id: student.company.id,
        name: student.company.name,
        contact: student.company.contact,
        teacher: student.company.teacher ? {
          id: student.company.teacher.id,
          name: student.company.teacher.name,
          surname: student.company.teacher.surname,
          alanId: student.company.teacher.alanId,
          alan: student.company.teacher.alan
        } : null
      } : null
    })
  } catch (error) {
    console.error('Student creation error:', error)
    return NextResponse.json(
      { error: 'Öğrenci oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  // KRİTİK KVKK KORUMA: Öğrenci güncelleme - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('id')
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const { name, surname, className, number } = await request.json()

    if (!name || !surname || !className) {
      return NextResponse.json(
        { error: 'Ad, soyad ve sınıf alanları zorunludur' },
        { status: 400 }
      )
    }

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: name.trim(),
        surname: surname.trim(),
        className: className.trim(),
        number: number?.trim() || null
      },
      include: {
        alan: true,
        company: {
          include: {
            teacher: {
              include: {
                alan: true
              }
            }
          }
        },
        class: true
      }
    })

    return NextResponse.json({
      id: updatedStudent.id,
      ad: updatedStudent.name,
      soyad: updatedStudent.surname,
      no: updatedStudent.number || '',
      sinif: updatedStudent.className,
      alanId: updatedStudent.alanId,
      company: updatedStudent.company ? {
        id: updatedStudent.company.id,
        name: updatedStudent.company.name,
        contact: updatedStudent.company.contact,
        teacher: updatedStudent.company.teacher ? {
          id: updatedStudent.company.teacher.id,
          name: updatedStudent.company.teacher.name,
          surname: updatedStudent.company.teacher.surname,
          alanId: updatedStudent.company.teacher.alanId,
          alan: updatedStudent.company.teacher.alan
        } : null
      } : null
    })
  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json(
      { error: 'Öğrenci güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  // KRİTİK KVKK KORUMA: Öğrenci silme - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging - Data deletion
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} deleting student personal data`, {
    timestamp: new Date().toISOString(),
    action: 'DELETE_STUDENT_DATA'
  })

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('id')
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Delete student
    await prisma.student.delete({
      where: { id: studentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Student deletion error:', error)
    return NextResponse.json(
      { error: 'Öğrenci silinirken hata oluştu' },
      { status: 500 }
    )
  }
}