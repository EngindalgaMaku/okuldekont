import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { generateDekontFileName, DekontNamingData } from '@/utils/dekontNaming'

// Next.js cache'ini devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dekontlar = await prisma.dekont.findMany({
      where: {
        companyId: id
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
        staj: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const transformedDekontlar = dekontlar.map((dekont: any) => ({
      id: dekont.id,
      companyId: dekont.companyId,
      staj_id: dekont.stajId,
      ay: dekont.month,
      yil: dekont.year,
      miktar: dekont.amount ? parseFloat(dekont.amount.toString()) : null,
      aciklama: `${dekont.student.name} ${dekont.student.surname} - ${dekont.month}/${dekont.year}`,
      dosya_url: dekont.fileUrl,
      onay_durumu: dekont.status === 'APPROVED' ? 'onaylandi' :
                   dekont.status === 'REJECTED' ? 'reddedildi' : 'bekliyor',
      red_nedeni: dekont.rejectReason,
      yukleyen_kisi: 'İşletme',
      odeme_tarihi: dekont.paymentDate.toISOString(),
      created_at: dekont.createdAt || new Date().toISOString(),
      // Nested relations for compatibility
      stajlar: {
        ogrenciler: {
          ad: dekont.student.name || '',
          soyad: dekont.student.surname || '',
          sinif: dekont.student.className || '',
          no: dekont.student.number || '',
          alanlar: dekont.student.alan ? { ad: dekont.student.alan.name } : { ad: '' }
        }
      }
    }))

    const response = NextResponse.json(transformedDekontlar);
    
    // Cache-control headers - mobil cache sorununu çözmek için
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching dekontlar:', error)
    return NextResponse.json({ error: 'Failed to fetch dekontlar' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const formData = await request.formData()
    
    const stajId = formData.get('staj_id') as string
    const ay = parseInt(formData.get('ay') as string)
    const yil = parseInt(formData.get('yil') as string)
    const aciklama = formData.get('aciklama') as string
    const miktar = parseFloat(formData.get('miktar') as string) || null
    const dosya = formData.get('dosya') as File

    if (!stajId || !ay || !yil) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      )
    }

    // Verify the staj belongs to this company and get related data
    const staj = await prisma.staj.findFirst({
      where: {
        id: stajId,
        companyId: companyId
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
        company: {
          select: {
            name: true
          }
        }
      }
    })

    if (!staj) {
      return NextResponse.json(
        { error: 'Staj bulunamadı veya bu işletmeye ait değil' },
        { status: 404 }
      )
    }

    // Tarih validasyonu 1: Mevcut ay ve gelecek aylar için dekont yüklenemez (öğrenciler önceki ayın maaşını alır)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    if (yil > currentYear || (yil === currentYear && ay >= currentMonth)) {
      return NextResponse.json(
        {
          error: `Mevcut ay (${currentMonth}/${currentYear}) ve gelecek aylar için dekont yükleyemezsiniz. Öğrenciler sadece önceki ayın maaşını alır.`
        },
        { status: 400 }
      )
    }

    // Tarih validasyonu 2: Öğrenci başlangıç tarihinden önce dekont yüklenemez
    const startDate = new Date(staj.startDate)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth() + 1
    
    if (yil < startYear || (yil === startYear && ay < startMonth)) {
      return NextResponse.json(
        {
          error: `${staj.student.name} ${staj.student.surname} ${startDate.toLocaleDateString('tr-TR')} tarihinde işe başlamış. Bu tarihten önceki aylar için dekont yükleyemezsiniz.`
        },
        { status: 400 }
      )
    }

    // Handle file upload to local storage
    let fileUrl = null
    if (dosya && dosya.size > 0) {
      try {
        console.log('📁 Dosya yükleme başlıyor:', {
          fileName: dosya.name,
          fileSize: dosya.size,
          fileType: dosya.type
        })

        // Dosya boyutu kontrolü (max 10MB)
        if (dosya.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Dosya boyutu çok büyük (maksimum 10MB)' },
            { status: 400 }
          )
        }

        // Dosya türü kontrolü
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if (!allowedTypes.includes(dosya.type)) {
          return NextResponse.json(
            { error: 'Desteklenmeyen dosya türü (sadece PDF, JPG, PNG)' },
            { status: 400 }
          )
        }

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dekontlar')
        await mkdir(uploadDir, { recursive: true })
        console.log('📁 Upload dizini oluşturuldu:', uploadDir)
        
        // Check for existing dekontlar for this month to handle additional dekontlar
        const existingDekontlar = await prisma.dekont.findMany({
          where: {
            stajId: stajId,
            month: ay,
            year: yil
          }
        })

        // Generate meaningful filename
        const dekontNamingData: DekontNamingData = {
          studentName: staj.student.name,
          studentSurname: staj.student.surname,
          studentClass: staj.student.className,
          studentNumber: staj.student.number || undefined,
          fieldName: staj.student.alan?.name || 'Bilinmeyen',
          companyName: staj.company.name,
          month: ay,
          year: yil,
          originalFileName: dosya.name,
          isAdditional: existingDekontlar.length > 0,
          additionalIndex: existingDekontlar.length + 1
        }

        const fileName = generateDekontFileName(dekontNamingData)
        const filePath = path.join(uploadDir, fileName)
        
        console.log('📁 Dosya adı oluşturuldu:', fileName)
        console.log('📁 Dosya yolu:', filePath)
        
        // Convert File to Buffer and save
        const bytes = await dosya.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)
        
        // Dosya gerçekten oluşturuldu mu kontrol et
        const fs = require('fs')
        if (!fs.existsSync(filePath)) {
          throw new Error('Dosya kaydedilemedi')
        }
        
        const fileStats = fs.statSync(filePath)
        console.log('📁 Dosya başarıyla kaydedildi:', {
          path: filePath,
          size: fileStats.size
        })
        
        // Set public URL
        fileUrl = `/uploads/dekontlar/${fileName}`
        
        console.log('✅ Dosya yükleme tamamlandı:', fileUrl)
      } catch (fileError) {
        console.error('❌ Dosya yükleme hatası:', fileError)
        const errorMessage = fileError instanceof Error ? fileError.message : 'Bilinmeyen hata'
        return NextResponse.json(
          { error: `Dosya yüklenemedi: ${errorMessage}` },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Dosya seçilmedi veya dosya boş' },
        { status: 400 }
      )
    }

    // Create the dekont with conditional teacherId
    const dekontData: any = {
      stajId: stajId,
      studentId: staj.studentId,
      companyId: companyId,
      month: ay,
      year: yil,
      amount: miktar,
      fileUrl: fileUrl,
      status: 'PENDING',
      paymentDate: new Date()
    };
    
    // Only include teacherId if it exists
    if (staj.teacherId) {
      dekontData.teacherId = staj.teacherId;
    }
    
    const newDekont = await prisma.dekont.create({
      data: dekontData
    })

    // Student info is already available from staj relation
    const student = staj.student

    // Format response to match frontend expectations
    const formattedDekont = {
      id: newDekont.id,
      ogrenci_adi: student ? `${student.name} ${student.surname}` : '',
      miktar: newDekont.amount,
      odeme_tarihi: newDekont.paymentDate,
      onay_durumu: newDekont.status === 'APPROVED' ? 'onaylandi' :
                  newDekont.status === 'REJECTED' ? 'reddedildi' : 'bekliyor',
      aciklama: aciklama,
      dosya_url: newDekont.fileUrl,
      ay: newDekont.month,
      yil: newDekont.year,
      staj_id: newDekont.stajId,
      yukleyen_kisi: 'İşletme',
      created_at: newDekont.createdAt,
      stajlar: {
        ogrenciler: {
          ad: student?.name || '',
          soyad: student?.surname || '',
          sinif: student?.className || '',
          no: student?.number || '',
          alanlar: student?.alan ? { ad: student.alan.name } : { ad: '' }
        }
      }
    }

    return NextResponse.json(formattedDekont)
  } catch (error) {
    console.error('Dekont creation error:', error)
    return NextResponse.json(
      { error: 'Dekont oluşturulamadı' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const { searchParams } = new URL(request.url)
    const dekontId = searchParams.get('dekontId')

    if (!dekontId) {
      return NextResponse.json({ error: 'Dekont ID gerekli' }, { status: 400 })
    }

    // Verify the dekont belongs to this company and can be deleted
    const dekont = await prisma.dekont.findFirst({
      where: {
        id: dekontId,
        companyId: companyId,
        status: {
          in: ['PENDING', 'REJECTED'] // Only allow deleting pending or rejected dekontlar
        }
      }
    })

    if (!dekont) {
      return NextResponse.json(
        { error: 'Dekont bulunamadı veya silinemez (onaylanmış dekontlar silinemez)' },
        { status: 404 }
      )
    }

    // Delete physical file if exists
    if (dekont.fileUrl) {
      try {
        const fs = require('fs').promises
        const filePath = path.join(process.cwd(), 'public', dekont.fileUrl)
        
        // Check if file exists before attempting to delete
        try {
          await fs.access(filePath)
          await fs.unlink(filePath)
          console.log('Dekont dosyası silindi:', filePath)
        } catch (fileError) {
          // File doesn't exist or cannot be deleted, continue anyway
          console.warn('Dekont dosyası silinemedi veya bulunamadı:', filePath, fileError)
        }
      } catch (error) {
        console.error('Dosya silme hatası:', error)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the dekont from database
    await prisma.dekont.delete({
      where: {
        id: dekontId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dekont deletion error:', error)
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}