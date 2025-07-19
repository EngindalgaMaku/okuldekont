import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const alanIdFilter = searchParams.get('alanId') || 'all'
    const searchTerm = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const whereClause: any = {}
    
    if (statusFilter !== 'all') {
      whereClause.durum = statusFilter
    }

    if (alanIdFilter !== 'all') {
      whereClause.ogretmenler = {
        alan_id: alanIdFilter
      }
    }

    if (searchTerm) {
      whereClause.OR = [
        {
          hafta: {
            contains: searchTerm
          }
        },
        {
          ogretmenler: {
            OR: [
              {
                ad: {
                  contains: searchTerm
                }
              },
              {
                soyad: {
                  contains: searchTerm
                }
              }
            ]
          }
        }
      ]
    }

    // Get total count
    const totalCount = await prisma.gorevBelgeleri.count({
      where: whereClause
    })

    // Get paginated results
    const belgeler = await prisma.gorevBelgeleri.findMany({
      where: whereClause,
      include: {
        ogretmenler: {
          select: {
            ad: true,
            soyad: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: offset,
      take: limit
    })

    // Format results similar to stored procedure
    const formattedResults = belgeler.map((belge: any) => ({
      id: belge.id,
      hafta: belge.hafta,
      durum: belge.durum,
      created_at: belge.created_at,
      ogretmen_ad: belge.ogretmenler?.ad || '',
      ogretmen_soyad: belge.ogretmenler?.soyad || '',
      total_count: totalCount
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('Görev belgeleri yüklenirken hata:', error)
    return NextResponse.json(
      { error: 'Görev belgeleri yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',') || []

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Silinecek ID\'ler belirtilmedi' },
        { status: 400 }
      )
    }

    await prisma.gorevBelgeleri.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Görev belgeleri silinirken hata:', error)
    return NextResponse.json(
      { error: 'Görev belgeleri silinemedi' },
      { status: 500 }
    )
  }
}