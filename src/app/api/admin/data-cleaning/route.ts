import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Demo/seed verilerini temizleme endpoint'i
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Admin kontrolü
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cleaningType = searchParams.get('type') || 'demo'
    const confirmToken = searchParams.get('confirm')

    // Güvenlik token kontrolü
    if (confirmToken !== 'CONFIRM_DATA_CLEANING_2025') {
      return NextResponse.json(
        { error: 'Güvenlik token geçersiz' },
        { status: 400 }
      )
    }

    let result = {
      success: true,
      message: '',
      deletedCounts: {} as Record<string, number>
    }

    if (cleaningType === 'demo' || cleaningType === 'all') {
      // Demo verilerini temizle
      result = await cleanDemoData()
    } else if (cleaningType === 'students') {
      // Sadece öğrenci verilerini temizle
      result = await cleanStudentData()
    } else if (cleaningType === 'companies') {
      // Sadece işletme verilerini temizle
      result = await cleanCompanyData()
    } else if (cleaningType === 'teachers') {
      // Sadece öğretmen verilerini temizle
      result = await cleanTeacherData()
    } else if (cleaningType === 'files') {
      // Sadece dosyaları temizle
      result = await cleanFileData()
    } else {
      return NextResponse.json(
        { error: 'Geçersiz temizleme tipi' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Veri temizleme hatası:', error)
    return NextResponse.json(
      { error: 'Veri temizlenirken bir hata oluştu', details: error.message },
      { status: 500 }
    )
  }
}

// Demo verilerini temizleme fonksiyonu
async function cleanDemoData() {
  const deletedCounts: Record<string, number> = {}

  try {
    // Transaction içinde temizleme işlemleri
    await prisma.$transaction(async (tx) => {
      // 1. Dekontları temizle
      const dekontResult = await tx.dekont.deleteMany({
        where: {
          OR: [
            { rejectReason: { contains: 'demo' } },
            { rejectReason: { contains: 'test' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
      deletedCounts.dekontlar = dekontResult.count

      // 2. Stajları temizle
      const stajResult = await tx.staj.deleteMany({
        where: {
          OR: [
            { terminationNotes: { contains: 'demo' } },
            { terminationNotes: { contains: 'test' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
      deletedCounts.stajlar = stajResult.count

      // 3. Test öğrencilerini temizle
      const ogrenciResult = await tx.student.deleteMany({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } },
            { surname: { contains: 'test' } },
            { surname: { contains: 'demo' } },
            { number: { startsWith: '0000' } },
            { number: { startsWith: '9999' } }
          ]
        }
      })
      deletedCounts.ogrenciler = ogrenciResult.count

      // 4. Test öğretmenlerini temizle (admin olmayan)
      const ogretmenResult = await tx.teacherProfile.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'test' } },
                { name: { contains: 'demo' } },
                { surname: { contains: 'test' } },
                { surname: { contains: 'demo' } }
              ]
            },
            {
              user: {
                role: { not: 'ADMIN' }
              }
            }
          ]
        }
      })
      deletedCounts.ogretmenler = ogretmenResult.count

      // 5. Test işletmelerini temizle
      const isletmeResult = await tx.companyProfile.deleteMany({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } },
            { contact: { contains: 'test' } },
            { contact: { contains: 'demo' } }
          ]
        }
      })
      deletedCounts.isletmeler = isletmeResult.count

      // 6. Test belgelerini temizle
      const belgeResult = await tx.belge.deleteMany({
        where: {
          OR: [
            { dosyaAdi: { contains: 'test' } },
            { dosyaAdi: { contains: 'demo' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
      deletedCounts.belgeler = belgeResult.count

      // 7. Test görev belgelerini temizle
      const gorevBelgeResult = await tx.gorevBelgesi.deleteMany({
        where: {
          OR: [
            { createdAt: { lt: new Date('2025-01-01') } },
            { durum: { contains: 'test' } },
            { durum: { contains: 'demo' } }
          ]
        }
      })
      deletedCounts.gorevBelgeleri = gorevBelgeResult.count

      // 8. Test kullanıcılarını temizle (admin olmayan)
      const kullaniciResult = await tx.user.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: 'test' } },
                { email: { contains: 'demo' } },
                { email: { endsWith: '.test' } }
              ]
            },
            {
              role: { not: 'ADMIN' }
            }
          ]
        }
      })
      deletedCounts.kullanicilar = kullaniciResult.count
    })

    return {
      success: true,
      message: 'Demo verileri başarıyla temizlendi',
      deletedCounts
    }

  } catch (error: any) {
    throw new Error(`Demo verileri temizlenirken hata: ${error.message}`)
  }
}

// Sadece öğrenci verilerini temizle
async function cleanStudentData() {
  const deletedCounts: Record<string, number> = {}

  try {
    await prisma.$transaction(async (tx) => {
      // Önce öğrencilere ait stajları temizle
      const stajResult = await tx.staj.deleteMany({
        where: {
          student: {
            OR: [
              { name: { contains: 'test' } },
              { name: { contains: 'demo' } },
              { number: { startsWith: '0000' } },
              { number: { startsWith: '9999' } }
            ]
          }
        }
      })
      deletedCounts.stajlar = stajResult.count

      // Sonra öğrencileri temizle
      const ogrenciResult = await tx.student.deleteMany({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } },
            { number: { startsWith: '0000' } },
            { number: { startsWith: '9999' } }
          ]
        }
      })
      deletedCounts.ogrenciler = ogrenciResult.count
    })

    return {
      success: true,
      message: 'Test öğrenci verileri temizlendi',
      deletedCounts
    }
  } catch (error: any) {
    throw new Error(`Öğrenci verileri temizlenirken hata: ${error.message}`)
  }
}

// Sadece işletme verilerini temizle
async function cleanCompanyData() {
  const deletedCounts: Record<string, number> = {}

  try {
    await prisma.$transaction(async (tx) => {
      // Önce işletmelere ait stajları temizle
      const stajResult = await tx.staj.deleteMany({
        where: {
          company: {
            OR: [
              { name: { contains: 'test' } },
              { name: { contains: 'demo' } }
            ]
          }
        }
      })
      deletedCounts.stajlar = stajResult.count

      // Sonra test işletmelerini temizle
      const isletmeResult = await tx.companyProfile.deleteMany({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } }
          ]
        }
      })
      deletedCounts.isletmeler = isletmeResult.count
    })

    return {
      success: true,
      message: 'Test işletme verileri temizlendi',
      deletedCounts
    }
  } catch (error: any) {
    throw new Error(`İşletme verileri temizlenirken hata: ${error.message}`)
  }
}

// Sadece öğretmen verilerini temizle
async function cleanTeacherData() {
  const deletedCounts: Record<string, number> = {}

  try {
    await prisma.$transaction(async (tx) => {
      // Test öğretmenlerini temizle (admin olmayan)
      const ogretmenResult = await tx.teacherProfile.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'test' } },
                { name: { contains: 'demo' } }
              ]
            },
            {
              user: {
                role: { not: 'ADMIN' }
              }
            }
          ]
        }
      })
      deletedCounts.ogretmenler = ogretmenResult.count

      // Test kullanıcılarını temizle (admin olmayan)
      const kullaniciResult = await tx.user.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: 'test' } },
                { email: { contains: 'demo' } }
              ]
            },
            {
              role: { not: 'ADMIN' }
            }
          ]
        }
      })
      deletedCounts.kullanicilar = kullaniciResult.count
    })

    return {
      success: true,
      message: 'Test öğretmen verileri temizlendi',
      deletedCounts
    }
  } catch (error: any) {
    throw new Error(`Öğretmen verileri temizlenirken hata: ${error.message}`)
  }
}

// Sadece dosyaları temizle
async function cleanFileData() {
  const deletedCounts: Record<string, number> = {}

  try {
    await prisma.$transaction(async (tx) => {
      // Test belgelerini temizle
      const belgeResult = await tx.belge.deleteMany({
        where: {
          OR: [
            { dosyaAdi: { contains: 'test' } },
            { dosyaAdi: { contains: 'demo' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
      deletedCounts.belgeler = belgeResult.count

      // Test dekontlarını temizle
      const dekontResult = await tx.dekont.deleteMany({
        where: {
          OR: [
            { fileUrl: { contains: 'test' } },
            { fileUrl: { contains: 'demo' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
      deletedCounts.dekontlar = dekontResult.count

      // Test görev belgelerini temizle
      const gorevBelgeResult = await tx.gorevBelgesi.deleteMany({
        where: {
          OR: [
            { createdAt: { lt: new Date('2025-01-01') } },
            { durum: { contains: 'test' } }
          ]
        }
      })
      deletedCounts.gorevBelgeleri = gorevBelgeResult.count
    })

    return {
      success: true,
      message: 'Test dosyaları temizlendi',
      deletedCounts
    }
  } catch (error: any) {
    throw new Error(`Dosyalar temizlenirken hata: ${error.message}`)
  }
}

// Veri sayısını getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu işlem için admin yetkisi gereklidir' },
        { status: 403 }
      )
    }

    // Test verilerinin sayısını hesapla
    const testDataCounts = {
      ogrenciler: await prisma.student.count({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } },
            { number: { startsWith: '0000' } },
            { number: { startsWith: '9999' } }
          ]
        }
      }),
      ogretmenler: await prisma.teacherProfile.count({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'test' } },
                { name: { contains: 'demo' } }
              ]
            },
            {
              user: {
                role: { not: 'ADMIN' }
              }
            }
          ]
        }
      }),
      isletmeler: await prisma.companyProfile.count({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { name: { contains: 'demo' } }
          ]
        }
      }),
      dekontlar: await prisma.dekont.count({
        where: {
          OR: [
            { rejectReason: { contains: 'demo' } },
            { rejectReason: { contains: 'test' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      }),
      belgeler: await prisma.belge.count({
        where: {
          OR: [
            { dosyaAdi: { contains: 'test' } },
            { dosyaAdi: { contains: 'demo' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      }),
      stajlar: await prisma.staj.count({
        where: {
          OR: [
            { terminationNotes: { contains: 'demo' } },
            { terminationNotes: { contains: 'test' } },
            { createdAt: { lt: new Date('2025-01-01') } }
          ]
        }
      })
    }

    return NextResponse.json({
      success: true,
      testDataCounts
    })

  } catch (error: any) {
    console.error('Test verisi sayıları getirilemedi:', error)
    return NextResponse.json(
      { error: 'Test verisi sayıları alınırken hata oluştu' },
      { status: 500 }
    )
  }
}