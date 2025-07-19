import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const internships = await prisma.staj.findMany({
      where: {
        companyId: id,
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
    
    // Get active education year
    const activeEducationYear = await prisma.egitimYili.findFirst({
      where: {
        active: true
      }
    })

    if (!activeEducationYear) {
      return NextResponse.json({ error: 'No active education year found' }, { status: 400 })
    }

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

    const internship = await prisma.staj.create({
      data: {
        studentId: data.studentId,
        companyId: id,
        teacherId: company.teacherId || '', // Use company's teacher or empty string
        educationYearId: activeEducationYear.id,
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

    // Update student's company assignment
    await prisma.student.update({
      where: { id: data.studentId },
      data: { companyId: id }
    })

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