import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveEducationYearId } from '@/lib/education-year'
import { auditInternshipCreation } from '@/lib/audit-trail'
import { getSystemUserId } from '@/lib/system-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const internships = await prisma.staj.findMany({
      where: {
        companyId: id,
        status: 'ACTIVE'  // Sadece aktif stajları göster
      },
      include: {
        student: {
          include: {
            alan: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedInternships = internships.map((internship: any) => ({
      id: internship.id,
      studentId: internship.studentId,
      startDate: internship.startDate.toISOString(),
      endDate: internship.endDate.toISOString(),
      terminationDate: internship.terminationDate?.toISOString(),
      status: internship.status,
      student: {
        id: internship.student.id,
        name: internship.student.name,
        surname: internship.student.surname,
        number: internship.student.number || '',
        className: internship.student.className,
        alan: {
          name: internship.student.alan.name
        }
      }
    }))

    return NextResponse.json(transformedInternships)
  } catch (error) {
    console.error('Error fetching internships:', error)
    return NextResponse.json({ error: 'Failed to fetch internships' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Get active education year - will throw error if none exists
    const educationYearId = await getActiveEducationYearId()

    // Get company info for teacher assignment
    const company = await prisma.companyProfile.findUnique({
      where: { id }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Calculate end date (150 days from start date)
    const startDate = new Date(data.startDate)
    const endDate = new Date(startDate.getTime() + 150 * 24 * 60 * 60 * 1000)
    const performedBy = data.performedBy || await getSystemUserId()

    // Use transaction to ensure both internship and history are created
    const result = await prisma.$transaction(async (prisma) => {
      const internship = await prisma.staj.create({
        data: {
          studentId: data.studentId,
          companyId: id,
          teacherId: company.teacherId || '', // Use company's teacher or empty string
          educationYearId,
          startDate: startDate,
          endDate: endDate,
          status: 'ACTIVE'
        },
        include: {
          student: {
            include: {
              alan: true
            }
          }
        }
      })

      // Get teacher info for detailed history
      const teacherInfo = company.teacherId ? await prisma.teacherProfile.findUnique({
        where: { id: company.teacherId }
      }) : null;

      // Create audit trail history record with detailed info
      const startDateFormatted = startDate.toLocaleDateString('tr-TR');
      const teacherName = teacherInfo ? `${teacherInfo.name} ${teacherInfo.surname}` : 'Atanmamış';
      
      await prisma.internshipHistory.create({
        data: {
          internshipId: internship.id,
          action: 'CREATED',
          newData: {
            studentId: data.studentId,
            companyId: id,
            teacherId: company.teacherId || '',
            educationYearId,
            startDate: startDate,
            endDate: endDate,
            status: 'ACTIVE'
          },
          performedBy,
          reason: `${company.name} işletmesinde staj başlatıldı`,
          notes: `Başlangıç Tarihi: ${startDateFormatted} | Koordinatör: ${teacherName}`
        }
      })

      // Update student's company assignment
      await prisma.student.update({
        where: { id: data.studentId },
        data: { companyId: id }
      })

      return internship
    })

    const internship = result

    return NextResponse.json({
      id: internship.id,
      studentId: internship.studentId,
      startDate: internship.startDate.toISOString(),
      endDate: internship.endDate.toISOString(),
      status: internship.status,
      student: {
        id: internship.student.id,
        name: internship.student.name,
        surname: internship.student.surname,
        number: internship.student.number || '',
        className: internship.student.className,
        alan: {
          name: internship.student.alan.name
        }
      }
    })
  } catch (error) {
    console.error('Error creating internship:', error)
    return NextResponse.json({ error: 'Failed to create internship' }, { status: 500 })
  }
}