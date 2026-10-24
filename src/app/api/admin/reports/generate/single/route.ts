import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const operationId = searchParams.get('operationId')

    if (!type || !operationId) {
      return NextResponse.json({ error: 'Rapor türü ve işlem ID gerekli' }, { status: 400 })
    }

    // Okul ismini çek
    const schoolSetting = await prisma.systemSetting.findUnique({
      where: { key: 'school_name' }
    })
    const schoolName = schoolSetting?.value || 'Okul Adı'

    let reportData: any = null
    let reportTitle = ''

    switch (type) {
      case 'staj-fesih':
        reportTitle = 'STAJ FESİH RAPORU'
        reportData = await getSingleTerminatedInternship(operationId)
        break
      case 'staj-atama':
        reportTitle = 'STAJ ATAMA RAPORU'
        reportData = await getSingleAssignedInternship(operationId)
        break
      case 'koordinator-degisiklik':
        reportTitle = 'KOORDİNATÖR DEĞİŞİKLİK RAPORU'
        reportData = await getSingleCoordinatorChange(operationId)
        break
      case 'staj-tamamlama':
        reportTitle = 'STAJ TAMAMLAMA RAPORU'
        reportData = await getSingleCompletedInternship(operationId)
        break
      default:
        return NextResponse.json({ error: 'Geçersiz rapor türü' }, { status: 400 })
    }

    if (!reportData) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 })
    }

    // JSON olarak döndür
    return NextResponse.json({
      success: true,
      title: reportTitle,
      type: type,
      operationId: operationId,
      data: reportData,
      schoolName: schoolName,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Tek işlem raporu oluşturma hatası:', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}

async function getSingleTerminatedInternship(stajId: string) {
  const staj = await prisma.staj.findUnique({
    where: {
      id: stajId,
      status: 'TERMINATED'
    },
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: {
        include: {
          alan: true
        }
      }
    }
  })

  if (!staj) return null

  return {
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company?.name || 'Belirtilmemiş',
    companyContact: staj.company?.contact || 'Belirtilmemiş',
    companyAuthority: staj.company?.masterTeacherName || staj.company?.contact || 'Belirtilmemiş',
    companyPhone: staj.company?.phone || '',
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    teacherField: staj.teacher?.alan?.name || 'Belirtilmemiş',
    startDate: staj.startDate,
    endDate: staj.endDate,
    terminatedAt: staj.terminationDate,
    terminationReason: staj.terminationReason || 'Belirtilmemiş',
    terminationNotes: staj.terminationNotes || ''
  }
}

async function getSingleAssignedInternship(stajId: string) {
  const staj = await prisma.staj.findUnique({
    where: {
      id: stajId,
      status: 'ACTIVE'
    },
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: {
        include: {
          alan: true
        }
      }
    }
  })

  if (!staj) return null

  return {
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company?.name || 'Belirtilmemiş',
    companyContact: staj.company?.contact || 'Belirtilmemiş',
    companyAuthority: staj.company?.masterTeacherName || staj.company?.contact || 'Belirtilmemiş',
    companyPhone: staj.company?.phone || '',
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    teacherField: staj.teacher?.alan?.name || 'Belirtilmemiş',
    startDate: staj.startDate,
    endDate: staj.endDate,
    assignedAt: staj.createdAt
  }
}

async function getSingleCoordinatorChange(changeId: string) {
  const change = await prisma.teacherAssignmentHistory.findUnique({
    where: {
      id: changeId
    },
    include: {
      company: true,
      teacher: {
        include: {
          alan: true
        }
      },
      previousTeacher: {
        include: {
          alan: true
        }
      },
      assignedByUser: true
    }
  })

  if (!change) return null

  return {
    companyName: change.company?.name || 'Belirtilmemiş',
    companyContact: change.company?.contact || 'Belirtilmemiş',
    companyAuthority: change.company?.masterTeacherName || change.company?.contact || 'Belirtilmemiş',
    companyPhone: change.company?.phone || '',
    newTeacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : 'Atanmamış',
    newTeacherField: change.teacher?.alan?.name || 'Belirtilmemiş',
    previousTeacherName: change.previousTeacher ? `${change.previousTeacher.name} ${change.previousTeacher.surname}` : 'Atanmamış',
    previousTeacherField: change.previousTeacher?.alan?.name || 'Belirtilmemiş',
    assignedAt: change.assignedAt,
    assignedBy: change.assignedByUser?.email || 'Bilinmeyen',
    reason: change.reason || 'Belirtilmemiş',
    notes: change.notes || ''
  }
}

async function getSingleCompletedInternship(stajId: string) {
  const staj = await prisma.staj.findUnique({
    where: {
      id: stajId,
      status: 'COMPLETED'
    },
    include: {
      student: {
        include: {
          alan: true
        }
      },
      company: true,
      teacher: {
        include: {
          alan: true
        }
      }
    }
  })

  if (!staj) return null

  return {
    studentName: `${staj.student.name} ${staj.student.surname}`,
    studentNumber: staj.student.number || 'Belirtilmemiş',
    studentClass: staj.student.className,
    fieldName: staj.student.alan?.name || 'Belirtilmemiş',
    companyName: staj.company?.name || 'Belirtilmemiş',
    companyContact: staj.company?.contact || 'Belirtilmemiş',
    companyAuthority: staj.company?.masterTeacherName || staj.company?.contact || 'Belirtilmemiş',
    companyPhone: staj.company?.phone || '',
    teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'Atanmamış',
    teacherField: staj.teacher?.alan?.name || 'Belirtilmemiş',
    startDate: staj.startDate,
    endDate: staj.endDate,
    completedAt: staj.lastModifiedAt,
    completionNotes: staj.terminationNotes || ''
  }
}
