import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all fields with statistics
    const fields = await prisma.alan.findMany({
      include: {
        _count: {
          select: {
            teachers: true,
            students: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get companies count separately (assuming companies are related through students)
    const companiesCount = await prisma.companyProfile.count()

    // Transform to match expected interface
    const transformedFields = fields.map(field => ({
      id: field.id,
      ad: field.name,
      aciklama: field.description,
      aktif: field.active,
      ogretmen_sayisi: field._count.teachers,
      ogrenci_sayisi: field._count.students,
      isletme_sayisi: companiesCount // This is a rough approximation
    }))

    return NextResponse.json(transformedFields)
  } catch (error) {
    console.error('Fields fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fields' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, active = true } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      )
    }

    const field = await prisma.alan.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active
      }
    })

    return NextResponse.json({
      id: field.id,
      ad: field.name,
      aciklama: field.description,
      aktif: field.active,
      ogretmen_sayisi: 0,
      ogrenci_sayisi: 0,
      isletme_sayisi: 0
    })
  } catch (error) {
    console.error('Field creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create field' },
      { status: 500 }
    )
  }
}