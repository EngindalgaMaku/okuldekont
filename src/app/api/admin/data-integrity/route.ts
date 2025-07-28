import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface IntegrityIssue {
  type: 'duplicate_student' | 'invalid_field_assignment' | 'missing_class'
  severity: 'low' | 'medium' | 'high' | 'critical'
  entity: string
  entityId: string
  description: string
  autoFixable: boolean
}

export async function GET() {
  try {
    const issues: IntegrityIssue[] = []

    // 1. Invalid Field Assignments - Öğretmenler var olmayan alanlara atanmış
    const teachersWithInvalidFields = await prisma.teacherProfile.findMany({
      where: {
        alanId: {
          not: null
        }
      },
      include: {
        alan: true
      }
    })

    for (const teacher of teachersWithInvalidFields) {
      if (teacher.alanId && !teacher.alan) {
        issues.push({
          type: 'invalid_field_assignment',
          severity: 'medium',
          entity: 'teacher',
          entityId: teacher.id,
          description: `Öğretmen "${teacher.name} ${teacher.surname}" var olmayan alan ID'sine (${teacher.alanId}) atanmış`,
          autoFixable: true
        })
      }
    }

    // 2. Duplicate Students - Aynı TC numarasına sahip öğrenciler (sadece dolu TC'ler için)
    const duplicateStudents = await prisma.student.groupBy({
      by: ['tcNo'],
      where: {
        tcNo: {
          not: null
        }
      },
      having: {
        tcNo: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        tcNo: true
      }
    })

    for (const duplicate of duplicateStudents) {
      if (duplicate.tcNo) {
        const students = await prisma.student.findMany({
          where: {
            tcNo: duplicate.tcNo
          }
        })

        issues.push({
          type: 'duplicate_student',
          severity: 'critical',
          entity: 'student',
          entityId: students.map(s => s.id).join(','),
          description: `TC numarası "${duplicate.tcNo}" ile ${duplicate._count.tcNo} öğrenci kaydı bulundu: ${students.map(s => `${s.name} ${s.surname}`).join(', ')}`,
          autoFixable: false
        })
      }
    }

    // 3. Missing Classes - Öğrenciler var olmayan sınıflara atanmış
    const studentsWithInvalidClasses = await prisma.student.findMany({
      where: {
        classId: {
          not: null
        }
      },
      include: {
        class: true
      }
    })

    for (const student of studentsWithInvalidClasses) {
      if (student.classId && !student.class) {
        issues.push({
          type: 'missing_class',
          severity: 'high',
          entity: 'student',
          entityId: student.id,
          description: `Öğrenci "${student.name} ${student.surname}" var olmayan sınıf ID'sine (${student.classId}) atanmış`,
          autoFixable: true
        })
      }
    }

    // İstatistikler
    const stats = {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
      autoFixableIssues: issues.filter(i => i.autoFixable).length
    }

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      stats,
      issues: issues.slice(0, 100), // İlk 100 sorunu göster
      message: `${issues.length} veri tutarsızlığı tespit edildi`
    })

  } catch (error) {
    console.error('Data integrity check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Veri bütünlüğü kontrolü sırasında hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}

// Otomatik düzeltme endpoint'i
export async function POST() {
  try {
    const fixedIssues: string[] = []

    // 1. Invalid field assignments düzeltme - öğretmenlerin alanId'sini null yap
    const invalidFieldAssignments = await prisma.teacherProfile.findMany({
      where: {
        alanId: {
          not: null
        },
        alan: null
      }
    })

    for (const teacher of invalidFieldAssignments) {
      await prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: { alanId: null }
      })
      fixedIssues.push(`Öğretmen "${teacher.name} ${teacher.surname}" geçersiz alan ataması kaldırıldı`)
    }

    // 2. Missing class assignments düzeltme - öğrencilerin classId'sini null yap
    const invalidClassAssignments = await prisma.student.findMany({
      where: {
        classId: {
          not: null
        },
        class: null
      }
    })

    for (const student of invalidClassAssignments) {
      await prisma.student.update({
        where: { id: student.id },
        data: { classId: null }
      })
      fixedIssues.push(`Öğrenci "${student.name} ${student.surname}" geçersiz sınıf ataması kaldırıldı`)
    }

    return NextResponse.json({
      success: true,
      fixedAt: new Date().toISOString(),
      fixedCount: fixedIssues.length,
      fixedIssues,
      message: `${fixedIssues.length} sorun otomatik olarak düzeltildi`
    })

  } catch (error) {
    console.error('Data integrity auto-fix error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Otomatik düzeltme sırasında hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}