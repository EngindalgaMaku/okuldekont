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

    // Mevcut öğretmen verilerini al
    const currentTeacher = await prisma.teacherProfile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
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

    if (!currentTeacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
    }

    // Transaction ile güncelleme ve geçmiş kaydı oluştur
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      
      // Değişen alanları tespit et ve geçmiş kaydı oluştur
      const changes = [];
      
      if (body.name && body.name !== currentTeacher.name) {
        changes.push({
          fieldName: 'name',
          changeType: 'PERSONAL_INFO_UPDATE',
          previousValue: currentTeacher.name,
          newValue: body.name,
          reason: 'Öğretmen adı güncellendi'
        });
      }
      
      if (body.surname && body.surname !== currentTeacher.surname) {
        changes.push({
          fieldName: 'surname',
          changeType: 'PERSONAL_INFO_UPDATE',
          previousValue: currentTeacher.surname,
          newValue: body.surname,
          reason: 'Öğretmen soyadı güncellendi'
        });
      }
      
      if (body.email !== undefined && body.email !== currentTeacher.email) {
        changes.push({
          fieldName: 'email',
          changeType: 'CONTACT_INFO_UPDATE',
          previousValue: currentTeacher.email,
          newValue: body.email,
          reason: 'E-mail adresi güncellendi'
        });
      }
      
      if (body.phone !== undefined && body.phone !== currentTeacher.phone) {
        changes.push({
          fieldName: 'phone',
          changeType: 'CONTACT_INFO_UPDATE',
          previousValue: currentTeacher.phone,
          newValue: body.phone,
          reason: 'Telefon numarası güncellendi'
        });
      }
      
      if (body.alanId && body.alanId !== currentTeacher.alanId) {
        changes.push({
          fieldName: 'alanId',
          changeType: 'FIELD_ASSIGNMENT_UPDATE',
          previousValue: currentTeacher.alanId?.toString(),
          newValue: body.alanId.toString(),
          reason: 'Alan değişikliği yapıldı'
        });
      }

      // Geçmiş kayıtlarını oluştur
      for (const change of changes) {
        console.log('Creating history record for:', change);
        
        try {
          // Admin user'ı bul
          const adminUser = await tx.user.findFirst({
            where: { role: 'ADMIN' }
          });
          
          if (!adminUser) {
            console.error('Admin user bulunamadı');
            continue;
          }

          // Raw SQL ile history kaydı oluştur
          const historyId = `th_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          
          await tx.$executeRaw`
            INSERT INTO teacher_history (
              id, teacherId, changeType, fieldName, previousValue, newValue,
              validFrom, changedBy, reason, archived
            ) VALUES (
              ${historyId}, ${id}, ${change.changeType}, ${change.fieldName},
              ${change.previousValue || null}, ${change.newValue || null},
              NOW(), ${adminUser.id}, ${change.reason || null}, 0
            )
          `;
          
          console.log('✅ Teacher history record created successfully:', {
            field: change.fieldName,
            from: change.previousValue,
            to: change.newValue,
            historyId: historyId
          });
        } catch (historyError) {
          console.error('❌ Geçmiş kaydı oluşturulamadı:', historyError);
        }
      }

      // Öğretmeni güncelle
      const updatedTeacher = await tx.teacherProfile.update({
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

      return updatedTeacher;
    });

    return NextResponse.json(result);
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