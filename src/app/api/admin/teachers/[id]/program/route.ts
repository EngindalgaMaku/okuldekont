import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params

    const programlar = await prisma.koordinatorlukProgrami.findMany({
      where: {
        ogretmenId: teacherId
      },
      orderBy: [
        { gun: 'asc' },
        { saatAraligi: 'asc' }
      ]
    })

    return NextResponse.json(programlar)
  } catch (error) {
    console.error('Program listesi getirme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params
    const { gun, saat_araligi, isletme_id } = await request.json()

    if (!gun || !saat_araligi || !isletme_id) {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    // Aynı gün ve saatte başka program var mı kontrol et
    const existingProgram = await prisma.koordinatorlukProgrami.findFirst({
      where: {
        ogretmenId: teacherId,
        gun,
        saatAraligi: saat_araligi
      }
    })

    if (existingProgram) {
      return NextResponse.json({ error: 'Bu gün ve saatte zaten bir program var' }, { status: 400 })
    }

    // İşletmenin varlığını kontrol et
    const isletme = await prisma.companyProfile.findUnique({
      where: { id: isletme_id }
    })

    if (!isletme) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 })
    }

    const yeniProgram = await prisma.koordinatorlukProgrami.create({
      data: {
        ogretmenId: teacherId,
        gun,
        saatAraligi: saat_araligi,
        isletmeId: isletme_id
      }
    })

    return NextResponse.json(yeniProgram, { status: 201 })
  } catch (error) {
    console.error('Program ekleme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}