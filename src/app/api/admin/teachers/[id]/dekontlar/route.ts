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

    // Öğretmenin sorumlu olduğu dekontları getir
    const dekontlar = await prisma.dekont.findMany({
      where: {
        teacherId: id
      },
      include: {
        staj: {
          include: {
            student: {
              select: {
                name: true,
                surname: true
              }
            },
            company: {
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
        createdAt: 'desc'
      }
    });

    // Formatla
    const formattedDekontlar = dekontlar.map((d: any) => ({
      id: d.id,
      isletme_ad: d.staj.company.name,
      ogrenci_ad: `${d.staj.student.name} ${d.staj.student.surname}`,
      miktar: d.amount,
      odeme_tarihi: d.paymentDate,
      onay_durumu: d.status,
      ay: d.month,
      yil: d.year,
      dosya_url: d.fileUrl,
      aciklama: d.rejectReason,
      red_nedeni: d.rejectReason,
      yukleyen_kisi: d.teacher ? `${d.teacher.name} ${d.teacher.surname} (Öğretmen)` : 'Bilinmiyor',
      created_at: d.createdAt
    }));

    return NextResponse.json(formattedDekontlar);
  } catch (error) {
    console.error('Öğretmen dekontları getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}