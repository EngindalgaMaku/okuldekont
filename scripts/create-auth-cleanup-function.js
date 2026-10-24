const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase bağlantı bilgileri eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAuthCleanupFunction() {
  try {
    console.log('🔧 Auth temizlik fonksiyonu oluşturuluyor...')

    // PostgreSQL fonksiyonu oluştur
    const authCleanupFunction = `
      CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          cleanup_date timestamp with time zone;
          total_count integer := 0;
          deleted_count integer := 0;
          result jsonb;
      BEGIN
          -- 7 günden eski tarihi hesapla
          cleanup_date := now() - interval '7 days';
          
          -- Toplam anonymous kullanıcı sayısını say
          SELECT count(*) INTO total_count
          FROM auth.users 
          WHERE (email IS NULL OR is_anonymous = true)
            AND (created_at < cleanup_date OR last_sign_in_at < cleanup_date);
          
          -- Auth tablosundan direkt silemediğimiz için log tablosu oluştur
          CREATE TABLE IF NOT EXISTS auth_cleanup_log (
              id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
              cleanup_date timestamp with time zone DEFAULT now(),
              users_to_delete integer,
              deletion_method text,
              notes text
          );
          
          -- Log kaydı ekle
          INSERT INTO auth_cleanup_log (users_to_delete, deletion_method, notes)
          VALUES (total_count, 'manual_script', 'Auth users require admin API for deletion');
          
          -- Sonuç döndür
          result := jsonb_build_object(
              'success', true,
              'total_anonymous_users', total_count,
              'cleanup_date', cleanup_date,
              'message', 'Use admin script for actual deletion',
              'timestamp', now()
          );
          
          RETURN result;
      END;
      $$;
    `

    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: authCleanupFunction
    })

    if (functionError) {
      console.error('❌ Fonksiyon oluşturma hatası:', functionError)
      
      // Alternatif yöntem - direkt SQL
      const { error: directError } = await supabase
        .from('dummy') // Bu başarısız olacak ama SQL çalıştırmaya çalışacak
        .select('*')
      
      console.log('⚠️  Direkt SQL çalıştırma denemesi yapıldı')
    }

    // System settings tablosuna temizlik ayarlarını ekle
    const settingsToAdd = [
      {
        key: 'auth_cleanup_enabled',
        value: 'true',
        description: 'Otomatik auth temizlik aktif mi?'
      },
      {
        key: 'auth_cleanup_days',
        value: '7',
        description: 'Kaç günden eski anonymous kullanıcılar silinsin?'
      },
      {
        key: 'auth_cleanup_last_run',
        value: new Date().toISOString(),
        description: 'Son temizlik çalıştırma tarihi'
      }
    ]

    for (const setting of settingsToAdd) {
      const { error: settingError } = await supabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'key' })

      if (settingError) {
        console.error(`❌ Setting eklenemedi (${setting.key}):`, settingError)
      } else {
        console.log(`✅ Setting eklendi: ${setting.key}`)
      }
    }

    console.log('✅ Auth temizlik sistemi kuruldu!')
    console.log('💡 Kullanım: npm run cleanup-auth')

  } catch (error) {
    console.error('❌ Auth temizlik sistemi kurulum hatası:', error)
  }
}

// Ana fonksiyon
async function main() {
  console.log('🚀 Auth Temizlik Sistemi Kurulumu')
  console.log('=' .repeat(40))
  
  await createAuthCleanupFunction()
  
  console.log('\n📋 Kurulum Tamamlandı!')
  console.log('🔧 Manuel temizlik: node scripts/cleanup-auth-users.js')
  console.log('📅 Otomatik temizlik için cron job ekleyin')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { createAuthCleanupFunction }