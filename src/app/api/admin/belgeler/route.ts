import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const isletmeId = formData.get('isletme_id') as string;
    const belgeTuru = formData.get('belge_turu') as string;
    const dosya = formData.get('dosya') as File;
    const ogretmenId = formData.get('ogretmen_id') as string;

    // Türkçe karakterleri İngilizce karakterlere çeviren ve boşlukları alt çizgi ile değiştiren fonksiyon
    const sanitizeName = (name: string) => {
      const turkishToEnglish: { [key: string]: string } = {
        'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U',
        'ş': 's', 'Ş': 'S',
        'ı': 'i', 'I': 'I',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C'
      };
      
      return name
        .replace(/[ğĞüÜşŞıIöÖçÇ]/g, (match) => turkishToEnglish[match] || match)
        .replace(/\s+/g, '_')
        .replace(/[^\w\-_.]/g, '')
        .toLowerCase();
    };

    // Dosya uzantısını al
    const fileExtension = path.extname(dosya.name);
    const tarih = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
    const timestamp = Date.now(); // Benzersizlik için timestamp ekle

    // İşletme bilgisini al
    const isletme = await prisma.companyProfile.findUnique({
      where: { id: isletmeId },
      select: { name: true, contact: true }
    });

    if (!isletme) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });
    }

    let yeniDosyaAdi: string;
    let yukleyenKisi: string;
    let yeniBelge: any;

    if (ogretmenId) {
      // Öğretmen yüklemesi
      if (!belgeTuru || !dosya) {
        return NextResponse.json({ error: 'Belge türü ve dosya gereklidir' }, { status: 400 });
      }

      const ogretmen = await prisma.teacherProfile.findUnique({
        where: { id: ogretmenId },
        select: { name: true, surname: true }
      });

      if (!ogretmen) {
        return NextResponse.json({ error: 'Öğretmen bulunamadı' }, { status: 404 });
      }

      yukleyenKisi = `${ogretmen.name} ${ogretmen.surname} (Öğretmen)`;
      yeniDosyaAdi = `${timestamp}_belge_${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(ogretmen.name + '_' + ogretmen.surname)}_${tarih}${fileExtension}`;

      // Öğretmen belgesi için yeni Belge tablosunu kullan
      yeniBelge = await (prisma as any).belge.create({
        data: {
          ad: belgeTuru,
          belgeTuru: belgeTuru,
          dosyaUrl: `/uploads/belgeler/${yeniDosyaAdi}`,
          dosyaAdi: dosya.name,
          yuklenenTaraf: "ogretmen",
          ogretmenId: ogretmenId,
          isletmeId: isletmeId
        }
      });
    } else {
      // İşletme yüklemesi
      if (!belgeTuru || !dosya) {
        return NextResponse.json({ error: 'Belge türü ve dosya gereklidir' }, { status: 400 });
      }

      yukleyenKisi = `${isletme.contact} (İşletme)`;
      yeniDosyaAdi = `${timestamp}_belge_${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(isletme.contact)}_${tarih}${fileExtension}`;

      // İşletme belgesi için yeni Belge tablosunu kullan
      yeniBelge = await (prisma as any).belge.create({
        data: {
          ad: belgeTuru,
          belgeTuru: belgeTuru,
          dosyaUrl: `/uploads/belgeler/${yeniDosyaAdi}`,
          dosyaAdi: dosya.name,
          yuklenenTaraf: "isletme",
          isletmeId: isletmeId
        }
      });
    }

    // Dosyayı kaydet
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'belgeler');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Klasör zaten varsa hata verme
    }

    const filePath = path.join(uploadDir, yeniDosyaAdi);
    const bytes = await dosya.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Dosya URL'si
    const dosyaUrl = `/uploads/belgeler/${yeniDosyaAdi}`;

    // Response formatı - frontend Belge interface'i ile uyumlu
    const response = {
      id: yeniBelge.id,
      isletme_ad: isletme.name,
      dosya_adi: dosya.name,
      dosya_url: dosyaUrl,
      belge_turu: belgeTuru,
      yukleme_tarihi: new Date().toISOString(),
      yukleyen_kisi: yukleyenKisi,
      status: yeniBelge.status || 'PENDING',
      onaylanma_tarihi: yeniBelge.onaylanmaTarihi,
      red_nedeni: yeniBelge.redNedeni
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Belge yükleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}