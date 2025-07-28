import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    // Filtreleme parametreleri
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const fieldId = searchParams.get('fieldId')
    const studentName = searchParams.get('studentName')
    const companyName = searchParams.get('companyName')

    let operations: any[] = []
    let total = 0

    if (type === 'staj-fesih') {
      // Fesih edilen stajlar için where koşulları
      const where: any = {
        status: 'TERMINATED'
      }
      
      // Filtreleme koşulları
      if (startDate || endDate) {
        where.terminationDate = {}
        if (startDate) where.terminationDate.gte = new Date(startDate)
        if (endDate) where.terminationDate.lte = new Date(endDate)
      }
      
      if (fieldId) {
        where.student = { alanId: fieldId }
      }
      
      if (studentName) {
        where.student = {
          ...where.student,
          OR: [
            { name: { contains: studentName } },
            { surname: { contains: studentName } }
          ]
        }
      }
      
      if (companyName) {
        where.company = {
          name: { contains: companyName }
        }
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
        orderBy: {
          terminationDate: 'desc'
        },
        skip,
        take: limit
      })

      total = await prisma.staj.count({ where })

      operations = stajlar.map(staj => ({
        id: staj.id,
        type: 'staj-fesih',
        title: `${staj.student.name} ${staj.student.surname} - Staj Feshi`,
        studentName: `${staj.student.name} ${staj.student.surname}`,
        companyName: staj.company?.name || '',
        teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : '',
        fieldName: staj.student.alan?.name || '',
        className: staj.student.className || '',
        date: staj.terminationDate,
        startDate: staj.startDate,
        endDate: staj.endDate,
        terminationDate: staj.terminationDate,
        terminationReason: staj.terminationReason,
        terminationNotes: staj.terminationNotes
      }))
    } else if (type === 'staj-atama') {
      // Staj atamaları için where koşulları
      const where: any = {
        status: 'ACTIVE'
      }
      
      // Filtreleme koşulları
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }
      
      if (fieldId) {
        where.student = { alanId: fieldId }
      }
      
      if (studentName) {
        where.student = {
          ...where.student,
          OR: [
            { name: { contains: studentName } },
            { surname: { contains: studentName } }
          ]
        }
      }
      
      if (companyName) {
        where.company = {
          name: { contains: companyName }
        }
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
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      })

      total = await prisma.staj.count({ where })

      operations = stajlar.map(staj => ({
        id: staj.id,
        type: 'staj-atama',
        title: `${staj.student.name} ${staj.student.surname} - Staj Ataması`,
        studentName: `${staj.student.name} ${staj.student.surname}`,
        companyName: staj.company?.name || '',
        teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : '',
        fieldName: staj.student.alan?.name || '',
        className: staj.student.className || '',
        date: staj.createdAt,
        startDate: staj.startDate,
        endDate: staj.endDate
      }))
    } else if (type === 'koordinator-degisiklik') {
      // Koordinatör değişiklikleri
      const changes = await prisma.teacherAssignmentHistory.findMany({
        include: {
          company: true,
          teacher: true,
          previousTeacher: true,
          assignedByUser: true
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limit
      })

      total = await prisma.teacherAssignmentHistory.count()

      operations = changes.map(change => ({
        id: change.id,
        type: 'koordinator-degisiklik',
        title: `${change.company.name} - Koordinatör Değişikliği`,
        companyName: change.company?.name || '',
        teacherName: change.teacher ? `${change.teacher.name} ${change.teacher.surname}` : '',
        previousTeacherName: change.previousTeacher ? `${change.previousTeacher.name} ${change.previousTeacher.surname}` : '',
        fieldName: change.teacher?.alanId || '',
        date: change.assignedAt,
        assignedBy: change.assignedByUser?.email || 'Bilinmeyen',
        reason: change.reason || 'Belirtilmemiş'
      }))
    } else if (type === 'staj-tamamlama') {
      // Tamamlanmış stajlar için where koşulları
      const where: any = {
        status: 'COMPLETED'
      }
      
      // Filtreleme koşulları
      if (startDate || endDate) {
        where.lastModifiedAt = {}
        if (startDate) where.lastModifiedAt.gte = new Date(startDate)
        if (endDate) where.lastModifiedAt.lte = new Date(endDate)
      }
      
      if (fieldId) {
        where.student = { alanId: fieldId }
      }
      
      if (studentName) {
        where.student = {
          ...where.student,
          OR: [
            { name: { contains: studentName } },
            { surname: { contains: studentName } }
          ]
        }
      }
      
      if (companyName) {
        where.company = {
          name: { contains: companyName }
        }
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
          teacher: {
            include: {
              alan: true
            }
          }
        },
        orderBy: {
          lastModifiedAt: 'desc'
        },
        skip,
        take: limit
      })

      total = await prisma.staj.count({ where })

      operations = stajlar.map(staj => ({
        id: staj.id,
        type: 'staj-tamamlama',
        title: `${staj.student.name} ${staj.student.surname} - Staj Tamamlama`,
        studentName: `${staj.student.name} ${staj.student.surname}`,
        companyName: staj.company?.name || '',
        teacherName: staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : '',
        fieldName: staj.student.alan?.name || '',
        className: staj.student.className || '',
        date: staj.lastModifiedAt || staj.endDate,
        startDate: staj.startDate,
        endDate: staj.endDate,
        completedAt: staj.lastModifiedAt,
        completionNotes: staj.terminationNotes || ''
      }))
    }

    return NextResponse.json({
      operations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('İşlemler listesi hatası:', error)
    return NextResponse.json(
      { error: 'İşlemler listesi yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}