import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface AssignmentRule {
  type: 'COORDINATOR_CONSISTENCY' | 'FIELD_MATCH' | 'MASTER_TEACHER_REQUIRED'
  severity: 'ERROR' | 'WARNING' | 'INFO'
  message: string
  suggestedAction?: string
  existingTeacherId?: string
  existingTeacherName?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { studentId, companyId, teacherId, action = 'create' } = await request.json()

    if (!studentId || !companyId) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const rules: AssignmentRule[] = []

    // Öğrenci bilgilerini al
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { alan: true }
    })

    if (!student) {
      return NextResponse.json({ error: 'Öğrenci bulunamadı' }, { status: 404 })
    }

    // İşletme bilgilerini al
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 })
    }

    // Usta öğreticisi kontrolü kaldırıldı - artık usta öğretici olmadan da atama yapılabilir
    // Sadece bilgilendirme amaçlı uyarı göster (ERROR yerine INFO)
    if (!company.masterTeacherName || company.masterTeacherName.trim() === '') {
      rules.push({
        type: 'MASTER_TEACHER_REQUIRED',
        severity: 'INFO',
        message: `ℹ️ Bilgi: ${company.name} işletmesinde usta öğreticisi henüz tanımlanmamış.`,
        suggestedAction: 'Staj ataması yapılabilir, ancak usta öğreticisi bilgilerinin daha sonra eklenmesi önerilir.'
      })
    }

    // 1. KURAL: İşletmede mevcut koordinatör kontrolü
    const existingInternships = await prisma.staj.findMany({
      where: {
        companyId: companyId,
        status: 'ACTIVE',
        teacherId: { not: null }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            alanId: true,
            alan: { select: { name: true } }
          }
        },
        student: {
          select: {
            name: true,
            surname: true,
            alanId: true,
            alan: { select: { name: true } }
          }
        }
      }
    })

    if (existingInternships.length > 0) {
      const existingCoordinators = Array.from(
        new Set(existingInternships.map(i => i.teacherId).filter(Boolean))
      )

      if (existingCoordinators.length === 1) {
        const existingTeacher = existingInternships[0].teacher
        
        if (existingTeacher) {
          // Mevcut koordinatör var, aynı koordinatör önerilsin
          if (!teacherId || teacherId === existingTeacher.id) {
            rules.push({
              type: 'COORDINATOR_CONSISTENCY',
              severity: 'INFO',
              message: `${company.name} işletmesinde zaten ${existingTeacher.name} ${existingTeacher.surname} koordinatör olarak atanmış.`,
              suggestedAction: 'Mevcut koordinatör otomatik seçildi. Bu kurala uygun bir atamadır.',
              existingTeacherId: existingTeacher.id,
              existingTeacherName: `${existingTeacher.name} ${existingTeacher.surname}`
            })
          } else {
            // Farklı koordinatör seçilmiş, uyarı ver
            const newTeacher = await prisma.teacherProfile.findUnique({
              where: { id: teacherId },
              include: { alan: true }
            })

            rules.push({
              type: 'COORDINATOR_CONSISTENCY',
              severity: 'WARNING',
              message: `⚠️ KURAL İHLALİ: ${company.name} işletmesinde zaten ${existingTeacher.name} ${existingTeacher.surname} koordinatör olarak görev yapıyor. Farklı koordinatör (${newTeacher?.name} ${newTeacher?.surname}) seçiyorsunuz.`,
              suggestedAction: `Önerilen: Mevcut koordinatör ${existingTeacher.name} ${existingTeacher.surname} ile devam edin. Koordinatör değişikliği tüm işletmedeki öğrencileri etkileyecektir.`,
              existingTeacherId: existingTeacher.id,
              existingTeacherName: `${existingTeacher.name} ${existingTeacher.surname}`
            })
          }

          // 2. KURAL: Alan uyumluluğu kontrolü - WARNING olarak değiştirildi (atama engellenmiyor)
          if (existingTeacher.alanId !== student.alanId) {
            rules.push({
              type: 'FIELD_MATCH',
              severity: 'WARNING',
              message: `⚠️ UYARI: Öğrenci alanı (${student.alan?.name}) ile mevcut koordinatör alanı (${existingTeacher.alan?.name}) farklı.`,
              suggestedAction: `Alan dışı atama yapılabilir ancak dikkatli olunması önerilir.`
            })
          }
        }
      } else if (existingCoordinators.length > 1) {
        // Birden fazla koordinatör var, bu zaten bir problem
        rules.push({
          type: 'COORDINATOR_CONSISTENCY',
          severity: 'ERROR',
          message: `🚫 KRİTİK HATA: ${company.name} işletmesinde ${existingCoordinators.length} farklı koordinatör bulunuyor!`,
          suggestedAction: 'Önce bu işletmedeki koordinatör atamasını düzenleyin. Bir işletmede sadece bir koordinatör olmalıdır.'
        })
      }
    } else {
      // İşletmede ilk staj, herhangi bir koordinatör seçilebilir
      if (teacherId) {
        const teacher = await prisma.teacherProfile.findUnique({
          where: { id: teacherId },
          include: { alan: true }
        })

        if (teacher) {
          if (teacher.alanId === student.alanId) {
            rules.push({
              type: 'COORDINATOR_CONSISTENCY',
              severity: 'INFO',
              message: `✅ ${company.name} işletmesinde ilk staj ataması yapılıyor. ${teacher.name} ${teacher.surname} koordinatör olarak atanacak.`,
              suggestedAction: 'Bu kurallara uygun bir atamadır.',
              existingTeacherId: teacher.id,
              existingTeacherName: `${teacher.name} ${teacher.surname}`
            })
          } else {
            // Alan uyumsuzluğu - WARNING olarak değiştirildi (atama engellenmiyor)
            rules.push({
              type: 'FIELD_MATCH',
              severity: 'WARNING',
              message: `⚠️ UYARI: Öğrenci alanı (${student.alan?.name}) ile koordinatör alanı (${teacher.alan?.name}) farklı.`,
              suggestedAction: `Alan dışı koordinatör ataması yapılabilir ancak dikkatli olunması önerilir.`
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      rules,
      hasErrors: rules.some(r => r.severity === 'ERROR'),
      hasWarnings: rules.some(r => r.severity === 'WARNING'),
      canProceed: !rules.some(r => r.severity === 'ERROR'),
      student: {
        name: `${student.name} ${student.surname}`,
        alan: student.alan?.name
      },
      company: {
        name: company.name
      },
      existingCoordinator: existingInternships.length > 0 ? existingInternships[0].teacher : null
    })

  } catch (error) {
    console.error('Staj atama kuralları kontrolü hatası:', error)
    return NextResponse.json(
      { error: 'Kural kontrolü yapılırken hata oluştu' },
      { status: 500 }
    )
  }
}