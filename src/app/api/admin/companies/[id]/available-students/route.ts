import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // First get the company's fields
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            alan: true
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get students in the company's field who are not currently in active internships
    const availableStudents = await prisma.student.findMany({
      where: {
        AND: [
          {
            alanId: company.teacher?.alanId || '' // Students in company's field
          },
          {
            companyId: null // Not currently assigned to any company
          }
        ]
      },
      include: {
        alan: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const transformedStudents = availableStudents.map((student: any) => ({
      id: student.id,
      name: student.name,
      surname: student.surname,
      number: student.number || '',
      className: student.className,
      alanId: student.alanId,
      alan: {
        name: student.alan.name
      }
    }))

    return NextResponse.json(transformedStudents)
  } catch (error) {
    console.error('Error fetching available students:', error)
    return NextResponse.json({ error: 'Failed to fetch available students' }, { status: 500 })
  }
}