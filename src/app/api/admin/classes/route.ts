import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const alanId = searchParams.get('alanId')
    
    const classes = await prisma.class.findMany({
      where: alanId ? { alanId } : {},
      include: {
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const transformedClasses = classes.map(cls => ({
      id: cls.id,
      ad: cls.name,
      alan_id: cls.alanId,
      ogrenci_sayisi: cls._count.students
    }))

    return NextResponse.json({
      success: true,
      data: transformedClasses
    })
  } catch (error) {
    console.error('Classes API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Classes could not be fetched' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, alanId, dal, haftalik_program } = body

    if (!name || !alanId) {
      return NextResponse.json(
        { success: false, error: 'Name and alanId are required' },
        { status: 400 }
      )
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        alanId,
        // Note: dal and haftalik_program are not in the current schema
        // If needed, they should be added to the schema first
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newClass.id,
        ad: newClass.name,
        alan_id: newClass.alanId
      }
    })
  } catch (error) {
    console.error('Create Class Error:', error)
    return NextResponse.json(
      { success: false, error: 'Class could not be created' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()
    const { name, dal, haftalik_program } = body

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'ID and name are required' },
        { status: 400 }
      )
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        // Note: dal and haftalik_program are not in the current schema
        // If needed, they should be added to the schema first
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedClass.id,
        ad: updatedClass.name,
        alan_id: updatedClass.alanId
      }
    })
  } catch (error) {
    console.error('Update Class Error:', error)
    return NextResponse.json(
      { success: false, error: 'Class could not be updated' },
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
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    await prisma.class.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    })
  } catch (error) {
    console.error('Delete Class Error:', error)
    return NextResponse.json(
      { success: false, error: 'Class could not be deleted' },
      { status: 500 }
    )
  }
}