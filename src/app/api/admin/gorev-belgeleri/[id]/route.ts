import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { durum } = body

    if (!durum) {
      return NextResponse.json({ error: 'Durum alanı gerekli' }, { status: 400 })
    }

    // Geçerli durum değerlerini kontrol et
    const validStatuses = ['Verildi', 'Teslim Alındı', 'İptal Edildi']
    if (!validStatuses.includes(durum)) {
      return NextResponse.json({ error: 'Geçersiz durum değeri' }, { status: 400 })
    }

    // Görev belgesini güncelle
    const updatedBelge = await prisma.gorevBelgesi.update({
      where: { id },
      data: { 
        durum,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedBelge
    })

  } catch (error) {
    console.error('Görev belgesi güncelleme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { id } = await params

    // Görev belgesini sil
    await prisma.gorevBelgesi.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Görev belgesi başarıyla silindi'
    })

  } catch (error) {
    console.error('Görev belgesi silme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}