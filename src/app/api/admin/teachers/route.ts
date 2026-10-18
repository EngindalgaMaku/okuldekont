import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getActiveEducationYearId } from '@/lib/education-year'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { name, surname, tcNo, phone, email, pin, alanId, position } = body

    // Validate required fields
    
    if (!name || !surname || !pin) {
      return NextResponse.json(
        { error: 'İsim, soyisim ve PIN zorunludur' },
        { status: 400 }
      )
    }

    if (pin.length !== 4) {
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    // User için unique email oluştur (login için)
    const userEmail = `${name.toLowerCase()}.${surname.toLowerCase()}.${Date.now()}@okul.local`
    
    // TeacherProfile için girilen email'i kullan (bilgi mesajları için)
    const teacherEmail = email?.trim() || null

    // Hash password (use PIN as default password)
    const hashedPassword = await bcrypt.hash(pin, 10)

    // Create user and teacher in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          email: userEmail,
          password: hashedPassword,
          role: 'TEACHER'
        }
      })

      // Create teacher profile
      const teacher = await tx.teacherProfile.create({
        data: {
          name: name.trim(),
          surname: surname.trim(),
          tcNo: tcNo?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          pin: pin.trim(),
          userId: user.id,
          alanId: alanId || null,
          position: position || null,
          mustChangePin: pin === '1234' // Force PIN change if default
        },
        include: {
          alan: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return teacher
    })

    return NextResponse.json({
      success: true,
      teacher: result
    })

  } catch (error) {
    console.error('Teacher creation error:', error)
    return NextResponse.json(
      { error: 'Öğretmen eklenirken hata oluştu', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const alan = searchParams.get('alan') || ''
    

    // TUM ogretmenleri isletme ve ogrenci detaylari ile getir
    const activeYearId = await getActiveEducationYearId()
    
    const ogretmenler = await prisma.teacherProfile.findMany({
      include: {
        alan: {
          select: {
            id: true,
            name: true
          }
        },
        // Schema'daki doğru field isimleri:
        stajlar: {
          where: {
            educationYearId: activeYearId,
            archived: false
          },
          include: {
            student: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        companies: {
          where: {
            stajlar: {
              some: {
                educationYearId: activeYearId,
                archived: false
              }
            }
          },
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { surname: 'asc' },
        { name: 'asc' }
      ]
    })
    
    // Database'deki GERÇEK öğretmen sayısını kontrol et
    const totalInDB = await prisma.teacherProfile.count()
    
    
    // Ahmet Başaran örneği
    const ahmet = ogretmenler.find(t => t.name === 'Ahmet' && t.surname === 'Başaran')
    if (ahmet) {
    }
    
    if (totalInDB > ogretmenler.length) {
    } else {
    }

    return NextResponse.json({
      success: true,
      ogretmenler: ogretmenler,
      total: ogretmenler.length,
      pagination: {
        page: 1,
        per_page: ogretmenler.length,
        total: ogretmenler.length,
        total_pages: 1
      }
    })

  } catch (error) {
    console.error('Teachers API error:', error)
    return NextResponse.json(
      { error: 'Ogretmen listesi alinirken hata olustu', details: String(error) },
      { status: 500 }
    )
  }
}