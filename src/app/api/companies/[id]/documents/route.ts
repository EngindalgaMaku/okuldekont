import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { validateAuthAndRole } from '@/middleware/auth'
import { validateFileUpload, generateSecureFileName, quarantineFile } from '@/lib/file-security'

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 🛡️ KRİTİK GÜVENLİK: Authentication kontrolü
    const authResult = await validateAuthAndRole(request, ['COMPANY', 'ADMIN'])
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // İşletme yetkisi kontrolü - sadece kendi belgelerini yükleyebilir
    if (authResult.user.role === 'COMPANY' && authResult.user.companyId !== id) {
      console.error('🚨 SECURITY: Unauthorized company document access attempt:', {
        requestedCompanyId: id,
        userCompanyId: authResult.user.companyId,
        userEmail: authResult.user.email,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Bu işletmenin belgelerini yükleme yetkiniz yok' }, { status: 403 })
    }

    console.log('🛡️ FILE SECURITY: Starting secure company document upload:', {
      companyId: id,
      userEmail: authResult.user.email,
      userRole: authResult.user.role,
      timestamp: new Date().toISOString()
    })
    
    const formData = await request.formData()
    
    const belgeTuru = formData.get('belge_turu') as string
    const dosya = formData.get('dosya') as File

    console.log('FormData içeriği:', {
      belgeTuru,
      dosyaAdi: dosya?.name,
      dosyaBoyutu: dosya?.size
    })

    if (!belgeTuru || !dosya) {
      console.log('Eksik alan:', { belgeTuru: !!belgeTuru, dosya: !!dosya })
      return NextResponse.json({ error: 'Belge türü ve dosya gereklidir' }, { status: 400 })
    }

    // 🛡️ KRİTİK GÜVENLİK TARAMASI - Company documents için
    const securityResult = await validateFileUpload(dosya, {
      maxSize: 5 * 1024 * 1024, // 5MB limit for documents
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      strictMode: true // Company documents için sıkı güvenlik
    })

    if (!securityResult.safe) {
      // Güvenli olmayan dosya - quarantine
      quarantineFile({
        originalName: dosya.name,
        companyId: id,
        userEmail: authResult.user?.email
      }, securityResult.error || 'Security validation failed')
      
      console.error('🚨 FILE SECURITY: Malicious company document blocked:', {
        fileName: dosya.name,
        companyId: id,
        userEmail: authResult.user.email,
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
      console.warn('⚠️ FILE SECURITY: Company document warnings:', {
        fileName: dosya.name,
        warnings: securityResult.warnings,
        companyId: id
      })
    }

    console.log('✅ FILE SECURITY: Company document passed security scan')

    // Türkçe karakterleri İngilizce karakterlere çeviren fonksiyon
    const sanitizeName = (name: string) => {
      const turkishToEnglish: { [key: string]: string } = {
        'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U',
        'ş': 's', 'Ş': 'S',
        'ı': 'i', 'I': 'I',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C'
      }
      
      return name
        .replace(/[ğĞüÜşŞıIöÖçÇ]/g, (match) => turkishToEnglish[match] || match)
        .replace(/\s+/g, '_')
        .replace(/[^\w\-_.]/g, '')
        .toLowerCase()
    }

    // İşletme bilgisini al
    const isletme = await prisma.companyProfile.findUnique({
      where: { id },
      select: { name: true, contact: true }
    })

    if (!isletme) {
      return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 })
    }

    // Generate SECURE filename with hash
    const secureFileName = generateSecureFileName(
      dosya.name,
      securityResult.fileInfo?.hash || 'unknown'
    )
    
    // Dosya uzantısını al
    const fileExtension = path.extname(secureFileName)
    const tarih = new Date().toISOString().split('T')[0] // YYYY-MM-DD formatı

    const yeniDosyaAdi = `${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(isletme.contact)}_${tarih}${fileExtension}`
    console.log('🛡️ FILE SECURITY: Secure company document filename generated:', {
      original: dosya.name,
      secure: yeniDosyaAdi,
      hash: securityResult.fileInfo?.hash?.substring(0, 16) + '...'
    })

    // Dosyayı kaydet
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'belgeler')
    console.log('Upload dizini:', uploadDir)
    
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('Upload dizini oluşturuldu/kontrol edildi')
    } catch (error) {
      console.log('Klasör oluşturma hatası (normal olabilir):', error)
    }

    const filePath = path.join(uploadDir, yeniDosyaAdi)
    console.log('Dosya yolu:', filePath)
    
    try {
      const bytes = await dosya.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      await writeFile(filePath, buffer)
      
      // Log successful secure upload
      console.log('✅ FILE SECURITY: Secure company document upload completed:', {
        originalName: dosya.name,
        secureFileName: yeniDosyaAdi,
        fileHash: securityResult.fileInfo?.hash?.substring(0, 16) + '...',
        companyId: id,
        uploadedBy: authResult.user.email,
        timestamp: new Date().toISOString()
      })
    } catch (fileError) {
      console.error('Dosya kaydetme hatası:', fileError)
      throw new Error(`Dosya kaydetme hatası: ${fileError}`)
    }

    // Dosya URL'si
    const dosyaUrl = `/uploads/belgeler/${yeniDosyaAdi}`

    // İşletme belgesi için GorevBelgesi tablosunu kullan - dosya adını da sakla
    try {
      // Geçici çözüm: Mevcut bir öğretmen ID'si bul
      const firstTeacher = await prisma.teacherProfile.findFirst({
        select: { id: true }
      })
      
      if (!firstTeacher) {
        throw new Error('Sistemde öğretmen bulunamadı. Lütfen önce öğretmen ekleyin.')
      }
      
      const yeniBelge = await (prisma as any).belge.create({
        data: {
          ad: belgeTuru,
          belgeTuru: belgeTuru,
          dosyaUrl: dosyaUrl,
          dosyaAdi: yeniDosyaAdi, // Yeni dosya adını kaydet, orijinal değil
          yuklenenTaraf: "isletme",
          isletmeId: id
        }
      })
      console.log('Veritabanı kaydı oluşturuldu:', yeniBelge.id)
    
      // Response formatı
      const response = {
        id: yeniBelge.id,
        ad: yeniDosyaAdi.split('.')[0], // Yeni dosya adından uzantıyı çıkar
        tur: belgeTuru,
        isletme_id: parseInt(id),
        dosya_url: dosyaUrl,
        yukleme_tarihi: new Date().toISOString(),
        yukleyen_kisi: `${isletme.contact} (İşletme)`
      }

      return NextResponse.json(response)
    } catch (dbError) {
      console.error('Veritabanı hatası:', dbError)
      throw new Error(`Veritabanı hatası: ${dbError}`)
    }
  } catch (error) {
    console.error('Belge yükleme hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // İşletme belgelerini yeni Belge tablosundan getir - hem işletme hem öğretmen yüklemeleri
    const belgeler = await (prisma as any).belge.findMany({
      where: {
        isletmeId: id
        // yuklenenTaraf kısıtlamasını kaldır - hem 'isletme' hem 'ogretmen' yüklemelerini dahil et
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
    const formattedBelgeler = await Promise.all(belgeler.map(async (belge: any) => {
      let yukleyenKisi = `${isletme.contact} (İşletme)`;
      
      // Eğer öğretmen yüklemişse, öğretmen bilgisini al
      if (belge.yuklenenTaraf === 'ogretmen' && belge.ogretmenId) {
        const ogretmen = await prisma.teacherProfile.findUnique({
          where: { id: belge.ogretmenId },
          select: { name: true, surname: true }
        });
        
        if (ogretmen) {
          yukleyenKisi = `${ogretmen.name} ${ogretmen.surname} (Öğretmen)`;
        }
      }
      
      return {
        id: belge.id,
        ad: belge.ad, // Belge adı
        tur: belge.belgeTuru, // Belge türü
        dosya_url: belge.dosyaUrl, // Dosya yolu
        yukleme_tarihi: belge.createdAt.toISOString(),
        yukleyen_kisi: yukleyenKisi,
        yuklenen_taraf: belge.yuklenenTaraf, // Silme kontrolü için
        isletme_id: parseInt(id)
      };
    }));

    const response = NextResponse.json(formattedBelgeler);
    
    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Belgeler getirme hatası:', error)
    return NextResponse.json({ error: 'Belgeler getirilemedi' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const belgeId = url.searchParams.get('belgeId')

    if (!belgeId) {
      return NextResponse.json({ error: 'Belge ID gereklidir' }, { status: 400 })
    }

    // Belgenin varlığını kontrol et
    const belge = await (prisma as any).belge.findFirst({
      where: {
        id: belgeId,
        isletmeId: id
      }
    })

    if (!belge) {
      return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })
    }

    // Öğretmen tarafından yüklenen belgeleri işletme silemez
    if (belge.yuklenenTaraf === 'ogretmen') {
      return NextResponse.json({
        error: 'Öğretmen tarafından yüklenen belgeler işletme tarafından silinemez'
      }, { status: 403 })
    }

    // Belgeyi sil
    await (prisma as any).belge.delete({
      where: {
        id: belgeId
      }
    })

    return NextResponse.json({ message: 'Belge başarıyla silindi' })
  } catch (error) {
    console.error('Belge silme hatası:', error)
    return NextResponse.json({ error: 'Belge silinemedi' }, { status: 500 })
  }
}