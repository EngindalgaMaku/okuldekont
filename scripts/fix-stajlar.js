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

async function fixStajlar() {
  try {
    console.log('🔧 Stajlar düzeltiliyor...\n');

    // 1. Önce bozuk stajları sil
    console.log('🗑️  Bozuk stajları siliniyor...');
    const { error: deleteError } = await supabase
      .from('stajlar')
      .delete()
      .gte('created_at', '1900-01-01');
    
    if (deleteError) {
      console.error('❌ Staj silme hatası:', deleteError);
      return;
    }
    console.log('✅ Tüm stajlar silindi');

    // 2. Aktif eğitim yılını al
    const { data: egitimYillari } = await supabase
      .from('egitim_yillari')
      .select('*')
      .eq('aktif', true);

    const egitimYili = egitimYillari?.[0];
    if (!egitimYili) {
      console.error('❌ Aktif eğitim yılı bulunamadı!');
      return;
    }
    console.log(`📅 Eğitim yılı: ${egitimYili.yil}`);

    // 3. Mevcut öğrencileri, işletmeleri ve öğretmenleri al
    const [
      { data: ogrenciler },
      { data: isletmeler },
      { data: ogretmenler }
    ] = await Promise.all([
      supabase.from('ogrenciler').select('id, alan_id'),
      supabase.from('isletmeler').select('id'),
      supabase.from('ogretmenler').select('id, alan_id')
    ]);

    console.log(`📊 Mevcut veriler: ${ogrenciler?.length || 0} öğrenci, ${isletmeler?.length || 0} işletme, ${ogretmenler?.length || 0} öğretmen`);

    if (!ogrenciler?.length || !isletmeler?.length || !ogretmenler?.length) {
      console.error('❌ Gerekli veriler eksik!');
      return;
    }

    // 4. Her öğrenci için staj oluştur
    const stajlarToInsert = [];
    
    ogrenciler.forEach((ogrenci, index) => {
      // Öğrencinin alanındaki öğretmenleri bul
      const alanOgretmenleri = ogretmenler.filter(o => o.alan_id === ogrenci.alan_id);
      
      if (alanOgretmenleri.length === 0) {
        console.warn(`⚠️ ${ogrenci.id} numaralı öğrencinin alanında öğretmen bulunamadı`);
        return;
      }

      // Rastgele öğretmen ve işletme seç
      const randomOgretmen = alanOgretmenleri[index % alanOgretmenleri.length];
      const randomIsletme = isletmeler[index % isletmeler.length];

      const baslangicTarihi = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const bitisTarihi = new Date(baslangicTarihi.getTime() + 120 * 24 * 60 * 60 * 1000);

      stajlarToInsert.push({
        ogrenci_id: ogrenci.id,
        isletme_id: randomIsletme.id,
        ogretmen_id: randomOgretmen.id,
        baslangic_tarihi: baslangicTarihi.toISOString().split('T')[0],
        bitis_tarihi: bitisTarihi.toISOString().split('T')[0],
        durum: Math.random() > 0.2 ? 'aktif' : 'tamamlandi'
      });
    });

    console.log(`💼 ${stajlarToInsert.length} staj kaydı oluşturuluyor...`);

    // 5. Stajları toplu ekle (50'şer grup halinde)
    let insertedTotal = 0;
    for (let i = 0; i < stajlarToInsert.length; i += 50) {
      const batch = stajlarToInsert.slice(i, i + 50);
      
      const { data: insertedStajlar, error: insertError } = await supabase
        .from('stajlar')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.error(`❌ Batch ${Math.floor(i/50) + 1} hatası:`, insertError);
        continue;
      }
      
      insertedTotal += insertedStajlar?.length || 0;
      console.log(`✅ Batch ${Math.floor(i/50) + 1}: ${insertedStajlar?.length || 0} staj eklendi`);
    }

    console.log(`\n🎉 ${insertedTotal} staj kaydı başarıyla oluşturuldu!`);
    console.log('✨ Tüm foreign key ilişkileri tutarlı.');

  } catch (error) {
    console.error('❌ Staj düzeltme hatası:', error.message);
  }
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  fixStajlar()
    .then(() => {
      console.log('\n🏁 Staj düzeltme işlemi tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { fixStajlar };