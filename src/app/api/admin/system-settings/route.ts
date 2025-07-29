import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Sistem ayarları yüklenirken hata:', error)
    return NextResponse.json(
      { error: 'Sistem ayarları yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json(updatedSetting)
  } catch (error) {
    console.error('Sistem ayarı güncellenirken hata:', error)
    return NextResponse.json(
      { error: 'Sistem ayarı güncellenemedi' },
      { status: 500 }
    )
  }
}