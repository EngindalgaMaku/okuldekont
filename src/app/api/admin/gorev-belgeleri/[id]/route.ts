import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { durum } = await request.json()

    if (!durum) {
      return NextResponse.json(
        { error: 'Durum belirtilmedi' },
        { status: 400 }
      )
    }

    await prisma.gorevBelgeleri.update({
      where: { id },
      data: { durum }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Görev belgesi güncellenirken hata:', error)
    return NextResponse.json(
      { error: 'Görev belgesi güncellenemedi' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.gorevBelgeleri.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Görev belgesi silinirken hata:', error)
    return NextResponse.json(
      { error: 'Görev belgesi silinemedi' },
      { status: 500 }
    )
  }
}