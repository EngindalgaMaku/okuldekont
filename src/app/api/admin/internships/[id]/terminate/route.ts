import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { reason, notes, documentId, terminatedBy, terminationDate } = await request.json();

    if (!reason || !terminatedBy) {
      return NextResponse.json(
        { error: 'Fesih nedeni ve fesihi yapan kişi bilgisi zorunludur' },
        { status: 400 }
      );
    }

    // Get current internship
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

    // Business rules validation
    if (currentInternship.status === 'TERMINATED') {
      return NextResponse.json(
        { error: 'Bu staj zaten fesih edilmiş' },
        { status: 400 }
      );
    }

    if (currentInternship.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Tamamlanmış staj fesih edilemez' },
        { status: 400 }
      );
    }

    // Verify document exists if provided
    if (documentId) {
      const document = await prisma.belge.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Belge bulunamadı' },
          { status: 404 }
        );
      }
    }

    // Verify terminator exists
    const terminator = await prisma.user.findUnique({
      where: { id: terminatedBy }
    });

    if (!terminator) {
      return NextResponse.json(
        { error: 'Fesihi yapan kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Use provided termination date or current date
    const finalTerminationDate = terminationDate ? new Date(terminationDate) : new Date();
    const terminationDateFormatted = finalTerminationDate.toLocaleDateString('tr-TR');

    // Perform termination in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update internship with proper enum value
      const updatedInternship = await tx.staj.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminationDate: finalTerminationDate,
          terminationReason: reason,
          terminatedBy,
          terminationDocumentId: documentId || null,
          terminationNotes: notes || null,
          lastModifiedBy: terminatedBy,
          lastModifiedAt: finalTerminationDate
        },
        include: {
          student: true,
          company: true,
          teacher: true,
          educationYear: true
        }
      });

      // Update student's company assignment to null
      await tx.student.update({
        where: { id: currentInternship.studentId },
        data: { companyId: null }
      });

      // Check if company has any other active internships
      const remainingActiveInternships = await tx.staj.count({
        where: {
          companyId: currentInternship.companyId,
          status: 'ACTIVE',
          id: { not: id } // Exclude the current internship being terminated
        }
      });

      // If no active internships remain, remove teacher assignment from company
      if (remainingActiveInternships === 0) {
        await tx.companyProfile.update({
          where: { id: currentInternship.companyId },
          data: {
            teacherId: null,
            teacherAssignedAt: null
          }
        });
      }

      // Get terminator and teacher info for detailed history
      const terminatorInfo = await tx.user.findUnique({
        where: { id: terminatedBy },
        include: {
          adminProfile: true,
          teacherProfile: true
        }
      });

      const teacherInfo = currentInternship.teacherId ? await tx.teacherProfile.findUnique({
        where: { id: currentInternship.teacherId }
      }) : null;

      // Create internship history record directly in transaction (no duplicate)
      const terminatorName = terminatorInfo?.teacherProfile
        ? `${terminatorInfo.teacherProfile.name} ${terminatorInfo.teacherProfile.surname}`
        : terminatorInfo?.adminProfile?.name || 'Sistem Admin';
      const teacherName = teacherInfo ? `${teacherInfo.name} ${teacherInfo.surname}` : 'Atanmamış';
      const companyName = currentInternship.company.name;
      
      await tx.internshipHistory.create({
        data: {
          internshipId: id,
          action: 'TERMINATED',
          previousData: {
            status: currentInternship.status,
            terminationDate: currentInternship.terminationDate,
            terminationReason: currentInternship.terminationReason
          },
          newData: {
            status: 'TERMINATED',
            terminationDate: finalTerminationDate,
            terminationReason: reason,
            terminatedBy,
            terminationDocumentId: documentId || null,
            terminationNotes: notes || null
          },
          performedBy: terminatedBy,
          reason: `${companyName} işletmesinde staj fesih edildi`,
          notes: `Fesih Tarihi: ${terminationDateFormatted} | Koordinatör: ${teacherName} | Fesih Eden: ${terminatorName} | Neden: ${reason}`
        }
      });

      return updatedInternship;
    });

    return NextResponse.json({
      success: true,
      message: 'Staj başarıyla fesih edildi',
      internship: result
    });

  } catch (error) {
    console.error('Termination error:', error);
    return NextResponse.json(
      { error: 'Staj fesih edilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve internship details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const internship = await prisma.staj.findUnique({
      where: { id },
      include: {
        student: true,
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