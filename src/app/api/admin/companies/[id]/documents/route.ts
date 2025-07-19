import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // İşletme belgelerini yeni Belge tablosundan getir
    const belgeler = await (prisma as any).belge.findMany({
      where: {
        isletmeId: id,
        yuklenenTaraf: 'isletme'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // İşletme bilgisini al
    const isletme = await prisma.companyProfile.findUnique({
      where: { id },
      select: { name: true, contact: true }
    });

    if (!isletme) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
    }

    // Belgeler formatını uygun hale getir
    const formattedBelgeler = belgeler.map((belge: any) => {
      return {
        id: belge.id,
        ad: belge.ad, // Belge adı
        tur: belge.belgeTuru, // Belge türü
        dosya_url: belge.dosyaUrl, // Dosya yolu
        yukleme_tarihi: belge.createdAt.toISOString(),
        yukleyen_kisi: `${isletme.contact} (İşletme)`,
        isletme_id: parseInt(id)
      };
    });

    return NextResponse.json(formattedBelgeler);
  } catch (error) {
    console.error('Belgeler getirme hatası:', error)
    return NextResponse.json({ error: 'Belgeler getirilemedi' }, { status: 500 })
  }
}