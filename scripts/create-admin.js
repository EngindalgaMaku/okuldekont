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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase URL veya Service Role Key bulunamadı. Lütfen .env.local dosyasını kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log('🔑 Admin kullanıcısı oluşturuluyor...');

  const adminEmail = 'admin@sistem.com';
  const adminPassword = '123456';

  // 1. Kullanıcıyı auth.users tablosunda ara
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Kullanıcılar listelenirken hata:', listError.message);
    return;
  }

  const existingUser = users.find(u => u.email === adminEmail);

  let userId;

  if (existingUser) {
    console.log('ℹ️ Admin kullanıcısı zaten mevcut. ID:', existingUser.id);
    userId = existingUser.id;
  } else {
    // 2. Kullanıcı yoksa oluştur
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (createError) {
      console.error('❌ Admin kullanıcısı oluşturulurken hata:', createError.message);
      return;
    }
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu. ID:', newUser.user.id);
    userId = newUser.user.id;
  }

  // 3. admin_kullanicilar tablosuna ekle/güncelle
  const { data: adminData, error: upsertError } = await supabase
    .from('admin_kullanicilar')
    .upsert({
      id: userId,
      ad: 'Sistem',
      soyad: 'Admini',
      email: adminEmail,
      yetki_seviyesi: 'super_admin'
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error('❌ admin_kullanicilar tablosuna eklenirken/güncellenirken hata:', upsertError.message);
    return;
  }

  console.log('✅ Admin kullanıcısı public tabloda başarıyla ayarlandı.');
  console.log('🎉 İşlem tamamlandı!');
}

createAdmin();