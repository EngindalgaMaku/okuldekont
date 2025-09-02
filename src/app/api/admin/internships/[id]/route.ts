import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditTrailEntry, auditActions } from '@/lib/audit-trail';
import { getSystemUserId } from '@/lib/system-user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const internship = await prisma.staj.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            alan: true
          }
        },
        company: true,
        teacher: true,
        educationYear: true
      }
    });

    if (!internship) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      internship
    });

  } catch (error) {
    console.error('Get internship error:', error);
    return NextResponse.json(
      { error: 'Staj bilgileri alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleInternshipUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleInternshipUpdate(request, params);
}

async function handleInternshipUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const { id } = await params;
  try {
    const { status, teacherId, companyId, startDate, endDate, performedBy, reason, notes } = await request.json();

    // Get real system user ID if performedBy not provided
    const realPerformedBy = performedBy || await getSystemUserId();

    // Get current internship data
    const currentInternship = await prisma.staj.findUnique({
      where: { id },
      include: {
        student: true,
        company: true,
        teacher: true,
        educationYear: true
      }
    });

    if (!currentInternship) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      lastModifiedBy: realPerformedBy,
      lastModifiedAt: new Date()
    };

    if (status !== undefined) updateData.status = status;
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (companyId !== undefined) updateData.companyId = companyId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    // Determine the action type based on what's being updated
    let action: string = auditActions.UPDATED;
    if (status && status !== currentInternship.status) {
      if (status === 'COMPLETED') action = auditActions.COMPLETED;
      else if (status === 'TERMINATED') action = auditActions.TERMINATED;
      else if (status === 'ACTIVE') action = auditActions.REACTIVATED;
    } else if (teacherId && teacherId !== currentInternship.teacherId) {
      action = auditActions.TEACHER_CHANGED;
    } else if (companyId && companyId !== currentInternship.companyId) {
      action = auditActions.COMPANY_CHANGED;
    }

    // Use transaction to ensure both update and audit trail are created
    const result = await prisma.$transaction(async (tx) => {
      // If teacherId is being changed, update all internships in the same company
      if (teacherId && teacherId !== currentInternship.teacherId) {
        // Get all active internships in the same company
        const companyInternships = await tx.staj.findMany({
          where: {
            companyId: currentInternship.companyId,
            status: 'ACTIVE'
          },
          include: {
            student: true,
            teacher: true
          }
        });

        // Get new teacher info
        const newTeacher = await tx.teacherProfile.findUnique({
          where: { id: teacherId }
        });

        // Update all internships in the company
        const updatedInternships = await Promise.all(
          companyInternships.map(async (internship) => {
            // Create assignment history if coordinator is changing
            if (internship.teacherId && internship.teacherId !== teacherId) {
              await tx.teacherAssignmentHistory.create({
                data: {
                  companyId: internship.companyId,
                  previousTeacherId: internship.teacherId,
                  teacherId: teacherId,
                  assignedAt: new Date(),
                  assignedBy: realPerformedBy,
                  reason: reason || 'Koordinatör değişikliği'
                }
              });
            }

            // Update internship
            const updated = await tx.staj.update({
              where: { id: internship.id },
              data: { 
                teacherId,
                lastModifiedBy: realPerformedBy,
                lastModifiedAt: new Date()
              },
              include: {
                student: {
                  include: {
                    alan: true
                  }
                },
                company: true,
                teacher: true,
                educationYear: true
              }
            });

            // Create audit trail for each internship
            await tx.internshipHistory.create({
              data: {
                internshipId: internship.id,
                action: auditActions.TEACHER_CHANGED,
                previousData: {
                  status: internship.status,
                  teacherId: internship.teacherId,
                  companyId: internship.companyId,
                  startDate: internship.startDate,
                  endDate: internship.endDate
                },
                newData: {
                  status: internship.status,
                  teacherId: teacherId,
                  companyId: internship.companyId,
                  startDate: internship.startDate,
                  endDate: internship.endDate
                },
                performedBy: realPerformedBy,
                reason: reason || `Koordinatör değişikliği: ${internship.teacher?.name || 'Bilinmeyen'} -> ${newTeacher?.name || 'Bilinmeyen'}`,
                notes: notes || `İşletme genelinde koordinatör değişikliği yapıldı`
              }
            });

            return updated;
          })
        );

        // Return the main internship that was requested to be updated
        return updatedInternships.find(i => i.id === id) || updatedInternships[0];
      } else {
        // Regular update for non-coordinator changes
        const updatedInternship = await tx.staj.update({
          where: { id },
          data: updateData,
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
            teacher: true,
            educationYear: true
          }
        });

        // Create audit trail history record
        await tx.internshipHistory.create({
          data: {
            internshipId: id,
            action: action as any,
            previousData: {
              status: currentInternship.status,
              teacherId: currentInternship.teacherId,
              companyId: currentInternship.companyId,
              startDate: currentInternship.startDate,
              endDate: currentInternship.endDate
            },
            newData: updateData,
            performedBy: realPerformedBy,
            reason: reason || `Staj durumu güncellendi: ${action}`,
            notes
          }
        });

        return updatedInternship;
      }
    });

    // Also create audit trail using utility function for backward compatibility
    setImmediate(async () => {
      try {
        await createAuditTrailEntry({
          internshipId: id,
          action,
          previousData: {
            status: currentInternship.status,
            teacherId: currentInternship.teacherId,
            companyId: currentInternship.companyId,
            startDate: currentInternship.startDate,
            endDate: currentInternship.endDate
          },
          newData: updateData,
          performedBy,
          reason: reason || `Staj durumu güncellendi: ${action}`,
          notes
        });
      } catch (auditError) {
        console.error('Audit trail creation failed:', auditError);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Staj başarıyla güncellendi',
      internship: result
    });

  } catch (error) {
    console.error('Update internship error:', error);
    return NextResponse.json(
      { error: 'Staj güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { performedBy, reason = 'Staj kaydı silindi' } = await request.json();
    
    // Get real system user ID if performedBy not provided
    const realPerformedBy = performedBy || await getSystemUserId();

    // Get current internship data for audit trail
    const currentInternship = await prisma.staj.findUnique({
      where: { id }
    });

    if (!currentInternship) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      );
    }

    // Use transaction to ensure both deletion and audit trail are created
    const result = await prisma.$transaction(async (prisma) => {
      // Create audit trail before deletion
      await prisma.internshipHistory.create({
        data: {
          internshipId: id,
          action: 'DELETED' as any,
          previousData: currentInternship,
          newData: {} as any,
          performedBy: realPerformedBy,
          reason,
          notes: 'Staj kaydı sistemden silindi'
        }
      });

      // Delete internship (history will be cascade deleted due to FK)
      await prisma.staj.delete({
        where: { id }
      });

      return true;
    });

    return NextResponse.json({
      success: true,
      message: 'Staj başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete internship error:', error);
    return NextResponse.json(
      { error: 'Staj silinirken hata oluştu' },
      { status: 500 }
    );
  }
}