import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all teachers with related data
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        alan: true,
        user: true
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ]
    })

    // Transform data to match expected interface
    const transformedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      surname: teacher.surname,
      phone: teacher.phone,
      email: teacher.email,
      pin: teacher.pin,
      alanId: teacher.alanId,
      alan: teacher.alan ? {
        id: teacher.alan.id,
        name: teacher.alan.name
      } : null
    }))

    return NextResponse.json(transformedTeachers)
  } catch (error) {
    console.error('Teachers fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, surname, phone, email, pin, alanId } = await request.json()

    if (!name || !surname || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First create a User record
    const userEmail = email?.trim() || `${name.toLowerCase()}.${surname.toLowerCase()}@okul.local`
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: 'temp123', // Temporary password, should be changed on first login
        role: 'TEACHER'
      }
    })

    // Then create the TeacherProfile with the user ID
    const teacher = await prisma.teacherProfile.create({
      data: {
        name: name.trim(),
        surname: surname.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        pin: pin.trim(),
        alanId: alanId || null,
        userId: user.id
      },
      include: {
        alan: true,
        user: true
      }
    })

    return NextResponse.json({
      id: teacher.id,
      name: teacher.name,
      surname: teacher.surname,
      phone: teacher.phone,
      email: teacher.email,
      pin: teacher.pin,
      alanId: teacher.alanId,
      alan: teacher.alan ? {
        id: teacher.alan.id,
        name: teacher.alan.name
      } : null
    })
  } catch (error) {
    console.error('Teacher creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create teacher' },
      { status: 500 }
    )
  }
}