import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { generateDekontFileName, DekontNamingData } from '@/utils/dekontNaming'

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
      miktar: dekont.amount ? parseFloat(dekont.amount.toString()) : 0,
      aciklama: `Payment for ${dekont.student.name} ${dekont.student.surname}`,
      dosya_url: dekont.fileUrl,
      onay_durumu: dekont.status.toLowerCase(),
      yukleyen_kisi: 'İşletme',
      odeme_tarihi: dekont.paymentDate.toISOString(),
      created_at: dekont.createdAt || new Date().toISOString(),
      // Nested relations for compatibility
      stajlar: {
        ogrenciler: {
          ad: dekont.student.name,
          soyad: dekont.student.surname,
          sinif: dekont.student.className,
          no: dekont.student.number,
          alanlar: dekont.student.alan ? { ad: dekont.student.alan.name } : { ad: 'Bilinmiyor' }
        }
      }
    }))

    return NextResponse.json(transformedDekontlar)
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

    // Handle file upload to local storage
    let fileUrl = null
    if (dosya && dosya.size > 0) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dekontlar')
        await mkdir(uploadDir, { recursive: true })
        
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
        
        // Convert File to Buffer and save
        const bytes = await dosya.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)
        
        // Set public URL
        fileUrl = `/uploads/dekontlar/${fileName}`
        
        console.log('File uploaded successfully:', fileUrl)
      } catch (fileError) {
        console.error('File upload error:', fileError)
        // Continue without file if upload fails
        fileUrl = null
      }
    }

    // Create the dekont
    const newDekont = await prisma.dekont.create({
      data: {
        stajId: stajId,
        studentId: staj.studentId,
        companyId: companyId,
        teacherId: staj.teacherId,
        month: ay,
        year: yil,
        amount: miktar,
        fileUrl: fileUrl,
        status: 'PENDING',
        paymentDate: new Date()
      }
    })

    // Student info is already available from staj relation
    const student = staj.student

    // Format response to match frontend expectations
    const formattedDekont = {
      id: newDekont.id,
      ogrenci_adi: student ? `${student.name} ${student.surname}` : 'Bilinmiyor',
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
          ad: student?.name || 'Bilinmiyor',
          soyad: student?.surname || 'Bilinmiyor',
          sinif: student?.className || 'Bilinmiyor',
          no: student?.number || 'Bilinmiyor',
          alanlar: student?.alan ? { ad: student.alan.name } : { ad: 'Bilinmiyor' }
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
