import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const alanlar = await prisma.alanlar.findMany({
      select: {
        id: true,
        ad: true
      },
      orderBy: {
        ad: 'asc'
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