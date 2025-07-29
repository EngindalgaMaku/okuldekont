import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

export async function POST(request: Request) {
  // KRİTİK KVKK KORUMA: Toplu öğrenci kişisel veri oluşturma - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // KVKK compliance logging - Bulk personal data creation
  console.log(`🔒 KVKV: Admin ${authResult.user?.email} creating bulk student personal data`, {
    timestamp: new Date().toISOString(),
    action: 'BULK_CREATE_STUDENT_DATA'
  })

  try {
    const { students, alanId } = await request.json()

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'Öğrenci listesi gereklidir' },
        { status: 400 }
      )
    }

    if (!alanId) {
      return NextResponse.json(
        { error: 'Alan ID gereklidir' },
        { status: 400 }
      )
    }

    // Validate each student
    const errors = []
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      if (!student.name?.trim()) {
        errors.push(`${i + 1}. satır: Ad gereklidir`)
      }
      if (!student.surname?.trim()) {
        errors.push(`${i + 1}. satır: Soyad gereklidir`)
      }
      if (!student.className?.trim()) {
        errors.push(`${i + 1}. satır: Sınıf gereklidir`)
      }
      if (!student.number?.trim()) {
        errors.push(`${i + 1}. satır: Okul numarası gereklidir`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Hatalı veriler: ${errors.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate numbers within the batch
    const numbers = students.map(s => s.number.trim()).filter(n => n)
    const duplicateNumbers = numbers.filter((num, index) => numbers.indexOf(num) !== index)
    if (duplicateNumbers.length > 0) {
      return NextResponse.json(
        { error: `Aynı okul numarası birden fazla kez kullanıldı: ${Array.from(new Set(duplicateNumbers)).join(', ')}` },
        { status: 400 }
      )
    }

    // Check for existing students with same numbers
    if (numbers.length > 0) {
      const existingStudents = await prisma.student.findMany({
        where: {
          alanId,
          number: {
            in: numbers
          }
        },
        select: {
          number: true,
          name: true,
          surname: true
        }
      })

      if (existingStudents.length > 0) {
        const existingNumbers = existingStudents.map(s => `${s.number} (${s.name} ${s.surname})`)
        return NextResponse.json(
          { error: `Bu okul numaraları zaten kayıtlı: ${existingNumbers.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Create students in bulk
    const createdStudents = await prisma.student.createMany({
      data: students.map(student => ({
        name: student.name.trim(),
        surname: student.surname.trim(),
        className: student.className.trim(),
        number: student.number?.trim() || null,
        alanId
      })),
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      count: createdStudents.count,
      message: `${createdStudents.count} öğrenci başarıyla eklendi`
    })

  } catch (error: any) {
    console.error('Bulk student creation error:', error)
    
    // Handle unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bazı okul numaraları zaten kayıtlı. Lütfen kontrol edin.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Öğrenciler oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}