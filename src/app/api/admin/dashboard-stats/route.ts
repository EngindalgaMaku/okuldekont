import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin user name
    const adminProfiles = await prisma.adminProfile.findMany({
      take: 1,
      select: {
        name: true
      }
    })

    // Get real counts from database
    const [
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.adminProfile.count(),
      prisma.teacherProfile.count(),
      prisma.companyProfile.count(),
      prisma.egitimYili.count()
    ])

    // For now, dekont stats are 0 since we don't have dekont data in the current schema
    // You can add dekont queries here when the dekont table is available
    const dekontStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }

    return NextResponse.json({
      userName: adminProfiles[0]?.name || 'Admin',
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount,
      dekontStats
    })
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json({
      userName: 'Admin',
      userCount: 0,
      adminCount: 0,
      teacherCount: 0,
      companyCount: 0,
      educationYearCount: 0,
      dekontStats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    })
  }
}