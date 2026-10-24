import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAuthAndRole } from '@/middleware/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        },
        enrollments: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            enrollmentDate: 'desc'
          },
          take: 1,
          include: {
            educationYear: {
              select: {
                id: true,
                year: true,
                active: true
              }
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const currentEnrollment = student.enrollments[0]

    return NextResponse.json({
      id: student.id,
      name: student.name,
      surname: student.surname,
      number: student.number,
      className: student.className,
      tcNo: student.tcNo,
      phone: student.phone,
      email: student.email,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      alanId: student.alanId,
      alan: student.alan,
      currentEnrollment: currentEnrollment ? {
        id: currentEnrollment.id,
        grade: currentEnrollment.grade,
        gradeType: currentEnrollment.gradeType,
        enrollmentStatus: currentEnrollment.status,
        enrollmentDate: currentEnrollment.enrollmentDate,
        educationYear: currentEnrollment.educationYear
      } : null
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params
    const {
      name,
      surname,
      className,
      number,
      tcNo,
      phone,
      email,
      parentName,
      parentPhone,
      alanId
    } = await request.json()

    if (!name || !surname || !className) {
      return NextResponse.json(
        { error: 'Name, surname, and className are required' },
        { status: 400 }
      )
    }

    // Get current student data to check for changes
    const currentStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            enrollmentDate: 'desc'
          },
          take: 1
        }
      }
    })

    if (!currentStudent) {
      return NextResponse.json(
        { error: 'Öğrenci bulunamadı' },
        { status: 404 }
      )
    }

    // Get current active education year
    const activeEducationYear = await prisma.egitimYili.findFirst({
      where: { active: true }
    })

    if (!activeEducationYear) {
      return NextResponse.json(
        { error: 'Aktif eğitim yılı bulunamadı' },
        { status: 400 }
      )
    }

    // Determine grade type based on className
    let gradeType: 'NORMAL' | 'MESEM' = 'NORMAL'
    if (className.includes('MESEM') || className.toLowerCase().includes('mesem')) {
      gradeType = 'MESEM'
    }

    // Extract grade number from className (e.g., "12F" -> "12", "MESEM 10A" -> "10")
    const gradeMatch = className.match(/(\d+)/)
    const gradeNumber = gradeMatch ? gradeMatch[1] : className

    const now = new Date()
    const currentEnrollment = currentStudent.enrollments[0]

    // Start transaction to update student and create enrollment history
    const result = await prisma.$transaction(async (tx) => {
      // Update student basic info
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          name: name.trim(),
          surname: surname.trim(),
          className: className.trim(),
          number: number?.trim() || null,
          tcNo: tcNo?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          parentName: parentName?.trim() || null,
          parentPhone: parentPhone?.trim() || null,
          alanId: alanId || currentStudent.alanId
        }
      })

      // Check if grade or enrollment info changed
      const enrollmentChanged =
        !currentEnrollment ||
        currentEnrollment.grade !== parseInt(gradeNumber) ||
        currentEnrollment.gradeType !== gradeType ||
        currentEnrollment.educationYearId !== activeEducationYear.id

      if (enrollmentChanged) {
        // Update current enrollment to PROMOTED if exists
        if (currentEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: currentEnrollment.id },
            data: {
              status: 'PROMOTED',
              promotionDate: now
            }
          })
        }

        // Create new enrollment record
        await tx.studentEnrollment.create({
          data: {
            studentId: id,
            educationYearId: activeEducationYear.id,
            className: className.trim(),
            grade: parseInt(gradeNumber),
            gradeType: gradeType,
            enrollmentDate: now,
            status: 'ACTIVE'
          }
        })
      }

      return updatedStudent
    })

    return NextResponse.json({
      id: result.id,
      ad: result.name,
      soyad: result.surname,
      no: result.number || '',
      sinif: result.className,
      alanId: result.alanId,
      tcNo: result.tcNo,
      phone: result.phone,
      email: result.email,
      parentName: result.parentName,
      parentPhone: result.parentPhone
    })
  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json(
      { error: 'Öğrenci güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
}