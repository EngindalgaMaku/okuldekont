import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { type, entityId, pin } = await request.json()

    if (!type || !entityId || !pin) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if it's a teacher login
    if (type === 'ogretmen') {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, surname: true, pin: true }
      })

      if (!teacher) {
        return NextResponse.json(
          { error: 'Teacher not found' },
          { status: 404 }
        )
      }

      if (teacher.pin !== pin) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        teacher: {
          id: teacher.id,
          name: teacher.name,
          surname: teacher.surname
        }
      })
    }

    // Check if it's a company login
    if (type === 'isletme') {
      const company = await prisma.companyProfile.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, pin: true }
      })

      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }

      if (company.pin !== pin) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        company: {
          id: company.id,
          name: company.name
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('PIN check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}