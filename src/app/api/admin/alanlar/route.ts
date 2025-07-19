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

    // Get companies count per field (students' companies grouped by field)
    const companiesPerField = await Promise.all(
      fields.map(async (field) => {
        const distinctCompanies = await prisma.student.findMany({
          where: {
            alanId: field.id,
            companyId: { not: null }
          },
          select: {
            companyId: true
          },
          distinct: ['companyId']
        })
        return {
          fieldId: field.id,
          count: distinctCompanies.length
        }
      })
    )

    // Create a map for easy lookup
    const companiesMap = new Map(
      companiesPerField.map(item => [item.fieldId, item.count])
    )

    // Transform to match expected interface
    const transformedFields = fields.map(field => ({
      id: field.id,
      ad: field.name,
      aciklama: field.description,
      aktif: field.active,
      ogretmen_sayisi: field._count.teachers,
      ogrenci_sayisi: field._count.students,
      isletme_sayisi: companiesMap.get(field.id) || 0
    }))

    return NextResponse.json(transformedFields)
  } catch (error) {
    console.error('Alanlar yüklenirken hata:', error)
    return NextResponse.json(
      { error: 'Alanlar yüklenemedi' },
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
        { error: 'Alan ID gereklidir' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, active } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Alan adı gereklidir' },
        { status: 400 }
      )
    }

    const updatedAlan = await prisma.alan.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active: Boolean(active)
      }
    })

    return NextResponse.json({
      success: true,
      alan: updatedAlan
    })
  } catch (error) {
    console.error('Alan güncellenirken hata:', error)
    return NextResponse.json(
      { error: 'Alan güncellenemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, active = true } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Alan adı gereklidir' },
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
    console.error('Alan oluşturulurken hata:', error)
    return NextResponse.json(
      { error: 'Alan oluşturulamadı' },
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
        { error: 'Alan ID gereklidir' },
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
        { error: 'Alan bulunamadı' },
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
      message: 'Alan başarıyla silindi'
    })
  } catch (error) {
    console.error('Alan silinirken hata:', error)
    return NextResponse.json(
      { error: 'Alan silinemedi' },
      { status: 500 }
    )
  }
}