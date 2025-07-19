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

    const companies = await prisma.companyProfile.findMany({
      where: {
        name: {
          contains: term
        },
        // Only companies with active internships
        stajlar: {
          some: {
            status: 'ACTIVE',
            terminationDate: null
          }
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

    // Format to match expected interface
    const formattedCompanies = companies.map((company: any) => ({
      id: company.id,
      name: company.name,
      contact: company.contact
    }))

    return NextResponse.json(formattedCompanies)
  } catch (error) {
    console.error('Company search error:', error)
    return NextResponse.json(
      { error: 'Company search failed' },
      { status: 500 }
    )
  }
}