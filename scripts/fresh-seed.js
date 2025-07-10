const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Örnek isimler
const ogretmenAdlari = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'İbrahim', 'Yusuf', 'Ömer', 'Hasan', 'Murat',
  'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice', 'Merve', 'Elif', 'Selin', 'Büşra', 'Gizem'
];

const soyadlar = [
  'Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Öztürk', 'Aydın', 'Özkan', 'Arslan', 'Doğan',
  'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Güneş', 'Erdoğan', 'Ateş', 'Çakır'
];

const ogrenciAdlari = [
  'Yusuf', 'Eymen', 'Mert', 'Ömer', 'Kerem', 'Arda', 'Berat', 'Kaan', 'Emre', 'Efe',
  'Elif', 'Asel', 'Defne', 'Zümra', 'Ecrin', 'Duru', 'Nisa', 'Sude', 'Ela', 'İrem'
];

const isletmeAdjectives = [
  'Modern', 'Gelişmiş', 'Yenilikçi', 'Global', 'Teknoloji', 'Digital', 'Akıllı', 'Uzman', 'Profesyonel', 'Entegre'
];

const isletmeTypes = [
  'Yazılım', 'Teknoloji', 'Bilişim', 'Danışmanlık', 'Hizmetleri', 'Sistemleri', 'Çözümleri', 'Merkezleri'
];

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getRandomName(names) {
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomSurname() {
  return getRandomName(soyadlar);
}

function generateCompanyName(alan) {
  const adj = getRandomName(isletmeAdjectives);
  const type = getRandomName(isletmeTypes);
  return `${adj} ${type}`;
}

async function createFreshSeedData() {
  console.log('🌱 Fresh seed data oluşturuluyor...\n');
  
  try {
    // 1. Mevcut alanları al
    console.log('📋 Mevcut alanlar getiriliyor...');
    const { data: alanlar, error: alanlarError } = await supabase
      .from('alanlar')
      .select('*')
      .order('ad');
    
    if (alanlarError) throw alanlarError;
    console.log(`✅ ${alanlar.length} alan bulundu.\n`);
    
    if (alanlar.length === 0) {
      console.log('⚠️  Hiç alan bulunamadı. Önce alanları oluşturun.');
      return;
    }

    // 2. Aktif eğitim yılını al
    console.log('📅 Aktif eğitim yılı getiriliyor...');
    const { data: egitimYillariData, error: egitimYiliError } = await supabase
      .from('egitim_yillari')
      .select('*')
      .eq('aktif', true);
    
    let egitimYili;
    if (egitimYiliError || !egitimYillariData || egitimYillariData.length === 0) {
      console.log('⚠️  Aktif eğitim yılı bulunamadı. Varsayılan oluşturuluyor...');
      const currentYear = new Date().getFullYear();
      const { data: newEgitimYili, error: newEgitimYiliError } = await supabase
        .from('egitim_yillari')
        .insert({
          yil: `${currentYear}-${currentYear + 1}`,
          aktif: true
        })
        .select()
        .single();
      
      if (newEgitimYiliError) throw newEgitimYiliError;
      egitimYili = newEgitimYili;
    } else {
      egitimYili = egitimYillariData[0]; // İlkini al
    }
    console.log(`✅ Eğitim yılı: ${egitimYili.yil}\n`);

    const allData = {
      ogretmenler: [],
      siniflar: [],
      ogrenciler: [],
      isletmeler: [],
      stajlar: [],
      isletmeAlanlar: []
    };

    // Her alan için veri oluştur
    for (const alan of alanlar) {
      console.log(`\n🎯 "${alan.ad}" alanı için veri oluşturuluyor...`);

      // 3. Öğretmenler oluştur
      const ogretmenlerForAlan = [];
      for (let i = 0; i < 4; i++) {
        const ogretmen = {
          id: uuidv4(),
          ad: getRandomName(ogretmenAdlari),
          soyad: getRandomSurname(),
          pin: generatePin(),
          alan_id: alan.id
        };
        ogretmenlerForAlan.push(ogretmen);
        allData.ogretmenler.push(ogretmen);
      }

      const { data: insertedOgretmenler, error: ogretmenError } = await supabase
        .from('ogretmenler')
        .insert(ogretmenlerForAlan)
        .select();
      
      if (ogretmenError) throw ogretmenError;
      console.log(`   ✅ ${insertedOgretmenler.length} öğretmen oluşturuldu`);

      // 4. Sınıflar oluştur
      const siniflarForAlan = [
        { ad: `${alan.ad}-11A`, alan_id: alan.id },
        { ad: `${alan.ad}-11B`, alan_id: alan.id },
        { ad: `${alan.ad}-12A`, alan_id: alan.id }
      ];
      
      const { data: insertedSiniflar, error: sinifError } = await supabase
        .from('siniflar')
        .insert(siniflarForAlan)
        .select();
      
      if (sinifError) throw sinifError;
      console.log(`   ✅ ${insertedSiniflar.length} sınıf oluşturuldu`);
      allData.siniflar.push(...insertedSiniflar);

      // 5. Öğrenciler oluştur
      const ogrencilerForAlan = [];
      for (let i = 0; i < 25; i++) {
        const ogrenci = {
          ad: getRandomName(ogrenciAdlari),
          soyad: getRandomSurname(),
          no: `${alan.id.slice(0, 2)}${String(i + 1).padStart(3, '0')}`, // Alan bazlı no
          sinif: insertedSiniflar[i % insertedSiniflar.length].ad,
          alan_id: alan.id
        };
        ogrencilerForAlan.push(ogrenci);
      }

      const { data: insertedOgrenciler, error: ogrenciError } = await supabase
        .from('ogrenciler')
        .insert(ogrencilerForAlan)
        .select();
      
      if (ogrenciError) throw ogrenciError;
      console.log(`   ✅ ${insertedOgrenciler.length} öğrenci oluşturuldu`);
      allData.ogrenciler.push(...insertedOgrenciler);

      // 6. İşletmeler oluştur
      const isletmelerForAlan = [];
      for (let i = 0; i < 8; i++) {
        const isletme = {
          id: uuidv4(),
          ad: generateCompanyName(alan),
          yetkili_kisi: `${getRandomName(ogretmenAdlari)} ${getRandomSurname()}`,
          pin: generatePin(),
          ogretmen_id: insertedOgretmenler[i % insertedOgretmenler.length].id
        };
        isletmelerForAlan.push(isletme);
        allData.isletmeler.push(isletme);
        
        // İşletme-alan ilişkisi
        allData.isletmeAlanlar.push({
          isletme_id: isletme.id,
          alan_id: alan.id
        });
      }

      const { data: insertedIsletmeler, error: isletmeError } = await supabase
        .from('isletmeler')
        .insert(isletmelerForAlan)
        .select();
      
      if (isletmeError) throw isletmeError;
      console.log(`   ✅ ${insertedIsletmeler.length} işletme oluşturuldu`);

      // 7. Stajlar oluştur (öğrencilerin %80'ine staj ata)
      const stajSayisi = Math.floor(insertedOgrenciler.length * 0.8);
      const stajlarForAlan = [];
      
      for (let i = 0; i < stajSayisi; i++) {
        const baslangicTarihi = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const bitisTarihi = new Date(baslangicTarihi.getTime() + 120 * 24 * 60 * 60 * 1000); // 4 months later
        
        const staj = {
          ogrenci_id: insertedOgrenciler[i].id,
          isletme_id: insertedIsletmeler[i % insertedIsletmeler.length].id,
          ogretmen_id: insertedOgretmenler[i % insertedOgretmenler.length].id,
          baslangic_tarihi: baslangicTarihi.toISOString().split('T')[0],
          bitis_tarihi: bitisTarihi.toISOString().split('T')[0],
          durum: Math.random() > 0.1 ? 'aktif' : 'tamamlandi'
        };
        stajlarForAlan.push(staj);
        allData.stajlar.push(staj);
      }

      if (stajlarForAlan.length > 0) {
        const { data: insertedStajlar, error: stajError } = await supabase
          .from('stajlar')
          .insert(stajlarForAlan)
          .select();
        
        if (stajError) throw stajError;
        console.log(`   ✅ ${insertedStajlar.length} staj kaydı oluşturuldu`);
      }
    }

    // 8. İşletme-alan ilişkilerini toplu ekle
    if (allData.isletmeAlanlar.length > 0) {
      console.log('\n🔗 İşletme-alan ilişkileri oluşturuluyor...');
      const { data: insertedIsletmeAlanlar, error: isletmeAlanError } = await supabase
        .from('isletme_alanlar')
        .insert(allData.isletmeAlanlar)
        .select();
      
      if (isletmeAlanError) throw isletmeAlanError;
      console.log(`✅ ${insertedIsletmeAlanlar.length} işletme-alan ilişkisi oluşturuldu`);
    }

    // Özet rapor
    console.log('\n📊 ÖZET RAPOR:');
    console.log(`   🎓 Alanlar: ${alanlar.length}`);
    console.log(`   👨‍🏫 Öğretmenler: ${allData.ogretmenler.length}`);
    console.log(`   🏫 Sınıflar: ${allData.siniflar.length}`);
    console.log(`   👨‍🎓 Öğrenciler: ${allData.ogrenciler.length}`);
    console.log(`   🏢 İşletmeler: ${allData.isletmeler.length}`);
    console.log(`   💼 Stajlar: ${allData.stajlar.length}`);
    console.log(`   🔗 İşletme-alan ilişkileri: ${allData.isletmeAlanlar.length}`);

    console.log('\n🎉 Fresh seed data başarıyla oluşturuldu!');
    console.log('✨ Tüm UUID ilişkileri tutarlı ve foreign key constraints uyumlu.');
    
  } catch (error) {
    console.error('❌ Seed data oluşturma hatası:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  createFreshSeedData()
    .then(() => {
      console.log('\n🏁 İşlem tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { createFreshSeedData };