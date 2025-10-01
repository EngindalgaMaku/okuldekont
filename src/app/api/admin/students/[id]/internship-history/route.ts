import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudentInternshipHistory } from '@/lib/audit-trail';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get student with basic info
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        alan: true,
        company: true
      }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Öğrenci bulunamadı' },
        { status: 404 }
      );
    }

    // Get all internships for this student
    const internships = await prisma.staj.findMany({
      where: { studentId: id },
      include: {
        company: true,
        teacher: true,
        educationYear: true
      },
      orderBy: { createdAt: 'desc' }
    }) as any[];

    const timeline: any[] = [];
    internships.forEach((internship: any) => {
      timeline.push({
        type: 'internship',
        action: 'CREATED',
        date: internship.createdAt,
        internshipId: internship.id,
        companyName: internship.company?.name || 'Bilinmeyen Şirket',
        teacherName: internship.teacher ? `${internship.teacher.name} ${internship.teacher.surname}` : 'Koordinatör Öğretmen atanmadı',
        status: internship.status,
        details: {
          startDate: internship.startDate,
          endDate: internship.endDate,
          educationYear: internship.educationYear?.year || 'Bilinmeyen'
        }
      });
    });

    const auditHistory = await getStudentInternshipHistory(id);
    auditHistory.forEach(record => {
      timeline.push({
        type: 'audit',
        action: record.action,
        date: record.performedAt,
        internshipId: record.internshipId,
        companyName: record.companyName,
        teacherName: record.teacherName,
        educationYear: record.educationYear,
        performedBy: record.performerName,
        reason: record.reason,
        notes: record.notes,
        previousData: record.previousData,
        newData: record.newData
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const companyDetails = internships.map((internship: any) => ({
      name: internship.company?.name || 'Bilinmeyen Şirket',
      startDate: internship.startDate,
      endDate: internship.endDate,
      status: internship.status,
      duration: internship.startDate && internship.endDate ? 
        Math.ceil((new Date(internship.endDate).getTime() - new Date(internship.startDate).getTime()) / (1000 * 60 * 60 * 24)) : null
    })).filter(company => company.name !== 'Bilinmeyen Şirket');

    const stats = {
      totalInternships: internships.length,
      activeInternships: internships.filter(i => i.status === 'ACTIVE').length,
      completedInternships: internships.filter(i => i.status === 'COMPLETED').length,
      terminatedInternships: internships.filter((i: any) => i.status === 'TERMINATED').length,
      companies: Array.from(new Set(internships.map((i: any) => i.company?.name).filter(Boolean))),
      companyDetails: companyDetails,
      currentCompany: student.company?.name || null
    };

    return NextResponse.json({
      success: true,
      student,
      internships,
      timeline,
      stats
    });
  } catch (error) {
    console.error('Get student internship history error:', error);
    return NextResponse.json(
      { error: 'Öğrenci staj geçmişi alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { companyId, teacherId, startDate, endDate, educationYearId } = body || {};

    if (!studentId || !companyId || !teacherId || !startDate || !endDate) {
      return NextResponse.json({ error: 'studentId, companyId, teacherId, startDate, endDate zorunludur' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Geçersiz tarih formatı' }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 });
    }

    // Overlap validation: allow boundary touching (end == start-1 is OK). Here we ensure no intersection.
    const overlapping = await prisma.staj.findFirst({
      where: {
        studentId,
        startDate: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }]
      },
      select: { id: true }
    });
    if (overlapping) {
      return NextResponse.json({ error: 'Tarih aralığı mevcut bir staj ile çakışıyor' }, { status: 400 });
    }

    // educationYearId opsiyonel; varsa kullanacağız, yoksa boş bırakacağız
    const eduYearId = educationYearId as string | undefined;

    const created = await prisma.staj.create({
      data: {
        studentId,
        companyId,
        teacherId,
        startDate: start,
        endDate: end,
        ...(eduYearId ? { educationYearId: eduYearId } : {}),
        status: 'TERMINATED'
      },
      include: { company: true, teacher: true }
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Create past internship error:', error);
    return NextResponse.json({ error: 'Geçmiş staj oluşturulurken hata oluştu' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { internshipId, companyId, teacherId, startDate, endDate } = body || {};

    if (!studentId || !internshipId) {
      return NextResponse.json({ error: 'studentId ve internshipId zorunludur' }, { status: 400 });
    }

    const staj = await prisma.staj.findUnique({ where: { id: internshipId } });
    if (!staj || staj.studentId !== studentId) {
      return NextResponse.json({ error: 'Staj kaydı bulunamadı' }, { status: 404 });
    }

    let start: Date | undefined;
    let end: Date | undefined;
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) return NextResponse.json({ error: 'Geçersiz başlangıç tarihi' }, { status: 400 });
    }
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) return NextResponse.json({ error: 'Geçersiz bitiş tarihi' }, { status: 400 });
    }
    if (start && end && end < start) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 });
    }

    // Overlap validation excluding current internship
    const ovStart = start || staj.startDate;
    const ovEnd = end ?? staj.endDate ?? undefined;
    const overlapping = await prisma.staj.findFirst({
      where: {
        studentId,
        id: { not: internshipId },
        startDate: { lte: ovEnd ? ovEnd : new Date(8640000000000000) },
        OR: [ { endDate: null }, { endDate: { gte: ovStart } } ]
      },
      select: { id: true }
    });
    if (overlapping) {
      return NextResponse.json({ error: 'Tarih aralığı başka bir staj ile çakışıyor' }, { status: 400 });
    }

    const updated = await prisma.staj.update({
      where: { id: internshipId },
      data: {
        companyId: companyId ?? undefined,
        teacherId: teacherId ?? undefined,
        startDate: start ?? undefined,
        endDate: end ?? undefined,
      },
      include: { company: true, teacher: true }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update past internship error:', error);
    return NextResponse.json({ error: 'Geçmiş staj güncellenirken hata oluştu' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { internshipId } = body || {};

    if (!studentId || !internshipId) {
      return NextResponse.json({ error: 'studentId ve internshipId zorunludur' }, { status: 400 });
    }

    const staj = await prisma.staj.findUnique({ where: { id: internshipId } });
    if (!staj || staj.studentId !== studentId) {
      return NextResponse.json({ error: 'Staj kaydı bulunamadı' }, { status: 404 });
    }

    if (staj.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Aktif staj silinemez. Önce feshedin veya tamamlayın.' }, { status: 400 });
    }

    // TODO: İlişkili dekont vb. var mı kontrol etmek istenirse burada yapılabilir
    await prisma.staj.delete({ where: { id: internshipId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete past internship error:', error);
    return NextResponse.json({ error: 'Geçmiş staj silinirken hata oluştu' }, { status: 500 });
  }
}