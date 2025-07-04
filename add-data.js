const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://guqwqbxsfvddwwczwljp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'
);

async function addData() {
  console.log('Örnek veri ekleniyor...');

  // İşletme verilerini ekle
  const isletmeler = [
    { ad: 'ABC Teknoloji', yetkili_kisi: 'Ahmet Demir', telefon: '555-1001', email: 'ahmet@abctek.com', adres: 'Merkez Mah. No:1', pin: '1234' },
    { ad: 'XYZ Elektrik', yetkili_kisi: 'Mehmet Şahin', telefon: '555-1002', email: 'mehmet@xyzelektrik.com', adres: 'Çarşı Cad. No:15', pin: '2345' },
    { ad: 'DEF Makine', yetkili_kisi: 'Fatma Yıldız', telefon: '555-1003', email: 'fatma@defmakine.com', adres: 'Sanayi Bölgesi No:8', pin: '3456' },
    { ad: 'GHI Otomotiv', yetkili_kisi: 'Ali Kaya', telefon: '555-1004', email: 'ali@ghiotomotiv.com', adres: 'Oto Sanayi Sitesi A/12', pin: '4567' },
    { ad: 'JKL Muhasebe', yetkili_kisi: 'Zeynep Özkan', telefon: '555-1005', email: 'zeynep@jklmuh.com', adres: 'İş Merkezi Kat:3', pin: '5678' },
    { ad: 'MNO Pazarlama', yetkili_kisi: 'Hasan Çelik', telefon: '555-1006', email: 'hasan@mnopazar.com', adres: 'AVM 2. Kat No:25', pin: '6789' }
  ];

  const { data, error } = await supabase
    .from('isletmeler')
    .insert(isletmeler);

  if (error) {
    console.error('İşletme ekleme hatası:', error);
  } else {
    console.log('✅ İşletmeler başarıyla eklendi!');
  }

  // Kontrol et
  const { data: check } = await supabase
    .from('isletmeler')
    .select('*');

  console.log(`📊 Toplam işletme sayısı: ${check?.length || 0}`);
}

addData(); 