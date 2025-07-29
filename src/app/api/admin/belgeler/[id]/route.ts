import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { validateAuthAndRole } from '@/middleware/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🛡️ KRİTİK GÜVENLİK: Authentication kontrolü - ADMIN ve TEACHER
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Önce belgenin mevcut olup olmadığını kontrol et
    const mevcutBelge = await (prisma as any).belge.findUnique({
      where: { id: id }
    });

    if (!mevcutBelge) {
      return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
    }

    // Onaylanmış belgelerin silinmesini engelle
    if (mevcutBelge.status === 'APPROVED') {
      return NextResponse.json({
        error: 'Onaylanmış belgeler silinemez'
      }, { status: 403 });
    }

    // Dosyayı fiziksel olarak sil (eğer varsa)
    if (mevcutBelge.dosyaUrl) {
      try {
        const fileName = path.basename(mevcutBelge.dosyaUrl);
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'belgeler', fileName);
        await unlink(filePath);
      } catch (fileError) {
        console.log('Dosya silme uyarısı:', fileError);
      }
    }

    // Belgeyi veritabanından sil
    await (prisma as any).belge.delete({
      where: { id: id }
    });


    return NextResponse.json({ 
      success: true,
      message: 'Belge başarıyla silindi' 
    });
    
  } catch (error) {
    console.error('Belge silme hatası:', error);
    return NextResponse.json({ 
      error: 'Belge silinirken hata oluştu' 
    }, { status: 500 });
  }
}