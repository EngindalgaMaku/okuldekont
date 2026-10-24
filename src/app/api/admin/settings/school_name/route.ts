import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst({
      where: {
        key: 'school_name'
      }
    })

    if (!setting) {
      return NextResponse.json({ value: 'Okul Adı' })
    }

    return NextResponse.json({ value: setting.value })
  } catch (error) {
    console.error('School name fetch error:', error)
    return NextResponse.json({ value: 'Okul Adı' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { value } = await request.json()

    await prisma.systemSetting.upsert({
      where: { key: 'school_name' },
      update: { value },
      create: { key: 'school_name', value }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('School name update error:', error)
    return NextResponse.json({ error: 'Okul adı güncellenirken hata oluştu' }, { status: 500 })
  }
}