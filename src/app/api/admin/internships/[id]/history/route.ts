import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getInternshipAuditTrail } from '@/lib/audit-trail';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get internship with history
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

    // Get history records using audit trail utility
    const formattedHistory = await getInternshipAuditTrail(id);

    return NextResponse.json({
      success: true,
      internship,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Get internship history error:', error);
    return NextResponse.json(
      { error: 'Staj geçmişi alınırken hata oluştu' },
      { status: 500 }
    );
  }
}