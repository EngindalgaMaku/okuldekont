import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        pin: true,
        mustChangePin: true,
        email: true,
        phone: true,
        alanId: true,
        alan: {
          select: {
            name: true
          }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Öğretmen getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const teacher = await prisma.teacherProfile.update({
      where: { id },
      data: body,
      select: {
        id: true,
        name: true,
        surname: true,
        pin: true,
        mustChangePin: true,
        email: true,
        phone: true,
        alanId: true,
        alan: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Öğretmen güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Check if teacher exists
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
    }

    // Delete the teacher
    await prisma.teacherProfile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Öğretmen silme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}