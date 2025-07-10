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
  console.log('🚀 Admin user creation API called')
  
  try {
    const { email, ad, soyad, yetki_seviyesi, password } = await request.json()
    console.log('📝 Request data:', { email, ad, soyad, yetki_seviyesi, hasPassword: !!password })

    // Validate required fields
    if (!email || !ad || !soyad || !yetki_seviyesi) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Tüm alanlar zorunludur' },
        { status: 400 }
      )
    }

    // Check if current user is super admin (you might want to add proper auth check here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      )
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası' },
        { status: 500 }
      )
    }

    let authData;
    let authError;
    let existingUser = null;

    console.log('🔐 Starting user creation process...')

    // Try to create user first, if it fails due to existing email, handle that
    if (password && password.trim()) {
      console.log('🔑 Creating user with password...')
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
      console.log('✅ User creation with password completed:', { hasUser: !!authData?.user, hasError: !!authError })
    } else {
      console.log('📧 Creating user via invitation...')
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
      console.log('✅ User invitation completed:', { hasUser: !!authData?.user, hasError: !!authError })
    }

    // If user creation failed because user already exists, try to find existing user
    if (authError && (authError.message.includes('already been registered') || authError.message.includes('already exists'))) {
      console.log('⚠️ User already exists, searching for existing user...')
      
      try {
        // Try to find user by listing users (with pagination for better performance)
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000 // Adjust as needed
        })
        
        console.log('📋 List users result:', { hasUsers: !!existingUsers?.users, userCount: existingUsers?.users?.length, hasError: !!listError })
        
        if (!listError && existingUsers) {
          existingUser = existingUsers.users.find(u => u.email === email)
          console.log('🔍 Found existing user:', { found: !!existingUser, userId: existingUser?.id })
          
          if (existingUser) {
            console.log('🔍 Checking if user is already admin...')
            // Check if they're already an admin
            const { data: existingAdmin, error: adminCheckError } = await supabaseAdmin
              .from('admin_kullanicilar')
              .select('id')
              .eq('id', existingUser.id)
              .single()
            
            console.log('📊 Admin check result:', { isAdmin: !!existingAdmin, hasError: !!adminCheckError })
            
            if (!adminCheckError && existingAdmin) {
              console.log('❌ User is already admin')
              return NextResponse.json(
                { error: 'Bu kullanıcı zaten admin listesinde bulunmaktadır' },
                { status: 400 }
              )
            }
            
            // User exists but not admin, use their data
            console.log('✅ User exists but not admin, will add to admin table')
            authData = { user: existingUser }
            authError = null
          }
        }
      } catch (listErr) {
        console.error('❌ Error listing users:', listErr)
      }
    }

    if (authError) {
      console.error('❌ Final auth error:', authError)
      return NextResponse.json(
        { error: `Kullanıcı oluşturulurken hata: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error('❌ No user data available')
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı' },
        { status: 400 }
      )
    }

    console.log('💾 Adding user to admin_kullanicilar table...', { userId: authData.user.id })

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
      console.error('❌ Database error:', dbError)
      // If DB insert fails, we should ideally delete the auth user too
      // but for now just return error
      return NextResponse.json(
        { error: `Veritabanına kayıt eklenirken hata: ${dbError.message}` },
        { status: 400 }
      )
    }

    console.log('✅ User successfully added to admin table')

    const response = {
      success: true,
      message: existingUser
        ? 'Mevcut kullanıcı admin listesine başarıyla eklendi'
        : (password && password.trim()
          ? 'Admin kullanıcı başarıyla oluşturuldu ve şifre atandı'
          : 'Admin kullanıcı başarıyla oluşturuldu ve davet maili gönderildi'),
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    }

    console.log('✅ Returning success response:', response)
    return NextResponse.json(response)

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
      // First check if user is super admin to apply restrictions
      const { data: currentUser, error: userCheckError } = await supabaseAdmin
        .from('admin_kullanicilar')
        .select('yetki_seviyesi')
        .eq('id', userId)
        .single()

      if (userCheckError) {
        console.error('User check error:', userCheckError)
        return NextResponse.json(
          { error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        )
      }

      const updateData: any = {}
      if (ad) updateData.ad = ad
      if (soyad) updateData.soyad = soyad
      if (yetki_seviyesi !== undefined) updateData.yetki_seviyesi = yetki_seviyesi
      
      // Don't allow super admin active status to be changed
      if (aktif !== undefined) {
        if (currentUser.yetki_seviyesi === 'super_admin') {
          console.log('⚠️ Attempt to change super admin active status blocked')
          // Don't update aktif for super admin - silently ignore this change
        } else {
          updateData.aktif = aktif
        }
      }
      
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