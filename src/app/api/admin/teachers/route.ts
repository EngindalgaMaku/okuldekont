import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    console.log('API basladi...')
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const alan = searchParams.get('alan') || ''
    
    console.log('Parametreler:', { search, alan })

    // TUM ogretmenleri isletme ve ogrenci detaylari ile getir
    console.log('TUM ogretmenleri isletme/ogrenci detaylari ile getiriliyor...')
    
    const ogretmenler = await prisma.teacherProfile.findMany({
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        },
        // Schema'daki doğru field isimleri:
        stajlar: {
          include: {
            student: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        companies: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { surname: 'asc' },
        { name: 'asc' }
      ]
    })
    
    // Database'deki GERÇEK öğretmen sayısını kontrol et
    const totalInDB = await prisma.teacherProfile.count()
    
    console.log('*** DATABASE BILGILERI ***')
    console.log('Database toplam ogretmen sayisi:', totalInDB)
    console.log('Getirilen ogretmen sayisi:', ogretmenler.length)
    
    // Ahmet Başaran örneği
    const ahmet = ogretmenler.find(t => t.name === 'Ahmet' && t.surname === 'Başaran')
    if (ahmet) {
      console.log('*** AHMET BASARAN DETAYLARI ***')
      console.log('Ahmet - Isletmeler:', ahmet.companies?.length || 0)
      console.log('Ahmet - Stajlar (öğrenciler):', ahmet.stajlar?.length || 0)
      console.log('Ahmet - Companies data:', ahmet.companies)
      console.log('Ahmet - Stajlar data:', ahmet.stajlar?.slice(0, 2)) // İlk 2 tane
    }
    
    if (totalInDB > ogretmenler.length) {
      console.log('PROBLEM: Database\'de daha fazla ogretmen var ama gelmiyor!')
      console.log('Database\'de:', totalInDB, 'Getirilen:', ogretmenler.length)
    } else {
      console.log('Tum ogretmenler getirildi')
    }

    return NextResponse.json({
      success: true,
      ogretmenler: ogretmenler,
      total: ogretmenler.length,
      pagination: {
        page: 1,
        per_page: ogretmenler.length,
        total: ogretmenler.length,
        total_pages: 1
      }
    })

  } catch (error) {
    console.error('Teachers API error:', error)
    return NextResponse.json(
      { error: 'Ogretmen listesi alinirken hata olustu', details: String(error) },
      { status: 500 }
    )
  }
}