import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || ''
    

    // TUM işletmeleri getir
    
    // Build where clause
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (filter === 'active') {
      whereClause.students = {
        some: {}
      }
    } else if (filter === 'empty') {
      whereClause.students = {
        none: {}
      }
    }
    
    const companies = await prisma.companyProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        address: true,
        pin: true,
        masterTeacherName: true,
        masterTeacherPhone: true,
        _count: {
          select: {
            students: true
          }
        },
        teacher: {
          select: {
            name: true,
            surname: true
          }
        },
        students: {
          select: {
            id: true,
            name: true,
            surname: true,
            number: true,
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })
    
    // Database'deki GERÇEK işletme sayısını kontrol et
    const totalInDB = await prisma.companyProfile.count({ where: whereClause })
    
    
    if (totalInDB > companies.length) {
    } else {
    }

    return NextResponse.json({
      success: true,
      companies: companies,
      total: companies.length
    })

  } catch (error) {
    console.error('Companies ALL API error:', error)
    return NextResponse.json(
      { error: 'İşletme listesi alınırken hata oluştu', details: String(error) },
      { status: 500 }
    )
  }
}