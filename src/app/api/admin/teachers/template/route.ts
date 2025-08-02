import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const headers = [
      'ad',
      'soyad',
      'tcNo',
      'telefon',
      'email',
      'pin',
      'alan',
      'position'
    ]
    
    const data = [
      {
        ad: 'Ahmet',
        soyad: 'Yılmaz',
        tcNo: '12345678901',
        telefon: '05551234567',
        email: 'ahmet@example.com',
        pin: '1234',
        alan: 'Bilişim Teknolojileri',
        position: 'alan_sefi'
      },
      {
        ad: 'Fatma',
        soyad: 'Öztürk',
        tcNo: '',
        telefon: '05559876543',
        email: 'fatma@example.com',
        pin: '1234',
        alan: 'Elektrik-Elektronik Teknolojisi',
        position: 'atolye_sefi'
      },
      {
        ad: 'Mehmet',
        soyad: 'Kaya',
        tcNo: '98765432101',
        telefon: '05555555555',
        email: '',
        pin: '1234',
        alan: 'Makine ve Tasarım Teknolojisi',
        position: ''
      }
    ];


    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Öğretmen Şablonu')

    // Set column widths
    const columnWidths = headers.map(() => ({ wch: 20 }));
    worksheet['!cols'] = columnWidths;

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="ogretmen_sablon.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Template export error:', error)
    return NextResponse.json({ error: 'Failed to export template' }, { status: 500 })
  }
}