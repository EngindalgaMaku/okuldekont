import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuthAndRole } from '@/middleware/auth';
import { getActiveEducationYearId } from '@/lib/education-year';

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // KRİTİK KVKK KORUMA: Şirket öğrenci kişisel verileri - SADECE ADMIN ve İLGİLİ COMPANY
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'COMPANY'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  
  // Company kullanıcısı sadece kendi öğrencilerine erişebilir
  if (authResult.user?.role === 'COMPANY' && authResult.user?.id !== id) {
    return NextResponse.json(
      { error: 'Bu şirketin öğrenci verilerine erişim yetkiniz yok' },
      { status: 403 }
    )
  }

  // KVKK compliance logging
  console.log(`🔒 KVKK: ${authResult.user?.role} ${authResult.user?.email} accessing company student data`, {
    companyId: id,
    timestamp: new Date().toISOString(),
    action: 'VIEW_COMPANY_STUDENTS'
  })

  try {
    const { searchParams } = new URL(request.url)
    const educationYearIdParam = searchParams.get('educationYearId')
    const educationYearId = educationYearIdParam || await getActiveEducationYearId()

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Şirketin öğrencilerini getir (aktif eğitim yılına göre filtreli)
    const students = await prisma.staj.findMany({
      where: {
        companyId: id,
        status: 'ACTIVE',
        educationYearId: educationYearId,
        archived: false
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