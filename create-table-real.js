const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://guqwqbxsfvddwwczwljp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'
);

async function createTableFinal() {
  console.log('Gerçek tabloyu oluşturuyorum - Service Role ile...');

  try {
    // Önce mevcut tabloyu kontrol et
    const { data: existing, error: checkError } = await supabase
      .from('egitim_yillari')
      .select('count')
      .limit(1);

    if (!checkError) {
      console.log('⚠️  Tablo zaten var, veriler kontrol ediliyor...');
      
      const { data: allData, error: dataError } = await supabase
        .from('egitim_yillari')
        .select('*');
        
      if (!dataError && allData) {
        console.log('📋 Mevcut veriler:');
        allData.forEach(row => {
          console.log(`   ${row.yil} - ${row.aktif ? 'Aktif' : 'Pasif'}`);
        });
        console.log('\n✅ Tablo zaten mevcut ve çalışıyor!');
        return;
      }
    }

    console.log('🔧 Tablo bulunamadı, oluşturuyorum...');
    
    // exec_sql fonksiyonu ile tablo oluştur
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS egitim_yillari (
            id SERIAL PRIMARY KEY,
            yil VARCHAR(20) NOT NULL UNIQUE,
            aktif BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        ALTER TABLE egitim_yillari DISABLE ROW LEVEL SECURITY;
        
        INSERT INTO egitim_yillari (yil, aktif) VALUES 
        ('2023-2024', false),
        ('2024-2025', true),
        ('2025-2026', false)
        ON CONFLICT (yil) DO NOTHING;
      `
    });

    if (error) {
      console.log('❌ exec_sql hatası:', error.message);
      
      // Plan B: Direct insert dene
      console.log('🔧 Plan B: Direct insert deneniyor...');
      
      const insertData = [
        { yil: '2023-2024', aktif: false },
        { yil: '2024-2025', aktif: true },
        { yil: '2025-2026', aktif: false }
      ];

      for (const item of insertData) {
        const { error: insertError } = await supabase
          .from('egitim_yillari')
          .insert(item);
        
        if (insertError) {
          console.log(`❌ ${item.yil} eklenemedi:`, insertError.message);
        } else {
          console.log(`✅ ${item.yil} eklendi`);
        }
      }
    } else {
      console.log('✅ SQL başarılı:', data);
    }

    // Final kontrol
    const { data: finalCheck, error: finalError } = await supabase
      .from('egitim_yillari')
      .select('*')
      .order('yil');

    if (finalError) {
      console.log('❌ Final kontrol hatası:', finalError.message);
    } else {
      console.log('\n🎉 Final kontrol - Tabloda bulunan veriler:');
      finalCheck?.forEach(row => {
        console.log(`   ${row.yil} - ${row.aktif ? 'Aktif' : 'Pasif'}`);
      });
    }

  } catch (error) {
    console.error('❌ Genel hata:', error.message);
  }
}

createTableFinal(); 