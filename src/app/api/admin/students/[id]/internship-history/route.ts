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

    // Get all internships for this student using any casting
    const internships = await prisma.staj.findMany({
      where: { studentId: id },
      include: {
        company: true,
        teacher: true,
        educationYear: true
      },
      orderBy: { createdAt: 'desc' }
    }) as any[];

    // Simple timeline without complex type casting
    const timeline: any[] = [];

    // Add internship events
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

      // Termination info is handled by audit history, no need to duplicate
    });

    // Get audit trail history and add to timeline
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

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate basic statistics with detailed company info
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