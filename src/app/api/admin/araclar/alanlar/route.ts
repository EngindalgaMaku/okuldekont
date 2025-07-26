import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const alanlar = await prisma.alan.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ 
      data: alanlar
    })
  } catch (error) {
    console.error('Alan listesi API hatası:', error)
    return NextResponse.json(
      { error: 'Alan listesi getirme işleminde hata oluştu' },
      { status: 500 }
    )
  }
}