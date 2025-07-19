import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const alanlar = await prisma.alan.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(alanlar)
  } catch (error) {
    console.error('Alanlar yüklenirken hata:', error)
    return NextResponse.json(
      { error: 'Alanlar yüklenemedi' },
      { status: 500 }
    )
  }
}