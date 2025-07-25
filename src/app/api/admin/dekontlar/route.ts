import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Dekontları listele
export async function GET() {
  try {
    const rawData = await prisma.dekont.findMany({
      include: {
        staj: {
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
            company: {
              select: {
                name: true,
                contact: true
              }
            },
            teacher: {
              select: {
                name: true,
                surname: true
              }
            }
          }
        },
        company: {
          select: {
            name: true,
            contact: true,
            teacher: {
              select: {
                name: true,
                surname: true
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
    })

    // Status mapping from database enum to Turkish frontend values
    const statusMapping = {
      'PENDING': 'bekliyor',
      'APPROVED': 'onaylandi',
      'REJECTED': 'reddedildi'
    };

    // Format data to match frontend interface
    const formattedData = rawData.map(dekont => ({
      id: dekont.id,
      isletme_ad: dekont.company?.name || dekont.staj?.company?.name || 'Bilinmiyor',
      koordinator_ogretmen: dekont.company?.teacher ? `${dekont.company.teacher.name} ${dekont.company.teacher.surname}` :
                           (dekont.staj?.teacher ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}` : 'Bilinmiyor'),
      ogrenci_ad: dekont.staj?.student ? `${dekont.staj.student.name} ${dekont.staj.student.surname}` : 'Bilinmiyor',
      ogrenci_sinif: dekont.staj?.student?.className || '',
      ogrenci_no: dekont.staj?.student?.number || '',
      miktar: dekont.amount ? Number(dekont.amount) : null,
      odeme_tarihi: dekont.paymentDate.toISOString(),
      onay_durumu: statusMapping[dekont.status] || dekont.status,
      ay: dekont.month,
      yil: dekont.year,
      dosya_url: dekont.fileUrl,
      aciklama: dekont.rejectReason,
      red_nedeni: dekont.rejectReason,
      yukleyen_kisi: dekont.teacher ? `${dekont.teacher.name} ${dekont.teacher.surname} (Öğretmen)` : 'Bilinmiyor',
      created_at: dekont.createdAt.toISOString()
    }))

    return NextResponse.json({ data: formattedData })
  } catch (error) {
    console.error('Dekont listesi alınırken hata:', error)
    return NextResponse.json(
      { error: 'Dekontlar alınırken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Yeni dekont ekle
export async function POST(request: Request) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    
    // Extract form fields
    const stajId = formData.get('staj_id') as string
    const miktar = formData.get('miktar') as string
    const ay = formData.get('ay') as string
    const yil = formData.get('yil') as string
    const aciklama = formData.get('aciklama') as string
    const ogretmenId = formData.get('ogretmen_id') as string
    const dosya = formData.get('dosya') as File
    
    console.log('Extracted form data:', {
      stajId,
      miktar,
      ay,
      yil,
      aciklama,
      ogretmenId,
      dosyaName: dosya?.name
    })
    
    // Validate required fields
    if (!stajId || !ogretmenId) {
      return NextResponse.json(
        { error: 'Staj ID ve öğretmen ID gerekli' },
        { status: 400 }
      )
    }
    
    // Get company and student IDs from staj first (needed for filename)
    const staj = await prisma.staj.findUnique({
      where: { id: stajId },
      include: {
        company: { select: { name: true } },
        student: { select: { name: true, surname: true } }
      }
    })
    
    if (!staj) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      )
    }
    
    // Dekont yükleme kuralları kontrolü
    const ayNum = ay ? parseInt(ay) : new Date().getMonth() + 1;
    const yilNum = yil ? parseInt(yil) : new Date().getFullYear();
    
    // Tarih validasyonu 1: Mevcut ay ve gelecek aylar için dekont yüklenemez (öğrenciler önceki ayın maaşını alır)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    if (yilNum > currentYear || (yilNum === currentYear && ayNum >= currentMonth)) {
      return NextResponse.json(
        {
          error: `Mevcut ay (${currentMonth}/${currentYear}) ve gelecek aylar için dekont yükleyemezsiniz. Öğrenciler sadece önceki ayın maaşını alır.`
        },
        { status: 400 }
      )
    }
    
    // Tarih validasyonu 2: Staj başlama tarihi kontrolü
    const stajBaslangic = new Date(staj.startDate);
    const dekontTarihi = new Date(yilNum, ayNum - 1, 1); // ayNum is 1-based, Date constructor expects 0-based
    
    if (dekontTarihi < stajBaslangic) {
      const stajBaslangicStr = stajBaslangic.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long'
      });
      const dekontTarihiStr = dekontTarihi.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long'
      });
      
      return NextResponse.json({
        error: `Staj başlama tarihinden (${stajBaslangicStr}) öncesine dekont yüklenemez. Seçilen ay: ${dekontTarihiStr}`
      }, { status: 400 });
    }
    
    // Bu öğrenci ve ay için mevcut dekontları kontrol et
    const mevcutDekontlar = await prisma.dekont.findMany({
      where: {
        studentId: staj.studentId,
        month: ayNum,
        year: yilNum
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Onaylanmış dekont varsa yükleme yapılamaz
    const onaylanmisDekont = mevcutDekontlar.find(d => d.status === 'APPROVED');
    if (onaylanmisDekont) {
      const ayAdi = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return NextResponse.json(
        { error: `${ayAdi[ayNum - 1]} ${yilNum} ayı için onaylanmış dekont bulunmaktadır. O ayla ilgili işlemler kapanmıştır.` },
        { status: 400 }
      )
    }
    
    // Beklemede dekont varsa ek dekont uyarısı ver
    const beklemedeDekont = mevcutDekontlar.find(d => d.status === 'PENDING');
    if (beklemedeDekont) {
      const ayAdi = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return NextResponse.json(
        {
          warning: `${ayAdi[ayNum - 1]} ${yilNum} ayı için zaten dekont var. Yükleyeceğiniz dekont ek dekont olarak eklenecektir.`,
          isEkDekont: true,
          mevcutDekontSayisi: mevcutDekontlar.length
        },
        { status: 409 }
      )
    }
    
    const isEkDekont = false;
    const ekSayisi = mevcutDekontlar.length;
    
    // Get teacher info for filename
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: ogretmenId },
      select: { name: true, surname: true }
    })
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Öğretmen bulunamadı' },
        { status: 404 }
      )
    }
    
    // Handle file upload if provided
    let fileUrl = null
    if (dosya && dosya.size > 0) {
      // Apply naming convention with ek dekont support
      const cleanName = (text: string) => text.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      const fileExt = dosya.name.split('.').pop();
      const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
                   'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
      const ayIndex = ay ? parseInt(ay) - 1 : new Date().getMonth();
      const yilFormatted = yil ? yil : new Date().getFullYear().toString();
      
      // Ek dekont isimlendirme mantığı
      let fileName = [
        'dekont',
        cleanName(ayAdi[ayIndex]),
        yilFormatted,
        cleanName(`${teacher.name}_${teacher.surname}`),
        cleanName(staj.company.name),
        cleanName(`${staj.student.name}_${staj.student.surname}`)
      ].join('_');
      
      // Ek dekont varsa dosya adına ek numarası ekle
      if (isEkDekont) {
        fileName += `_ek${ekSayisi + 1}`;
      }
      
      fileName += `.${fileExt}`;
      
      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'dekontlar');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Save file to filesystem
      const timestamp = Date.now();
      const finalFileName = `${timestamp}_${fileName}`;
      const filePath = join(uploadDir, finalFileName);
      const bytes = await dosya.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      fileUrl = `/uploads/dekontlar/${finalFileName}`;
      console.log('File saved as:', fileUrl);
    }
    
    // Create dekont data object matching Prisma schema
    const dekontData = {
      stajId: stajId,
      companyId: staj.companyId,
      teacherId: ogretmenId,
      studentId: staj.studentId,
      amount: miktar ? parseFloat(miktar) : null,
      paymentDate: new Date(),
      month: ay ? parseInt(ay) : new Date().getMonth() + 1,
      year: yil ? parseInt(yil) : new Date().getFullYear(),
      status: 'PENDING' as const,
      fileUrl: fileUrl
    }
    
    console.log('Final dekont data:', dekontData)
    
    const data = await prisma.dekont.create({
      data: dekontData,
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
            teacher: true
          }
        },
        company: true,
        teacher: true
      }
    })

    // Format the response to match what frontend expects
    const formattedData = {
      id: data.id,
      isletme_ad: data.staj.company.name,
      ogrenci_ad: `${data.staj.student.name} ${data.staj.student.surname}`,
      miktar: data.amount,
      odeme_tarihi: data.paymentDate,
      onay_durumu: data.status,
      ay: data.month,
      yil: data.year,
      dosya_url: data.fileUrl,
      aciklama: data.rejectReason,
      red_nedeni: data.rejectReason,
      yukleyen_kisi: data.teacher ? `${data.teacher.name} ${data.teacher.surname} (Öğretmen)` : 'Bilinmiyor',
      created_at: data.createdAt
    }

    return NextResponse.json({ data: formattedData })
  } catch (error) {
    console.error('Dekont eklenirken hata:', error)
    return NextResponse.json(
      { error: 'Dekont eklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Dekont güncelle
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    const data = await prisma.dekont.update({
      where: { id },
      data: updateData,
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
            teacher: true
          }
        },
        company: true,
        teacher: true
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Dekont güncellenirken hata:', error)
    return NextResponse.json(
      { error: 'Dekont güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

// Dekont sil
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Dekont ID\'si gerekli' },
        { status: 400 }
      )
    }

    await prisma.dekont.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dekont silinirken hata:', error)
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}