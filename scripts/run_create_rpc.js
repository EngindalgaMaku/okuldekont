require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL veya Service Key bulunamadı. .env.local dosyasını kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const runMigration = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'create_gorev_belgeleri_rpc.sql'), 'utf8');
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });

    if (error) {
      console.error('RPC fonksiyonu oluşturulurken hata:', error);
    } else {
      console.log('`get_gorev_belgeleri_detayli` fonksiyonu başarıyla oluşturuldu.');
    }
  } catch (err) {
    console.error('Betiği çalıştırırken hata:', err);
  }
};

runMigration();