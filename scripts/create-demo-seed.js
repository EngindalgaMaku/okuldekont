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
  console.error('Supabase URL veya Service Role Key bulunamadı. .env.local dosyasını kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const alanlar = [
  { ad: 'Bilişim Teknolojileri', aciklama: 'Yazılım, donanım ve ağ sistemleri' },
  { ad: 'Muhasebe ve Finansman', aciklama: 'Finansal yönetim ve muhasebe işlemleri' },
  { ad: 'Pazarlama ve Perakende', aciklama: 'Satış, pazarlama ve müşteri ilişkileri' },
  { ad: 'Sağlık Hizmetleri', aciklama: 'Hasta bakımı ve temel tıbbi hizmetler' },
  { ad: 'Turizm ve Otelcilik', aciklama: 'Konaklama, seyahat ve yiyecek-içecek hizmetleri' },
  { ad: 'Endüstriyel Otomasyon', aciklama: 'Mekatronik ve endüstriyel üretim sistemleri' }
];

const ogretmenAdlari = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice'];
const soyadlar = ['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Öztürk', 'Aydın'];
const ogrenciAdlari = ['Yusuf', 'Eymen', 'Mert', 'Ömer', 'Kerem', 'Elif', 'Asel', 'Defne', 'Zümra', 'Ecrin'];

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createDemoData() {
  console.log('🔥 Kapsamlı demo verisi oluşturuluyor...');

  try {
    // 1. Alanları oluştur
    const { data: alanlarData, error: alanlarError } = await supabase
      .from('alanlar')
      .upsert(alanlar, { onConflict: 'ad' })
      .select();
    if (alanlarError) throw alanlarError;
    console.log(`✅ ${alanlarData.length} alan oluşturuldu.`);

    for (const alan of alanlarData) {
      console.log(`\n➡️  "${alan.ad}" alanı için veri oluşturuluyor...`);

      // 2. Öğretmenleri oluştur
      const ogretmenlerToInsert = [];
      for (let i = 0; i < 5; i++) {
        ogretmenlerToInsert.push({
          ad: ogretmenAdlari[Math.floor(Math.random() * ogretmenAdlari.length)],
          soyad: soyadlar[Math.floor(Math.random() * soyadlar.length)],
          pin: generatePin(),
          alan_id: alan.id
        });
      }
      const { data: ogretmenlerData, error: ogretmenlerError } = await supabase
        .from('ogretmenler')
        .insert(ogretmenlerToInsert)
        .select();
      if (ogretmenlerError) throw ogretmenlerError;
      console.log(`   - ${ogretmenlerData.length} öğretmen oluşturuldu.`);

      // 3. Sınıfları oluştur
      const siniflarToInsert = [
        { ad: '11-A', alan_id: alan.id },
        { ad: '11-B', alan_id: alan.id }
      ];
      const { data: siniflarData, error: siniflarError } = await supabase
        .from('siniflar')
        .upsert(siniflarToInsert, { onConflict: 'ad, alan_id' })
        .select();
      if (siniflarError) throw siniflarError;
      console.log(`   - ${siniflarData.length} sınıf oluşturuldu.`);

      // 4. Öğrencileri oluştur
      const ogrencilerToInsert = [];
      for (let i = 0; i < 20; i++) {
        ogrencilerToInsert.push({
          ad: ogrenciAdlari[Math.floor(Math.random() * ogrenciAdlari.length)],
          soyad: soyadlar[Math.floor(Math.random() * soyadlar.length)],
          sinif: siniflarData[i % 2].ad, // Öğrencileri 2 sınıfa dağıt
          alan_id: alan.id,
          no: (100 + i).toString()
        });
      }
      const { data: ogrencilerData, error: ogrencilerError } = await supabase
        .from('ogrenciler')
        .insert(ogrencilerToInsert)
        .select();
      if (ogrencilerError) throw ogrencilerError;
      console.log(`   - ${ogrencilerData.length} öğrenci oluşturuldu.`);

      // 5. İşletmeleri oluştur
      const isletmelerToInsert = [];
      for (let i = 0; i < 10; i++) {
        isletmelerToInsert.push({
          ad: `${alan.ad} İşletmesi ${i + 1}`,
          yetkili_kisi: 'Yetkili Kişi',
          pin: generatePin(),
          ogretmen_id: ogretmenlerData[i % 5].id
        });
      }
      const { data: isletmelerData, error: isletmelerError } = await supabase
        .from('isletmeler')
        .insert(isletmelerToInsert)
        .select();
      if (isletmelerError) throw isletmelerError;
      console.log(`   - ${isletmelerData.length} işletme oluşturuldu.`);

      // 6. Stajları oluştur
      const stajlarToInsert = [];
      const aktifEgitimYili = await supabase.from('egitim_yillari').select('id').eq('aktif', true).single();
      for (let i = 0; i < 15; i++) { // Her alandan 15 öğrenciye staj ata
        stajlarToInsert.push({
          ogrenci_id: ogrencilerData[i].id,
          isletme_id: isletmelerData[i % 10].id,
          ogretmen_id: ogretmenlerData[i % 5].id,
          egitim_yili_id: aktifEgitimYili.data.id,
          baslangic_tarihi: new Date().toISOString(),
          durum: 'aktif'
        });
      }
      const { data: stajlarData, error: stajlarError } = await supabase
        .from('stajlar')
        .insert(stajlarToInsert)
        .select();
      if (stajlarError) throw stajlarError;
      console.log(`   - ${stajlarData.length} staj kaydı oluşturuldu.`);
    }

    console.log('\n🎉 Kapsamlı demo verisi başarıyla oluşturuldu!');

  } catch (error) {
    console.error('❌ Demo verisi oluşturulurken hata:', error.message);
  }
}

createDemoData();