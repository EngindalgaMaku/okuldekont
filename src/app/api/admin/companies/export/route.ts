import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const allFieldMappings: { [key: string]: string } = {
  name: 'İşletme Adı',
  contact: 'Yetkili Kişi',
  phone: 'Telefon',
  email: 'E-posta',
  address: 'Adres',
  taxNumber: 'Vergi Numarası',
  pin: 'PIN Kodu',
  teacher: 'Koordinatör Öğretmen',
  studentCount: 'Öğrenci Sayısı',
  masterTeacherName: 'Usta Öğretici',
  masterTeacherPhone: 'Usta Öğretici Telefon',
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
    
    if (filters?.active) {
      // Aktif stajı olan işletmeler (active internships)
      whereClause.stajlar = {
        some: {
          status: 'ACTIVE'
        }
      }
    }
    
    if (filters?.empty) {
      // Boş işletmeler (hiç aktif stajı olmayan)
      whereClause.stajlar = {
        none: {
          status: 'ACTIVE'
        }
      }
    }

    // Build orderBy based on sort
    const orderBy: any = {}
    if (sort === 'name_asc') {
      orderBy.name = 'asc'
    } else if (sort === 'name_desc') {
      orderBy.name = 'desc'
    } else if (sort === 'student_count_desc') {
      orderBy.stajlar = { _count: 'desc' }
    } else if (sort === 'student_count_asc') {
      orderBy.stajlar = { _count: 'asc' }
    } else {
      orderBy.name = 'asc' // Default sort
    }

    const companies = await prisma.companyProfile.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            name: true,
            surname: true,
          }
        },
        _count: {
          select: {
            students: true,
            stajlar: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
      orderBy,
    })

    let selectedFields: string[]
    if (fields === 'all') {
      selectedFields = Object.keys(allFieldMappings)
    } else if (fields === 'default') {
      selectedFields = ['name', 'contact', 'phone', 'teacher', 'studentCount']
    } else if (Array.isArray(fields)) {
      selectedFields = fields
    } else {
      return NextResponse.json({ error: 'Invalid fields parameter' }, { status: 400 })
    }

    const headers = selectedFields.map(fieldId => allFieldMappings[fieldId])
    
    const data = companies.map((company: any) => {
      const row: { [key: string]: any } = {}
      selectedFields.forEach(fieldId => {
        const header = allFieldMappings[fieldId]
        switch (fieldId) {
          case 'teacher':
            row[header] = company.teacher
              ? `${company.teacher.name} ${company.teacher.surname}`
              : 'Atanmamış'
            break
          case 'studentCount':
            row[header] = company._count.stajlar || 0
            break
          case 'name':
            row[header] = company.name || ''
            break
          case 'contact':
            row[header] = company.contact || ''
            break
          case 'phone':
            row[header] = company.phone || ''
            break
          case 'email':
            row[header] = company.email || ''
            break
          case 'address':
            row[header] = company.address || ''
            break
          case 'taxNumber':
            row[header] = company.taxNumber || ''
            break
          case 'pin':
            row[header] = company.pin || ''
            break
          case 'masterTeacherName':
            row[header] = company.masterTeacherName || ''
            break
          case 'masterTeacherPhone':
            row[header] = company.masterTeacherPhone || ''
            break
          default:
            row[header] = (company as any)[fieldId] || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'İşletmeler')

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="isletmeler.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}