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

    // 1. Görev belgesini getir
    const gorevBelgesi = await (prisma.gorevBelgesi as any).findUnique({
      where: { id },
      select: {
        ogretmenId: true,
        hafta: true,
        isletmeIdler: true,
        barcode: true
      }
    });

    if (!gorevBelgesi) {
      return NextResponse.json({ error: 'Görev belgesi bulunamadı' }, { status: 404 });
    }

    // 2. Öğretmen bilgilerini getir
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: gorevBelgesi.ogretmenId },
      include: {
        alan: {
          select: { name: true }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
    }

    // 3. Öğretmenin stajlarını getir (işletme ve öğrenci bilgileriyle)
    const stajlar = await prisma.staj.findMany({
      where: { teacherId: gorevBelgesi.ogretmenId },
      include: {
        company: {
          select: { id: true, name: true }
        },
        student: {
          select: { 
            id: true,
            name: true,
            surname: true,
            number: true,
            className: true
          }
        }
      }
    });

    // 4. Koordinatörlük programını oluştur - seçili işletmeler için
    const isletmeIdler = gorevBelgesi.isletmeIdler ? JSON.parse(gorevBelgesi.isletmeIdler) : [];
    const koordinatorlukProgrami: any[] = [];
    
    // Her seçili işletme için default program oluştur
    isletmeIdler.forEach((isletmeId: string) => {
      // Haftalık varsayılan program (Pazartesi-Cuma)
      ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].forEach(gun => {
        koordinatorlukProgrami.push({
          id: `${isletmeId}-${gun}`,
          isletme_id: isletmeId,
          gun: gun,
          saat_araligi: '08:00-16:00'
        });
      });
    });

    // 5. Deputy head name'i getir
    const deputyHeadSetting = await prisma.systemSetting.findUnique({
      where: { key: 'coordinator_deputy_head_name' }
    });

    // 6. Veriyi formatla
    const ogretmenDetay = {
      ad: teacher.name,
      soyad: teacher.surname,
      alan: { ad: teacher.alan?.name || '' },
      stajlar: stajlar.map(staj => ({
        isletme_id: staj.companyId,
        isletmeler: staj.company ? {
          id: staj.company.id,
          ad: staj.company.name
        } : null,
        ogrenciler: staj.student ? {
          id: staj.student.id,
          ad: staj.student.name,
          soyad: staj.student.surname,
          no: staj.student.number,
          sinif: staj.student.className
        } : null
      })),
      koordinatorluk_programi: koordinatorlukProgrami
    };

    const responseData = {
      belgeData: {
        hafta: gorevBelgesi.hafta,
        isletme_idler: gorevBelgesi.isletmeIdler ? JSON.parse(gorevBelgesi.isletmeIdler) : [],
        barcode: (gorevBelgesi as any).barcode || null
      },
      ogretmenDetay,
      deputyHeadName: deputyHeadSetting?.value || ''
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Print data getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}