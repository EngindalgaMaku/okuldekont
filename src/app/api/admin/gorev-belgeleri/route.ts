import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const alanId = searchParams.get('alanId') || 'all'
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Filtre koşulları
    const whereConditions: any = {}

    if (status !== 'all') {
      whereConditions.durum = status
    }

    if (search) {
      whereConditions.OR = [
        {
          hafta: {
            contains: search
          }
        },
        {
          teacher: {
            OR: [
              { name: { contains: search } },
              { surname: { contains: search } }
            ]
          }
        }
      ]
    }

    if (alanId !== 'all') {
      whereConditions.teacher = {
        ...whereConditions.teacher,
        alanId: alanId
      }
    }

    // Toplam sayıyı al
    const totalCount = await prisma.gorevBelgesi.count({
      where: whereConditions
    })

    // Belgeleri getir
    const belgeler = await prisma.gorevBelgesi.findMany({
      where: whereConditions,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            alan: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    })

    // Response formatı
    const formattedBelgeler = belgeler.map(belge => ({
      id: belge.id,
      hafta: belge.hafta,
      durum: belge.durum,
      barcode: (belge as any).barcode || null,
      created_at: belge.createdAt.toISOString(),
      ogretmen_ad: belge.teacher.name,
      ogretmen_soyad: belge.teacher.surname,
      total_count: totalCount
    }))

    return NextResponse.json(formattedBelgeler)

  } catch (error) {
    console.error('Görev belgeleri API hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await request.json()
    const { ogretmenId, hafta, isletmeIdler } = body

    if (!ogretmenId || !hafta || !isletmeIdler) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 })
    }

    // Benzersiz barkod oluştur
    const generateBarcode = () => {
      const prefix = 'GB'; // GorevBelgesi prefix
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${prefix}${timestamp}${random}`;
    };

    // Görev belgesini oluştur
    const gorevBelgesi = await (prisma.gorevBelgesi as any).create({
      data: {
        ogretmenId,
        hafta,
        isletmeIdler: isletmeIdler,
        durum: 'Basıldı',
        barcode: generateBarcode()
      }
    })

    return NextResponse.json(gorevBelgesi, { status: 201 })

  } catch (error) {
    console.error('Görev belgesi oluşturma hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json({ error: 'ID parametresi gerekli' }, { status: 400 })
    }

    const ids = idsParam.split(',')

    // Belgeleri sil
    await prisma.gorevBelgesi.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return NextResponse.json({ success: true, deletedCount: ids.length })

  } catch (error) {
    console.error('Görev belgesi silme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}