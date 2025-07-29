import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  // KRİTİK KVKK KORUMA: Toplu işletme oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} bulk creating companies with business data`, {
    timestamp: new Date().toISOString(),
    action: 'BULK_CREATE_COMPANY_DATA'
  })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    // Read file buffer
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    let data: any[]
    
    // Parse file based on type
    if (file.name.toLowerCase().endsWith('.csv')) {
      // Parse CSV
      const text = new TextDecoder().decode(uint8Array)
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        return NextResponse.json({ error: 'CSV dosyası en az 2 satır içermelidir (başlık + veri)' }, { status: 400 })
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })
    } else {
      // Parse Excel
      const workbook = XLSX.read(uint8Array, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      data = XLSX.utils.sheet_to_json(worksheet)
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Dosyada veri bulunamadı' }, { status: 400 })
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // +2 because of header and 0-based index

      try {
        // Validate required fields
        if (!row.name || !row.contact) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: İşletme adı ve yetkili kişi zorunludur`)
          continue
        }

        // Validate email format if provided
        if (row.email && row.email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(row.email.trim())) {
            results.failed++
            results.errors.push(`Satır ${rowNumber}: Geçersiz email formatı "${row.email}"`)
            continue
          }
        }

        // Validate phone format if provided
        if (row.phone && row.phone.trim()) {
          const cleanPhone = row.phone.trim().replace(/[\s\-\(\)]/g, '')
          const phoneRegex = /^(\+\d{1,3})?\d{10,14}$/
          if (!phoneRegex.test(cleanPhone)) {
            results.failed++
            results.errors.push(`Satır ${rowNumber}: Geçersiz telefon formatı "${row.phone}"`)
            continue
          }
        }

        // Validate PIN if provided
        const pin = row.pin?.toString().trim()
        if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: PIN 4 haneli rakam olmalıdır`)
          continue
        }

        // Validate tax number if provided
        if (row.taxNumber && row.taxNumber.trim()) {
          const taxNumber = row.taxNumber.toString().trim()
          if (taxNumber.length !== 10 || !/^\d{10}$/.test(taxNumber)) {
            results.failed++
            results.errors.push(`Satır ${rowNumber}: Vergi numarası 10 haneli rakam olmalıdır`)
            continue
          }

          // Check if tax number already exists
          const existingTaxNumber = await prisma.companyProfile.findFirst({
            where: { taxNumber: taxNumber }
          })

          if (existingTaxNumber) {
            results.failed++
            results.errors.push(`Satır ${rowNumber}: Vergi numarası "${taxNumber}" zaten kullanımda`)
            continue
          }
        }

        // Check if company name already exists
        const existingCompany = await prisma.companyProfile.findFirst({
          where: {
            name: row.name.trim()
          }
        })

        if (existingCompany) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: İşletme adı "${row.name}" zaten kullanımda`)
          continue
        }

        // Generate PIN if not provided
        const finalPin = pin || Math.floor(1000 + Math.random() * 9000).toString()

        // Create company
        await prisma.companyProfile.create({
          data: {
            name: row.name.trim(),
            contact: row.contact.trim(),
            phone: row.phone?.trim() || null,
            email: row.email?.trim() || null,
            address: row.address?.trim() || null,
            taxNumber: row.taxNumber?.toString().trim() || null,
            pin: finalPin,
            masterTeacherName: row.usta_ogretici_ad?.trim() || null,
            masterTeacherPhone: row.usta_ogretici_telefon?.trim() || null,
          }
        })

        results.successful++

      } catch (error: any) {
        results.failed++
        results.errors.push(`Satır ${rowNumber}: ${error.message}`)
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Bulk company creation error:', error)
    return NextResponse.json(
      { error: 'Toplu işletme ekleme sırasında hata oluştu' },
      { status: 500 }
    )
  }
}