import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const type = searchParams.get('type') || 'all'
    const query = searchParams.get('query') || ''

    if (!date) {
      return NextResponse.json(
        { error: 'Tarih parametresi gerekli' },
        { status: 400 }
      )
    }

    const queryDate = new Date(date)
    if (isNaN(queryDate.getTime())) {
      return NextResponse.json(
        { error: 'Geçersiz tarih formatı' },
        { status: 400 }
      )
    }

    const results: any[] = []

    // Öğretmen verilerini sorgula
    if (type === 'all' || type === 'teacher') {
      const whereClause: any = {}
      if (query) {
        whereClause.OR = [
          { name: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } }
        ]
      }

      const teachers = await prisma.teacherProfile.findMany({
        where: whereClause,
        include: {
          alan: true
        }
      })

      for (const teacher of teachers) {
        results.push({
          type: 'teacher',
          id: teacher.id,
          name: teacher.name,
          phone: teacher.phone,
          email: teacher.email,
          field: teacher.alan?.name || 'Bilinmiyor',
          changes: []
        })
      }
    }

    // İşletme verilerini sorgula
    if (type === 'all' || type === 'company') {
      const whereClause: any = {}
      if (query) {
        whereClause.OR = [
          { name: { contains: query } },
          { phone: { contains: query } },
          { address: { contains: query } }
        ]
      }

      const companies = await prisma.companyProfile.findMany({
        where: whereClause
      })

      for (const company of companies) {
        results.push({
          type: 'company',
          id: company.id,
          name: company.name,
          phone: company.phone,
          address: company.address,
          master_teacher: company.masterTeacherName,
          employee_count: company.employeeCount,
          changes: []
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      query_date: queryDate.toISOString(),
      total: results.length
    })

  } catch (error) {
    console.error('Temporal history API error:', error)
    return NextResponse.json(
      { error: 'Geçmiş bilgi sorgulaması başarısız oldu' },
      { status: 500 }
    )
  }
}