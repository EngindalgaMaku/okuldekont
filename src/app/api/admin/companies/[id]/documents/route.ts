import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // İşletme ile ilgili TÜM onaylanan belgeleri getir (hem işletme hem öğretmen tarafından yüklenen)
    const belgeler = await (prisma as any).belge.findMany({
      where: {
        isletmeId: id,
        status: 'APPROVED' // Sadece onaylanan belgeler
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
            contact: true
          }
        }
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
      // Yükleyen kişiyi belirle
      let yukleyenKisi = 'Bilinmiyor';
      if (belge.yuklenenTaraf === 'ogretmen' && belge.teacher) {
        yukleyenKisi = `${belge.teacher.name} ${belge.teacher.surname} (Öğretmen)`;
      } else if (belge.yuklenenTaraf === 'isletme' && belge.company) {
        yukleyenKisi = `${belge.company.contact} (İşletme)`;
      }

      return {
        id: belge.id,
        ad: belge.ad, // Belge adı
        tur: belge.belgeTuru, // Belge türü
        dosya_url: belge.dosyaUrl, // Dosya yolu
        yukleme_tarihi: belge.createdAt.toISOString(),
        yukleyen_kisi: yukleyenKisi,
        yuklenen_taraf: belge.yuklenenTaraf,
        status: belge.status,
        onaylanma_tarihi: belge.onaylanmaTarihi ? belge.onaylanmaTarihi.toISOString() : null,
        isletme_id: parseInt(id)
      };
    });

    return NextResponse.json(formattedBelgeler);
  } catch (error) {
    console.error('Belgeler getirme hatası:', error)
    return NextResponse.json({ error: 'Belgeler getirilemedi' }, { status: 500 })
  }
}