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

    // Get real counts from database and current education year
    const [
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount,
      currentEducationYear
    ] = await Promise.all([
      prisma.user.count(),
      prisma.adminProfile.count(),
      prisma.teacherProfile.count(),
      prisma.companyProfile.count(),
      prisma.egitimYili.count(),
      prisma.egitimYili.findFirst({
        where: {
          active: true
        }
      })
    ])

    // Get current date and calculate previous month for dekont statistics
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // 1-based month
    
    // Calculate previous month and year
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
    
    // Get dekont statistics for previous month (current month's dekont reports)
    const [
      totalDekontlar,
      pendingDekontlar,
      approvedDekontlar,
      rejectedDekontlar
    ] = await Promise.all([
      prisma.dekont.count({
        where: {
          month: previousMonth,
          year: previousYear
        }
      }),
      prisma.dekont.count({
        where: {
          month: previousMonth,
          year: previousYear,
          status: 'PENDING'
        }
      }),
      prisma.dekont.count({
        where: {
          month: previousMonth,
          year: previousYear,
          status: 'APPROVED'
        }
      }),
      prisma.dekont.count({
        where: {
          month: previousMonth,
          year: previousYear,
          status: 'REJECTED'
        }
      })
    ])

    const dekontStats = {
      total: totalDekontlar,
      pending: pendingDekontlar,
      approved: approvedDekontlar,
      rejected: rejectedDekontlar
    }

    return NextResponse.json({
      userName: adminProfiles[0]?.name || 'Admin',
      userCount,
      adminCount,
      teacherCount,
      companyCount,
      educationYearCount,
      currentEducationYear: currentEducationYear ?
        currentEducationYear.year || `${currentEducationYear.startDate?.getFullYear() || new Date().getFullYear()}-${currentEducationYear.endDate?.getFullYear() || new Date().getFullYear() + 1}` :
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
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
      currentEducationYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      dekontStats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    })
  }
}