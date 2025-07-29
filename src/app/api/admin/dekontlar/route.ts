import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { validateAuthAndRole } from '@/middleware/auth'
import { encryptFinancialData, decryptFinancialData, maskFinancialData } from '@/lib/encryption'
import { validateAndSanitize, validateDekont, sanitizeString, ValidationFunctions } from '@/lib/validation'
import { validateFileUpload, generateSecureFileName, quarantineFile } from '@/lib/file-security'
import { generateDekontFileName, DekontNamingData } from '@/utils/dekontNaming'

// Dekontları listele - SADECE ADMIN
export async function GET(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

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

    // Format data to match frontend interface with decrypted financial data
    const formattedData = rawData.map(dekont => ({
      id: dekont.id,
      isletme_ad: dekont.company?.name || dekont.staj?.company?.name || 'Bilinmiyor',
      koordinator_ogretmen: dekont.company?.teacher ? `${dekont.company.teacher.name} ${dekont.company.teacher.surname}` :
                           (dekont.staj?.teacher ? `${dekont.staj.teacher.name} ${dekont.staj.teacher.surname}` : 'Bilinmiyor'),
      ogrenci_ad: dekont.staj?.student ? `${dekont.staj.student.name} ${dekont.staj.student.surname}` : 'Bilinmiyor',
      ogrenci_sinif: dekont.staj?.student?.className || '',
      ogrenci_no: dekont.staj?.student?.number || '',
      miktar: dekont.amount ? Number(decryptFinancialData(dekont.amount.toString())) : null,
      odeme_tarihi: dekont.paymentDate.toISOString(),
      onay_durumu: statusMapping[dekont.status] || dekont.status,
      ay: dekont.month,
      yil: dekont.year,
      dosya_url: dekont.fileUrl,
      aciklama: dekont.rejectReason,
      red_nedeni: dekont.rejectReason,
      yukleyen_kisi: dekont.teacher
        ? `${dekont.teacher.name} ${dekont.teacher.surname} (Öğretmen)`
        : (dekont.company?.contact
          ? `${dekont.company.contact} (İşletme)`
          : (dekont.staj?.company?.contact
            ? `${dekont.staj.company.contact} (İşletme)`
            : 'İşletme')),
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

// Yeni dekont ekle - SADECE ADMIN VE TEACHER
export async function POST(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Parse multipart form data
    const formData = await request.formData()
    
    // Extract form fields
    const stajId = formData.get('staj_id') as string
    const miktar = formData.get('miktar') as string
    const ay = parseInt(formData.get('ay') as string)
    const yil = parseInt(formData.get('yil') as string)
    const aciklama = formData.get('aciklama') as string
    const ogretmenId = formData.get('ogretmen_id') as string
    const dosya = formData.get('dosya') as File
    
    // INPUT VALIDATION & SANITIZATION
    console.log('Raw miktar value:', miktar, 'Type:', typeof miktar)
    
    // Miktar işleme - boş string, null, undefined, 0 durumlarını handle et
    let processedAmount: number | undefined = undefined
    if (miktar && typeof miktar === 'string' && miktar.trim() !== '') {
      const parsed = parseFloat(miktar.trim())
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        processedAmount = parsed
      } else {
        return NextResponse.json(
          { error: 'Geçersiz miktar formatı' },
          { status: 400 }
        )
      }
    }
    
    console.log('Processed amount:', processedAmount)
    
    // Staj ID validasyonu
    if (!stajId) {
      return NextResponse.json(
        { error: 'Staj ID gerekli' },
        { status: 400 }
      )
    }
    
    const stajIdValidation = ValidationFunctions.id(stajId)
    if (!stajIdValidation.valid) {
      return NextResponse.json(
        { error: `Staj ID hatası: ${stajIdValidation.error}` },
        { status: 400 }
      )
    }
    
    const dekontData = {
      stajId: sanitizeString(stajId),
      amount: processedAmount,
      month: ay || undefined,
      year: yil || undefined,
      description: aciklama ? sanitizeString(aciklama) : undefined
    }
    
    console.log('Dekont data for validation:', dekontData)
    
    // Validate dekont data
    const validationResult = validateDekont(dekontData)
    if (!validationResult.valid) {
      console.warn(`🛡️ VALIDATION: Dekont creation failed`, {
        errors: validationResult.errors,
        userId: authResult.user?.id
      })
      return NextResponse.json(
        { error: `Validation hatası: ${validationResult.errors.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate teacher ID
    if (!ogretmenId) {
      return NextResponse.json(
        { error: 'Öğretmen ID gerekli' },
        { status: 400 }
      )
    }
    
    const teacherIdValidation = ValidationFunctions.id(ogretmenId)
    if (!teacherIdValidation.valid) {
      return NextResponse.json(
        { error: teacherIdValidation.error },
        { status: 400 }
      )
    }
    
    console.log('✅ VALIDATION: Dekont data validated successfully')
    
    // Get company and student IDs from staj first (needed for filename)
    const staj = await prisma.staj.findUnique({
      where: { id: stajId },
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
    })
    
    if (!staj) {
      return NextResponse.json(
        { error: 'Staj bulunamadı' },
        { status: 404 }
      )
    }
    
    // Dekont yükleme kuralları kontrolü
    const ayNum = ay ? ay : new Date().getMonth() + 1;
    const yilNum = yil ? yil : new Date().getFullYear();
    
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
    
    // Handle SECURE file upload if provided
    let fileUrl = null
    if (dosya && dosya.size > 0) {
      console.log('🛡️ FILE SECURITY: Starting secure admin dekont upload:', {
        fileName: dosya.name,
        fileSize: dosya.size,
        fileType: dosya.type,
        uploadedBy: authResult.user?.email,
        timestamp: new Date().toISOString()
      })

      // KRİTİK GÜVENLİK TARAMASI - Admin dekont uploads için
      const securityResult = await validateFileUpload(dosya, {
        maxSize: 10 * 1024 * 1024, // 10MB for admin uploads
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        strictMode: true // Admin uploads için sıkı güvenlik
      })

      if (!securityResult.safe) {
        // Güvenli olmayan dosya - quarantine
        quarantineFile({
          originalName: dosya.name,
          adminId: authResult.user?.id,
          userEmail: authResult.user?.email
        }, securityResult.error || 'Security validation failed')
        
        console.error('🚨 FILE SECURITY: Malicious admin dekont file blocked:', {
          fileName: dosya.name,
          adminId: authResult.user?.id,
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
        console.warn('⚠️ FILE SECURITY: Admin dekont file warnings:', {
          fileName: dosya.name,
          warnings: securityResult.warnings,
          adminId: authResult.user?.id
        })
      }

      console.log('✅ FILE SECURITY: Admin dekont file passed security scan')
      
      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'dekontlar');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      console.log('📁 Upload dizini oluşturuldu:', uploadDir)
      
      // Check for existing dekontlar for this month to handle additional dekontlar
      const existingDekontlar = await prisma.dekont.findMany({
        where: {
          stajId: stajId,
          month: ay ? ay : new Date().getMonth() + 1,
          year: yil ? yil : new Date().getFullYear()
        }
      })

      // Generate SECURE filename with hash but preserve extension
      const originalExtension = dosya.name.split('.').pop()?.toLowerCase() || 'pdf'
      const secureFileName = generateSecureFileName(
        dosya.name,
        securityResult.fileInfo?.hash || 'unknown'
      )
      
      // Get full student data for filename generation
      const fullStudent = await prisma.student.findUnique({
        where: { id: staj.studentId },
        include: {
          alan: {
            select: {
              name: true
            }
          }
        }
      })

      // Generate meaningful filename for reference with correct extension (same as company panel)
      const dekontNamingData: DekontNamingData = {
        studentName: fullStudent?.name || staj.student.name,
        studentSurname: fullStudent?.surname || staj.student.surname,
        studentClass: fullStudent?.className || staj.student.className || 'Bilinmeyen',
        studentNumber: fullStudent?.number || staj.student.number || undefined,
        fieldName: fullStudent?.alan?.name || staj.student.alan?.name || 'Bilinmeyen',
        companyName: staj.company.name,
        month: ay,
        year: yil,
        originalFileName: dosya.name, // Use original filename to preserve extension
        isAdditional: existingDekontlar.length > 0,
        additionalIndex: existingDekontlar.length + 1
      }

      const fileName = generateDekontFileName(dekontNamingData)
      const filePath = join(uploadDir, fileName)
      
      console.log('📁 Dosya adı oluşturuldu:', fileName)
      console.log('📁 Dosya yolu:', filePath)
      
      // Convert File to Buffer and save
      const bytes = await dosya.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
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
      fileUrl = `/uploads/dekontlar/${fileName}`;
      
      // Log successful secure upload
      console.log('✅ FILE SECURITY: Secure admin dekont upload completed:', {
        originalName: dosya.name,
        secureFileName: fileName,
        fileHash: securityResult.fileInfo?.hash?.substring(0, 16) + '...',
        adminId: authResult.user?.id,
        timestamp: new Date().toISOString()
      })
    }
    
    // Create dekont data object matching Prisma schema with encrypted amount
    const encryptedAmount = miktar ? encryptFinancialData(miktar) : null
    
    // Mali veri güvenlik logu (maskelenmiş)
    console.log(`🔒 FINANCIAL: Dekont amount encrypted`, {
      originalAmount: maskFinancialData(miktar),
      adminId: authResult.user?.id,
      timestamp: new Date().toISOString()
    })
    
    const createDekontData = {
      stajId: stajId,
      companyId: staj.companyId,
      teacherId: ogretmenId,
      studentId: staj.studentId,
      amount: encryptedAmount,
      paymentDate: new Date(),
      month: ay ? ay : new Date().getMonth() + 1,
      year: yil ? yil : new Date().getFullYear(),
      status: 'PENDING' as const,
      fileUrl: fileUrl
    }
    
    console.log('Final dekont data:', createDekontData)
    
    const data = await prisma.dekont.create({
      data: createDekontData,
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

    // Format the response to match what frontend expects with decrypted amount
    const formattedData = {
      id: data.id,
      isletme_ad: data.staj?.company?.name || staj.company.name || 'Bilinmiyor',
      ogrenci_ad: data.staj?.student ? `${data.staj.student.name} ${data.staj.student.surname}` : `${staj.student.name} ${staj.student.surname}`,
      miktar: data.amount ? Number(decryptFinancialData(data.amount.toString())) : null,
      odeme_tarihi: data.paymentDate,
      onay_durumu: data.status,
      ay: data.month,
      yil: data.year,
      dosya_url: data.fileUrl,
      aciklama: data.rejectReason,
      red_nedeni: data.rejectReason,
      yukleyen_kisi: data.teacher ? `${data.teacher.name} ${data.teacher.surname} (Öğretmen)` : `${teacher.name} ${teacher.surname} (Öğretmen)`,
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

// Dekont güncelle - SADECE ADMIN
export async function PUT(request: Request) {
  const authResult = await validateAuthAndRole(request, ['ADMIN'])
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

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
