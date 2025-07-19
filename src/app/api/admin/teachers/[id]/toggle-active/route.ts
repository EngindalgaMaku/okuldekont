import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Get the current teacher to check their current active status
    const currentTeacher = await prisma.teacherProfile.findUnique({
      where: { id },
      select: { active: true }
    });

    if (!currentTeacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
    }

    // Toggle the active status
    const newActiveStatus = !currentTeacher.active;

    const updatedTeacher = await prisma.teacherProfile.update({
      where: { id },
      data: { active: newActiveStatus },
      select: {
        id: true,
        name: true,
        surname: true,
        active: true
      }
    });

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher,
      message: `Öğretmen ${newActiveStatus ? 'aktif' : 'pasif'} edildi.`
    });
  } catch (error) {
    console.error('Öğretmen aktiflik durumu değiştirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}