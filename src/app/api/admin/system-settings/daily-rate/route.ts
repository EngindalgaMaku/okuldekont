import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Günlük ücret oranını getir
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: 'daily_rate'
      }
    })

    if (!setting) {
      // Default değer 221.0466
      const defaultSetting = await prisma.systemSetting.create({
        data: {
          key: 'daily_rate',
          value: '221.0466'
        }
      })
      
      return NextResponse.json({ 
        daily_rate: parseFloat(defaultSetting.value) 
      })
    }

    return NextResponse.json({ 
      daily_rate: parseFloat(setting.value) 
    })
  } catch (error) {
    console.error('Günlük ücret ayarı getirme hatası:', error)
    return NextResponse.json(
      { error: 'Ayar getirme işleminde hata oluştu' },
      { status: 500 }
    )
  }
}

// Günlük ücret oranını güncelle
export async function PUT(request: Request) {
  try {
    const { daily_rate } = await request.json()
    
    if (!daily_rate || isNaN(daily_rate) || daily_rate <= 0) {
      return NextResponse.json(
        { error: 'Geçerli bir günlük ücret oranı girmelisiniz' },
        { status: 400 }
      )
    }

    const setting = await prisma.systemSetting.upsert({
      where: {
        key: 'daily_rate'
      },
      update: {
        value: daily_rate.toString()
      },
      create: {
        key: 'daily_rate',
        value: daily_rate.toString()
      }
    })

    return NextResponse.json({ 
      success: true,
      daily_rate: parseFloat(setting.value),
      message: 'Günlük ücret oranı başarıyla güncellendi'
    })
  } catch (error) {
    console.error('Günlük ücret ayarı güncelleme hatası:', error)
    return NextResponse.json(
      { error: 'Ayar güncelleme işleminde hata oluştu' },
      { status: 500 }
    )
  }
}