import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Belge yükleme başlıyor, işletme ID:', id)
    
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

    // Dosya uzantısını al
    const fileExtension = path.extname(dosya.name)
    const tarih = new Date().toISOString().split('T')[0] // YYYY-MM-DD formatı

    const yeniDosyaAdi = `${sanitizeName(belgeTuru)}_${sanitizeName(isletme.name)}_${sanitizeName(isletme.contact)}_${tarih}${fileExtension}`
    console.log('Oluşturulan dosya adı:', yeniDosyaAdi)

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
      console.log('Dosya başarıyla kaydedildi')
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
          dosyaAdi: dosya.name,
          yuklenenTaraf: "isletme",
          isletmeId: id
        }
      })
      console.log('Veritabanı kaydı oluşturuldu:', yeniBelge.id)
    
      // Response formatı
      const response = {
        id: yeniBelge.id,
        ad: dosya.name.split('.')[0], // Dosya adından uzantıyı çıkar
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
        isletmeId: id,
        yuklenenTaraf: 'isletme'
      }
    })

    if (!belge) {
      return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })
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