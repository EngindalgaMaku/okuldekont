import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!term || term.length < 2) {
      return NextResponse.json([])
    }

    const teachers = await prisma.teacherProfile.findMany({
      where: {
        OR: [
          {
            name: {
              contains: term
            }
          },
          {
            surname: {
              contains: term
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        surname: true
      },
      orderBy: {
        name: 'asc'
      },
      take: limit
    })

    // Format to match expected interface
    const formattedTeachers = teachers.map((teacher: any) => ({
      id: teacher.id,
      name: teacher.name,
      surname: teacher.surname
    }))

    return NextResponse.json(formattedTeachers)
  } catch (error) {
    console.error('Teacher search error:', error)
    return NextResponse.json(
      { error: 'Teacher search failed' },
      { status: 500 }
    )
  }
}