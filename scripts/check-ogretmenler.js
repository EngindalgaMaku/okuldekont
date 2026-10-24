const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOgretmenler() {
  const alanId = '5ef957f8-2a3f-46c0-97e0-9fa4fb234231';
  
  console.log('Checking teachers for alan:', alanId);
  const { data, error } = await supabase
    .from('ogretmenler')
    .select('*')
    .eq('alan_id', alanId);
  
  if (error) {
    console.error('Öğretmenler Error:', error);
  } else {
    console.log('Teachers found:', data.length);
    data.forEach(o => console.log(`- ${o.ad} ${o.soyad} (ID: ${o.id})`));
  }

  console.log('\nChecking all teachers...');
  const { data: allTeachers, error: allError } = await supabase
    .from('ogretmenler')
    .select('id, ad, soyad, alan_id')
    .limit(10);
  
  if (allError) {
    console.error('All teachers error:', allError);
  } else {
    console.log('Sample teachers:');
    allTeachers.forEach(o => console.log(`- ${o.ad} ${o.soyad} (Alan: ${o.alan_id})`));
  }

  // Check which alan this is
  console.log('\nChecking alan details...');
  const { data: alanData, error: alanError } = await supabase
    .from('alanlar')
    .select('*')
    .eq('id', alanId)
    .single();
  
  if (alanError) {
    console.error('Alan error:', alanError);
  } else {
    console.log('Alan:', alanData.ad, '- Aktif:', alanData.aktif);
  }
}

checkOgretmenler();