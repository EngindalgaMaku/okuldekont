import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSystemUserId } from '@/lib/system-user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const { teacherId, reason, notes, assignedBy } = await request.json()
    
    // Always use system user ID to avoid foreign key constraint issues
    const currentUserId = await getSystemUserId()
    
    const result = await prisma.$transaction(async (prisma) => {
      // Get current company with teacher info
      const company = await prisma.companyProfile.findUnique({
        where: { id: companyId },
        include: { teacher: true }
      })

      if (!company) {
        throw new Error('İşletme bulunamadı')
      }

      const previousTeacherId = company.teacherId

      // Update company with new teacher
      const updatedCompany = await prisma.companyProfile.update({
        where: { id: companyId },
        data: {
          teacherId: teacherId || null
        },
        include: {
          teacher: {
            include: { alan: true }
          }
        }
      })


      // Find active internships for this company to update history
      const activeInternships = await prisma.staj.findMany({
        where: {
          companyId,
          status: 'ACTIVE'
        }
      })

      // Get teacher info for detailed history
      const teacherInfo = teacherId ? await prisma.teacherProfile.findUnique({
        where: { id: teacherId }
      }) : null;

      const previousTeacherInfo = previousTeacherId ? await prisma.teacherProfile.findUnique({
        where: { id: previousTeacherId }
      }) : null;

      // Determine action and reason based on context
      const historyAction = !previousTeacherId && teacherId
        ? 'ASSIGNED'
        : previousTeacherId && !teacherId
        ? 'UPDATED'
        : 'TEACHER_CHANGED'

      const teacherName = teacherInfo ? `${teacherInfo.name} ${teacherInfo.surname}` : 'Koordinatör';
      const previousTeacherName = previousTeacherInfo ? `${previousTeacherInfo.name} ${previousTeacherInfo.surname}` : 'Koordinatör';

      let actionReason;
      if (historyAction === 'ASSIGNED') {
        actionReason = `${teacherName} koordinatör olarak atandı`;
      } else if (historyAction === 'UPDATED') {
        actionReason = `${previousTeacherName} koordinatörlükten kaldırıldı`;
      } else {
        actionReason = `Koordinatör ${previousTeacherName}'den ${teacherName}'e değiştirildi`;
      }

      // Create internship history records for each active internship
      for (const internship of activeInternships) {
        await prisma.internshipHistory.create({
          data: {
            internshipId: internship.id,
            action: historyAction,
            previousData: {
              teacherId: previousTeacherId,
              teacherName: previousTeacherName
            },
            newData: {
              teacherId: teacherId || null,
              teacherName: teacherName
            },
            performedBy: currentUserId,
            reason: reason?.trim() || actionReason,
            notes: notes?.trim() || null
          }
        })
      }

      const responseActionType = !previousTeacherId && teacherId
        ? 'ATAMA'
        : previousTeacherId && !teacherId
        ? 'KALDIR'
        : 'DEĞİŞTİR'

      return { updatedCompany, actionType: responseActionType, affectedInternships: activeInternships.length }
    })

    return NextResponse.json({
      success: true,
      company: {
        id: result.updatedCompany.id,
        name: result.updatedCompany.name,
        teacherId: result.updatedCompany.teacherId,
        teacher: result.updatedCompany.teacher ? {
          id: result.updatedCompany.teacher.id,
          name: result.updatedCompany.teacher.name,
          surname: result.updatedCompany.teacher.surname,
          alanId: result.updatedCompany.teacher.alanId
        } : null
      },
      message: `Koordinatör ${result.actionType.toLowerCase()} işlemi başarıyla tamamlandı`,
      actionType: result.actionType,
      affectedInternships: result.affectedInternships
    })

  } catch (error) {
    console.error('Teacher assignment error:', error)
    return NextResponse.json({
      error: (error as Error).message || 'Koordinatör atama işlemi sırasında hata oluştu'
    }, { status: 500 })
  }
}

// Get available teachers for assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    
    // Get all active teachers
    const teachers = await prisma.teacherProfile.findMany({
      where: { active: true },
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { surname: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      teachers: teachers.map(teacher => ({
        id: teacher.id,
        name: teacher.name,
        surname: teacher.surname,
        alanId: teacher.alanId,
        alan: teacher.alan
      }))
    })

  } catch (error) {
    console.error('Teachers fetch error:', error)
    return NextResponse.json({ 
      error: 'Koordinatör listesi getirilemedi' 
    }, { status: 500 })
  }
}