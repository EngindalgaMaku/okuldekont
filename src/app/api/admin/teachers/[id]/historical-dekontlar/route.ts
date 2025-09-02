import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params

    // Öğretmenin eski koordinatörlük yaptığı işletmeleri bul
    const historicalAssignments = await prisma.teacherAssignmentHistory.findMany({
      where: {
        previousTeacherId: teacherId
      },
      include: {
        company: {
          include: {
            stajlar: {
              where: {
                status: {
                  in: ['ACTIVE', 'COMPLETED', 'TERMINATED']
                }
              },
              include: {
                student: true,
                dekontlar: {
                  include: {
                    teacher: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    })

    // Eski koordinatörlük dönemindeki dekontları formatla
    const historicalDekontlar: any[] = []
    
    historicalAssignments.forEach(assignment => {
      const company = assignment.company
      
      company.stajlar.forEach(staj => {
        staj.dekontlar.forEach(dekont => {
          // Sadece bu öğretmenin koordinatörlük dönemindeki dekontları al
          const dekontDate = new Date(dekont.createdAt)
          const assignmentDate = new Date(assignment.assignedAt)
          
          // Dekont bu öğretmenin koordinatörlük döneminde yüklendiyse
          if (dekontDate >= assignmentDate) {
            historicalDekontlar.push({
              id: dekont.id,
              staj_id: staj.id,
              ogrenci_ad: `${staj.student.name} ${staj.student.surname}`,
              ogrenci_sinif: staj.student.className,
              ogrenci_no: staj.student.number,
              isletme_ad: company.name,
              ay: dekont.month,
              yil: dekont.year,
              miktar: dekont.amount ? Number(dekont.amount) : null,
              aciklama: '',
              dosya_adi: dekont.fileUrl ? dekont.fileUrl.split('/').pop() : '',
              dosya_yolu: dekont.fileUrl,
              onay_durumu: dekont.status === 'APPROVED' ? 'onaylandi' : 
                          dekont.status === 'REJECTED' ? 'reddedildi' : 'bekliyor',
              onay_tarihi: dekont.approvedAt,
              red_nedeni: dekont.rejectReason,
              yukleyen_kisi: dekont.teacher ? `${dekont.teacher.name} ${dekont.teacher.surname} (Öğretmen)` : 'Sistem',
              created_at: dekont.createdAt,
              koordinatorluk_donemi: {
                baslangic: assignment.assignedAt,
                bitis: null, // Koordinatörlük sonu tarihi yok, sadece değişiklik tarihi var
                eski_koordinator: true
              }
            })
          }
        })
      })
    })

    return NextResponse.json(historicalDekontlar)
  } catch (error) {
    console.error('Eski koordinatörlük dekontları getirme hatası:', error)
    return NextResponse.json(
      { error: 'Eski koordinatörlük dekontları getirilemedi' },
      { status: 500 }
    )
  }
}
