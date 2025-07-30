import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Aktif eğitim yılını getir
export async function GET() {
  try {
    const activeEducationYear = await prisma.egitimYili.findFirst({
      where: { 
        active: true,
        archived: false 
      }
    })

    if (!activeEducationYear) {
      return NextResponse.json(
        { error: 'Aktif eğitim yılı bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json(activeEducationYear)
  } catch (error) {
    console.error('Aktif eğitim yılı getirilirken hata:', error)
    return NextResponse.json(
      { error: 'Aktif eğitim yılı getirilemedi' },
      { status: 500 }
    )
  }
}