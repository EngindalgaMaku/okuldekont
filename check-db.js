const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://guqwqbxsfvddwwczwljp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'
);

async function checkData() {
  console.log('Veritabanı bağlantısı kontrol ediliyor...');
  
  // Eğitim Yılları tablosunu kontrol et
  console.log('\n=== EĞİTİM YILLARI ===');
  const { data: egitimYillari, error: egitimError } = await supabase
    .from('egitim_yillari')
    .select('*');
  
  if (egitimError) {
    console.error('❌ Eğitim Yılları hatası:', egitimError.message);
  } else {
    console.log('✅ Eğitim yılı sayısı:', egitimYillari?.length || 0);
    egitimYillari?.forEach(y => console.log(`- ${y.yil} (${y.aktif ? 'Aktif' : 'Pasif'})`));
  }

  // İşletmeler tablosunu kontrol et
  console.log('\n=== İŞLETMELER ===');
  const { data: isletmeler, error: isletmeError } = await supabase
    .from('isletmeler')
    .select('*');
  
  if (isletmeError) {
    console.error('İşletmeler hatası:', isletmeError);
  } else {
    console.log('İşletme sayısı:', isletmeler?.length || 0);
    isletmeler?.forEach(i => console.log(`- ${i.ad} (${i.yetkili_kisi})`));
  }

  // Diğer tabloları da kontrol et
  console.log('\n=== ALANLAR ===');
  const { data: alanlar, error: alanError } = await supabase
    .from('alanlar')
    .select('*');
  
  if (alanError) {
    console.error('Alanlar hatası:', alanError);
  } else {
    console.log('Alan sayısı:', alanlar?.length || 0);
    alanlar?.forEach(a => console.log(`- ${a.ad}`));
  }

  console.log('\n=== ÖĞRENCİLER ===');
  const { data: ogrenciler, error: ogrenciError } = await supabase
    .from('ogrenciler')
    .select('*');
  
  if (ogrenciError) {
    console.error('Öğrenciler hatası:', ogrenciError);
  } else {
    console.log('Öğrenci sayısı:', ogrenciler?.length || 0);
  }

  // Öğretmenler tablosunu kontrol et
  console.log('\n=== ÖĞRETMENLER ===');
  const { data: ogretmenler, error: ogretmenError } = await supabase
    .from('ogretmenler')
    .select('*');
  
  if (ogretmenError) {
    console.error('❌ Öğretmenler hatası:', ogretmenError.message);
  } else {
    console.log('✅ Öğretmen sayısı:', ogretmenler?.length || 0);
    ogretmenler?.forEach(o => console.log(`- ${o.ad} ${o.soyad} (${o.aktif ? 'Aktif' : 'Pasif'})`));
  }

  // İşletme-Alan ilişkilerini kontrol et
  console.log('\n=== İŞLETME-ALAN İLİŞKİLERİ ===');
  const { data: isletmeAlanlar, error: isletmeAlanError } = await supabase
    .from('isletme_alanlar')
    .select(`
      id,
      isletmeler (ad),
      alanlar (ad),
      ogretmenler (ad, soyad)
    `);
  
  if (isletmeAlanError) {
    console.error('❌ İşletme-Alan ilişkileri hatası:', isletmeAlanError.message);
  } else {
    console.log('✅ İşletme-Alan ataması sayısı:', isletmeAlanlar?.length || 0);
    isletmeAlanlar?.forEach(ia => {
      const koordinator = ia.ogretmenler ? 
        `${ia.ogretmenler.ad} ${ia.ogretmenler.soyad}` : 
        'Koordinatör yok';
      console.log(`- ${ia.isletmeler.ad} → ${ia.alanlar.ad} (${koordinator})`);
    });
  }
}

checkData(); 