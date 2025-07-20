import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveEducationYearId } from '@/lib/education-year'
import { auditInternshipCreation } from '@/lib/audit-trail'
import { getSystemUserId } from '@/lib/system-user'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentIds = searchParams.get('studentIds')
    const status = searchParams.get('status')
    
    let whereClause: any = {}
    
    // Filter by student IDs if provided
    if (studentIds) {
      const studentIdArray = studentIds.split(',').filter(id => id.trim())
      whereClause.studentId = { in: studentIdArray }
    }
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }
    
    // Get internships with related data
    const internships = await prisma.staj.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            alan: true
          }
        },
        company: true,
        teacher: true,
        educationYear: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data to match expected interface with teacher history support
    const transformedInternships = await Promise.all(internships.map(async (internship) => {
      let teacherInfo = null
      
      // Get teacher info from current relation or history
      if (internship.teacher) {
        teacherInfo = {
          id: internship.teacher.id,
          name: internship.teacher.name,
          surname: internship.teacher.surname
        }
      } else if (internship.status === 'TERMINATED') {
        // For terminated internships, get teacher info from history
        const teacherHistory = await prisma.internshipHistory.findFirst({
          where: {
            internshipId: internship.id,
            action: { in: ['ASSIGNED', 'TEACHER_CHANGED'] }
          },
          orderBy: { performedAt: 'desc' }
        })
        
        if (teacherHistory?.newData) {
          const newData = teacherHistory.newData as any
          if (newData.teacherName && newData.teacherId) {
            const teacherName = newData.teacherName as string
            const [name, ...surnameParts] = teacherName.split(' ')
            teacherInfo = {
              id: newData.teacherId as string,
              name: name || 'Bilinmeyen',
              surname: surnameParts.join(' ') || 'Öğretmen'
            }
          }
        }
      }

      return {
        id: internship.id,
        studentId: internship.studentId,
        companyId: internship.companyId,
        teacherId: internship.teacherId,
        educationYearId: internship.educationYearId,
        startDate: internship.startDate.toISOString().split('T')[0],
        endDate: internship.endDate.toISOString().split('T')[0],
        status: internship.status,
        terminationDate: internship.terminationDate?.toISOString().split('T')[0] || null,
        createdAt: internship.createdAt.toISOString(),
        student: internship.student ? {
          id: internship.student.id,
          name: internship.student.name,
          surname: internship.student.surname,
          number: internship.student.number || '',
          className: internship.student.className,
          alan: internship.student.alan ? {
            name: internship.student.alan.name
          } : null
        } : null,
        company: internship.company ? {
          id: internship.company.id,
          name: internship.company.name,
          contact: internship.company.contact
        } : null,
        teacher: teacherInfo
      }
    }))

    return NextResponse.json({
      success: true,
      data: transformedInternships
    })
  } catch (error) {
    console.error('Internships fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch internships' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { studentId, companyId, teacherId, startDate, endDate, status = 'ACTIVE', performedBy } = await request.json()

    if (!studentId || !companyId || !teacherId || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get real system user ID if performedBy not provided
    const realPerformedBy = performedBy || await getSystemUserId()

    // Get active education year - will throw error if none exists
    const educationYearId = await getActiveEducationYearId()

    // Use transaction to ensure both internship and history are created
    const result = await prisma.$transaction(async (prisma) => {
      // Create internship
      const internship = await prisma.staj.create({
        data: {
          studentId,
          companyId,
          teacherId,
          educationYearId,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : new Date(startDate),
          status,
          terminationDate: null
        },
        include: {
          student: {
            include: {
              alan: true
            }
          },
          company: true,
          teacher: true,
          educationYear: true
        }
      })

      // Get teacher and company info for detailed history
      const teacherInfo = await prisma.teacherProfile.findUnique({
        where: { id: teacherId }
      });
      
      const companyInfo = await prisma.companyProfile.findUnique({
        where: { id: companyId }
      });

      // Create audit trail history record with detailed info
      const startDateFormatted = new Date(startDate).toLocaleDateString('tr-TR');
      const teacherName = teacherInfo ? `${teacherInfo.name} ${teacherInfo.surname}` : 'Bilinmeyen Koordinatör';
      const companyName = companyInfo?.name || 'Bilinmeyen İşletme';
      
      await prisma.internshipHistory.create({
        data: {
          internshipId: internship.id,
          action: 'CREATED',
          newData: {
            studentId,
            companyId,
            teacherId,
            educationYearId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : new Date(startDate),
            status
          },
          performedBy: realPerformedBy,
          reason: `${companyName} işletmesinde staj başlatıldı`,
          notes: `Başlangıç Tarihi: ${startDateFormatted} | Koordinatör: ${teacherName}`
        }
      })

      return internship
    })

    const internship = result

    return NextResponse.json({
      id: internship.id,
      studentId: internship.studentId,
      companyId: internship.companyId,
      teacherId: internship.teacherId,
      educationYearId: internship.educationYearId,
      startDate: internship.startDate.toISOString().split('T')[0],
      endDate: internship.endDate.toISOString().split('T')[0],
      status: internship.status,
      terminationDate: internship.terminationDate?.toISOString().split('T')[0] || null,
      createdAt: internship.createdAt.toISOString(),
      student: internship.student ? {
        id: internship.student.id,
        name: internship.student.name,
        surname: internship.student.surname,
        number: internship.student.number || '',
        className: internship.student.className,
        alan: internship.student.alan ? {
          name: internship.student.alan.name
        } : null
      } : null,
      company: internship.company ? {
        id: internship.company.id,
        name: internship.company.name,
        contact: internship.company.contact
      } : null,
      teacher: internship.teacher ? {
        id: internship.teacher.id,
        name: internship.teacher.name,
        surname: internship.teacher.surname
      } : null
    })
  } catch (error) {
    console.error('Internship creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create internship' },
      { status: 500 }
    )
  }
}