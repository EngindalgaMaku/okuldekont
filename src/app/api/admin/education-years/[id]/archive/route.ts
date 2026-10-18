import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, adminId } = body // action: 'archive' | 'unarchive'

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID gerekli' },
        { status: 400 }
      )
    }

    // Eğitim yılını kontrol et
    const educationYear = await prisma.egitimYili.findUnique({
      where: { id },
      include: {
        stajlar: {
          include: {
            dekontlar: true,
            history: true
          }
        }
      }
    }) as any

    if (!educationYear) {
      return NextResponse.json(
        { error: 'Eğitim yılı bulunamadı' },
        { status: 404 }
      )
    }

    // Aktif eğitim yılını arşivlemeyi engelle
    if (educationYear.active && action === 'archive') {
      return NextResponse.json(
        { error: 'Aktif eğitim yılı arşivlenemez' },
        { status: 400 }
      )
    }

    const now = new Date()
    let result

    if (action === 'archive') {
      // Eğitim yılını ve ilgili tüm verileri arşivle
      result = await prisma.$transaction(async (tx: any) => {
        // 1. Eğitim yılını arşivle
        const archivedEducationYear = await tx.egitimYili.update({
          where: { id },
          data: {
            archived: true,
            archivedAt: now,
            archivedBy: adminId
          } as any
        })

        // 2. Bu eğitim yılına ait tüm stajları arşivle
        const archivedInternships = await tx.staj.updateMany({
          where: {
            educationYearId: id,
            archived: false
          } as any,
          data: {
            archived: true,
            archivedAt: now,
            archivedBy: adminId
          } as any
        })

        // 3. Bu stajlara ait dekontları arşivle
        const internshipIds = educationYear.stajlar.map((s: any) => s.id)
        const archivedDekonts = await tx.dekont.updateMany({
          where: {
            stajId: { in: internshipIds },
            archived: false
          } as any,
          data: {
            archived: true,
            archivedAt: now,
            archivedBy: adminId
          } as any
        })

        // 4. Staj geçmişlerini arşivle
        const archivedHistory = await tx.internshipHistory.updateMany({
          where: {
            internshipId: { in: internshipIds },
            archived: false
          } as any,
          data: {
            archived: true,
            archivedAt: now,
            archivedBy: adminId
          } as any
        })

        return {
          educationYear: archivedEducationYear,
          archivedInternships: archivedInternships.count,
          archivedDekonts: archivedDekonts.count,
          archivedHistory: archivedHistory.count
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Eğitim yılı başarıyla arşivlendi',
        data: result,
        archivedCounts: {
          stajlar: result.archivedInternships,
          dekontlar: result.archivedDekonts,
          internshipHistory: result.archivedHistory
        }
      })

    } else if (action === 'unarchive') {
      // Arşivden çıkar
      result = await prisma.$transaction(async (tx: any) => {
        // 1. Eğitim yılını arşivden çıkar
        const unarchivedEducationYear = await tx.egitimYili.update({
          where: { id },
          data: {
            archived: false,
            archivedAt: null,
            archivedBy: null
          } as any
        })

        // 2. Bu eğitim yılına ait tüm stajları arşivden çıkar
        const unarchivedInternships = await tx.staj.updateMany({
          where: {
            educationYearId: id,
            archived: true
          } as any,
          data: {
            archived: false,
            archivedAt: null,
            archivedBy: null
          } as any
        })

        // 3. Bu stajlara ait dekontları arşivden çıkar
        const internshipIds = educationYear.stajlar.map((s: any) => s.id)
        const unarchivedDekonts = await tx.dekont.updateMany({
          where: {
            stajId: { in: internshipIds },
            archived: true
          } as any,
          data: {
            archived: false,
            archivedAt: null,
            archivedBy: null
          } as any
        })

        // 4. Staj geçmişlerini arşivden çıkar
        const unarchivedHistory = await tx.internshipHistory.updateMany({
          where: {
            internshipId: { in: internshipIds },
            archived: true
          } as any,
          data: {
            archived: false,
            archivedAt: null,
            archivedBy: null
          } as any
        })

        return {
          educationYear: unarchivedEducationYear,
          unarchivedInternships: unarchivedInternships.count,
          unarchivedDekonts: unarchivedDekonts.count,
          unarchivedHistory: unarchivedHistory.count
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Eğitim yılı başarıyla arşivden çıkarıldı',
        data: result,
        unarchivedCounts: {
          stajlar: result.unarchivedInternships,
          dekontlar: result.unarchivedDekonts,
          internshipHistory: result.unarchivedHistory
        }
      })
    }

    return NextResponse.json(
      { error: 'Geçersiz işlem' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Arşivleme hatası:', error)
    return NextResponse.json(
      { error: 'Arşivleme işlemi sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Eğitim yılının arşiv durumunu ve istatistiklerini getir
    const educationYear = await prisma.egitimYili.findUnique({
      where: { id },
      include: {
        stajlar: {
          include: {
            student: {
              include: {
                alan: true,
                class: true
              }
            },
            company: true,
            teacher: true,
            dekontlar: true,
            history: true
          }
        }
      }
    }) as any

    if (!educationYear) {
      return NextResponse.json(
        { error: 'Eğitim yılı bulunamadı' },
        { status: 404 }
      )
    }

    // İstatistikleri hesapla
    const stats = {
      totalInternships: educationYear.stajlar?.length || 0,
      archivedInternships: educationYear.stajlar?.filter((s: any) => s.archived).length || 0,
      totalDekonts: educationYear.stajlar?.reduce((acc: number, s: any) => acc + (s.dekontlar?.length || 0), 0) || 0,
      archivedDekonts: educationYear.stajlar?.reduce((acc: number, s: any) =>
        acc + (s.dekontlar?.filter((d: any) => d.archived).length || 0), 0) || 0,
      totalHistory: educationYear.stajlar?.reduce((acc: number, s: any) => acc + (s.history?.length || 0), 0) || 0,
      archivedHistory: educationYear.stajlar?.reduce((acc: number, s: any) =>
        acc + (s.history?.filter((h: any) => h.archived).length || 0), 0) || 0
    }

    return NextResponse.json({
      educationYear,
      stats,
      isFullyArchived: educationYear.archived || false,
      canArchive: !educationYear.active && !educationYear.archived,
      canUnarchive: educationYear.archived || false
    })

  } catch (error) {
    console.error('Arşiv bilgisi getirme hatası:', error)
    return NextResponse.json(
      { error: 'Arşiv bilgileri getirilirken hata oluştu' },
      { status: 500 }
    )
  }
}