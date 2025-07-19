import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, pin } = await request.json()

    if (!type || !pin) {
      return NextResponse.json(
        { error: 'Type and pin are required' },
        { status: 400 }
      )
    }

    if (pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      )
    }

    let count = 0

    if (type === 'teacher') {
      const result = await prisma.teacherProfile.updateMany({
        data: {
          pin: pin
        }
      })
      count = result.count
    } else if (type === 'company') {
      const result = await prisma.companyProfile.updateMany({
        data: {
          pin: pin
        }
      })
      count = result.count
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "teacher" or "company"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      count,
      message: `${count} ${type === 'teacher' ? 'teacher' : 'company'} PINs have been reset` 
    })
  } catch (error) {
    console.error('PIN reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset PINs' },
      { status: 500 }
    )
  }
}