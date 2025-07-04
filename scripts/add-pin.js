const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addPinToIsletmeler() {
  console.log('🔐 İşletmelere PIN alanı ekleniyor...')
  
  console.log('\n📋 Aşağıdaki SQL\'i Supabase Dashboard\'da çalıştırın:')
  console.log('🔗 https://supabase.com/dashboard/project/guqwqbxsfvddwwczwljp/sql')
  console.log('\n' + '='.repeat(60))
  
  const pinSQL = `
-- İşletmeler tablosuna PIN alanı ekle
ALTER TABLE isletmeler ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT '1234';

-- Mevcut işletmelere rastgele PIN ata
UPDATE isletmeler SET pin = '1234' WHERE id = 1;
UPDATE isletmeler SET pin = '5678' WHERE id = 2;
UPDATE isletmeler SET pin = '9876' WHERE id = 3;

-- Yeni işletmeler ekle (PIN ile)
INSERT INTO isletmeler (ad, yetkili_kisi, telefon, email, adres, vergi_no, pin) VALUES 
('MegaTech Bilişim A.Ş.', 'Ahmet Özkan', '02125551237', 'ahmet.ozkan@megatech.com', 'Beşiktaş, İstanbul', '1234567893', '2468'),
('AutoParts Otomotiv Ltd.', 'Serpil Kılıç', '02125551238', 'serpil.kilic@autoparts.com', 'Şişli, İstanbul', '1234567894', '1357'),
('ElektroMax Elektronik', 'Burak Tunç', '02125551239', 'burak.tunc@elektromax.com', 'Bakırköy, İstanbul', '1234567895', '7531')
ON CONFLICT (vergi_no) DO NOTHING;

-- PIN alanını göster
SELECT id, ad, yetkili_kisi, pin FROM isletmeler ORDER BY id;
`
  
  console.log(pinSQL)
  console.log('='.repeat(60))
  console.log('\n✅ SQL\'i çalıştırdıktan sonra işletme giriş sistemi hazır olacak!')
  
  // Mevcut işletmeleri kontrol et
  try {
    const { data: isletmeler, error } = await supabase
      .from('isletmeler')
      .select('id, ad, yetkili_kisi')
      .limit(5)
    
    if (isletmeler && isletmeler.length > 0) {
      console.log('\n📊 Mevcut İşletmeler:')
      isletmeler.forEach(isletme => {
        console.log(`  - ${isletme.ad} (${isletme.yetkili_kisi})`)
      })
    }
  } catch (error) {
    console.log('\n📡 İşletmeler kontrol ediliyor...')
  }
}

async function main() {
  console.log('🎓 Hüsniye Özdilek MTAL - PIN Sistemi')
  console.log('='.repeat(45))
  
  await addPinToIsletmeler()
}

main() 