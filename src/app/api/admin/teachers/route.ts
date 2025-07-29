import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

export async function GET(request: Request) {
  // KRİTİK KVKK KORUMA: Öğretmen kişisel verileri ve PIN kodları - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} accessing teacher personal data and PINs`, {
    timestamp: new Date().toISOString(),
    action: 'VIEW_TEACHER_DATA'
  })

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
      tcNo: teacher.tcNo,
      phone: teacher.phone,
      email: teacher.email,
      pin: teacher.pin,
      alanId: teacher.alanId,
      position: teacher.position,
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
  // KRİTİK KVKK KORUMA: Öğretmen oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} creating teacher with personal data`, {
    timestamp: new Date().toISOString(),
    action: 'CREATE_TEACHER_DATA'
  })

  try {
    const { name, surname, tcNo, phone, email, pin, alanId, position } = await request.json()

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
        tcNo: tcNo?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        pin: pin.trim(),
        alanId: alanId || null,
        position: position || null,
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
      tcNo: teacher.tcNo,
      phone: teacher.phone,
      email: teacher.email,
      pin: teacher.pin,
      alanId: teacher.alanId,
      position: teacher.position,
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