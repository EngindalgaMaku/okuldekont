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

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    const { name, description, active } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      )
    }

    const updatedField = await prisma.alan.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active: Boolean(active)
      },
      include: {
        _count: {
          select: {
            teachers: true,
            students: true
          }
        }
      }
    })

    // Get companies count
    const companiesCount = await prisma.companyProfile.count()

    return NextResponse.json({
      success: true,
      field: {
        id: updatedField.id,
        ad: updatedField.name,
        aciklama: updatedField.description,
        aktif: updatedField.active,
        ogretmen_sayisi: updatedField._count.teachers,
        ogrenci_sayisi: updatedField._count.students,
        isletme_sayisi: companiesCount
      }
    })
  } catch (error) {
    console.error('Field update error:', error)
    return NextResponse.json(
      { error: 'Failed to update field' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    // Check if field has related data
    const fieldWithCounts = await prisma.alan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teachers: true,
            students: true,
            classes: true
          }
        }
      }
    })

    if (!fieldWithCounts) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      )
    }

    const totalRelated = fieldWithCounts._count.teachers +
                        fieldWithCounts._count.students +
                        fieldWithCounts._count.classes

    if (totalRelated > 0) {
      return NextResponse.json(
        { error: 'Bu alana bağlı öğretmen, öğrenci veya sınıf bulunmaktadır. Önce bunları kaldırın.' },
        { status: 400 }
      )
    }

    await prisma.alan.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Field deleted successfully'
    })
  } catch (error) {
    console.error('Field deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete field' },
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