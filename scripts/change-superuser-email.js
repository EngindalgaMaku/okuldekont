const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local dosyasındaki çevre değişkenlerini yükle
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      });
    }
  } catch (error) {
    console.error('⚠️ .env.local dosyası okunurken hata oluştu:', error);
  }
}

loadEnv();

async function changeSuperuserEmail() {
  console.log('🔄 Süper admin email değiştirme işlemi başlatılıyor...');
  
  const newEmail = 'admin@ozdilek';
  
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Gerekli çevre değişkenleri bulunamadı. Lütfen .env.local dosyasını kontrol edin.');
    console.error('Gerekli: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // PostgreSQL client
  const pgClient = new Client({
    connectionString: databaseUrl,
  });

  // Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // PostgreSQL bağlantısı
    await pgClient.connect();
    console.log('✅ PostgreSQL bağlantısı başarılı.');

    // 1. Mevcut süper admin kullanıcısını bul
    console.log('🔍 Mevcut süper admin kullanıcısı aranıyor...');
    const findSuperAdminQuery = `
      SELECT id, email, ad, soyad 
      FROM public.admin_kullanicilar 
      WHERE yetki_seviyesi = 'super_admin' 
      AND aktif = true
      LIMIT 1;
    `;
    
    const { rows } = await pgClient.query(findSuperAdminQuery);
    
    if (rows.length === 0) {
      console.error('❌ Aktif süper admin kullanıcısı bulunamadı.');
      process.exit(1);
    }

    const superAdmin = rows[0];
    console.log('✅ Süper admin bulundu:', {
      id: superAdmin.id,
      currentEmail: superAdmin.email,
      ad: superAdmin.ad,
      soyad: superAdmin.soyad
    });

    // 2. Supabase Auth'da email güncelle
    console.log('🔄 Supabase Auth email güncelleniyor...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      superAdmin.id,
      {
        email: newEmail,
        email_confirm: true // Email'i otomatik olarak doğrula
      }
    );

    if (authError) {
      console.error('❌ Supabase Auth email güncelleme hatası:', authError);
      throw authError;
    }

    console.log('✅ Supabase Auth email başarıyla güncellendi');

    // 3. admin_kullanicilar tablosunda email güncelle
    console.log('🔄 admin_kullanicilar tablosunda email güncelleniyor...');
    const updateAdminQuery = `
      UPDATE public.admin_kullanicilar 
      SET email = $1, updated_at = NOW()
      WHERE id = $2 AND yetki_seviyesi = 'super_admin';
    `;
    
    await pgClient.query(updateAdminQuery, [newEmail, superAdmin.id]);
    console.log('✅ admin_kullanicilar tablosunda email başarıyla güncellendi');

    // 4. Değişiklikleri doğrula
    console.log('🔍 Değişiklikler doğrulanıyor...');
    const verifyQuery = `
      SELECT id, email, ad, soyad, yetki_seviyesi, aktif
      FROM public.admin_kullanicilar 
      WHERE id = $1;
    `;
    
    const { rows: verifyRows } = await pgClient.query(verifyQuery, [superAdmin.id]);
    const updatedAdmin = verifyRows[0];

    console.log('✅ Süper admin email başarıyla değiştirildi:');
    console.log('📧 Eski email:', superAdmin.email);
    console.log('📧 Yeni email:', updatedAdmin.email);
    console.log('👤 Kullanıcı:', `${updatedAdmin.ad} ${updatedAdmin.soyad}`);
    console.log('🔑 Yetki seviyesi:', updatedAdmin.yetki_seviyesi);
    console.log('✅ Aktif durumu:', updatedAdmin.aktif);

    console.log('\n🎉 İşlem başarıyla tamamlandı!');
    console.log(`📝 Artık ${newEmail} adresi ile giriş yapabilirsiniz.`);

  } catch (error) {
    console.error('❌ Süper admin email değiştirme işleminde hata oluştu:', error);
    console.error('Hata detayı:', error.message);
    process.exit(1);
  } finally {
    await pgClient.end();
    console.log('👋 Veritabanı bağlantısı kapatıldı.');
  }
}

// Script'i çalıştır
changeSuperuserEmail();