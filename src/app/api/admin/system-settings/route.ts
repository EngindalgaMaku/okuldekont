import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['aktif_egitim_yili', 'school_name']
        }
      },
      select: {
        key: true,
        value: true
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Sistem ayarları yüklenirken hata:', error)
    return NextResponse.json(
      { error: 'Sistem ayarları yüklenemedi' },
      { status: 500 }
    )
  }
}