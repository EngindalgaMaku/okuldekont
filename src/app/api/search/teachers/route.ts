import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  // PUBLIC: Öğretmen arama - Dropdown data için herkese açık
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!term || term.length < 2) {
      return NextResponse.json([])
    }

    console.log('🔍 Teacher search:', { term, limit })

    // Optimize with Prisma ORM for better performance and type safety
    // Note: Removed 'mode' for MySQL compatibility (most MySQL collations are case-insensitive by default)
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

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Teacher search results:', teachers.length, 'found')
    }

    // Format to match expected interface
    const formattedTeachers = teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      surname: teacher.surname
    }))

    return NextResponse.json(formattedTeachers)
  } catch (error) {
    console.error('💥 Teacher search error:', error)
    return NextResponse.json(
      { error: 'Teacher search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}