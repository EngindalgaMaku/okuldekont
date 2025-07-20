import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const alanId = resolvedParams.id

    // Bu alan için öğrencilerin atandığı işletmeleri getir (hem staj kaydı hem de sadece atama)
    const isletmelerData = await prisma.companyProfile.findMany({
      where: {
        OR: [
          // Aktif staj kaydı olan işletmeler
          {
            stajlar: {
              some: {
                student: {
                  alanId: alanId
                },
                status: 'ACTIVE'  // Sadece aktif staj kayıtları
              }
            }
          },
          // Sadece öğrenci ataması olan işletmeler (staj kaydı olmadan)
          {
            students: {
              some: {
                alanId: alanId,
                stajlar: {
                  none: {
                    status: 'ACTIVE'  // Aktif stajı olmayan ama atanmış öğrenciler
                  }
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        teacherId: true,
        teacher: {
          select: {
            id: true,
            name: true,
            surname: true,
            alanId: true,
            alan: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Aktif stajlar
        stajlar: {
          where: {
            student: {
              alanId: alanId
            },
            status: 'ACTIVE'  // Sadece aktif stajları getir
          },
          select: {
            id: true,
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                className: true,
                number: true
              }
            }
          }
        },
        // Atanan tüm öğrenciler (staj kaydı olmasa da)
        students: {
          where: {
            alanId: alanId
          },
          select: {
            id: true,
            name: true,
            surname: true,
            className: true,
            number: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // İşletme verilerini dönüştür ve öğrenci listelerini birleştir
    const transformedIsletmeler = isletmelerData.map((isletme) => {
      // Staj kayıtları olan öğrenciler
      const stajOgrencileri = isletme.stajlar.map(staj => ({
        id: `staj-${staj.id}`,
        student: staj.student
      }))
      
      // Sadece atanan öğrenciler (staj kaydı olmayan)
      const atanmisOgrenciler = isletme.students
        .filter(student => !isletme.stajlar.some(staj => staj.student.id === student.id))
        .map(student => ({
          id: `assigned-${student.id}`,
          student
        }))
      
      // Tüm öğrencileri birleştir
      const tumStajlar = [...stajOgrencileri, ...atanmisOgrenciler]

      return {
        id: isletme.id,
        ad: isletme.name,
        yetkili: isletme.contact,
        telefon: isletme.phone,
        email: isletme.email,
        adres: isletme.address,
        teacherId: isletme.teacherId,
        teacher: isletme.teacher,
        stajlar: tumStajlar
      }
    })

    return NextResponse.json(transformedIsletmeler)
  } catch (error) {
    console.error('İşletmeler API hatası:', error)
    return NextResponse.json(
      { error: 'İşletmeler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}