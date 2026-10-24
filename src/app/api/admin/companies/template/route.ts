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
      'name',
      'contact',
      'phone',
      'email',
      'address',
      'taxNumber',
      'pin',
      'usta_ogretici_ad',
      'usta_ogretici_telefon'
    ]
    
    const data = [
      {
        name: 'Örnek İnşaat A.Ş.',
        contact: 'Ahmet Yılmaz',
        phone: '05551234567',
        email: 'ahmet@ornekinsaat.com',
        address: 'Örnek Mah. Sanayi Cad. No:123, İstanbul',
        taxNumber: '1234567890',
        pin: '1234',
        usta_ogretici_ad: 'Mehmet Usta',
        usta_ogretici_telefon: '05559876543'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'İşletme Şablonu')

    // Set column widths
    const columnWidths = headers.map(() => ({ wch: 25 }));
    worksheet['!cols'] = columnWidths;

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="isletme_sablon.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Company Template export error:', error)
    return NextResponse.json({ error: 'Failed to export template' }, { status: 500 })
  }
}