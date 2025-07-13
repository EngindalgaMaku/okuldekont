import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Initialize the admin client inside the handler to ensure env vars are loaded
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    const { ogretmen_id, hafta, isletme_idler, overwrite } = await request.json()

    if (!ogretmen_id || !hafta || !isletme_idler) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 })
    }

    // If overwrite is true, first cancel existing documents for that week/teacher
    if (overwrite) {
      const { error: updateError } = await supabaseAdmin
        .from('gorev_belgeleri')
        .update({ durum: 'İptal Edildi' })
        .eq('ogretmen_id', ogretmen_id)
        .eq('hafta', hafta)
        .in('durum', ['Verildi', 'Teslim Alındı'])

      if (updateError) {
        console.error('Mevcut belgeleri iptal ederken hata:', updateError)
        throw new Error('Mevcut belgeler iptal edilirken bir veritabanı hatası oluştu.')
      }
    }

    // Insert the new document
    const { data: newBelge, error: insertError } = await supabaseAdmin
      .from('gorev_belgeleri')
      .insert({
        ogretmen_id: ogretmen_id,
        hafta: hafta,
        isletme_idler: isletme_idler,
        durum: 'Verildi' // Set default status
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Yeni belge eklenirken hata:', insertError)
      // Check for RLS violation specifically
      if (insertError.code === '42501') {
         throw new Error('Yeni kayıt, satır seviyesi güvenlik politikasını ihlal ediyor. Lütfen Supabase ayarlarınızı kontrol edin.');
      }
      throw new Error('Yeni belge eklenirken bir veritabanı hatası oluştu.')
    }

    if (!newBelge) {
      throw new Error('Belge oluşturuldu ancak ID alınamadı.')
    }

    return NextResponse.json({ id: newBelge.id })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}