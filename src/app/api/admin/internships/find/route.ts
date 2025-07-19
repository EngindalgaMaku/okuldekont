import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ogrenci_id = searchParams.get('ogrenci_id');
    const isletme_id = searchParams.get('isletme_id');
    
    if (!ogrenci_id || !isletme_id) {
      return NextResponse.json({ error: 'ogrenci_id ve isletme_id gerekli' }, { status: 400 });
    }

    const staj = await prisma.staj.findFirst({
      where: {
        studentId: ogrenci_id,
        companyId: isletme_id
      },
      select: {
        id: true
      }
    });

    if (!staj) {
      return NextResponse.json({ error: 'Staj bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ id: staj.id });
  } catch (error) {
    console.error('Staj ID bulma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}