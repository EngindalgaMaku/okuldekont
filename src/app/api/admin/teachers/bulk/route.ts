import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  // KRİTİK KVKV KORUMA: Toplu öğretmen oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: Admin ${authResult.user?.email} bulk creating teachers with personal data`, {
    timestamp: new Date().toISOString(),
    action: 'BULK_CREATE_TEACHER_DATA'
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

    // Get all areas and existing teachers for mapping and validation
    const [alanlar, existingTeachers] = await Promise.all([
      prisma.alan.findMany({ select: { id: true, name: true } }),
      prisma.teacherProfile.findMany({ select: { name: true, surname: true, tcNo: true } })
    ])
    const existingTeacherNames = new Set(
      existingTeachers.map(t => `${t.name.toLowerCase()} ${t.surname.toLowerCase()}`)
    )
    const existingTcs = new Set(existingTeachers.map(t => t.tcNo).filter(Boolean))

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
        const ad = row.ad?.trim()
        const soyad = row.soyad?.trim()

        // Validate required fields
        if (!ad || !soyad) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: Ad ve soyad zorunludur`)
          continue
        }

        // Check for duplicate name and surname
        const fullName = `${ad.toLowerCase()} ${soyad.toLowerCase()}`
        if (existingTeacherNames.has(fullName)) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: "${ad} ${soyad}" adında bir öğretmen zaten mevcut.`)
          continue
        }

        // Find alan by name if provided
        let alanId = null
        if (row.alan) {
          const alan = alanlar.find(a => a.name.toLowerCase() === row.alan.toLowerCase())
          if (alan) {
            alanId = alan.id
          } else {
            results.failed++
            results.errors.push(`Satır ${rowNumber}: Alan "${row.alan}" bulunamadı`)
            continue
          }
        }

        // Validate position
        const validPositions = ['alan_sefi', 'atolye_sefi', '']
        const position = row.position || ''
        if (position && !validPositions.includes(position)) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: Geçersiz görev "${position}". Geçerli değerler: alan_sefi, atolye_sefi veya boş`)
          continue
        }

        // Set default PIN if not provided
        const pin = row.pin || '1234'
        if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: PIN 4 haneli rakam olmalıdır`)
          continue
        }

        // Validate TC No if provided
        const tcNo = row.tcNo?.trim()
        if (tcNo && (tcNo.length !== 11 || !/^\d{11}$/.test(tcNo))) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: TC Kimlik No 11 haneli rakam olmalıdır`)
          continue
        }
        
        if (tcNo && existingTcs.has(tcNo)) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: TC Kimlik No "${tcNo}" zaten kullanımda`)
          continue
        }

        // Create user first
        const userEmail = row.email?.trim() || `${ad.toLowerCase()}.${soyad.toLowerCase()}@okul.local`
        
        // Check if user email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userEmail }
        })

        if (existingUser) {
          results.failed++
          results.errors.push(`Satır ${rowNumber}: Email "${userEmail}" zaten kullanımda`)
          continue
        }

        const user = await prisma.user.create({
          data: {
            email: userEmail,
            password: 'temp123', // Temporary password
            role: 'TEACHER'
          }
        })

        // Create teacher profile
        await prisma.teacherProfile.create({
          data: {
            name: ad,
            surname: soyad,
            tcNo: tcNo || null,
            phone: row.telefon?.trim() || null,
            email: row.email?.trim() || null,
            pin: String(pin),
            alanId: alanId,
            position: position || null,
            userId: user.id
          }
        })

        results.successful++
        // Add to sets to prevent duplicates within the same file
        existingTeacherNames.add(fullName)
        if (tcNo) existingTcs.add(tcNo)

      } catch (error: any) {
        results.failed++
        // Prisma validation errors are more specific
        if (error.code === 'P2002') {
            const target = error.meta?.target || ['Bilinmeyen alan']
            results.errors.push(`Satır ${rowNumber}: Benzersizlik ihlali - ${target.join(', ')} zaten mevcut.`)
        } else {
            results.errors.push(`Satır ${rowNumber}: Beklenmedik bir hata oluştu - ${error.message}`)
        }
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Bulk teacher creation error:', error)
    return NextResponse.json(
      { error: 'Toplu öğretmen ekleme sırasında hata oluştu' },
      { status: 500 }
    )
  }
}