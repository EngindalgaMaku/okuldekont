import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { headers } from 'next/headers'

// Dekontları listele
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('dekontlar')
      .select(`
        *,
        stajlar (
          *,
          ogrenciler (
            ad,
            soyad,
            alan_id,
            sinif,
            no,
            alan (
              ad
            )
          ),
          isletmeler (
            ad,
            yetkili_kisi
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
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
    const body = await request.json()
    const { data, error } = await supabase
      .from('dekontlar')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
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

    const { data, error } = await supabase
      .from('dekontlar')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

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

    const { error } = await supabase
      .from('dekontlar')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dekont silinirken hata:', error)
    return NextResponse.json(
      { error: 'Dekont silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
} 