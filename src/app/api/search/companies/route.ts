import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  // PUBLIC: Şirket arama - Dropdown data için herkese açık
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!term || term.length < 2) {
      return NextResponse.json([])
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Company search:', { term, limit })
    }

    const companies = await prisma.companyProfile.findMany({
      where: {
        name: {
          contains: term
        }
      },
      select: {
        id: true,
        name: true,
        contact: true
      },
      orderBy: {
        name: 'asc'
      },
      take: limit
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Company search results:', companies.length, 'found')
    }

    // Format to match expected interface
    const formattedCompanies = companies.map((company) => ({
      id: company.id,
      name: company.name,
      contact: company.contact
    }))

    return NextResponse.json(formattedCompanies)
  } catch (error) {
    console.error('💥 Company search error:', error)
    return NextResponse.json(
      { error: 'Company search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}