import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { type, pin } = await request.json()

    if (!type || !pin) {
      return NextResponse.json(
        { error: 'Type ve PIN gereklidir' },
        { status: 400 }
      )
    }

    if (pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    let updateResult;
    let count = 0;

    if (type === 'teacher') {
      // Tüm öğretmenlerin PIN'lerini sıfırla
      updateResult = await prisma.teacherProfile.updateMany({
        data: { pin }
      })
      count = updateResult.count
    } else if (type === 'company') {
      // Tüm işletmelerin PIN'lerini sıfırla
      updateResult = await prisma.companyProfile.updateMany({
        data: { pin }
      })
      count = updateResult.count
    } else {
      return NextResponse.json(
        { error: 'Geçersiz type. "teacher" veya "company" olmalıdır' },
        { status: 400 }
      )
    }

    console.log(`${type} PIN reset completed. Updated ${count} records with PIN: ${pin}`)

    return NextResponse.json({ 
      success: true, 
      count,
      message: `${count} ${type === 'teacher' ? 'öğretmen' : 'işletme'} PIN'i güncellendi`
    })
  } catch (error) {
    console.error('PIN reset hatası:', error)
    return NextResponse.json(
      { error: 'PIN reset işlemi başarısız oldu' },
      { status: 500 }
    )
  }
}