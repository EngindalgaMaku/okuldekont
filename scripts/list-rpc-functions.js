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

async function listRpcFunctions() {
  console.log('📋 Veritabanındaki RPC fonksiyonları listeleniyor...\n');
  
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
    console.log('✅ Veritabanı bağlantısı başarılı.\n');

    // 1. Tüm custom fonksiyonları listele (sistem fonksiyonları hariç)
    console.log('📝 Özel RPC Fonksiyonları:');
    console.log('=' .repeat(80));
    
    const functionsQuery = `
      SELECT 
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type,
        l.lanname as language,
        CASE 
          WHEN p.prosecdef THEN 'SECURITY DEFINER'
          ELSE 'SECURITY INVOKER'
        END as security,
        obj_description(p.oid, 'pg_proc') as description
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public'  -- Sadece public schema
        AND l.lanname != 'internal'  -- Sistem fonksiyonları hariç
      ORDER BY p.proname;
    `;

    const { rows: functions } = await client.query(functionsQuery);
    
    if (functions.length === 0) {
      console.log('⚠️ Özel RPC fonksiyonu bulunamadı.');
    } else {
      functions.forEach((func, index) => {
        console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
        console.log(`   📤 Dönüş: ${func.return_type}`);
        console.log(`   🔧 Dil: ${func.language.toUpperCase()}`);
        console.log(`   🔒 Güvenlik: ${func.security}`);
        if (func.description) {
          console.log(`   📝 Açıklama: ${func.description}`);
        }
        console.log('');
      });
    }

    // 2. Admin ile ilgili fonksiyonları detaylı göster
    console.log('\n🔧 Admin İle İlgili Fonksiyonlar:');
    console.log('=' .repeat(80));
    
    const adminFunctionsQuery = `
      SELECT 
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND (p.proname ILIKE '%admin%' 
             OR p.proname ILIKE '%user%'
             OR p.proname ILIKE '%setting%'
             OR p.proname ILIKE '%super%')
      ORDER BY p.proname;
    `;

    const { rows: adminFunctions } = await client.query(adminFunctionsQuery);
    
    if (adminFunctions.length === 0) {
      console.log('⚠️ Admin ile ilgili fonksiyon bulunamadı.');
    } else {
      adminFunctions.forEach((func, index) => {
        console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`);
        console.log('-'.repeat(60));
        console.log(func.definition);
        console.log('');
      });
    }

    // 3. Trigger fonksiyonlarını listele
    console.log('\n🎯 Trigger Fonksiyonları:');
    console.log('=' .repeat(80));
    
    const triggerFunctionsQuery = `
      SELECT 
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        'trigger' as type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND pg_get_function_result(p.oid) = 'trigger'
      ORDER BY p.proname;
    `;

    const { rows: triggerFunctions } = await client.query(triggerFunctionsQuery);
    
    if (triggerFunctions.length === 0) {
      console.log('⚠️ Trigger fonksiyonu bulunamadı.');
    } else {
      triggerFunctions.forEach((func, index) => {
        console.log(`${index + 1}. ${func.function_name}() [TRIGGER]`);
      });
    }

    // 4. Aktif triggerları listele
    console.log('\n🔗 Aktif Triggerlar:');
    console.log('=' .repeat(80));
    
    const triggersQuery = `
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name,
        CASE t.tgtype & 66
          WHEN 2 THEN 'BEFORE'
          WHEN 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END as timing,
        CASE t.tgtype & 28
          WHEN 4 THEN 'INSERT'
          WHEN 8 THEN 'DELETE'
          WHEN 16 THEN 'UPDATE'
          WHEN 12 THEN 'INSERT, DELETE'
          WHEN 20 THEN 'INSERT, UPDATE'
          WHEN 24 THEN 'DELETE, UPDATE'
          WHEN 28 THEN 'INSERT, DELETE, UPDATE'
        END as events
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname;
    `;

    const { rows: triggers } = await client.query(triggersQuery);
    
    if (triggers.length === 0) {
      console.log('⚠️ Aktif trigger bulunamadı.');
    } else {
      triggers.forEach((trigger, index) => {
        console.log(`${index + 1}. ${trigger.trigger_name}`);
        console.log(`   📊 Tablo: ${trigger.table_name}`);
        console.log(`   🔧 Fonksiyon: ${trigger.function_name}()`);
        console.log(`   ⏰ Zamanlama: ${trigger.timing}`);
        console.log(`   📝 Olaylar: ${trigger.events}`);
        console.log('');
      });
    }

    console.log('\n✅ RPC fonksiyonları listeleme tamamlandı!');
    console.log('📋 Bu fonksiyonlar veritabanında stored procedure olarak saklanır.');
    console.log('🔧 Supabase Dashboard > SQL Editor\'den de görüntüleyebilirsiniz.');

  } catch (error) {
    console.error('❌ RPC fonksiyonları listelenirken hata oluştu:', error);
    console.error('Hata detayı:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Veritabanı bağlantısı kapatıldı.');
  }
}

// Script'i çalıştır
listRpcFunctions();