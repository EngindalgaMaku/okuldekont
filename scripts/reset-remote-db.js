const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// .env.local dosyasındaki çevre değişkenlerini yükle
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

async function main() {
  console.log('🔥 Uzak Veritabanını Sıfırlama Başlatılıyor...');
  console.log('='.repeat(50));

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL bulunamadı. Lütfen .env.local dosyasını kontrol edin.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Veritabanı bağlantısı başarılı.');

    console.log('🗑️  Tüm nesneler siliniyor (TABLE, VIEW, FUNCTION, TYPE)...');

    // Tüm fonksiyonları sil
    const functions = await client.query(`
      SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ') CASCADE;' as drop_command
      FROM pg_proc p
      JOIN pg_namespace ns ON p.pronamespace = ns.oid
      WHERE ns.nspname = 'public';
    `);
    for (const row of functions.rows) {
      console.log(`   -> ${row.drop_command}`);
      await client.query(row.drop_command);
    }

    // Tüm view'ları sil
    const views = await client.query(`
      SELECT 'DROP VIEW IF EXISTS ' || table_schema || '.' || table_name || ' CASCADE;' as drop_command
      FROM information_schema.views
      WHERE table_schema = 'public';
    `);
    for (const row of views.rows) {
        console.log(`   -> ${row.drop_command}`);
        await client.query(row.drop_command);
    }

    // Tüm tabloları sil
    const tables = await client.query(`
      SELECT 'DROP TABLE IF EXISTS ' || table_schema || '.' || table_name || ' CASCADE;' as drop_command
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    for (const row of tables.rows) {
        console.log(`   -> ${row.drop_command}`);
        await client.query(row.drop_command);
    }
    
    // Tüm custom type'ları sil
    const types = await client.query(`
        SELECT 'DROP TYPE IF EXISTS ' || n.nspname || '.' || t.typname || ' CASCADE;' as drop_command
        FROM pg_type t 
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
        WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid)) 
        AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
        AND n.nspname = 'public';
    `);
    for (const row of types.rows) {
        console.log(`   -> ${row.drop_command}`);
        await client.query(row.drop_command);
    }

    console.log('\n🎉 Veritabanı başarıyla sıfırlandı!');
  } catch (error) {
    console.error('\n❌ Sıfırlama sırasında kritik bir hata oluştu:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  }
}

main();