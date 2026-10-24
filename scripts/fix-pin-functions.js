const { Client } = require('pg');

// .env.local dosyasındaki çevre değişkenlerini yükle
function loadEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
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

async function fixPinFunctions() {
  console.log('🔧 PIN Verification Fonksiyonları Düzeltiliyor...');
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

    // Önce tabloları oluştur
    console.log('\n📋 Giriş denemesi tabloları kontrol ediliyor...');
    
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS ogretmen_giris_denemeleri (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ogretmen_id UUID REFERENCES ogretmenler(id),
        giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_adresi TEXT,
        user_agent TEXT,
        basarili BOOLEAN DEFAULT false,
        kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
      );
      
      CREATE TABLE IF NOT EXISTS isletme_giris_denemeleri (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        isletme_id UUID REFERENCES isletmeler(id),
        giris_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_adresi TEXT,
        user_agent TEXT,
        basarili BOOLEAN DEFAULT false,
        kilitlenme_tarihi TIMESTAMP WITH TIME ZONE
      );
    `;
    
    await client.query(createTablesSQL);
    console.log('✅ Tablolar kontrol edildi.');

    // Öğretmen PIN fonksiyonu
    console.log('\n🔐 Öğretmen PIN fonksiyonu oluşturuluyor...');
    
    const ogretmenPinFunction = `
      CREATE OR REPLACE FUNCTION check_ogretmen_pin_giris(
        p_ogretmen_id UUID,
        p_girilen_pin TEXT,
        p_ip_adresi TEXT,
        p_user_agent TEXT
      ) RETURNS JSON AS $$
      DECLARE
        v_ogretmen RECORD;
        v_yanlis_giris_sayisi INTEGER;
        v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
        v_son_giris_denemesi TIMESTAMP;
        v_kilitlenme_tarihi TIMESTAMP;
      BEGIN
        SELECT * INTO v_ogretmen
        FROM ogretmenler
        WHERE id = p_ogretmen_id;
        
        IF NOT FOUND THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Öğretmen bulunamadı.',
            'kilitli', false
          );
        END IF;
        
        SELECT 
          COUNT(*) as yanlis_giris,
          MAX(giris_tarihi) as son_deneme,
          MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
        INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
        FROM ogretmen_giris_denemeleri
        WHERE ogretmen_id = p_ogretmen_id
          AND giris_tarihi > NOW() - v_kilitlenme_suresi
          AND basarili = false;
        
        IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
            'kilitli', true,
            'kilitlenme_tarihi', v_kilitlenme_tarihi
          );
        END IF;
        
        IF v_ogretmen.pin = p_girilen_pin THEN
          INSERT INTO ogretmen_giris_denemeleri (
            ogretmen_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili
          ) VALUES (
            p_ogretmen_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            true
          );
          RETURN json_build_object(
            'basarili', true,
            'mesaj', 'Giriş başarılı.',
            'kilitli', false
          );
        ELSE
          INSERT INTO ogretmen_giris_denemeleri (
            ogretmen_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili,
            kilitlenme_tarihi
          ) VALUES (
            p_ogretmen_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            false,
            CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
              ELSE NULL
            END
          );
          RETURN json_build_object(
            'basarili', false,
            'mesaj', CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
              ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
            END,
            'kilitli', v_yanlis_giris_sayisi >= 4,
            'kilitlenme_tarihi', CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
              ELSE NULL
            END
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await client.query(ogretmenPinFunction);
    console.log('✅ check_ogretmen_pin_giris fonksiyonu oluşturuldu.');

    // İşletme PIN fonksiyonu
    console.log('\n🏢 İşletme PIN fonksiyonu oluşturuluyor...');
    
    const isletmePinFunction = `
      CREATE OR REPLACE FUNCTION check_isletme_pin_giris(
        p_isletme_id UUID,
        p_girilen_pin TEXT,
        p_ip_adresi TEXT,
        p_user_agent TEXT
      ) RETURNS JSON AS $$
      DECLARE
        v_isletme RECORD;
        v_yanlis_giris_sayisi INTEGER;
        v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
        v_son_giris_denemesi TIMESTAMP;
        v_kilitlenme_tarihi TIMESTAMP;
      BEGIN
        SELECT * INTO v_isletme
        FROM isletmeler
        WHERE id = p_isletme_id;
        
        IF NOT FOUND THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'İşletme bulunamadı.',
            'kilitli', false
          );
        END IF;
        
        SELECT 
          COUNT(*) as yanlis_giris,
          MAX(giris_tarihi) as son_deneme,
          MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi
        INTO v_yanlis_giris_sayisi, v_son_giris_denemesi, v_kilitlenme_tarihi
        FROM isletme_giris_denemeleri
        WHERE isletme_id = p_isletme_id
          AND giris_tarihi > NOW() - v_kilitlenme_suresi
          AND basarili = false;
        
        IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Hesabınız kilitlendi. Lütfen daha sonra tekrar deneyin.',
            'kilitli', true,
            'kilitlenme_tarihi', v_kilitlenme_tarihi
          );
        END IF;
        
        IF v_isletme.pin = p_girilen_pin THEN
          INSERT INTO isletme_giris_denemeleri (
            isletme_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili
          ) VALUES (
            p_isletme_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            true
          );
          RETURN json_build_object(
            'basarili', true,
            'mesaj', 'Giriş başarılı.',
            'kilitli', false
          );
        ELSE
          INSERT INTO isletme_giris_denemeleri (
            isletme_id,
            giris_tarihi,
            ip_adresi,
            user_agent,
            basarili,
            kilitlenme_tarihi
          ) VALUES (
            p_isletme_id,
            NOW(),
            p_ip_adresi,
            p_user_agent,
            false,
            CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
              ELSE NULL
            END
          );
          RETURN json_build_object(
            'basarili', false,
            'mesaj', CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN 'Çok fazla başarısız deneme. Hesabınız kilitlendi.'
              ELSE 'Yanlış PIN kodu. Kalan deneme hakkı: ' || (5 - v_yanlis_giris_sayisi)::TEXT
            END,
            'kilitli', v_yanlis_giris_sayisi >= 4,
            'kilitlenme_tarihi', CASE 
              WHEN v_yanlis_giris_sayisi >= 4 THEN NOW()
              ELSE NULL
            END
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await client.query(isletmePinFunction);
    console.log('✅ check_isletme_pin_giris fonksiyonu oluşturuldu.');

    console.log('\n🎉 PIN verification fonksiyonları başarıyla düzeltildi!');
    console.log('✅ Öğretmen girişi artık çalışmalı.');
    
  } catch (error) {
    console.error('\n❌ PIN fonksiyonları düzeltilirken hata:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  }
}

fixPinFunctions();