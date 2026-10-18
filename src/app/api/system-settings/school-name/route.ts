import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: 'school_name'
      }
    })

    if (!setting) {
      return NextResponse.json({ value: 'Okul Adı' })
    }

    return NextResponse.json({ value: setting.value })
  } catch (error) {
    console.error('System settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}