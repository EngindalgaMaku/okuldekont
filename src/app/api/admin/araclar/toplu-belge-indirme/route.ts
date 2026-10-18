import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import JSZip from 'jszip'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ay = searchParams.get('ay')
    const yil = searchParams.get('yil')
    const ogretmen = searchParams.get('ogretmen')
    const alan = searchParams.get('alan')

    // Validate required parameters
    if (!ay || !yil || !ogretmen || !alan) {
      return NextResponse.json(
        { error: 'Ay, yıl, öğretmen ve alan parametreleri gerekli' },
        { status: 400 }
      )
    }


    const selectedYear = parseInt(yil)
    const selectedMonth = parseInt(ay)

    // Öğretmeni bul
    const ogretmenParts = ogretmen.trim().split(' ')
    const firstName = ogretmenParts[0] || ''
    const lastName = ogretmenParts.slice(1).join(' ') || ''

    const selectedTeacher = await prisma.teacherProfile.findFirst({
      where: {
        AND: [
          { name: { contains: firstName } },
          { surname: { contains: lastName } }
        ]
      }
    })

    if (!selectedTeacher) {
      return NextResponse.json({ 
        error: 'Seçilen öğretmen bulunamadı'
      }, { status: 404 })
    }

    // Bu öğretmenin dekontlarını getir
    const dekontlar = await prisma.dekont.findMany({
      where: {
        teacherId: selectedTeacher.id,
        month: selectedMonth,
        year: selectedYear,
        fileUrl: {
          not: null
        }
      },
      include: {
        student: {
          select: {
            name: true,
            surname: true,
            number: true,
            className: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        teacher: {
          select: {
            name: true,
            surname: true
          }
        }
      },
      orderBy: [
        { student: { className: 'asc' } },
        { student: { number: 'asc' } }
      ]
    })

    if (dekontlar.length === 0) {
      return NextResponse.json({ 
        error: 'Seçilen kriterlerde dekont bulunamadı'
      }, { status: 404 })
    }


    // ZIP dosyası oluştur
    const zip = new JSZip()

    // Her ay için klasör oluştur
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ]

    const monthFolder = zip.folder(`${monthNames[selectedMonth - 1]}_${selectedYear}`)
    
    if (!monthFolder) {
      throw new Error('Klasör oluşturulamadı')
    }

    // Her dekont için gerçek dosyayı indir ve ZIP'e ekle
    for (const dekont of dekontlar) {
      try {

        if (!dekont.fileUrl) {
          continue
        }

        // Dosyayı indir
        const fileResponse = await fetch(dekont.fileUrl)
        if (!fileResponse.ok) {
          continue
        }

        const fileBuffer = await fileResponse.arrayBuffer()
        
        // Orijinal dosya uzantısını al
        const fileExtension = dekont.fileUrl.split('.').pop() || 'pdf'
        
        // Dosya adı oluştur (orijinal dosya uzantısıyla)
        const fileName = `${dekont.student?.name}_${dekont.student?.surname}_${dekont.student?.className}_${monthNames[selectedMonth - 1]}_${selectedYear}.${fileExtension}`
        
        // ZIP'e ekle
        monthFolder.file(fileName, fileBuffer)

      } catch (error) {
        console.error(`Dekont dosyası işleme hatası: ${dekont.id}`, error)
        // Hata olsa bile devam et
      }
    }

    // ZIP dosyasını oluştur
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // Response olarak ZIP dosyasını döndür
    const response = new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${selectedTeacher.name}_${selectedTeacher.surname}_${monthNames[selectedMonth - 1]}_${selectedYear}_Dekontlar.zip"`,
        'Content-Length': zipBuffer.byteLength.toString()
      }
    })

    return response

  } catch (error) {
    console.error('Toplu indirme API hatası:', error)
    return NextResponse.json(
      { error: 'ZIP dosyası oluşturma hatası' },
      { status: 500 }
    )
  }
}

// Basit metin formatında dekont oluşturma
function generateDekontText(dekont: any, month: number, year: number): string {
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]

  return `
=====================================
           ÖDEME DEKONTU
=====================================

Öğrenci Adı Soyadı: ${dekont.student?.name} ${dekont.student?.surname}
Sınıf/No: ${dekont.student?.className} / ${dekont.student?.number}
İşletme: ${dekont.company?.name || 'Belirtilmemiş'}
Koordinatör Öğretmen: ${dekont.teacher?.name} ${dekont.teacher?.surname}

Dönem: ${monthNames[month - 1]} ${year}
Ödeme Tarihi: ${dekont.paymentDate ? new Date(dekont.paymentDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
Durum: ${dekont.status === 'APPROVED' ? 'Onaylandı' : dekont.status === 'PENDING' ? 'Beklemede' : 'Reddedildi'}

ÖDEME TUTARI: ${dekont.amount ? dekont.amount.toFixed(2) : '0.00'} TL

=====================================

Bu dekont ${new Date().toLocaleDateString('tr-TR')} tarihinde 
sistem tarafından oluşturulmuştur.

Belge URL: ${dekont.fileUrl || 'Belirtilmemiş'}
Dekont ID: ${dekont.id}
`
}

// Özet raporu oluşturma
function generateSummary(dekontlar: any[], month: number, year: number, teacher: any): string {
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]

  const totalAmount = dekontlar.reduce((sum, dekont) => {
    return sum + (dekont.amount ? parseFloat(dekont.amount.toString()) : 0)
  }, 0)

  const approvedCount = dekontlar.filter(d => d.status === 'APPROVED').length
  const pendingCount = dekontlar.filter(d => d.status === 'PENDING').length
  const rejectedCount = dekontlar.filter(d => d.status === 'REJECTED').length

  return `
=====================================
           ÖZET RAPORU
=====================================

Koordinatör Öğretmen: ${teacher.name} ${teacher.surname}
Dönem: ${monthNames[month - 1]} ${year}
Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}

=====================================
           İSTATİSTİKLER
=====================================

Toplam Dekont Sayısı: ${dekontlar.length}
- Onaylanan: ${approvedCount}
- Bekleyen: ${pendingCount}
- Reddedilen: ${rejectedCount}

Toplam Tutar: ${totalAmount.toFixed(2)} TL

=====================================
           DEKONT LİSTESİ
=====================================

${dekontlar.map((dekont, index) => `
${index + 1}. ${dekont.student?.name} ${dekont.student?.surname}
   Sınıf: ${dekont.student?.className}
   İşletme: ${dekont.company?.name || 'Belirtilmemiş'}
   Tutar: ${dekont.amount ? dekont.amount.toFixed(2) : '0.00'} TL
   Durum: ${dekont.status === 'APPROVED' ? 'Onaylandı' : dekont.status === 'PENDING' ? 'Beklemede' : 'Reddedildi'}
`).join('\n')}

=====================================

Bu rapor ${new Date().toLocaleDateString('tr-TR')} tarihinde 
sistem tarafından otomatik olarak oluşturulmuştur.
`
}