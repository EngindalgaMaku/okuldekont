const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminUsers() {
  try {
    const { data, error } = await supabase
      .from('admin_kullanicilar')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('Admin Kullanıcılar:');
    data.forEach(user => {
      console.log(`- ${user.ad} ${user.soyad} (${user.email}) - Yetki: ${user.yetki_seviyesi}`);
    });
    
    // Engin Dalga'yı bul
    const enginDalga = data.find(user => 
      user.ad.toLowerCase() === 'engin' && user.soyad.toLowerCase() === 'dalga'
    );
    
    if (enginDalga) {
      console.log('\n=== Engin Dalga Bilgileri ===');
      console.log(`ID: ${enginDalga.id}`);
      console.log(`Email: ${enginDalga.email}`);
      console.log(`Mevcut Yetki: ${enginDalga.yetki_seviyesi}`);
      console.log(`Aktif: ${enginDalga.aktif}`);
      
      if (enginDalga.yetki_seviyesi === 'super_admin') {
        console.log('\n⚠️  Engin Dalga super_admin olarak kayıtlı!');
        console.log('Eğer super admin olmaması gerekiyorsa, yetki seviyesini değiştireceğiz.');
      }
    } else {
      console.log('\n❌ Engin Dalga bulunamadı');
    }
  } catch (error) {
    console.error('Hata:', error);
  }
}

checkAdminUsers();