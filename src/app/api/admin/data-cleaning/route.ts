import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

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
    const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dry_run') === '1'

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
    } else if (cleaningType === 'production_reset') {
      // Uygulamaya geçiş: sistem ayarları ve temel tanımlar hariç her şeyi sil
      result = await cleanProductionData(dryRun)
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
    } else if (cleaningType === 'files_on_disk') {
      // public/uploads altındaki gerçek dosyaları temizle (DRY-RUN destekli)
      result = await cleanFilesOnDisk(dryRun)
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

// Uygulamaya geçiş için tam temizlik (sistem ayarları ve temel tanımlar korunur)
async function cleanProductionData(dryRun: boolean) {
  const deletedCounts: Record<string, number> = {}

  // Korunacaklar:
  // - Eğitim yılları ve aktif yıl bilgisi
  // - Alanlar (fields) ve sınıflar (classes)
  // - Admin kullanıcı(lar) ve sistem ayarları

  // Silinecek işlemsel veriler:
  // - dekont, belge, gorevBelgesi
  // - staj
  // - student
  // - companyProfile
  // - teacherProfile (admin olmayanlar)
  // - user (admin olmayanlar)

  try {
    if (dryRun) {
      const counts = await prisma.$transaction([
        prisma.dekont.count(),
        prisma.belge.count(),
        prisma.gorevBelgesi.count(),
        prisma.attendance.count(),
        prisma.staj.count(),
        prisma.studentEnrollment.count(),
        prisma.studentHistory.count(),
        prisma.student.count(),
        prisma.companyProfile.count(),
        prisma.teacherProfile.count({ where: { user: { role: { not: 'ADMIN' } } } }),
        prisma.message.count({ where: { sender: { role: { not: 'ADMIN' } } } }),
        prisma.user.count({ where: { role: { not: 'ADMIN' } } })
      ])

      deletedCounts.dekontlar = counts[0]
      deletedCounts.belgeler = counts[1]
      deletedCounts.gorevBelgeleri = counts[2]
      deletedCounts.attendance = counts[3]
      deletedCounts.stajlar = counts[4]
      deletedCounts.ogrenciKayitlari = counts[5]
      deletedCounts.ogrenciGecmis = counts[6]
      deletedCounts.ogrenciler = counts[7]
      deletedCounts.isletmeler = counts[8]
      deletedCounts.ogretmenler = counts[9]
      deletedCounts.mesajlar = counts[10]
      deletedCounts.kullanicilar = counts[11]

      return {
        success: true,
        message: 'DRY-RUN: Üretim sıfırlama ile silinecek kayıt sayıları',
        deletedCounts
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1) İşlemsel belgeler/ekler
      const dekont = await tx.dekont.deleteMany({})
      deletedCounts.dekontlar = dekont.count

      const belge = await tx.belge.deleteMany({})
      deletedCounts.belgeler = belge.count

      const gorevBelgesi = await tx.gorevBelgesi.deleteMany({})
      deletedCounts.gorevBelgeleri = gorevBelgesi.count

      // 2) Öğrenciye bağımlı kayıtlar (FK ihlali olmaması için önce bunları sil)
      const attendance = await tx.attendance.deleteMany({})
      deletedCounts.attendance = attendance.count

      // 3) Öğrenci yıl kayıtları ve öğrenci geçmişi
      const enrollments = await tx.studentEnrollment.deleteMany({})
      deletedCounts.ogrenciKayitlari = enrollments.count

      const studentHistory = await tx.studentHistory.deleteMany({})
      deletedCounts.ogrenciGecmis = studentHistory.count

      // 4) Stajlar (InternshipHistory, Belge ilişkileri CASCADE ile gider)
      const staj = await tx.staj.deleteMany({})
      deletedCounts.stajlar = staj.count

      // 5) Öğrenciler
      const students = await tx.student.deleteMany({})
      deletedCounts.ogrenciler = students.count

      // 6) İşletmeler
      const companies = await tx.companyProfile.deleteMany({})
      deletedCounts.isletmeler = companies.count

      // 7) Öğretmen profilleri (Admin user’a bağlı öğretmenler korunur)
      const teachers = await tx.teacherProfile.deleteMany({ where: { user: { role: { not: 'ADMIN' } } } })
      deletedCounts.ogretmenler = teachers.count

      // 8) Messaging: admin olmayan kullanıcıların mesajlarını sil (FK için)
      const messages = await tx.message.deleteMany({ where: { sender: { role: { not: 'ADMIN' } } } })
      deletedCounts.mesajlar = messages.count

      // 9) Kullanıcılar (admin olmayanlar)
      const users = await tx.user.deleteMany({ where: { role: { not: 'ADMIN' } } })
      deletedCounts.kullanicilar = users.count
    })

    return {
      success: true,
      message: 'Üretim geçişi için veriler başarıyla temizlendi (temel tanımlar ve sistem ayarları korundu)',
      deletedCounts
    }
  } catch (error: any) {
    throw new Error(`Üretim temizliği sırasında hata: ${error.message}`)
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

// Sadece dosyaları (DB) temizle
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

// Disk üzerindeki upload dosyalarını temizle (DRY-RUN destekli)
async function cleanFilesOnDisk(dryRun: boolean) {
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')
  const targets = [
    path.join(uploadsRoot, 'belgeler'),
    path.join(uploadsRoot, 'dekontlar')
  ]

  let deletedCounts: Record<string, number> = {}
  let bytesFreedTotal = 0

  const safeListDir = async (dir: string) => {
    try {
      const entries = await fs.readdir(dir)
      return entries
    } catch {
      return []
    }
  }

  for (const dir of targets) {
    const entries = await safeListDir(dir)
    let count = 0
    for (const name of entries) {
      if (name === '.gitkeep') continue
      const full = path.join(dir, name)
      try {
        const st = await fs.stat(full)
        if (dryRun) {
          count += 1
          if (st.isFile()) bytesFreedTotal += st.size
        } else {
          if (st.isDirectory()) {
            await fs.rm(full, { recursive: true, force: true })
          } else {
            await fs.unlink(full)
            bytesFreedTotal += st.size
          }
          count += 1
        }
      } catch {
        // ignore individual entry errors
      }
    }
    deletedCounts[path.basename(dir)] = count
  }

  return {
    success: true,
    message: dryRun
      ? 'DRY-RUN: Diskte silinecek upload dosyaları sayıldı'
      : 'Diskteki upload dosyaları temizlendi',
    deletedCounts,
    bytesFreed: dryRun ? undefined : bytesFreedTotal
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