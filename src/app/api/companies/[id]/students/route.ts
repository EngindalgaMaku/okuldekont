import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Şirketin öğrencilerini getir
    const students = await prisma.staj.findMany({
      where: {
        companyId: id,
        status: 'ACTIVE'
      },
      include: {
        student: {
          include: {
            alan: {
              select: {
                name: true
              }
            }
          }
        },
        teacher: {
          select: {
            name: true,
            surname: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Formatla
    const formattedStudents = students.map((staj: any) => ({
      id: staj.student.id,
      staj_id: staj.id,
      ad: staj.student.name,
      soyad: staj.student.surname,
      sinif: staj.student.className,
      no: staj.student.number,
      alanlar: staj.student.alan ? { ad: staj.student.alan.name } : null,
      baslangic_tarihi: staj.startDate,
      bitis_tarihi: staj.endDate,
      ogretmen_ad: staj.teacher?.name || '',
      ogretmen_soyad: staj.teacher?.surname || ''
    }));

    const response = NextResponse.json(formattedStudents);
    
    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Şirket öğrencileri getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}