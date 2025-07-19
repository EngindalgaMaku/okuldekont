import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { pin } = await request.json()

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    // İşletme PIN güncelleme
    const updatedCompany = await prisma.companyProfile.update({
      where: { id },
      data: { pin }
    })

    // Giriş denemelerini temizle (eğer böyle bir tablo varsa)
    // Bu tabloyu henüz Prisma schema'da tanımlamadığımız için try-catch kullanıyoruz
    try {
      await prisma.$executeRaw`DELETE FROM isletme_giris_denemeleri WHERE isletme_id = ${id}`
    } catch (error) {
      console.warn('Giriş denemelerini temizleme hatası:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PIN güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'PIN güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}