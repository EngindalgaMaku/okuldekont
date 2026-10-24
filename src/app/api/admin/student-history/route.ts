import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporal enum types (until Prisma client is regenerated)
type StudentChangeType = 'PERSONAL_INFO_UPDATE' | 'CONTACT_INFO_UPDATE' | 'PARENT_INFO_UPDATE' | 'SCHOOL_INFO_UPDATE' | 'OTHER_UPDATE'

// GET: Fetch student history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const changeType = searchParams.get('changeType')
    const fieldName = searchParams.get('fieldName')
    const validAt = searchParams.get('validAt') // Belirli bir tarihte geçerli olan değerleri getir

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    const offset = (page - 1) * limit

    const where: any = {
      studentId,
      archived: false
    }

    if (changeType) {
      where.changeType = changeType as StudentChangeType
    }

    if (fieldName) {
      where.fieldName = fieldName
    }

    // Belirli bir tarihte geçerli olan değerleri filtrele
    if (validAt) {
      const dateFilter = new Date(validAt)
      where.validFrom = { lte: dateFilter }
      where.OR = [
        { validTo: null },
        { validTo: { gte: dateFilter } }
      ]
    }

    const [history, totalCount] = await Promise.all([
      (prisma as any).studentHistory.findMany({
        where,
        include: {
          student: {
            select: {
              name: true,
              surname: true,
              className: true,
              number: true
            }
          },
          changedByUser: {
            select: {
              id: true,
              email: true,
              adminProfile: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { validFrom: 'desc' },
        skip: offset,
        take: limit
      }),
      (prisma as any).studentHistory.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    })

  } catch (error) {
    console.error('Student history fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Öğrenci geçmiş kayıtları getirilirken hata oluştu'
    }, { status: 500 })
  }
}

// POST: Create student history record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      changeType,
      fieldName,
      previousValue,
      newValue,
      changedBy,
      reason,
      notes
    } = body

    if (!studentId || !changeType || !fieldName) {
      return NextResponse.json({
        error: 'Student ID, change type, and field name are required'
      }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 })
    }

    // Get any admin user for changedBy field
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: 'No admin user found'
      }, { status: 404 })
    }

    // Aynı alan için önceki kaydın validTo'sunu güncelle
    const previousRecord = await (prisma as any).studentHistory.findFirst({
      where: {
        studentId,
        fieldName,
        validTo: null
      },
      orderBy: { validFrom: 'desc' }
    })

    const now = new Date()

    // Transaction ile güvenli güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // Önceki kaydın validTo'sunu güncelle
      if (previousRecord) {
        await (tx as any).studentHistory.update({
          where: { id: previousRecord.id },
          data: { validTo: now }
        })
      }

      // Yeni kayıt oluştur
      const newRecord = await (tx as any).studentHistory.create({
        data: {
          studentId,
          changeType: changeType as StudentChangeType,
          fieldName,
          previousValue: previousValue ? JSON.stringify(previousValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          validFrom: now,
          changedBy: adminUser.id,
          reason,
          notes
        },
        include: {
          student: {
            select: {
              name: true,
              surname: true,
              className: true,
              number: true
            }
          },
          changedByUser: {
            select: {
              id: true,
              email: true,
              adminProfile: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      return newRecord
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Öğrenci geçmiş kaydı başarıyla oluşturuldu'
    })

  } catch (error) {
    console.error('Student history creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Öğrenci geçmiş kaydı oluşturulurken hata oluştu'
    }, { status: 500 })
  }
}