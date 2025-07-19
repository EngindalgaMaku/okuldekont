import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // İşletme belgelerini GorevBelgesi tablosundan getir
    const belgeler = await prisma.gorevBelgesi.findMany({
      where: {
        isletmeIdler: id,
        hafta: 'isletme-belge' // İşletme belgelerini ayırt etmek için
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
    const formattedBelgeler = belgeler.map(belge => {
      // Dosya adından belge türünü ve bilgileri çıkar
      const dosyaAdi = belge.durum === 'yuklenmiş' ? 'belge' : belge.durum;
      
      return {
        id: belge.id,
        ad: dosyaAdi,
        tur: 'isletme-belge',
        dosya_url: `/uploads/belgeler/${dosyaAdi}`, // Bu URL gerçek dosya yolu ile güncellenebilir
        yukleme_tarihi: belge.createdAt.toISOString(),
        yukleyen_kisi: `${isletme.contact} (İşletme)`
      };
    });

    return NextResponse.json(formattedBelgeler);
  } catch (error) {
    console.error('Belgeler getirme hatası:', error)
    return NextResponse.json({ error: 'Belgeler getirilemedi' }, { status: 500 })
  }
}