import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Şirket ID gerekli' },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: resolvedParams.id },
      include: {
        stajlar: {
          where: {
            status: {
              in: ['ACTIVE', 'SUSPENDED', 'PENDING_TERMINATION'] as any
            }
          },
          include: {
            company: true,
            teacher: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Öğrenci bulunamadı' },
        { status: 404 }
      );
    }

    // Check if company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Şirket bulunamadı' },
        { status: 404 }
      );
    }

    const activeInternships = student.stajlar;

    // Validation results
    const validation = {
      canAssign: true,
      warnings: [] as string[],
      errors: [] as string[],
      activeInternships,
      requiresTermination: false,
      student,
      company
    };

    // Check for active internships
    if (activeInternships.length > 0) {
      validation.canAssign = false;
      validation.requiresTermination = true;
      validation.errors.push(
        `Öğrencinin aktif stajı var: ${activeInternships.map(s => s.company.name).join(', ')}`
      );
      validation.errors.push(
        'Yeni staja atanabilmesi için önce mevcut staj fesih edilmelidir.'
      );
    }

    // Check if trying to assign to same company
    const currentCompanyInternship = activeInternships.find(s => s.companyId === companyId);
    if (currentCompanyInternship) {
      validation.errors.push('Öğrenci zaten bu şirkette staj yapıyor');
    }

    return NextResponse.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Assignment validation error:', error);
    return NextResponse.json(
      { error: 'Atama doğrulaması sırasında hata oluştu' },
      { status: 500 }
    );
  }
}