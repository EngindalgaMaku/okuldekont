import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: alanId } = await params

    // Seçilen alana göre öğretmenleri getir
    const ogretmenler = await prisma.teacherProfile.findMany({
      where: {
        active: true,
        alanId: alanId
      },
      select: {
        id: true,
        name: true,
        surname: true
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ]
    })

    // Ad soyad birleştir
    const formattedOgretmenler = ogretmenler.map(ogretmen => ({
      id: ogretmen.id,
      name: ogretmen.name,
      surname: ogretmen.surname,
      fullName: `${ogretmen.name} ${ogretmen.surname}`
    }))

    return NextResponse.json({ 
      data: formattedOgretmenler
    })
  } catch (error) {
    console.error('Alan öğretmenleri API hatası:', error)
    return NextResponse.json(
      { error: 'Alan öğretmenleri getirme işleminde hata oluştu' },
      { status: 500 }
    )
  }
}