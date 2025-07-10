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
          const value = valueParts.join('=').trim().replace(/"/g, '');
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDataConsistency() {
  try {
    console.log('🔍 Veri tutarlılığı doğrulanıyor...\n');
    
    let issues = [];
    let success = [];

    // 1. Öğrenciler ve stajlar ilişkisi
    console.log('📊 Öğrenci-Staj İlişkileri Kontrol Ediliyor...');
    const { data: ogrenciler } = await supabase.from('ogrenciler').select('id');
    const { data: stajlar } = await supabase.from('stajlar').select('ogrenci_id');
    
    console.log(`   Debug: ${ogrenciler?.length || 0} öğrenci, ${stajlar?.length || 0} staj bulundu`);
    
    const ogrenciIds = new Set(ogrenciler?.map(o => String(o.id)) || []);
    const stajOgrenciIds = stajlar?.map(s => String(s.ogrenci_id)) || [];
    
    const invalidStajOgrenciIds = stajOgrenciIds.filter(id => !ogrenciIds.has(id));
    
    if (invalidStajOgrenciIds.length > 0) {
      console.log(`   Debug: İlk 5 geçersiz ogrenci_id: ${invalidStajOgrenciIds.slice(0, 5)}`);
      console.log(`   Debug: İlk 5 geçerli ogrenci_id: ${Array.from(ogrenciIds).slice(0, 5)}`);
      issues.push(`❌ ${invalidStajOgrenciIds.length} staj kaydında geçersiz ogrenci_id bulundu`);
    } else {
      success.push(`✅ Tüm staj kayıtlarında geçerli ogrenci_id var`);
    }

    // 2. İşletmeler ve stajlar ilişkisi
    console.log('🏢 İşletme-Staj İlişkileri Kontrol Ediliyor...');
    const { data: isletmeler } = await supabase.from('isletmeler').select('id');
    const stajIsletmeIds = stajlar?.map(s => String(s.isletme_id)) || [];
    
    console.log(`   Debug: ${isletmeler?.length || 0} işletme bulundu`);
    
    const isletmeIds = new Set(isletmeler?.map(i => String(i.id)) || []);
    const invalidStajIsletmeIds = stajIsletmeIds.filter(id => !isletmeIds.has(id));
    
    if (invalidStajIsletmeIds.length > 0) {
      console.log(`   Debug: İlk 5 geçersiz isletme_id: ${invalidStajIsletmeIds.slice(0, 5)}`);
      console.log(`   Debug: İlk 5 geçerli isletme_id: ${Array.from(isletmeIds).slice(0, 5)}`);
      issues.push(`❌ ${invalidStajIsletmeIds.length} staj kaydında geçersiz isletme_id bulundu`);
    } else {
      success.push(`✅ Tüm staj kayıtlarında geçerli isletme_id var`);
    }

    // 3. Öğretmenler ve stajlar ilişkisi
    console.log('👨‍🏫 Öğretmen-Staj İlişkileri Kontrol Ediliyor...');
    const { data: ogretmenler } = await supabase.from('ogretmenler').select('id');
    const stajOgretmenIds = stajlar?.map(s => String(s.ogretmen_id)) || [];
    
    console.log(`   Debug: ${ogretmenler?.length || 0} öğretmen bulundu`);
    
    const ogretmenIds = new Set(ogretmenler?.map(o => String(o.id)) || []);
    const invalidStajOgretmenIds = stajOgretmenIds.filter(id => !ogretmenIds.has(id));
    
    if (invalidStajOgretmenIds.length > 0) {
      console.log(`   Debug: İlk 5 geçersiz ogretmen_id: ${invalidStajOgretmenIds.slice(0, 5)}`);
      console.log(`   Debug: İlk 5 geçerli ogretmen_id: ${Array.from(ogretmenIds).slice(0, 5)}`);
      issues.push(`❌ ${invalidStajOgretmenIds.length} staj kaydında geçersiz ogretmen_id bulundu`);
    } else {
      success.push(`✅ Tüm staj kayıtlarında geçerli ogretmen_id var`);
    }

    // 4. Alanlar ve ilişkili tablolar
    console.log('🎓 Alan İlişkileri Kontrol Ediliyor...');
    const { data: alanlar } = await supabase.from('alanlar').select('id');
    const alanIds = new Set(alanlar?.map(a => String(a.id)) || []);
    
    console.log(`   Debug: ${alanlar?.length || 0} alan bulundu`);
    
    const ogrenciAlanIds = ogrenciler?.map(o => String(o.alan_id)) || [];
    const ogretmenAlanIds = ogretmenler?.filter(o => o.alan_id).map(o => String(o.alan_id)) || [];
    
    const invalidOgrenciAlanIds = ogrenciAlanIds.filter(id => !alanIds.has(id));
    const invalidOgretmenAlanIds = ogretmenAlanIds.filter(id => !alanIds.has(id));
    
    if (invalidOgrenciAlanIds.length > 0) {
      console.log(`   Debug: İlk 5 geçersiz öğrenci alan_id: ${invalidOgrenciAlanIds.slice(0, 5)}`);
      console.log(`   Debug: Geçerli alan_id'ler: ${Array.from(alanIds)}`);
      issues.push(`❌ ${invalidOgrenciAlanIds.length} öğrencide geçersiz alan_id bulundu`);
    } else {
      success.push(`✅ Tüm öğrencilerde geçerli alan_id var`);
    }
    
    if (invalidOgretmenAlanIds.length > 0) {
      issues.push(`❌ ${invalidOgretmenAlanIds.length} öğretmende geçersiz alan_id bulundu`);
    } else {
      success.push(`✅ Tüm öğretmenlerde geçerli alan_id var (null olanlar hariç)`);
    }

    // 5. İşletme-Alan İlişkileri
    console.log('🔗 İşletme-Alan İlişkileri Kontrol Ediliyor...');
    const { data: isletmeAlanlar } = await supabase.from('isletme_alanlar').select('*');
    
    if (isletmeAlanlar) {
      const invalidIsletmeAlanIsletmeIds = isletmeAlanlar.filter(ia => !isletmeIds.has(ia.isletme_id));
      const invalidIsletmeAlanAlanIds = isletmeAlanlar.filter(ia => !alanIds.has(ia.alan_id));
      
      if (invalidIsletmeAlanIsletmeIds.length > 0) {
        issues.push(`❌ ${invalidIsletmeAlanIsletmeIds.length} işletme-alan ilişkisinde geçersiz isletme_id bulundu`);
      } else {
        success.push(`✅ Tüm işletme-alan ilişkilerinde geçerli isletme_id var`);
      }
      
      if (invalidIsletmeAlanAlanIds.length > 0) {
        issues.push(`❌ ${invalidIsletmeAlanAlanIds.length} işletme-alan ilişkisinde geçersiz alan_id bulundu`);
      } else {
        success.push(`✅ Tüm işletme-alan ilişkilerinde geçerli alan_id var`);
      }
    }

    // Özet rapor
    console.log('\n📊 VERİ TUTARLİLIĞI RAPORU:');
    console.log('━'.repeat(50));
    
    console.log('\n✅ BAŞARILI KONTROLLER:');
    success.forEach(s => console.log(`   ${s}`));
    
    if (issues.length > 0) {
      console.log('\n❌ BULUNAN PROBLEMLER:');
      issues.forEach(i => console.log(`   ${i}`));
      console.log('\n⚠️  Veri tutarlılığı sorunları bulundu!');
      return false;
    } else {
      console.log('\n🎉 TÜM VERİLER TUTARLI!');
      console.log('✨ Hiçbir foreign key sorunu bulunamadı.');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Doğrulama hatası:', error.message);
    return false;
  }
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  verifyDataConsistency()
    .then((isConsistent) => {
      console.log('\n🏁 Doğrulama tamamlandı!');
      process.exit(isConsistent ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { verifyDataConsistency };