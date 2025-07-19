import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const adminUser = await prisma.adminProfile.findUnique({
      where: {
        email: email
      },
      select: {
        name: true,
        email: true,
        role: true
      }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role
    })
  } catch (error) {
    console.error('Admin user info error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin user info' },
      { status: 500 }
    )
  }
}