import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Dekont sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Dekont ID\'si gerekli' },
        { status: 400 }
      );
    }

    console.log('Deleting dekont with ID:', id);

    // Önce dekont bilgilerini al (dosya URL'si için)
    const dekont = await prisma.dekont.findUnique({
      where: { id },
      select: { fileUrl: true }
    });

    if (!dekont) {
      return NextResponse.json(
        { error: 'Dekont bulunamadı' },
        { status: 404 }
      );
    }

    // Dekont veritabanından sil
    await prisma.dekont.delete({
      where: { id }
    });

    // Eğer dosya varsa fiziksel olarak sil
    if (dekont.fileUrl) {
      try {
        // Dosya yolunu oluştur (public/uploads/dekontlar/filename.pdf formatında)
        const filename = dekont.fileUrl.split('/').pop();
        if (filename) {
          const filePath = join(process.cwd(), 'public', 'uploads', 'dekontlar', filename);
          
          // Dosya mevcutsa sil
          if (existsSync(filePath)) {
            await unlink(filePath);
            console.log('File deleted:', filePath);
          }
        }
      } catch (fileError) {
        console.error('Dosya silinirken hata:', fileError);
        // Dosya silme hatası dekont silme işlemini engellemez
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dekont ve ilişkili dosya başarıyla silindi'
    });
  } catch (error) {
    console.error('Dekont silinirken hata:', error);
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Dekont güncelle  
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Dekont ID\'si gerekli' },
        { status: 400 }
      );
    }

    console.log('Updating dekont with ID:', id, 'Data:', body);

    const data = await prisma.dekont.update({
      where: { id },
      data: body,
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
            teacher: true
          }
        },
        company: true,
        teacher: true
      }
    });

    // Format the response to match what frontend expects
    const statusMapping = {
      'PENDING': 'bekliyor',
      'APPROVED': 'onaylandi',
      'REJECTED': 'reddedildi'
    };

    const formattedData = {
      id: data.id,
      isletme_ad: data.staj.company.name,
      ogrenci_ad: `${data.staj.student.name} ${data.staj.student.surname}`,
      miktar: data.amount,
      odeme_tarihi: data.paymentDate,
      onay_durumu: statusMapping[data.status as keyof typeof statusMapping] || data.status,
      ay: data.month,
      yil: data.year,
      dosya_url: data.fileUrl,
      aciklama: data.rejectReason,
      red_nedeni: data.rejectReason,
      yukleyen_kisi: data.teacher ? `${data.teacher.name} ${data.teacher.surname} (Öğretmen)` : 'Bilinmiyor',
      created_at: data.createdAt
    };

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Dekont güncellenirken hata:', error);
    return NextResponse.json(
      { error: 'Dekont güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Tekil dekont getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Dekont ID\'si gerekli' },
        { status: 400 }
      );
    }

    const dekont = await prisma.dekont.findUnique({
      where: { id },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
            teacher: true
          }
        },
        company: true,
        teacher: true
      }
    });

    if (!dekont) {
      return NextResponse.json(
        { error: 'Dekont bulunamadı' },
        { status: 404 }
      );
    }

    // Format the response to match what frontend expects
    const statusMapping = {
      'PENDING': 'bekliyor',
      'APPROVED': 'onaylandi',
      'REJECTED': 'reddedildi'
    };

    const formattedData = {
      id: dekont.id,
      isletme_ad: dekont.staj.company.name,
      ogrenci_ad: `${dekont.staj.student.name} ${dekont.staj.student.surname}`,
      miktar: dekont.amount,
      odeme_tarihi: dekont.paymentDate,
      onay_durumu: statusMapping[dekont.status as keyof typeof statusMapping] || dekont.status,
      ay: dekont.month,
      yil: dekont.year,
      dosya_url: dekont.fileUrl,
      aciklama: dekont.rejectReason,
      red_nedeni: dekont.rejectReason,
      yukleyen_kisi: dekont.teacher ? `${dekont.teacher.name} ${dekont.teacher.surname} (Öğretmen)` : 'Bilinmiyor',
      created_at: dekont.createdAt
    };

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Dekont getirme hatası:', error);
    return NextResponse.json(
      { error: 'Dekont getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}