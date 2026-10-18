import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Örnek öğretmen verileri
const ogretmenler = [
  {
    ad: 'Ahmet',
    soyad: 'Yılmaz',
    email: 'ahmet.yilmaz@okul.edu.tr',
    telefon: '0532 123 45 67',
    alan_id: null, // Alan ID'si daha sonra güncellenecek
    aktif: true,
    pin: '1234'
  },
  {
    ad: 'Fatma',
    soyad: 'Demir',
    email: 'fatma.demir@okul.edu.tr',
    telefon: '0533 234 56 78',
    alan_id: null,
    aktif: true,
    pin: '2345'
  },
  {
    ad: 'Mehmet',
    soyad: 'Kaya',
    email: 'mehmet.kaya@okul.edu.tr',
    telefon: '0534 345 67 89',
    alan_id: null,
    aktif: true,
    pin: '3456'
  },
  {
    ad: 'Ayşe',
    soyad: 'Özkan',
    email: 'ayse.ozkan@okul.edu.tr',
    telefon: '0535 456 78 90',
    alan_id: null,
    aktif: true,
    pin: '4567'
  },
  {
    ad: 'Mustafa',
    soyad: 'Çelik',
    email: 'mustafa.celik@okul.edu.tr',
    telefon: '0536 567 89 01',
    alan_id: null,
    aktif: true,
    pin: '5678'
  },
  {
    ad: 'Zeynep',
    soyad: 'Arslan',
    email: 'zeynep.arslan@okul.edu.tr',
    telefon: '0537 678 90 12',
    alan_id: null,
    aktif: false, // Pasif öğretmen örneği
    pin: '6789'
  }
];

async function seedOgretmenler() {
  console.log('🌱 Öğretmen seed data ekleniyor...');
  
  try {
    // Önce mevcut öğretmenleri kontrol et
    const { data: mevcutOgretmenler, error: kontrolError } = await supabase
      .from('ogretmenler')
      .select('*');
    
    if (kontrolError) {
      console.error('❌ Kontrol hatası:', kontrolError);
      return;
    }
    
    if (mevcutOgretmenler && mevcutOgretmenler.length > 0) {
      console.log('⚠️ Zaten öğretmen verileri mevcut. Seed işlemi atlanıyor.');
      console.log(`📊 Mevcut öğretmen sayısı: ${mevcutOgretmenler.length}`);
      return;
    }
    
    // Alanları kontrol et ve ID'leri al
    const { data: alanlar, error: alanError } = await supabase
      .from('alanlar')
      .select('*');
    
    if (alanError) {
      console.error('❌ Alan kontrol hatası:', alanError);
    }
    
    // Eğer alanlar varsa, öğretmenlere rastgele alan ata
    if (alanlar && alanlar.length > 0) {
      ogretmenler.forEach((ogretmen, index) => {
        // Her öğretmene rastgele alan ata (bazılarına alan atama)
        if (index < alanlar.length) {
          ogretmen.alan_id = alanlar[index % alanlar.length].id;
        }
      });
    }
    
    // Öğretmenleri ekle
    const { data, error } = await supabase
      .from('ogretmenler')
      .insert(ogretmenler)
      .select();
    
    if (error) {
      console.error('❌ Ekleme hatası:', error);
      return;
    }
    
    console.log('✅ Öğretmenler başarıyla eklendi!');
    console.log(`📊 Eklenen öğretmen sayısı: ${data.length}`);
    
    // Eklenen öğretmenleri listele
    data.forEach(ogretmen => {
      console.log(`👤 ${ogretmen.ad} ${ogretmen.soyad} - ${ogretmen.email} - PIN: ${ogretmen.pin}`);
    });
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
  }
}

// Alanlar için seed data
const alanlar = [
  {
    ad: 'Bilişim Teknolojileri',
    aciklama: 'Bilgisayar programlama, web tasarım ve sistem yönetimi',
    aktif: true
  },
  {
    ad: 'Muhasebe ve Finansman',
    aciklama: 'Muhasebe, finansal analiz ve ekonomi',
    aktif: true
  },
  {
    ad: 'Elektrik-Elektronik',
    aciklama: 'Elektrik tesisatı, elektronik devreler ve otomasyon',
    aktif: true
  },
  {
    ad: 'Makine Teknolojisi',
    aciklama: 'Makine imalat, CNC ve endüstriyel üretim',
    aktif: true
  },
  {
    ad: 'Otomotiv Teknolojisi',
    aciklama: 'Otomobil tamiri, motor teknolojileri ve araç sistemleri',
    aktif: true
  }
];

async function seedAlanlar() {
  console.log('🌱 Alan seed data ekleniyor...');
  
  try {
    // Mevcut alanları kontrol et
    const { data: mevcutAlanlar, error: kontrolError } = await supabase
      .from('alanlar')
      .select('*');
    
    if (kontrolError) {
      console.error('❌ Alan kontrol hatası:', kontrolError);
      return;
    }
    
    if (mevcutAlanlar && mevcutAlanlar.length >= 3) {
      console.log('⚠️ Yeterli alan verisi mevcut. Seed işlemi atlanıyor.');
      console.log(`📊 Mevcut alan sayısı: ${mevcutAlanlar.length}`);
      return mevcutAlanlar;
    }
    
    // Alanları ekle
    const { data, error } = await supabase
      .from('alanlar')
      .insert(alanlar)
      .select();
    
    if (error) {
      console.error('❌ Alan ekleme hatası:', error);
      return;
    }
    
    console.log('✅ Alanlar başarıyla eklendi!');
    console.log(`📊 Eklenen alan sayısı: ${data.length}`);
    
    data.forEach(alan => {
      console.log(`📚 ${alan.ad} - ${alan.aciklama}`);
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ Alan seed genel hatası:', error);
    return null;
  }
}

async function seedAll() {
  console.log('🚀 SEED DATA İŞLEMİ BAŞLIYOR');
  console.log('================================');
  
  // Önce alanları ekle
  await seedAlanlar();
  
  // Sonra öğretmenleri ekle
  await seedOgretmenler();
  
  console.log('================================');
  console.log('✅ SEED DATA İŞLEMİ TAMAMLANDI');
}

// Script çalıştırma
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll();
}

export { seedOgretmenler, seedAlanlar, seedAll };