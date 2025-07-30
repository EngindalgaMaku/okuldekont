import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Tüm eğitim yıllarını getir
export async function GET() {
  try {
    const educationYears = await prisma.egitimYili.findMany({
      where: {
        archived: false // Arşivlenen eğitim yıllarını gizle
      },
      orderBy: {
        year: 'desc'
      }
    })

    return NextResponse.json(educationYears)
  } catch (error) {
    console.error('Eğitim yılları getirilirken hata:', error)
    return NextResponse.json(
      { error: 'Eğitim yılları getirilemedi' },
      { status: 500 }
    )
  }
}

// POST - Yeni eğitim yılı oluştur
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { year, startDate, endDate, active } = body

    // Eğer yeni yıl aktif olarak ayarlanıyorsa, diğerlerini pasif yap
    if (active) {
      await prisma.egitimYili.updateMany({
        where: { active: true },
        data: { active: false }
      })
    }

    const educationYear = await prisma.egitimYili.create({
      data: {
        year,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        active: active || false
      }
    })

    return NextResponse.json(educationYear, { status: 201 })
  } catch (error) {
    console.error('Eğitim yılı oluşturulurken hata:', error)
    return NextResponse.json(
      { error: 'Eğitim yılı oluşturulamadı' },
      { status: 500 }
    )
  }
}

// PUT - Eğitim yılını güncelle
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, year, startDate, endDate, active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID gerekli' },
        { status: 400 }
      )
    }

    // Eğer yıl aktif olarak ayarlanıyorsa, diğerlerini pasif yap
    if (active) {
      await prisma.egitimYili.updateMany({
        where: { 
          active: true,
          id: { not: id }
        },
        data: { active: false }
      })
    }

    const educationYear = await prisma.egitimYili.update({
      where: { id },
      data: {
        year,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        active
      }
    })

    return NextResponse.json(educationYear)
  } catch (error) {
    console.error('Eğitim yılı güncellenirken hata:', error)
    return NextResponse.json(
      { error: 'Eğitim yılı güncellenemedi' },
      { status: 500 }
    )
  }
}

// DELETE - Eğitim yılını sil
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID gerekli' },
        { status: 400 }
      )
    }

    // İlişkili stajlar var mı kontrol et
    const relatedInternships = await prisma.staj.count({
      where: { educationYearId: id }
    })

    if (relatedInternships > 0) {
      return NextResponse.json(
        { error: 'Bu eğitim yılına bağlı stajlar bulunduğu için silinemez' },
        { status: 400 }
      )
    }

    await prisma.egitimYili.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Eğitim yılı silinirken hata:', error)
    return NextResponse.json(
      { error: 'Eğitim yılı silinemedi' },
      { status: 500 }
    )
  }
}