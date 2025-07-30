import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Temporal enum types (until Prisma client is regenerated)
type EnrollmentStatus = 'ACTIVE' | 'PROMOTED' | 'GRADUATED' | 'TRANSFERRED' | 'DROPPED_OUT' | 'SUSPENDED';
type GradeType = 'NORMAL' | 'MESEM';

interface PromotionResult {
  promoted: number;
  graduated: number;
  errors: Array<{
    studentId: string;
    studentName: string;
    error: string;
  }>;
}

// POST - Öğrenci sınıf yükseltme sistemi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fromEducationYearId,
      toEducationYearId,
      grades = [], // Hangi sınıfları yükseltelim? [9, 10, 11, 12] veya [9, 10] gibi
      gradeType = 'NORMAL', // 'NORMAL' veya 'MESEM'
      adminUserId
    } = body;

    if (!fromEducationYearId || !toEducationYearId || !adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Kaynak eğitim yılı, hedef eğitim yılı ve admin kullanıcısı gerekli' },
        { status: 400 }
      );
    }

    const result: PromotionResult = {
      promoted: 0,
      graduated: 0,
      errors: []
    };

    // Aktif öğrenci kayıtlarını getir
    const activeEnrollments = await (prisma as any).studentEnrollment.findMany({
      where: {
        educationYearId: fromEducationYearId,
        status: 'ACTIVE',
        gradeType: gradeType as GradeType,
        ...(grades.length > 0 ? { grade: { in: grades } } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true
          }
        }
      }
    });

    console.log(`${activeEnrollments.length} aktif öğrenci bulundu sınıf yükseltme için`);

    // Her öğrenci için transaction başlat
    for (const enrollment of activeEnrollments) {
      try {
        await prisma.$transaction(async (tx) => {
          const currentGrade = enrollment.grade;
          const studentName = `${enrollment.student.name} ${enrollment.student.surname}`;

          // 12. sınıf öğrencileri mezun et
          if (currentGrade === 12) {
            // Mevcut kaydı güncelle - mezun durumuna getir
            await (tx as any).studentEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: 'GRADUATED',
                graduationDate: new Date(),
                updatedAt: new Date()
              }
            });

            result.graduated++;
            console.log(`${studentName} mezun edildi`);
            return;
          }

          // 9, 10, 11. sınıf öğrencilerini yükselt
          const nextGrade = currentGrade + 1;
          let nextClassName = enrollment.className;

          // Sınıf adını güncelle
          if (gradeType === 'MESEM') {
            nextClassName = `${nextGrade}mesem`;
          } else {
            // Normal sınıflar için sınıf harfini koru (12A → 13A olmaz, 11A → 12A olur)
            const classLetter = enrollment.className.replace(/\d+/, '');
            nextClassName = `${nextGrade}${classLetter}`;
          }

          // 1. Mevcut kaydı PROMOTED durumuna güncelle
          await (tx as any).studentEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: 'PROMOTED',
              promotionDate: new Date(),
              updatedAt: new Date()
            }
          });

          // 2. Yeni eğitim yılı için yeni kayıt oluştur
          await (tx as any).studentEnrollment.create({
            data: {
              studentId: enrollment.studentId,
              educationYearId: toEducationYearId,
              classId: enrollment.classId, // Aynı sınıf ID'si (güncellenmeli)
              className: nextClassName,
              grade: nextGrade,
              gradeType: gradeType as GradeType,
              status: 'ACTIVE',
              notes: `${enrollment.className} sınıfından yükseltildi`
            }
          });

          result.promoted++;
          console.log(`${studentName} ${enrollment.className} → ${nextClassName} yükseltildi`);
        });

      } catch (error) {
        console.error(`${enrollment.student.name} ${enrollment.student.surname} yükseltme hatası:`, error);
        result.errors.push({
          studentId: enrollment.studentId,
          studentName: `${enrollment.student.name} ${enrollment.student.surname}`,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sınıf yükseltme tamamlandı. ${result.promoted} öğrenci yükseltildi, ${result.graduated} öğrenci mezun edildi. ${result.errors.length} hata oluştu.`
    });

  } catch (error) {
    console.error('Bulk promotion error:', error);
    return NextResponse.json(
      { success: false, error: 'Sınıf yükseltme sırasında hata oluştu' },
      { status: 500 }
    );
  }
}

// GET - Sınıf yükseltme önizlemesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromEducationYearId = searchParams.get('fromEducationYearId');
    const grades = searchParams.get('grades')?.split(',').map(g => parseInt(g)) || [];
    const gradeType = searchParams.get('gradeType') || 'NORMAL';

    if (!fromEducationYearId) {
      return NextResponse.json(
        { success: false, error: 'Kaynak eğitim yılı gerekli' },
        { status: 400 }
      );
    }

    // Yükseltilecek öğrencileri getir
    const enrollments = await (prisma as any).studentEnrollment.findMany({
      where: {
        educationYearId: fromEducationYearId,
        status: 'ACTIVE',
        gradeType: gradeType as GradeType,
        ...(grades.length > 0 ? { grade: { in: grades } } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            className: true
          }
        }
      },
      orderBy: [
        { grade: 'asc' },
        { className: 'asc' },
        { student: { name: 'asc' } }
      ]
    });

    // Sınıf bazında grupla
    const gradeGroups = enrollments.reduce((acc: any, enrollment: any) => {
      const grade = enrollment.grade;
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(enrollment);
      return acc;
    }, {});

    // İstatistikler
    const stats = {
      total: enrollments.length,
      toBePromoted: enrollments.filter((e: any) => e.grade < 12).length,
      toBeGraduated: enrollments.filter((e: any) => e.grade === 12).length,
      gradeBreakdown: Object.keys(gradeGroups).map(grade => ({
        grade: parseInt(grade),
        count: gradeGroups[grade].length,
        students: gradeGroups[grade]
      }))
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        enrollments
      }
    });

  } catch (error) {
    console.error('Promotion preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Sınıf yükseltme önizlemesi getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}