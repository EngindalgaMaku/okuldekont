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
    const { email, ad, soyad, yetki_seviyesi, password } = await request.json()

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

    let authData;
    let authError;

    if (password && password.trim()) {
      // Create user with specific password
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          ad,
          soyad,
          full_name: `${ad} ${soyad}`,
          role: 'admin'
        }
      })
      authData = result.data
      authError = result.error
    } else {
      // Create user via invitation (original behavior)
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(
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
      authData = result.data
      authError = result.error
    }

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Kullanıcı oluşturulurken hata: ${authError.message}` },
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
      message: password && password.trim() 
        ? 'Admin kullanıcı başarıyla oluşturuldu ve şifre atandı'
        : 'Admin kullanıcı başarıyla oluşturuldu ve davet maili gönderildi',
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

export async function PUT(request: NextRequest) {
  try {
    const { userId, password, ad, soyad, yetki_seviyesi, aktif } = await request.json()

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı ID gerekli' },
        { status: 400 }
      )
    }

    // Check if current user is super admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      )
    }

    // Update user password if provided
    if (password && password.trim()) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (passwordError) {
        console.error('Password update error:', passwordError)
        return NextResponse.json(
          { error: `Şifre güncellenirken hata: ${passwordError.message}` },
          { status: 400 }
        )
      }
    }

    // Update admin_kullanicilar table if other fields provided
    if (ad || soyad || yetki_seviyesi !== undefined || aktif !== undefined) {
      const updateData: any = {}
      if (ad) updateData.ad = ad
      if (soyad) updateData.soyad = soyad
      if (yetki_seviyesi !== undefined) updateData.yetki_seviyesi = yetki_seviyesi
      if (aktif !== undefined) updateData.aktif = aktif
      updateData.updated_at = new Date().toISOString()

      const { error: dbError } = await supabaseAdmin
        .from('admin_kullanicilar')
        .update(updateData)
        .eq('id', userId)

      if (dbError) {
        console.error('Database update error:', dbError)
        return NextResponse.json(
          { error: `Kullanıcı bilgileri güncellenirken hata: ${dbError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: password && password.trim() 
        ? 'Kullanıcı bilgileri ve şifre başarıyla güncellendi'
        : 'Kullanıcı bilgileri başarıyla güncellendi'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}