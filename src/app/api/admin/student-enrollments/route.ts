import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Temporal enum types (until Prisma client is regenerated)
type EnrollmentStatus = 'ACTIVE' | 'PROMOTED' | 'GRADUATED' | 'TRANSFERRED' | 'DROPPED_OUT' | 'SUSPENDED';
type GradeType = 'NORMAL' | 'MESEM';

// GET - Tüm öğrenci kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const educationYearId = searchParams.get('educationYearId');
    const grade = searchParams.get('grade');
    const status = searchParams.get('status');
    const gradeType = searchParams.get('gradeType');
    const stats = searchParams.get('stats'); // İstatistik modu

    // İstatistik modu
    if (stats === 'true') {
      const total = await (prisma as any).studentEnrollment.count();
      const recent = await (prisma as any).studentEnrollment.count({
        where: {
          enrollmentDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Son 7 gün
          }
        }
      });

      return NextResponse.json({
        success: true,
        total,
        recent
      });
    }

    const whereClause: any = {};
    
    if (educationYearId) {
      whereClause.educationYearId = educationYearId;
    }
    
    if (grade) {
      whereClause.grade = parseInt(grade);
    }
    
    if (status) {
      whereClause.status = status as EnrollmentStatus;
    }
    
    if (gradeType) {
      whereClause.gradeType = gradeType as GradeType;
    }

    // Note: Will use raw query until Prisma client is regenerated
    const enrollments = await (prisma as any).studentEnrollment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            className: true,
            number: true,
          }
        },
        educationYear: {
          select: {
            id: true,
            year: true,
          }
        },
        class: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { educationYear: { year: 'desc' } },
        { grade: 'asc' },
        { className: 'asc' },
        { student: { name: 'asc' } }
      ]
    });

    return NextResponse.json({
      success: true,
      data: enrollments,
      count: enrollments.length
    });

  } catch (error) {
    console.error('Student enrollments fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Öğrenci kayıtları getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni öğrenci kaydı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      educationYearId,
      classId,
      className,
      grade,
      gradeType = 'NORMAL',
      status = 'ACTIVE',
      notes
    } = body;

    // Aynı öğrenci için aynı eğitim yılında zaten kayıt var mı kontrol et
    const existingEnrollment = await (prisma as any).studentEnrollment.findUnique({
      where: {
        studentId_educationYearId: {
          studentId,
          educationYearId
        }
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Bu öğrenci bu eğitim yılında zaten kayıtlı' },
        { status: 400 }
      );
    }

    // Yeni kayıt oluştur
    const enrollment = await (prisma as any).studentEnrollment.create({
      data: {
        studentId,
        educationYearId,
        classId,
        className,
        grade: parseInt(grade),
        gradeType: gradeType as GradeType,
        status: status as EnrollmentStatus,
        notes
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        },
        educationYear: {
          select: {
            id: true,
            year: true,
          }
        },
        class: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: enrollment,
      message: 'Öğrenci kaydı başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error('Student enrollment creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Öğrenci kaydı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}