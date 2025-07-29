import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { validateAuthAndRole } from '@/middleware/auth';
import { validateFileUpload, generateSecureFileName, quarantineFile } from '@/lib/file-security';

export async function GET(request: NextRequest) {
  // 🛡️ KRİTİK GÜVENLİK: Authentication kontrolü - SADECE ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    console.log('🛡️ ADMIN SECURITY: Authorized admin accessing documents list:', {
      adminId: authResult.user?.id,
      adminEmail: authResult.user?.email,
      timestamp: new Date().toISOString()
    })

    const belgeler = await prisma.belge.findMany({
      include: {
        teacher: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      belgeler: belgeler
    });

  } catch (error) {
    console.error('Belgeler listeleme hatası:', error);
    return NextResponse.json(
      { error: 'Belgeler yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 🛡️ KRİTİK GÜVENLİK: Authentication kontrolü - ADMIN ve TEACHER
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    console.log('🛡️ FILE SECURITY: Starting secure admin document upload:', {
      adminId: authResult.user?.id,
      adminEmail: authResult.user?.email,
      timestamp: new Date().toISOString()
    })

    const formData = await request.formData();
    const isletmeId = formData.get('isletme_id') as string;
    const belgeTuru = formData.get('belge_turu') as string;
    const dosya = formData.get('dosya') as File;
    const ogretmenId = formData.get('ogretmen_id') as string;

    // Basic validation
    if (!belgeTuru || !dosya || !isletmeId) {
      return NextResponse.json({ error: 'İşletme ID, belge türü ve dosya gereklidir' }, { status: 400 });
    }

    // 🛡️ KRİTİK GÜVENLİK TARAMASI - Admin document uploads için
    const securityResult = await validateFileUpload(dosya, {
      maxSize: 10 * 1024 * 1024, // 10MB for admin document uploads
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      strictMode: true // Admin uploads için sıkı güvenlik
    })

    if (!securityResult.safe) {
      // Güvenli olmayan dosya - quarantine
      quarantineFile({
        originalName: dosya.name,
        adminId: authResult.user?.id,
        userEmail: authResult.user?.email,
        companyId: isletmeId
      }, securityResult.error || 'Security validation failed')
      
      console.error('🚨 FILE SECURITY: Malicious admin document blocked:', {
        fileName: dosya.name,
        adminId: authResult.user?.id,
        companyId: isletmeId,
        error: securityResult.error,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { error: securityResult.error },
        { status: 400 }
      )
    }

    // Security warnings varsa logla
    if (securityResult.warnings && securityResult.warnings.length > 0) {
      console.warn('⚠️ FILE SECURITY: Admin document warnings:', {
        fileName: dosya.name,
        warnings: securityResult.warnings,
        adminId: authResult.user?.id
      })
    }

    console.log('✅ FILE SECURITY: Admin document passed security scan')

    // Türkçe karakterleri İngilizce karakterlere çeviren fonksiyon - işletme paneli ile tutarlı
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
    
    // Generate SECURE filename with hash
    const secureFileName = generateSecureFileName(
      dosya.name,
      securityResult.fileInfo?.hash || 'unknown'
    )
    
    // Dosya uzantısını al - secure filename'den
    const fileExtension = path.extname(secureFileName);
    const tarih = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı

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
      // İşletme paneli ile tutarlı dosya isimlendirme
      yeniDosyaAdi = `${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(`${ogretmen.name}_${ogretmen.surname}`)}_${tarih}${fileExtension}`;

      // Öğretmen belgesi için yeni Belge tablosunu kullan
      yeniBelge = await (prisma as any).belge.create({
        data: {
          ad: belgeTuru,
          belgeTuru: belgeTuru,
          dosyaUrl: `/uploads/belgeler/${yeniDosyaAdi}`,
          dosyaAdi: yeniDosyaAdi, // Yeni dosya adını kaydet, orijinal değil
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
      // İşletme paneli ile tutarlı dosya isimlendirme
      yeniDosyaAdi = `${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(isletme.contact)}_${tarih}${fileExtension}`;

      // İşletme belgesi için yeni Belge tablosunu kullan
      yeniBelge = await (prisma as any).belge.create({
        data: {
          ad: belgeTuru,
          belgeTuru: belgeTuru,
          dosyaUrl: `/uploads/belgeler/${yeniDosyaAdi}`,
          dosyaAdi: yeniDosyaAdi, // Yeni dosya adını kaydet, orijinal değil
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

    // Log successful secure upload
    console.log('✅ FILE SECURITY: Secure admin document upload completed:', {
      originalName: dosya.name,
      secureFileName: yeniDosyaAdi,
      fileHash: securityResult.fileInfo?.hash?.substring(0, 16) + '...',
      adminId: authResult.user?.id,
      companyId: isletmeId,
      timestamp: new Date().toISOString()
    })

    // Dosya URL'si
    const dosyaUrl = `/uploads/belgeler/${yeniDosyaAdi}`;

    // Response formatı - frontend Belge interface'i ile uyumlu
    const response = {
      id: yeniBelge.id,
      isletme_ad: isletme.name,
      dosya_adi: yeniDosyaAdi, // Yeni dosya adını response'ta da kullan
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