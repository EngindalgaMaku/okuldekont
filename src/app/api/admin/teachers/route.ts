import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    console.log('Teacher POST request başladı...')
    const body = await request.json()
    console.log('Gelen veri:', body)
    
    const { name, surname, tcNo, phone, email, pin, alanId, position } = body

    // Validate required fields
    console.log('Validation kontrolleri:', { name, surname, pin, pinLength: pin?.length })
    
    if (!name || !surname || !pin) {
      console.log('Eksik zorunlu alanlar:', { name: !!name, surname: !!surname, pin: !!pin })
      return NextResponse.json(
        { error: 'İsim, soyisim ve PIN zorunludur' },
        { status: 400 }
      )
    }

    if (pin.length !== 4) {
      console.log('PIN uzunluk hatası:', pin.length)
      return NextResponse.json(
        { error: 'PIN 4 haneli olmalıdır' },
        { status: 400 }
      )
    }

    // User için unique email oluştur (login için)
    const userEmail = `${name.toLowerCase()}.${surname.toLowerCase()}.${Date.now()}@okul.local`
    
    // TeacherProfile için girilen email'i kullan (bilgi mesajları için)
    const teacherEmail = email?.trim() || null
    console.log('User email:', userEmail)
    console.log('Teacher bilgi email:', teacherEmail)

    // Hash password (use PIN as default password)
    console.log('Password hashleniyor...')
    const hashedPassword = await bcrypt.hash(pin, 10)
    console.log('Password hashlendi')

    // Create user and teacher in transaction
    console.log('Transaction başlatılıyor...')
    const result = await prisma.$transaction(async (tx) => {
      console.log('User oluşturuluyor...')
      // Create user first
      const user = await tx.user.create({
        data: {
          email: userEmail,
          password: hashedPassword,
          role: 'TEACHER'
        }
      })
      console.log('User oluşturuldu:', user.id)

      console.log('Teacher profile oluşturuluyor...')
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
      console.log('Teacher profile oluşturuldu:', teacher.id)

      return teacher
    })
    console.log('Transaction tamamlandı')

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
    console.log('API basladi...')
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const alan = searchParams.get('alan') || ''
    
    console.log('Parametreler:', { search, alan })

    // TUM ogretmenleri isletme ve ogrenci detaylari ile getir
    console.log('TUM ogretmenleri isletme/ogrenci detaylari ile getiriliyor...')
    
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
    
    console.log('*** DATABASE BILGILERI ***')
    console.log('Database toplam ogretmen sayisi:', totalInDB)
    console.log('Getirilen ogretmen sayisi:', ogretmenler.length)
    
    // Ahmet Başaran örneği
    const ahmet = ogretmenler.find(t => t.name === 'Ahmet' && t.surname === 'Başaran')
    if (ahmet) {
      console.log('*** AHMET BASARAN DETAYLARI ***')
      console.log('Ahmet - Isletmeler:', ahmet.companies?.length || 0)
      console.log('Ahmet - Stajlar (öğrenciler):', ahmet.stajlar?.length || 0)
      console.log('Ahmet - Companies data:', ahmet.companies)
      console.log('Ahmet - Stajlar data:', ahmet.stajlar?.slice(0, 2)) // İlk 2 tane
    }
    
    if (totalInDB > ogretmenler.length) {
      console.log('PROBLEM: Database\'de daha fazla ogretmen var ama gelmiyor!')
      console.log('Database\'de:', totalInDB, 'Getirilen:', ogretmenler.length)
    } else {
      console.log('Tum ogretmenler getirildi')
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