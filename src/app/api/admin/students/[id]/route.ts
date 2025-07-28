import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const student = await prisma.student.findUnique({
      where: { id }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: student.id,
      name: student.name,
      surname: student.surname,
      number: student.number,
      className: student.className,
      tcNo: student.tcNo,
      phone: student.phone,
      email: student.email,
      // gender: student.gender, // Bu alanlar henüz schema'da yok
      // birthDate: student.birthDate,
      parentName: student.parentName,
      // parentSurname: student.parentSurname,
      parentPhone: student.parentPhone,
      alanId: student.alanId,
      companyId: student.companyId,
      classId: student.classId
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { 
      name, 
      surname, 
      className, 
      number, 
      tcNo, 
      phone, 
      email, 
      parentName, 
      parentPhone 
    } = await request.json()

    if (!name || !surname || !className) {
      return NextResponse.json(
        { error: 'Name, surname, and className are required' },
        { status: 400 }
      )
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: name.trim(),
        surname: surname.trim(),
        className: className.trim(),
        number: number?.trim() || null,
        tcNo: tcNo?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        parentName: parentName?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
      }
    })

    return NextResponse.json({
      id: updatedStudent.id,
      ad: updatedStudent.name,
      soyad: updatedStudent.surname,
      no: updatedStudent.number || '',
      sinif: updatedStudent.className,
      alanId: updatedStudent.alanId
    })
  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json(
      { error: 'Öğrenci güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
} 