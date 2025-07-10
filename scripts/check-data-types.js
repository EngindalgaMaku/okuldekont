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

async function checkDataTypes() {
  console.log('Checking ogrenciler table IDs...');
  const { data, error } = await supabase
    .from('ogrenciler')
    .select('id, ad, soyad')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample ogrenciler data:');
    data.forEach(o => console.log(`ID: ${o.id} (${typeof o.id}) - ${o.ad} ${o.soyad}`));
  }

  console.log('\nChecking stajlar table...');
  const { data: stajData, error: stajError } = await supabase
    .from('stajlar')
    .select('id, ogrenci_id')
    .limit(5);
  
  if (stajError) {
    console.error('Stajlar Error:', stajError);
  } else {
    console.log('Sample stajlar data:');
    stajData.forEach(s => console.log(`Staj ID: ${s.id}, Ogrenci ID: ${s.ogrenci_id} (${typeof s.ogrenci_id})`));
  }

  // Check for the specific problematic students
  console.log('\nChecking problematic student IDs (13, 133)...');
  const { data: specificData, error: specificError } = await supabase
    .from('ogrenciler')
    .select('id, ad, soyad')
    .in('id', ['13', '133']);
  
  if (specificError) {
    console.error('Specific Error:', specificError);
  } else {
    console.log('Problematic students:');
    specificData.forEach(o => console.log(`ID: ${o.id} (${typeof o.id}) - ${o.ad} ${o.soyad}`));
  }
}

checkDataTypes();