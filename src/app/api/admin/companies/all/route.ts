import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    console.log('Companies ALL API başladı...')
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || ''
    
    console.log('Parametreler:', { search, filter })

    // TUM işletmeleri getir
    console.log('TUM işletmeler getiriliyor...')
    
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
    
    console.log('*** DATABASE BILGILERI ***')
    console.log('Database toplam işletme sayısı:', totalInDB)
    console.log('Getirilen işletme sayısı:', companies.length)
    
    if (totalInDB > companies.length) {
      console.log('⚠️ PROBLEM: Database\'de daha fazla işletme var ama gelmiyor!')
      console.log('Database\'de:', totalInDB, 'Getirilen:', companies.length)
    } else {
      console.log('✅ Tüm işletmeler getirildi')
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