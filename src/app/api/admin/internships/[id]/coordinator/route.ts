import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditTrailEntry, auditActions } from '@/lib/audit-trail';
import { getSystemUserId } from '@/lib/system-user';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { teacherId } = await request.json();

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Öğretmen ID gerekli' },
        { status: 400 }
      );
    }

    // Mevcut stajı al
    const currentInternship = await prisma.staj.findUnique({
      where: { id },
      include: {
        student: true,
        company: true,
        teacher: true
      }
    });

    if (!currentInternship) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      );
    }

    // Yeni öğretmeni al
    const newTeacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId }
    });

    if (!newTeacher) {
      return NextResponse.json(
        { error: 'Öğretmen bulunamadı' },
        { status: 404 }
      );
    }

    // Aynı işletmedeki tüm aktif stajları bul
    const companyInternships = await prisma.staj.findMany({
      where: {
        companyId: currentInternship.companyId,
        status: 'ACTIVE'
      },
      include: {
        student: true,
        teacher: true
      }
    });

    // Get system user ID before transaction
    const systemUserId = await getSystemUserId();

    // Transaction ile tüm stajları güncelle
    const result = await prisma.$transaction(async (tx) => {
      // Tüm stajları yeni koordinatöre ata
      const updatedInternships = await Promise.all(
        companyInternships.map(async (internship) => {
          // Eski koordinatör bilgisini kaydet
          if (internship.teacherId && internship.teacherId !== teacherId) {
            await tx.teacherAssignmentHistory.create({
              data: {
                companyId: internship.companyId,
                previousTeacherId: internship.teacherId,
                teacherId: teacherId,
                assignedAt: new Date(),
                assignedBy: systemUserId,
                reason: 'Koordinatör değişikliği'
              }
            });
          }

          // Stajı güncelle
          const updated = await tx.staj.update({
            where: { id: internship.id },
            data: { teacherId },
            include: {
              student: true,
              company: true,
              teacher: true
            }
          });

          // Audit trail oluştur
          await tx.internshipHistory.create({
            data: {
              internshipId: internship.id,
              action: auditActions.TEACHER_CHANGED,
              previousData: {
                teacherId: internship.teacherId,
                status: internship.status
              },
              newData: {
                teacherId: teacherId,
                status: internship.status
              },
              performedBy: await getSystemUserId(),
              reason: `Koordinatör değişikliği: ${internship.teacher?.name || 'Bilinmeyen'} -> ${newTeacher.name}`,
              notes: `İşletme genelinde koordinatör değişikliği yapıldı`
            }
          });

          return updated;
        })
      );

      return updatedInternships;
    });

    return NextResponse.json({
      success: true,
      message: `${companyInternships.length} stajın koordinatörü başarıyla güncellendi`,
      updatedInternships: result
    });

  } catch (error) {
    console.error('Koordinatör güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Koordinatör güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}
