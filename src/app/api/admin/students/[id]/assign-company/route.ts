import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditInternshipCreation, auditInternshipAssignment } from '@/lib/audit-trail'
import { getActiveEducationYearId } from '@/lib/education-year'
import { getSystemUserId } from '@/lib/system-user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const { companyId, teacherId, startDate, endDate } = await request.json()

    if (!studentId || !companyId) {
      return NextResponse.json(
        { error: 'Student ID and Company ID are required' },
        { status: 400 }
      )
    }

    // Get real system user ID
    const currentUserId = await getSystemUserId()

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Update student's company assignment
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: { companyId },
        include: {
          company: {
            include: {
              teacher: true
            }
          },
          alan: true
        }
      })

      // 2. Always create internship record when student is assigned to company
      // Check if there's already an active internship for this student-company combination
      const existingStaj = await prisma.staj.findFirst({
        where: {
          studentId,
          status: 'ACTIVE',
          terminationDate: null
        }
      })

      if (!existingStaj) {
        // Get active education year - will throw error if none exists
        const educationYearId = await getActiveEducationYearId()
        
        // Use provided dates or default values
        const internshipStartDate = startDate ? new Date(startDate) : new Date()
        const internshipEndDate = endDate 
          ? new Date(endDate) 
          : new Date(internshipStartDate.getTime() + (150 * 24 * 60 * 60 * 1000)) // 150 days later
        
        // Use provided teacherId or company's assigned teacher
        const finalTeacherId = teacherId || updatedStudent.company?.teacherId || null
        
        // Create internship record
        const createdInternship = await prisma.staj.create({
          data: {
            studentId,
            companyId,
            teacherId: finalTeacherId,
            educationYearId,
            startDate: internshipStartDate,
            endDate: internshipEndDate,
            status: 'ACTIVE',
            lastModifiedBy: currentUserId,
            lastModifiedAt: new Date()
          }
        })

        // Get teacher info for detailed history
        const teacherInfo = finalTeacherId ? await prisma.teacherProfile.findUnique({
          where: { id: finalTeacherId }
        }) : null;

        // Get company info for detailed history
        const companyInfo = await prisma.companyProfile.findUnique({
          where: { id: companyId }
        });

        // Create internship history record for assignment with detailed info
        const startDateFormatted = internshipStartDate.toLocaleDateString('tr-TR');
        const teacherName = teacherInfo ? `${teacherInfo.name} ${teacherInfo.surname}` : 'Atanmamış';
        const companyName = companyInfo?.name || 'Bilinmeyen İşletme';
        
        await prisma.internshipHistory.create({
          data: {
            internshipId: createdInternship.id,
            action: 'CREATED',
            newData: {
              studentId,
              companyId,
              teacherId: finalTeacherId,
              educationYearId,
              startDate: internshipStartDate,
              endDate: internshipEndDate,
              status: 'ACTIVE'
            },
            performedBy: currentUserId,
            reason: `${companyName} işletmesinde staj başlatıldı`,
            notes: `Başlangıç Tarihi: ${startDateFormatted} | Koordinatör: ${teacherName}`
          }
        })
      }

      return updatedStudent
    })

    return NextResponse.json({
      success: true,
      message: 'Öğrenci başarıyla işletmeye atandı',
      student: {
        id: result.id,
        name: result.name,
        surname: result.surname,
        className: result.className,
        company: result.company ? {
          id: result.company.id,
          name: result.company.name,
          contact: result.company.contact,
          teacher: result.company.teacher ? {
            id: result.company.teacher.id,
            name: result.company.teacher.name,
            surname: result.company.teacher.surname
          } : null
        } : null
      }
    })
  } catch (error) {
    console.error('Student company assignment error:', error)
    return NextResponse.json(
      { error: 'Öğrenci işletmeye atanırken hata oluştu' },
      { status: 500 }
    )
  }
}

// Remove student from company (Terminate internship)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const body = await request.json().catch(() => ({}))
    const { reason, notes, terminationDate } = body

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Fesih nedeni zorunludur' },
        { status: 400 }
      )
    }

    // Get real system user ID
    const currentUserId = await getSystemUserId()

    // Start transaction to ensure data consistency with extended timeout
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Get student with company information
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          company: true
        }
      })

      if (!student) {
        throw new Error('Öğrenci bulunamadı')
      }

      if (!student.companyId || !student.company) {
        throw new Error('Bu öğrenci herhangi bir işletmeye atanmamış')
      }

      // 2. Get active internships for this student (if any exist)
      const activeInternships = await prisma.staj.findMany({
        where: {
          studentId,
          status: 'ACTIVE',
          terminationDate: null
        },
        include: {
          student: true,
          company: true,
          teacher: true
        }
      })

      let terminatedInternshipsCount = 0

      // 3. Terminate active internships with reason and notes (if they exist)
      if (activeInternships.length > 0) {
        // Use provided termination date or current date
        const finalTerminationDate = terminationDate ? new Date(terminationDate) : new Date();
        
        // Batch update all internships
        const internshipIds = activeInternships.map(i => i.id)
        await prisma.staj.updateMany({
          where: { id: { in: internshipIds } },
          data: {
            status: 'TERMINATED',
            terminationDate: finalTerminationDate,
            terminationReason: reason.trim(),
            terminationNotes: notes?.trim() || null,
            terminatedBy: currentUserId
          }
        })

        // Create history records in batch
        const historyRecords = activeInternships.map(internship => {
          const terminationDateFormatted = finalTerminationDate.toLocaleDateString('tr-TR');
          const teacherName = internship.teacher ? `${internship.teacher.name} ${internship.teacher.surname}` : 'Atanmamış';
          
          return {
            internshipId: internship.id,
            action: 'TERMINATED' as const,
            previousData: {
              status: internship.status,
              terminationDate: internship.terminationDate,
              terminationReason: internship.terminationReason
            },
            newData: {
              status: 'TERMINATED',
              terminationDate: finalTerminationDate,
              terminationReason: reason.trim(),
              terminationNotes: notes?.trim() || null
            },
            performedBy: currentUserId,
            reason: `${internship.company.name} işletmesinde staj fesih edildi`,
            notes: `Fesih Tarihi: ${terminationDateFormatted} | Koordinatör: ${teacherName} | Neden: ${reason.trim()}`
          }
        })

        await prisma.internshipHistory.createMany({
          data: historyRecords
        })

        terminatedInternshipsCount = activeInternships.length
      }

      // 4. Remove company assignment from student (regardless of internship records)
      await prisma.student.update({
        where: { id: studentId },
        data: { companyId: null }
      })

      // 5. Check if company has any remaining active internships after termination
      if (activeInternships.length > 0) {
        const companyId = student.companyId;
        const remainingActiveInternships = await prisma.staj.count({
          where: {
            companyId: companyId,
            status: 'ACTIVE'
          }
        });

        // If no active internships remain, remove teacher assignment from company
        if (remainingActiveInternships === 0) {
          await prisma.companyProfile.update({
            where: { id: companyId },
            data: {
              teacherId: null,
              teacherAssignedAt: null
            }
          });
        }
      }

      return {
        student,
        terminatedInternships: activeInternships,
        terminatedCount: terminatedInternshipsCount,
        companyName: student.company.name
      }
    }, {
      timeout: 15000 // 15 saniye timeout
    })

    return NextResponse.json({
      success: true,
      message: result.terminatedCount > 0
        ? `${result.companyName} işletmesinden çıkarıldı ve ${result.terminatedCount} staj kaydı fesih edildi`
        : `${result.companyName} işletmesinden çıkarıldı (staj kaydı bulunamadı)`,
      terminatedInternships: result.terminatedCount,
      companyName: result.companyName
    })
  } catch (error) {
    console.error('Student internship termination error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Staj fesih edilirken hata oluştu' },
      { status: 500 }
    )
  }
}