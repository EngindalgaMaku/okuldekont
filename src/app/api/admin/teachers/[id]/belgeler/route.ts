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

    // Öğretmenin sorumlu olduğu görev belgelerini getir
    const belgeler = await prisma.gorevBelgesi.findMany({
      where: {
        ogretmenId: id
      },
      include: {
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
    const formattedBelgeler = belgeler.map((belge: any) => ({
      id: belge.id,
      isletme_ad: 'Görev Belgesi', // GorevBelgesi doesn't have company relation
      dosya_adi: `Hafta ${belge.hafta} Görev Belgesi`,
      dosya_url: null, // GorevBelgesi doesn't store file URL
      belge_turu: 'Görev Belgesi',
      yukleme_tarihi: belge.createdAt,
      yukleyen_kisi: belge.teacher ? `${belge.teacher.name} ${belge.teacher.surname} (Öğretmen)` : 'Bilinmiyor'
    }));

    return NextResponse.json(formattedBelgeler);
  } catch (error) {
    console.error('Öğretmen belgeleri getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}