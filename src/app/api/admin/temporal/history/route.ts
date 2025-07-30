import { NextRequest, NextResponse } from 'next/server'
import { getCompanyFieldValueAtDate, getTeacherFieldValueAtDate } from '@/lib/temporal-queries'
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
      const teachers = await prisma.teacherProfile.findMany({
        where: query ? {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } }
          ]
        } : undefined,
        include: {
          alan: true,
          teacherHistory: {
            where: {
              validFrom: { lte: queryDate },
              OR: [
                { validTo: null },
                { validTo: { gte: queryDate } }
              ]
            },
            orderBy: { validFrom: 'desc' },
            take: 5
          }
        }
      })

      for (const teacher of teachers) {
        // Her öğretmen için o tarihteki bilgileri al
        const nameAtDate = await getTeacherFieldValueAtDate(teacher.id, 'name', queryDate)
        const phoneAtDate = await getTeacherFieldValueAtDate(teacher.id, 'phone', queryDate)
        const emailAtDate = await getTeacherFieldValueAtDate(teacher.id, 'email', queryDate)
        const fieldAtDate = await getTeacherFieldValueAtDate(teacher.id, 'field_id', queryDate)

        results.push({
          type: 'teacher',
          id: teacher.id,
          name: nameAtDate || teacher.name,
          phone: phoneAtDate || teacher.phone,
          email: emailAtDate || teacher.email,
          field: teacher.alan?.name || 'Bilinmiyor',
          changes: teacher.teacherHistory
        })
      }
    }

    // İşletme verilerini sorgula
    if (type === 'all' || type === 'company') {
      const companies = await prisma.companyProfile.findMany({
        where: query ? {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { address: { contains: query } }
          ]
        } : undefined,
        include: {
          companyHistory: {
            where: {
              validFrom: { lte: queryDate },
              OR: [
                { validTo: null },
                { validTo: { gte: queryDate } }
              ]
            },
            orderBy: { validFrom: 'desc' },
            take: 5
          }
        }
      })

      for (const company of companies) {
        // Her işletme için o tarihteki bilgileri al
        const nameAtDate = await getCompanyFieldValueAtDate(company.id, 'name', queryDate)
        const phoneAtDate = await getCompanyFieldValueAtDate(company.id, 'phone', queryDate)
        const addressAtDate = await getCompanyFieldValueAtDate(company.id, 'address', queryDate)
        const masterTeacherAtDate = await getCompanyFieldValueAtDate(company.id, 'master_teacher', queryDate)
        const employeeCountAtDate = await getCompanyFieldValueAtDate(company.id, 'employee_count', queryDate)

        results.push({
          type: 'company',
          id: company.id,
          name: nameAtDate || company.name,
          phone: phoneAtDate || company.phone,
          address: addressAtDate || company.address,
          master_teacher: masterTeacherAtDate || company.masterTeacherName,
          employee_count: employeeCountAtDate || company.employeeCount,
          changes: company.companyHistory
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