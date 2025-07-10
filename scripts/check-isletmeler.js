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

async function checkIsletmeler() {
  console.log('Checking isletmeler table structure...');
  const { data, error } = await supabase
    .from('isletmeler')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('İşletmeler Error:', error);
  } else {
    console.log('Sample isletmeler data:');
    data.forEach(i => console.log(`ID: ${i.id} (${typeof i.id}) - ${i.ad}`));
  }

  // Get some staj isletme_id values to compare
  console.log('\nChecking stajlar isletme_id values...');
  const { data: stajData, error: stajError } = await supabase
    .from('stajlar')
    .select('isletme_id')
    .limit(5);
  
  if (stajError) {
    console.error('Stajlar Error:', stajError);
  } else {
    console.log('Sample stajlar isletme_id values:');
    stajData.forEach(s => console.log(`isletme_id: ${s.isletme_id} (${typeof s.isletme_id})`));
  }

  // Test a specific query that's failing
  console.log('\nTesting problematic query...');
  if (stajData && stajData.length > 0) {
    const testId = stajData[0].isletme_id;
    console.log(`Testing with isletme_id: ${testId}`);
    
    const { data: testData, error: testError } = await supabase
      .from('isletmeler')
      .select('ad')
      .eq('id', testId)
      .single();
    
    if (testError) {
      console.error('Test query error:', testError);
    } else {
      console.log('Test query successful:', testData);
    }
  }
}

checkIsletmeler();