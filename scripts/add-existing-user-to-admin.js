const { Client } = require('pg');
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

async function addExistingUserToAdmin(email, ad, soyad, yetkiSeviyesi = 'admin') {
  console.log('🚀 Mevcut kullanıcı admin listesine ekleniyor...');
  
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL bulunamadı. Lütfen .env.local dosyasını kontrol edin.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Veritabanı bağlantısı başarılı.');

    // First, get the user from auth.users table
    const authUserQuery = `
      SELECT id, email, raw_user_meta_data, created_at
      FROM auth.users 
      WHERE email = $1
    `;
    
    const authUserResult = await client.query(authUserQuery, [email]);
    
    if (authUserResult.rows.length === 0) {
      console.error('❌ Bu email adresine sahip kullanıcı bulunamadı:', email);
      process.exit(1);
    }

    const authUser = authUserResult.rows[0];
    console.log(`✅ Kullanıcı bulundu: ${authUser.email} (ID: ${authUser.id})`);

    // Check if user is already in admin table
    const existingAdminQuery = `
      SELECT id FROM admin_kullanicilar WHERE id = $1
    `;
    
    const existingAdminResult = await client.query(existingAdminQuery, [authUser.id]);
    
    if (existingAdminResult.rows.length > 0) {
      console.log('⚠️ Bu kullanıcı zaten admin listesinde bulunuyor.');
      process.exit(0);
    }

    // Insert into admin_kullanicilar table
    const insertAdminQuery = `
      INSERT INTO admin_kullanicilar (id, ad, soyad, email, yetki_seviyesi, aktif, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    await client.query(insertAdminQuery, [
      authUser.id,
      ad,
      soyad,
      email,
      yetkiSeviyesi,
      true
    ]);

    console.log('✅ Kullanıcı başarıyla admin listesine eklendi!');
    console.log(`   - Email: ${email}`);
    console.log(`   - Ad Soyad: ${ad} ${soyad}`);
    console.log(`   - Yetki Seviyesi: ${yetkiSeviyesi}`);
    console.log(`   - Durum: Aktif`);

  } catch (err) {
    console.error('❌ İşlem sırasında hata oluştu:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Veritabanı bağlantısı kapatıldı.');
  }
}

// Komut satırından parametreleri al
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('📋 Kullanım: node add-existing-user-to-admin.js <email> <ad> <soyad> [yetki_seviyesi]');
  console.log('');
  console.log('Örnekler:');
  console.log('  node add-existing-user-to-admin.js user@example.com John Doe admin');
  console.log('  node add-existing-user-to-admin.js manager@example.com Jane Smith super_admin');
  console.log('');
  console.log('Yetki seviyeleri: operator, admin, super_admin (varsayılan: admin)');
  process.exit(1);
}

const [email, ad, soyad, yetkiSeviyesi] = args;

addExistingUserToAdmin(email, ad, soyad, yetkiSeviyesi);