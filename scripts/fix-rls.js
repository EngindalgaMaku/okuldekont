import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function disableRLS() {
  console.log('🔓 RLS devre dışı bırakılıyor...')

  try {
    const { data, error } = await supabase.rpc('disable_rls', {
      table_name: 'isletmeler'
    })

    if (error) throw error

    console.log('✅ RLS başarıyla devre dışı bırakıldı')
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

async function fixRLSAndSeed() {
  console.log('🔧 RLS düzeltme ve veri ekleme...')
  
  console.log('\n📋 RLS politikalarını kaldırmak için aşağıdaki SQL\'i Supabase Dashboard\'da çalıştırın:')
  console.log('🔗 https://supabase.com/dashboard/project/guqwqbxsfvddwwczwljp/sql')
  console.log('\n' + '='.repeat(60))
  
  const fixSQL = `
-- RLS politikalarını geçici olarak kaldır
ALTER TABLE alanlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE ogretmenler DISABLE ROW LEVEL SECURITY;
ALTER TABLE isletmeler DISABLE ROW LEVEL SECURITY;
ALTER TABLE ogrenciler DISABLE ROW LEVEL SECURITY;
ALTER TABLE stajlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE dekontlar DISABLE ROW LEVEL SECURITY;

-- Örnek veri ekle
INSERT INTO alanlar (ad, aciklama) VALUES 
('Bilişim Teknolojileri', 'Bilgisayar programcılığı ve web tasarımı'),
('Elektrik-Elektronik', 'Elektrik tesisatı ve elektronik sistemler'),
('Makine Teknolojisi', 'CNC ve genel makine imalatı'),
('Otomotiv', 'Otomobil bakım ve onarımı'),
('Muhasebe ve Finans', 'Muhasebe ve mali işler'),
('Pazarlama ve Satış', 'Mağaza satış ve müşteri hizmetleri')
ON CONFLICT (ad) DO NOTHING;

-- Örnek işletmeler
INSERT INTO isletmeler (ad, yetkili_kisi, telefon, email, adres, vergi_no) VALUES 
('TechCorp Yazılım Ltd.', 'Ali Çelik', '02125551234', 'ali.celik@techcorp.com', 'Ataşehir, İstanbul', '1234567890'),
('ElektrikPro Mühendislik', 'Zeynep Aydın', '02125551235', 'zeynep.aydin@elektrikpro.com', 'Kadıköy, İstanbul', '1234567891'),
('MakineParts A.Ş.', 'Hasan Korkmaz', '02125551236', 'hasan.korkmaz@makineparts.com', 'Kartal, İstanbul', '1234567892')
ON CONFLICT (vergi_no) DO NOTHING;

-- Örnek öğretmenler (alan_id 1, 2, 3 varsayarak)
INSERT INTO ogretmenler (ad, soyad, email, telefon, alan_id) VALUES 
('Mehmet', 'Yılmaz', 'mehmet.yilmaz@okul.edu.tr', '05551234567', 1),
('Ayşe', 'Kaya', 'ayse.kaya@okul.edu.tr', '05551234568', 2),
('Fatma', 'Demir', 'fatma.demir@okul.edu.tr', '05551234569', 3)
ON CONFLICT (email) DO NOTHING;

-- Örnek öğrenciler
INSERT INTO ogrenciler (ad, soyad, tc_no, telefon, email, alan_id, sinif, veli_adi, veli_telefon) VALUES 
('Ahmet', 'Yıldız', '12345678901', '05559876543', 'ahmet.yildiz@student.edu.tr', 1, '12-A', 'Mustafa Yıldız', '05559876544'),
('Elif', 'Özkan', '12345678902', '05559876545', 'elif.ozkan@student.edu.tr', 2, '12-B', 'Sevgi Özkan', '05559876546'),
('Can', 'Arslan', '12345678903', '05559876547', 'can.arslan@student.edu.tr', 3, '12-C', 'Murat Arslan', '05559876548')
ON CONFLICT (tc_no) DO NOTHING;
`
  
  console.log(fixSQL)
  console.log('='.repeat(60))
  console.log('\n✅ SQL\'i çalıştırdıktan sonra sistem tamamen hazır olacak!')
  
  // Test bağlantısı
  try {
    const { data, error } = await supabase.from('alanlar').select('*').limit(1)
    if (data && data.length > 0) {
      console.log('\n🎉 Veritabanı mevcut ve erişilebilir!')
      console.log('📊 Test verisi:', data[0])
    }
  } catch (error) {
    console.log('\n📡 Veritabanı bağlantısı test ediliyor...')
  }
}

async function main() {
  console.log('🎓 Hüsniye Özdilek MTAL - RLS Düzeltme')
  console.log('='.repeat(45))
  
  await disableRLS()
  await fixRLSAndSeed()
}

main() 