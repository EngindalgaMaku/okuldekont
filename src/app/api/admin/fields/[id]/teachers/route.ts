import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fieldId } = await params

    if (!fieldId) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    // Fetch teachers for this field
    const teachers = await prisma.teacherProfile.findMany({
      where: {
        alanId: fieldId,
        active: true
      },
      include: {
        alan: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ]
    })

    // Transform data to match expected interface
    const transformedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      surname: teacher.surname,
      alan: teacher.alan ? {
        name: teacher.alan.name
      } : null
    }))

    return NextResponse.json(transformedTeachers)
  } catch (error) {
    console.error('Teachers by field fetch error:', error)
    return NextResponse.json(
      { error: 'Öğretmenler getirilemedi' },
      { status: 500 }
    )
  }
}