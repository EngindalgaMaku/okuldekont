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

    // Öğretmenin sorumlu olduğu stajların tüm dekontlarını getir (işletme yüklü dahil)
    const dekontlar = await prisma.dekont.findMany({
      where: {
        staj: {
          teacherId: id
        }
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
                name: true,
                contact: true
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

    // Status mapping from database enum to Turkish frontend values
    const statusMapping: {[key: string]: string} = {
      'PENDING': 'bekliyor',
      'APPROVED': 'onaylandi',
      'REJECTED': 'reddedildi'
    };

    // Formatla
    const formattedDekontlar = dekontlar.map((d: any) => ({
      id: d.id,
      isletme_ad: d.staj.company.name,
      ogrenci_ad: `${d.staj.student.name} ${d.staj.student.surname}`,
      miktar: d.amount,
      odeme_tarihi: d.paymentDate,
      onay_durumu: statusMapping[d.status as string] || d.status,
      ay: d.month,
      yil: d.year,
      dosya_url: d.fileUrl,
      aciklama: d.rejectReason,
      red_nedeni: d.rejectReason,
      // Gerçek yükleyiciyi belirle
      yukleyen_kisi: d.teacherId
        ? (d.teacher ? `${d.teacher.name} ${d.teacher.surname} (Öğretmen)` : 'Öğretmen')
        : (d.staj?.company?.contact
          ? `${d.staj.company.contact} (İşletme)`
          : 'İşletme Yetkilisi (İşletme)'),
      created_at: d.createdAt
    }));

    return NextResponse.json(formattedDekontlar);
  } catch (error) {
    console.error('Öğretmen dekontları getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}