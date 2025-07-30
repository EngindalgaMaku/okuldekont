import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const fieldId = searchParams.get('fieldId')
    const educationYearId = searchParams.get('educationYearId')

    if (!type) {
      return NextResponse.json({ error: 'Rapor türü gerekli' }, { status: 400 })
    }

    let reportData: any[] = []
    let reportTitle = ''
    let reportSummary = ''

    switch (type) {
      case 'staj-fesih':
        reportTitle = 'STAJ FESİH RAPORU'
        reportData = await getTerminatedInternships(startDate, endDate, fieldId, educationYearId)
        reportSummary = `${reportData.length} adet staj fesih işlemi`
        break
      case 'staj-atama':
        reportTitle = 'STAJ ATAMA RAPORU'
        reportData = await getAssignedInternships(startDate, endDate, fieldId, educationYearId)
        reportSummary = `${reportData.length} adet staj atama işlemi`
        break
      case 'koordinator-degisiklik':
        reportTitle = 'KOORDİNATÖR DEĞİŞİKLİK RAPORU'
        reportData = await getCoordinatorChanges(startDate, endDate, fieldId, educationYearId)
        reportSummary = `${reportData.length} adet koordinatör değişikliği`
        break
      case 'yillik-ozet':
        reportTitle = 'YILLIK ÖZET RAPORU'
        reportData = await getYearlySummary(educationYearId)
        reportSummary = `${educationYearId ? 'Seçili eğitim yılı' : 'Tüm eğitim yılları'} özet raporu`
        break
      default:
        return NextResponse.json({ error: 'Geçersiz rapor türü' }, { status: 400 })
    }

    // JSON olarak döndür
    return NextResponse.json({
      success: true,
      title: reportTitle,
      summary: reportSummary,
      type: type,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      educationYearId: educationYearId || null,
      totalRecords: reportData.length,
      data: reportData,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Rapor oluşturma hatası:', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}

async function getTerminatedInternships(startDate?: string | null, endDate?: string | null, fieldId?: string | null, educationYearId?: string | null) {
  const where: any = {
    status: 'TERMINATED'
  }

  if (startDate || endDate) {
    where.terminationDate = {}
    if (startDate) where.terminationDate.gte = new Date(startDate)
    if (endDate) where.terminationDate.lte = new Date(endDate)
  }

  if (fieldId) {
    where.student = {
      alanId: fieldId
    }
  }

  if (educationYearId) {
    where.educationYearId = educationYearId
  }

  const stajlar = await prisma.staj.findMany({
    where,
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    },
    orderBy: { terminationDate: 'desc' }
  })

  return stajlar.map((staj: any) => ({
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company.name,
    companyContact: staj.company.contact,
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    terminatedAt: staj.terminationDate,
    terminationReason: staj.terminationReason || 'Belirtilmemiş',
    terminationNotes: staj.terminationNotes || ''
  }))
}

async function getAssignedInternships(startDate?: string | null, endDate?: string | null, fieldId?: string | null, educationYearId?: string | null) {
  const where: any = {
    status: 'ACTIVE'
  }

  if (startDate || endDate) {
    where.startDate = {}
    if (startDate) where.startDate.gte = new Date(startDate)
    if (endDate) where.startDate.lte = new Date(endDate)
  }

  if (fieldId) {
    where.student = {
      alanId: fieldId
    }
  }

  if (educationYearId) {
    where.educationYearId = educationYearId
  }

  const stajlar = await prisma.staj.findMany({
    where,
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: true
    },
    orderBy: { startDate: 'desc' }
  })

  return stajlar.map((staj: any) => ({
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company.name,
    companyContact: staj.company.contact,
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    startDate: staj.startDate,
    endDate: staj.endDate,
    assignedAt: staj.createdAt
  }))
}

async function getCoordinatorChanges(startDate?: string | null, endDate?: string | null, fieldId?: string | null, educationYearId?: string | null) {
  const where: any = {}

  if (startDate || endDate) {
    where.assignedAt = {}
    if (startDate) where.assignedAt.gte = new Date(startDate)
    if (endDate) where.assignedAt.lte = new Date(endDate)
  }

  if (fieldId) {
    where.teacher = {
      alanId: fieldId
    }
  }

  // Eğitim yılı filtresi için company üzerinden stajları kontrol et
  if (educationYearId) {
    where.company = {
      ...where.company,
      Staj: {
        some: {
          educationYearId: educationYearId
        }
      }
    }
  }

  const changes = await prisma.teacherAssignmentHistory.findMany({
    where,
    include: {
      company: true,
      teacher: true,
      previousTeacher: true,
      assignedByUser: true
    },
    orderBy: { assignedAt: 'desc' }
  })

  return changes.map((change: any) => ({
    companyName: change.company.name,
    companyContact: change.company.contact,
    newTeacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : 'Atanmamış',
    previousTeacherName: change.previousTeacher ? `${change.previousTeacher.name} ${change.previousTeacher.surname}` : 'Atanmamış',
    assignedAt: change.assignedAt,
    assignedBy: change.assignedByUser?.email || 'Bilinmeyen',
    reason: change.reason || 'Belirtilmemiş',
    notes: change.notes || ''
  }))
}

// Yeni fonksiyon: Yıllık özet raporu
async function getYearlySummary(educationYearId?: string | null) {
  const where: any = {}
  if (educationYearId) {
    where.educationYearId = educationYearId
  }

  // Eğitim yılı bilgisini al
  let educationYear = null
  if (educationYearId) {
    educationYear = await prisma.egitimYili.findUnique({
      where: { id: educationYearId }
    })
  }

  // Staj istatistikleri
  const [
    totalInternships,
    activeInternships,
    completedInternships,
    terminatedInternships
  ] = await Promise.all([
    prisma.staj.count({ where }),
    prisma.staj.count({ where: { ...where, status: 'ACTIVE' } }),
    prisma.staj.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.staj.count({ where: { ...where, status: 'TERMINATED' } })
  ])

  // Alan bazlı istatistikler
  const fieldStats = await prisma.staj.groupBy({
    by: ['studentId'],
    where,
    _count: {
      id: true
    }
  })

  // Şirket bazlı istatistikler
  const companyStats = await prisma.staj.groupBy({
    by: ['companyId'],
    where,
    _count: {
      id: true
    }
  })

  return [{
    educationYear: educationYear?.year || 'Tüm Yıllar',
    totalInternships,
    activeInternships,
    completedInternships,
    terminatedInternships,
    terminationRate: totalInternships > 0 ? ((terminatedInternships / totalInternships) * 100).toFixed(2) : '0',
    completionRate: totalInternships > 0 ? ((completedInternships / totalInternships) * 100).toFixed(2) : '0',
    totalFields: fieldStats.length,
    totalCompanies: companyStats.length,
    generatedAt: new Date().toISOString()
  }]
}
