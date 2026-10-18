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

    // Öğretmenin yüklediği belgeler - yeni Belge tablosundan getir
    const belgeler = await (prisma as any).belge.findMany({
      where: {
        ogretmenId: id,
        yuklenenTaraf: 'ogretmen'
      },
      include: {
        teacher: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatla - yeni belge tablosunu kullan
    const formattedBelgeler = belgeler.map((belge: any) => {
      const companyName = belge.company?.name || 'Bilinmeyen İşletme';
      const teacherName = belge.teacher ? `${belge.teacher.name} ${belge.teacher.surname}` : 'Bilinmeyen';
      
      return {
        id: belge.id,
        isletme_ad: companyName,
        dosya_adi: belge.ad, // Belge adı
        dosya_url: belge.dosyaUrl, // Dosya yolu
        belge_turu: belge.belgeTuru, // Belge türü
        yukleme_tarihi: belge.createdAt,
        yukleyen_kisi: teacherName + ' (Öğretmen)',
        status: belge.status || 'PENDING', // Onay durumu
        onaylanma_tarihi: belge.onaylanmaTarihi,
        red_nedeni: belge.redNedeni
      };
    });

    return NextResponse.json(formattedBelgeler);
  } catch (error) {
    console.error('Öğretmen belgeleri getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}