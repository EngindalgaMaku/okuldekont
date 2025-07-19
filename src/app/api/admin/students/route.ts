import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all students with related data
    const students = await prisma.student.findMany({
      include: {
        alan: true,
        company: true,
        class: true
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ]
    })

    // Transform data to match expected interface
    const transformedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      surname: student.surname,
      number: student.number || '',
      className: student.className,
      tcNo: student.tcNo,
      phone: student.phone,
      email: student.email,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      alan: student.alan ? {
        id: student.alan.id,
        name: student.alan.name
      } : null,
      company: student.company ? {
        id: student.company.id,
        name: student.company.name,
        contact: student.company.contact
      } : null
    }))

    return NextResponse.json(transformedStudents)
  } catch (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, surname, className, number, tcNo, phone, email, parentName, parentPhone, alanId } = await request.json()

    if (!name || !surname || !className || !alanId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const student = await prisma.student.create({
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
        alanId
      },
      include: {
        alan: true,
        company: true,
        class: true
      }
    })

    return NextResponse.json({
      id: student.id,
      name: student.name,
      surname: student.surname,
      number: student.number || '',
      className: student.className,
      tcNo: student.tcNo,
      phone: student.phone,
      email: student.email,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      alan: student.alan ? {
        id: student.alan.id,
        name: student.alan.name
      } : null,
      company: student.company ? {
        id: student.company.id,
        name: student.company.name,
        contact: student.company.contact
      } : null
    })
  } catch (error) {
    console.error('Student creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}