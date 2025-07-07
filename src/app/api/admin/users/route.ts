import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email, ad, soyad, yetki_seviyesi } = await request.json()

    // Validate required fields
    if (!email || !ad || !soyad || !yetki_seviyesi) {
      return NextResponse.json(
        { error: 'Tüm alanlar zorunludur' },
        { status: 400 }
      )
    }

    // Check if current user is super admin (you might want to add proper auth check here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      )
    }

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          ad,
          soyad,
          full_name: `${ad} ${soyad}`,
          role: 'admin'
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/login`
      }
    )

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Kullanıcı davet edilirken hata: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı' },
        { status: 400 }
      )
    }

    // Add to admin_kullanicilar table
    const { error: dbError } = await supabaseAdmin
      .from('admin_kullanicilar')
      .insert({
        id: authData.user.id,
        ad,
        soyad,
        email,
        yetki_seviyesi,
        aktif: true
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // If DB insert fails, we should ideally delete the auth user too
      // but for now just return error
      return NextResponse.json(
        { error: `Veritabanına kayıt eklenirken hata: ${dbError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin kullanıcı başarıyla oluşturuldu ve davet maili gönderildi',
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}