import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['aktif_egitim_yili', 'okul_adi', 'school_name']
        }
      },
      select: {
        key: true,
        value: true
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Public system settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}