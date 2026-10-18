import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const week = searchParams.get('week')

    if (!teacherId || !week) {
      return NextResponse.json(
        { error: 'Öğretmen ID ve hafta bilgisi gereklidir' },
        { status: 400 }
      )
    }

    const existingDocuments = await prisma.gorevBelgesi.findMany({
      where: {
        ogretmenId: teacherId,
        hafta: week,
        durum: {
          in: ['Verildi', 'Teslim Alındı']
        }
      },
      select: {
        id: true
      }
    })

    return NextResponse.json({ documents: existingDocuments })
  } catch (error) {
    console.error('Görev belgesi kontrol hatası:', error)
    return NextResponse.json(
      { error: 'Görev belgesi kontrol edilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { ogretmen_id, hafta, isletme_idler, overwrite } = await request.json()

    if (!ogretmen_id || !hafta || !isletme_idler) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 })
    }

    // If overwrite is true, first cancel existing documents for that week/teacher
    if (overwrite) {
      try {
        await prisma.gorevBelgesi.updateMany({
          where: {
            ogretmenId: ogretmen_id,
            hafta: hafta,
            durum: {
              in: ['Verildi', 'Teslim Alındı']
            }
          },
          data: {
            durum: 'İptal Edildi'
          }
        })
      } catch (updateError) {
        console.error('Mevcut belgeleri iptal ederken hata:', updateError)
        throw new Error('Mevcut belgeler iptal edilirken bir veritabanı hatası oluştu.')
      }
    }

    // Insert the new document
    try {
      const newBelge = await prisma.gorevBelgesi.create({
        data: {
          ogretmenId: ogretmen_id,
          hafta: hafta,
          isletmeIdler: JSON.stringify(isletme_idler),
          durum: 'Verildi' // Set default status
        },
        select: {
          id: true
        }
      })

      if (!newBelge) {
        throw new Error('Belge oluşturuldu ancak ID alınamadı.')
      }

      return NextResponse.json({ id: newBelge.id })

    } catch (insertError) {
      console.error('Yeni belge eklenirken hata:', insertError)
      throw new Error('Yeni belge eklenirken bir veritabanı hatası oluştu.')
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}