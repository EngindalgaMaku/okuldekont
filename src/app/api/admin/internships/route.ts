import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Transform data to match expected interface
    const transformedInternships = internships.map(internship => ({
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
    const { studentId, companyId, teacherId, startDate, endDate, status = 'ACTIVE' } = await request.json()

    if (!studentId || !companyId || !teacherId || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get current education year (or create a default one)
    let educationYear = await prisma.egitimYili.findFirst({
      where: { active: true }
    })

    if (!educationYear) {
      // Create a default education year
      const currentYear = new Date().getFullYear()
      educationYear = await prisma.egitimYili.create({
        data: {
          year: `${currentYear}-${currentYear + 1}`,
          active: true
        }
      })
    }

    const internship = await prisma.staj.create({
      data: {
        studentId,
        companyId,
        teacherId,
        educationYearId: educationYear.id,
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