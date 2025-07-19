import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface DataIntegrityIssue {
  type: string
  severity: 'high' | 'medium' | 'low'
  description: string
  affectedRecords: number
  fixable: boolean
}

export async function GET() {
  try {
    const foundIssues: DataIntegrityIssue[] = []

    // 1. Koordinatör referansları kontrolü
    const companiesWithTeachers = await prisma.company.findMany({
      where: {
        teacherId: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        teacherId: true
      }
    })

    let missingCoordinators = 0
    for (const company of companiesWithTeachers) {
      if (company.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: company.teacherId },
          select: { id: true }
        })
        if (!teacher) {
          missingCoordinators++
        }
      }
    }

    if (missingCoordinators > 0) {
      foundIssues.push({
        type: 'MISSING_COORDINATORS',
        severity: 'high',
        description: `${missingCoordinators} işletmede tanımlı koordinatör öğretmen tablosunda bulunamadı`,
        affectedRecords: missingCoordinators,
        fixable: true
      })
    }

    // 2. Staj-öğretmen referansları kontrolü
    const internshipsWithTeachers = await prisma.internship.findMany({
      where: {
        teacherId: {
          not: null
        },
        status: 'aktif'
      },
      select: {
        id: true,
        teacherId: true
      }
    })

    const teacherIds = Array.from(new Set(internshipsWithTeachers.map((i: any) => i.teacherId).filter(Boolean)))
    let missingTeachers = 0

    for (const teacherId of teacherIds) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId! },
        select: { id: true }
      })
      if (!teacher) {
        const affectedInternships = internshipsWithTeachers.filter((i: any) => i.teacherId === teacherId)
        missingTeachers += affectedInternships.length
      }
    }

    if (missingTeachers > 0) {
      foundIssues.push({
        type: 'MISSING_TEACHERS_IN_STAJ',
        severity: 'high',
        description: `${missingTeachers} staj kaydında tanımlı öğretmen bulunamadı`,
        affectedRecords: missingTeachers,
        fixable: true
      })
    }

    // 3. Orphaned öğrenciler kontrolü
    const internshipsWithStudents = await prisma.internship.findMany({
      where: {
        status: 'aktif'
      },
      select: {
        id: true,
        studentId: true
      }
    })

    let orphanedStudents = 0
    for (const internship of internshipsWithStudents) {
      if (internship.studentId) {
        const student = await prisma.student.findUnique({
          where: { id: internship.studentId },
          select: { id: true }
        })
        if (!student) {
          orphanedStudents++
        }
      }
    }

    if (orphanedStudents > 0) {
      foundIssues.push({
        type: 'ORPHANED_STUDENTS',
        severity: 'high',
        description: `${orphanedStudents} staj kaydında öğrenci bulunamadı`,
        affectedRecords: orphanedStudents,
        fixable: true
      })
    }

    return NextResponse.json({ 
      issues: foundIssues,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Veri bütünlüğü kontrolü hatası:', error)
    return NextResponse.json(
      { error: 'Veri bütünlüğü kontrolü sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}