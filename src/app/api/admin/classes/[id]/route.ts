import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, dal, haftalik_program } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // Haftalık program verisi düzenleme
    let processedProgram = null
    if (haftalik_program && typeof haftalik_program === 'object') {
      processedProgram = haftalik_program
    } else if (haftalik_program && typeof haftalik_program === 'string') {
      try {
        processedProgram = JSON.parse(haftalik_program)
      } catch (e) {
        console.error('Invalid JSON for haftalik_program:', haftalik_program)
        processedProgram = null
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name,
        dal: dal || null,
        haftalik_program: processedProgram
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedClass.id,
        ad: updatedClass.name,
        alan_id: updatedClass.alanId,
        dal: updatedClass.dal,
        haftalik_program: updatedClass.haftalik_program
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if class has students
    const classWithStudents = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    if (!classWithStudents) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      )
    }

    if (classWithStudents._count.students > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete class with students' },
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true }
        },
        alan: {
          select: {
            name: true
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: classData.id,
        ad: classData.name,
        alan_id: classData.alanId,
        alan_adi: classData.alan.name,
        dal: classData.dal,
        haftalik_program: classData.haftalik_program,
        ogrenci_sayisi: classData._count.students
      }
    })
  } catch (error) {
    console.error('Get Class Error:', error)
    return NextResponse.json(
      { success: false, error: 'Class could not be fetched' },
      { status: 500 }
    )
  }
}