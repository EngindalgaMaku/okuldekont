import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const allFieldMappings: { [key: string]: string } = {
  name: 'Ad',
  surname: 'Soyad',
  tcNo: 'TC Kimlik No',
  phone: 'Telefon',
  email: 'E-posta',
  pin: 'PIN',
  alan: 'Alan',
  position: 'Görevi',
  active: 'Aktif Durumu',
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
      whereClause.active = true
    }

    // Build orderBy based on sort
    const orderBy: any = {}
    if (sort === 'name_asc') {
      orderBy.name = 'asc'
    } else if (sort === 'field_asc') {
      orderBy.alan = { name: 'asc' }
    } else {
      orderBy.name = 'asc' // Default sort
    }

    const teachers = await prisma.teacherProfile.findMany({
      where: whereClause,
      include: {
        alan: true,
      },
      orderBy,
    })

    let selectedFields: string[]
    if (fields === 'all') {
      selectedFields = Object.keys(allFieldMappings)
    } else if (fields === 'default') {
      selectedFields = ['name', 'surname', 'alan', 'phone']
    } else if (Array.isArray(fields)) {
      selectedFields = fields
    } else {
      return NextResponse.json({ error: 'Invalid fields parameter' }, { status: 400 })
    }

    const headers = selectedFields.map(fieldId => allFieldMappings[fieldId])
    
    const data = teachers.map((teacher) => {
      const row: { [key: string]: any } = {}
      selectedFields.forEach(fieldId => {
        const header = allFieldMappings[fieldId]
        switch (fieldId) {
          case 'alan':
            row[header] = teacher.alan?.name || 'N/A'
            break
          case 'active':
            row[header] = teacher.active ? 'Aktif' : 'Pasif'
            break
          default:
            row[header] = (teacher as any)[fieldId] || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Öğretmenler')

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="ogretmenler.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}