const { createClient } = require('@supabase/supabase-js')

// Environment variables from Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Environment variables gerekli! .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createPinFunctions() {
  console.log('PIN kontrol fonksiyonları oluşturuluyor...')
  
  try {
    // Önce tabloları oluştur
    console.log('Giriş denemesi tabloları oluşturuluyor...')
    
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
    `
    
    const { error: tableError } = await supabase.rpc('exec_sql', { query: createTablesSQL })
    if (tableError) {
      console.log('Tablolar zaten mevcut olabilir:', tableError.message)
    } else {
      console.log('Tablolar başarıyla oluşturuldu.')
    }
    
    // Şimdi fonksiyonları oluştur
    console.log('check_ogretmen_pin_giris fonksiyonu oluşturuluyor...')
    
    const ogretmenPinFunctionSQL = `
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
    `
    
    const { error: funcError } = await supabase.rpc('exec_sql', { query: ogretmenPinFunctionSQL })
    if (funcError) {
      console.error('Fonksiyon oluşturma hatası:', funcError)
      throw funcError
    }
    
    console.log('check_ogretmen_pin_giris fonksiyonu başarıyla oluşturuldu!')
    
    // İşletme PIN fonksiyonu da oluştur
    console.log('check_isletme_pin_giris fonksiyonu oluşturuluyor...')
    
    const isletmePinFunctionSQL = `
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
    `
    
    const { error: isletmeFuncError } = await supabase.rpc('exec_sql', { query: isletmePinFunctionSQL })
    if (isletmeFuncError) {
      console.error('İşletme fonksiyon oluşturma hatası:', isletmeFuncError)
      throw isletmeFuncError
    }
    
    console.log('check_isletme_pin_giris fonksiyonu başarıyla oluşturuldu!')
    
    console.log('✅ Tüm PIN kontrol fonksiyonları başarıyla oluşturuldu!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

createPinFunctions() 