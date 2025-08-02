import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const allFieldMappings: { [key: string]: string } = {
  name: 'Ad',
  surname: 'Soyad',
  number: 'Okul Numarası',
  className: 'Sınıf',
  tcNo: 'TC Kimlik No',
  phone: 'Telefon',
  email: 'E-posta',
  parentName: 'Veli Adı',
  parentPhone: 'Veli Telefon',
  alan: 'Alan',
  company: 'İşletme',
  teacher: 'Koordinatör Öğretmen',
  status: 'Staj Durumu',
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fields, sort, filters } = await req.json()

    // Build query based on filters
    const whereClause: any = {}
    
    if (filters?.alan && filters.alan !== 'all') {
      whereClause.alanId = filters.alan
    }
    
    if (filters?.sinif && filters.sinif !== 'all') {
      whereClause.className = filters.sinif
    }
    
    if (filters?.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          whereClause.stajlar = {
            some: {
              status: 'ACTIVE'
            }
          }
          break
        case 'unassigned':
          whereClause.stajlar = {
            none: {
              status: 'ACTIVE'
            }
          }
          break
        case 'terminated':
          whereClause.stajlar = {
            some: {
              status: 'TERMINATED'
            }
          }
          break
        case 'completed':
          whereClause.stajlar = {
            some: {
              status: 'COMPLETED'
            }
          }
          break
      }
    }

    // Build orderBy based on sort
    const orderBy: any = {}
    if (sort === 'name_asc') {
      orderBy.name = 'asc'
    } else if (sort === 'name_desc') {
      orderBy.name = 'desc'
    } else if (sort === 'number_asc') {
      orderBy.number = 'asc'
    } else if (sort === 'number_desc') {
      orderBy.number = 'desc'
    } else if (sort === 'class_asc') {
      orderBy.className = 'asc'
    } else if (sort === 'class_desc') {
      orderBy.className = 'desc'
    } else {
      orderBy.name = 'asc' // Default sort
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        alan: {
          select: {
            name: true
          }
        },
        stajlar: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            company: {
              select: {
                name: true,
                teacher: {
                  select: {
                    name: true,
                    surname: true
                  }
                }
              }
            }
          },
          take: 1
        }
      },
      orderBy,
    })

    let selectedFields: string[]
    if (fields === 'all') {
      selectedFields = Object.keys(allFieldMappings)
    } else if (fields === 'default') {
      selectedFields = ['name', 'surname', 'number', 'className', 'alan', 'company', 'teacher']
    } else if (Array.isArray(fields)) {
      selectedFields = fields
    } else {
      return NextResponse.json({ error: 'Invalid fields parameter' }, { status: 400 })
    }

    const headers = selectedFields.map(fieldId => allFieldMappings[fieldId])
    
    const data = students.map((student: any) => {
      const row: { [key: string]: any } = {}
      const activeStaj = student.stajlar[0] // First active internship
      
      selectedFields.forEach(fieldId => {
        const header = allFieldMappings[fieldId]
        switch (fieldId) {
          case 'alan':
            row[header] = student.alan?.name || 'Belirtilmemiş'
            break
          case 'company':
            row[header] = activeStaj?.company?.name || 'Atanmamış'
            break
          case 'teacher':
            row[header] = activeStaj?.company?.teacher
              ? `${activeStaj.company.teacher.name} ${activeStaj.company.teacher.surname}`
              : 'Atanmamış'
            break
          case 'status':
            if (activeStaj) {
              row[header] = 'Aktif Stajda'
            } else {
              // Check if there are any terminated internships
              const hasTerminated = student.stajlar.some((s: any) => s.status === 'TERMINATED')
              const hasCompleted = student.stajlar.some((s: any) => s.status === 'COMPLETED')
              
              if (hasCompleted) {
                row[header] = 'Tamamlanmış'
              } else if (hasTerminated) {
                row[header] = 'Fesih Edilmiş'
              } else {
                row[header] = 'Atanmamış'
              }
            }
            break
          case 'name':
            row[header] = student.name || ''
            break
          case 'surname':
            row[header] = student.surname || ''
            break
          case 'number':
            row[header] = student.number || ''
            break
          case 'className':
            row[header] = student.className || ''
            break
          case 'tcNo':
            row[header] = student.tcNo || ''
            break
          case 'phone':
            row[header] = student.phone || ''
            break
          case 'email':
            row[header] = student.email || ''
            break
          case 'parentName':
            row[header] = student.parentName || ''
            break
          case 'parentPhone':
            row[header] = student.parentPhone || ''
            break
          default:
            row[header] = (student as any)[fieldId] || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Öğrenciler')

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="ogrenciler.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}