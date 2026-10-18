import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TutarsizlikRaporu {
  id: string
  type: 'COKLU_KOORDINATOR' | 'EKSIK_KOORDINATOR' | 'HATALI_ATAMA' | 'SURESI_GECMIS_AKTIF' | 'USTA_OGRETICI_EKSIK'
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  affectedItems: any[]
  canAutoFix: boolean
  solution?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Check if user is admin
    const admin = await prisma.adminProfile.findUnique({
      where: { email: session.user.email }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin yetkisi gerekli' }, { status: 403 })
    }

    const issues: TutarsizlikRaporu[] = []

    // 1. Çoklu koordinatör kontrolü - Aynı işletmede farklı koordinatörler
    const cokluKoordinatorIssues = await prisma.$queryRaw`
      SELECT
        c.id as company_id,
        c.name as company_name,
        COUNT(DISTINCT i.teacherId) as koordinator_sayisi,
        GROUP_CONCAT(DISTINCT CONCAT(t.name, ' ', t.surname)) as koordinatorler,
        GROUP_CONCAT(DISTINCT CONCAT(s.name, ' ', s.surname, ' (', s.number, ')')) as ogrenciler
      FROM internships i
      JOIN companies c ON i.companyId = c.id
      JOIN students s ON i.studentId = s.id
      LEFT JOIN teachers t ON i.teacherId = t.id
      WHERE i.status = 'ACTIVE' AND i.teacherId IS NOT NULL
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT i.teacherId) > 1
    ` as any[]

    for (const issue of cokluKoordinatorIssues) {
      issues.push({
        id: `COKLU_KOORDINATOR_${issue.company_id}`,
        type: 'COKLU_KOORDINATOR',
        description: `${issue.company_name} işletmesinde ${issue.koordinator_sayisi} farklı koordinatör öğretmen atanmış: ${issue.koordinatorler}`,
        severity: 'HIGH',
        affectedItems: [`İşletme: ${issue.company_name}`, `Koordinatörler: ${issue.koordinatorler}`, `Öğrenciler: ${issue.ogrenciler}`],
        canAutoFix: false,
        solution: 'Aynı işletmedeki tüm öğrenciler için tek bir koordinatör öğretmen belirlenmeli.'
      })
    }

    // 2. Eksik koordinatör kontrolü
    const eksikKoordinatorIssues = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE',
        teacherId: null
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
        }
      }
    })

    if (eksikKoordinatorIssues.length > 0) {
      issues.push({
        id: 'EKSIK_KOORDINATOR_GENEL',
        type: 'EKSIK_KOORDINATOR',
        description: `${eksikKoordinatorIssues.length} adet aktif stajda koordinatör öğretmen atanmamış`,
        severity: 'HIGH',
        affectedItems: eksikKoordinatorIssues.map((staj: any) =>
          `${staj.student?.name} ${staj.student?.surname} - ${staj.company?.name}`
        ),
        canAutoFix: false,
        solution: 'Her staj için uygun alan koordinatör öğretmeni atanmalı.'
      })
    }

    // 3. Süresi geçmiş aktif stajlar
    const today = new Date().toISOString().split('T')[0]
    const suresiGecmisStajlar = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: new Date(today)
        }
      },
      include: {
        student: {
          select: {
            name: true,
            surname: true,
            number: true
          }
        },
        company: {
          select: {
            name: true
          }
        }
      }
    })

    if (suresiGecmisStajlar.length > 0) {
      issues.push({
        id: 'SURESI_GECMIS_AKTIF',
        type: 'SURESI_GECMIS_AKTIF',
        description: `${suresiGecmisStajlar.length} adet stajın süresi geçmiş ama hala aktif durumda`,
        severity: 'MEDIUM',
        affectedItems: suresiGecmisStajlar.map((staj: any) =>
          `${staj.student?.name} ${staj.student?.surname} - ${staj.company?.name} (Bitiş: ${staj.endDate?.toLocaleDateString('tr-TR')})`
        ),
        canAutoFix: true,
        solution: 'Süresi geçmiş stajlar otomatik olarak tamamlandı olarak işaretlenebilir.'
      })
    }

    // 4. Hatalı alan ataması kontrolü - Öğrencinin alanına uygun olmayan ��ğretmen
    const hataliAtamaIssues = await prisma.$queryRaw`
      SELECT
        i.id,
        CONCAT(s.name, ' ', s.surname) as student_name,
        CONCAT(t.name, ' ', t.surname) as teacher_name,
        sa.name as student_alan,
        ta.name as teacher_alan,
        c.name as company_name
      FROM internships i
      JOIN students s ON i.studentId = s.id
      JOIN teachers t ON i.teacherId = t.id
      JOIN fields sa ON s.alanId = sa.id
      JOIN fields ta ON t.alanId = ta.id
      JOIN companies c ON i.companyId = c.id
      WHERE i.status = 'ACTIVE'
      AND sa.id != ta.id
    ` as any[]

    if (hataliAtamaIssues.length > 0) {
      issues.push({
        id: 'HATALI_ALAN_ATAMASI',
        type: 'HATALI_ATAMA',
        description: `🚨 KRİTİK HATA: ${hataliAtamaIssues.length} adet stajda öğrenci alanı ile koordinatör öğretmen alanı uyuşmuyor!`,
        severity: 'HIGH',
        affectedItems: hataliAtamaIssues.map(issue =>
          `👨‍🎓 ${issue.student_name} (${issue.student_alan}) ❌ 👨‍🏫 ${issue.teacher_name} (${issue.teacher_alan}) 🏢 ${issue.company_name}`
        ),
        canAutoFix: false,
        solution: '⚠️ ZORUNLU: Öğrencinin alanı ile koordinatör öğretmenin alanı mutlaka aynı olmalıdır! Örnek: Bilişim öğrencisi → Bilişim öğretmeni'
      })
    }

    // 5. Usta öğreticisi eksik işletmeler
    const companiesWithoutMasterTeacher = await prisma.companyProfile.findMany({
      where: {
        OR: [
          { masterTeacherName: null },
          { masterTeacherName: '' }
        ],
        stajlar: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      include: {
        stajlar: {
          where: { status: 'ACTIVE' },
          include: {
            student: { select: { name: true, surname: true, className: true } }
          }
        }
      }
    })

    if (companiesWithoutMasterTeacher.length > 0) {
      issues.push({
        id: 'USTA_OGRETICI_EKSIK',
        type: 'USTA_OGRETICI_EKSIK',
        description: `🚫 KRİTİK UYARI: ${companiesWithoutMasterTeacher.length} işletmede usta öğreticisi tanımlanmamış ama aktif stajları var`,
        severity: 'HIGH',
        affectedItems: companiesWithoutMasterTeacher.flatMap(company =>
          company.stajlar.map(staj =>
            `🏢 ${company.name} - 👨‍🎓 ${staj.student?.name} ${staj.student?.surname} (${staj.student?.className})`
          )
        ),
        canAutoFix: false,
        solution: '⚠️ ZORUNLU: Bu işletmelere usta öğreticisi tanımlanmalıdır. İşletme profil sayfasından usta öğreticisi bilgilerini ekleyin. Usta öğreticisi olmayan işletmelerde staj yapılamaz.'
      })
    }

    return NextResponse.json({
      success: true,
      issues,
      summary: {
        total: issues.length,
        high: issues.filter(i => i.severity === 'HIGH').length,
        medium: issues.filter(i => i.severity === 'MEDIUM').length,
        low: issues.filter(i => i.severity === 'LOW').length,
        autoFixable: issues.filter(i => i.canAutoFix).length
      }
    })

  } catch (error) {
    console.error('Tutarsızlık kontrolü hatası:', error)
    return NextResponse.json(
      { error: 'Tutarsızlık kontrolü yapılırken hata oluştu' },
      { status: 500 }
    )
  }
}