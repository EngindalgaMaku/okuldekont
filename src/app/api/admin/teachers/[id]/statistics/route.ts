import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params

    // First, get the teacher info from TeacherProfile table
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        name: true,
        surname: true
      }
    })

    if (!teacher) {
      return NextResponse.json({
        teacherId: teacherId,
        teacherName: 'Öğretmen Bulunamadı',
        totalCompanies: 0,
        totalStudents: 0,
        activeInternships: 0,
        completedInternships: 0,
        companies: [],
        students: []
      })
    }

    // Get companies where this teacher is coordinator
    const companies = await prisma.companyProfile.findMany({
      where: {
        teacherId: teacherId
      },
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        masterTeacherName: true,
        masterTeacherPhone: true,
        stajlar: {
          where: {
            status: {
              in: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED']
            }
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                number: true,
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
      }
    })

    // Get all internships where teacher is directly assigned (active and past)
    const allInternships = await prisma.staj.findMany({
      where: {
        teacherId: teacherId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
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
            masterTeacherName: true,
            masterTeacherPhone: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    // Separate active and past internships
    const activeInternships = allInternships.filter(s => s.status === 'ACTIVE')
    const terminatedInternships = allInternships.filter(s => s.status === 'TERMINATED')
    const completedInternships = allInternships.filter(s => s.status === 'COMPLETED')

    // Get teacher assignment changes where this teacher was previously assigned
    const teacherChanges = await prisma.teacherAssignmentHistory.findMany({
      where: {
        previousTeacherId: teacherId
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    })

    // Process companies data
    const companiesData = companies.map(company => ({
      id: company.id,
      name: company.name,
      contact: company.contact,
      phone: company.phone,
      masterTeacherName: company.masterTeacherName,
      masterTeacherPhone: company.masterTeacherPhone,
      studentCount: company.stajlar.length,
      activeStudents: company.stajlar.filter(s => s.status === 'ACTIVE').length
    }))

    // Combine all students (from companies and direct assignments)
    const allStudents = new Map()
    
    // Add students from coordinated companies
    companies.forEach(company => {
      company.stajlar.forEach(staj => {
        const studentId = staj.student.id
        allStudents.set(`${studentId}_${staj.id}`, {
          id: staj.student.id,
          internshipId: staj.id,
          name: `${staj.student.name} ${staj.student.surname}`,
          email: staj.student.email,
          number: staj.student.number,
          fieldName: staj.student.alan?.name || 'Bilinmiyor',
          companyName: company.name,
          companyContact: company.contact,
          companyPhone: company.phone,
          masterTeacherName: company.masterTeacherName,
          masterTeacherPhone: company.masterTeacherPhone,
          startDate: staj.startDate,
          endDate: staj.endDate,
          terminationDate: staj.terminationDate,
          status: staj.status
        })
      })
    })

    // Add students from direct assignments (all statuses including terminated)
    allInternships.forEach(staj => {
      const studentId = staj.student.id
      allStudents.set(`${studentId}_${staj.id}`, {
        id: staj.student.id,
        internshipId: staj.id,
        name: `${staj.student.name} ${staj.student.surname}`,
        email: staj.student.email,
        number: staj.student.number,
        fieldName: staj.student.alan?.name || 'Bilinmiyor',
        companyName: staj.company?.name || 'Bilinmiyor',
        companyContact: staj.company?.contact,
        companyPhone: staj.company?.phone,
        masterTeacherName: staj.company?.masterTeacherName,
        masterTeacherPhone: staj.company?.masterTeacherPhone,
        startDate: staj.startDate,
        endDate: staj.endDate,
        terminationDate: staj.terminationDate,
        status: staj.status
      })
    })

    const studentsData = Array.from(allStudents.values())

    // Calculate statistics
    const totalTerminated = terminatedInternships.length
    const totalCompleted = completedInternships.length
    const transferredToOthers = teacherChanges.length

    const statistics = {
      teacherId: teacher.id,
      teacherName: `${teacher.name} ${teacher.surname}`,
      totalCompanies: companies.length,
      totalStudents: studentsData.length,
      terminatedInternships: totalTerminated,
      completedInternships: totalCompleted,
      transferredToOthers: transferredToOthers,
      companies: companiesData,
      students: studentsData,
      teacherChanges: teacherChanges.map(change => ({
        id: change.id,
        companyName: change.company?.name || 'Bilinmiyor',
        newTeacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : 'Bilinmiyor',
        assignedAt: change.assignedAt,
        reason: change.reason
      }))
    }

    return NextResponse.json(statistics)

  } catch (error) {
    console.error('Teacher statistics API error:', error)
    return NextResponse.json(
      { error: 'İstatistikler alınırken hata oluştu' },
      { status: 500 }
    )
  }
}