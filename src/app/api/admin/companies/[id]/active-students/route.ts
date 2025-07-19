import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const activeInternships = await prisma.staj.findMany({
      where: {
        companyId: id,
        status: 'ACTIVE',
        terminationDate: null
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

    const transformedActiveStudents = activeInternships.map((internship: any) => ({
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

    return NextResponse.json(transformedActiveStudents)
  } catch (error) {
    console.error('Error fetching active students:', error)
    return NextResponse.json({ error: 'Failed to fetch active students' }, { status: 500 })
  }
}