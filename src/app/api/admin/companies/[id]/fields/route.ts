import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get company with teacher and field information
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

    // Create a simple field structure based on the company's teacher's field
    const companyFields = company.teacher?.alan ? [{
      id: `${company.id}-${company.teacher.alan.id}`,
      alanId: company.teacher.alan.id,
      alan: {
        id: company.teacher.alan.id,
        name: company.teacher.alan.name
      }
    }] : []

    return NextResponse.json(companyFields)
  } catch (error) {
    console.error('Error fetching company fields:', error)
    return NextResponse.json({ error: 'Failed to fetch company fields' }, { status: 500 })
  }
}