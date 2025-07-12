const { createClient } = require('@supabase/supabase-js')

// Environment variables from Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Environment variables gerekli! .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createUnlockTeacherFunction() {
  console.log('Öğretmen kilit açma fonksiyonu oluşturuluyor...')
  
  try {
    // Unlock teacher function
    const unlockTeacherFunctionSQL = `
      CREATE OR REPLACE FUNCTION unlock_ogretmen_hesabi(
        p_ogretmen_id UUID
      ) RETURNS JSON AS $$
      DECLARE
        v_ogretmen RECORD;
        v_silinen_kayit_sayisi INTEGER := 0;
      BEGIN
        -- Öğretmenin var olduğunu kontrol et
        SELECT * INTO v_ogretmen
        FROM ogretmenler
        WHERE id = p_ogretmen_id;
        
        IF NOT FOUND THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Öğretmen bulunamadı.',
            'silinen_kayit_sayisi', 0
          );
        END IF;
        
        -- Tüm başarısız giriş denemelerini ve kilit kayıtlarını sil
        DELETE FROM ogretmen_giris_denemeleri
        WHERE ogretmen_id = p_ogretmen_id
          AND (basarili = false OR kilitlenme_tarihi IS NOT NULL);
        
        GET DIAGNOSTICS v_silinen_kayit_sayisi = ROW_COUNT;
        
        RETURN json_build_object(
          'basarili', true,
          'mesaj', 'Öğretmen hesabı başarıyla kilidi açıldı.',
          'silinen_kayit_sayisi', v_silinen_kayit_sayisi
        );
        
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Kilit açılırken bir hata oluştu: ' || SQLERRM,
            'silinen_kayit_sayisi', 0
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: funcError } = await supabase.rpc('exec_sql', { query: unlockTeacherFunctionSQL })
    if (funcError) {
      console.error('Fonksiyon oluşturma hatası:', funcError)
      throw funcError
    }
    
    console.log('✅ unlock_ogretmen_hesabi fonksiyonu başarıyla oluşturuldu!')
    
    // Check teacher lock status function
    const checkLockStatusFunctionSQL = `
      CREATE OR REPLACE FUNCTION check_ogretmen_kilit_durumu(
        p_ogretmen_id UUID
      ) RETURNS JSON AS $$
      DECLARE
        v_ogretmen RECORD;
        v_kilitlenme_tarihi TIMESTAMP;
        v_yanlis_giris_sayisi INTEGER;
        v_kilitlenme_suresi INTERVAL := INTERVAL '30 minutes';
        v_kilitli BOOLEAN := false;
        v_son_yanlis_giris TIMESTAMP;
      BEGIN
        -- Öğretmenin var olduğunu kontrol et
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
        
        -- Son 30 dakikadaki başarısız giriş denemelerini ve kilit durumunu kontrol et
        SELECT 
          COUNT(*) as yanlis_giris,
          MAX(CASE WHEN kilitlenme_tarihi IS NOT NULL THEN kilitlenme_tarihi END) as kilit_tarihi,
          MAX(giris_tarihi) as son_deneme
        INTO v_yanlis_giris_sayisi, v_kilitlenme_tarihi, v_son_yanlis_giris
        FROM ogretmen_giris_denemeleri
        WHERE ogretmen_id = p_ogretmen_id
          AND giris_tarihi > NOW() - v_kilitlenme_suresi
          AND basarili = false;
        
        -- Kilit durumunu belirle
        IF v_kilitlenme_tarihi IS NOT NULL AND v_kilitlenme_tarihi + v_kilitlenme_suresi > NOW() THEN
          v_kilitli := true;
        END IF;
        
        RETURN json_build_object(
          'basarili', true,
          'kilitli', v_kilitli,
          'kilitlenme_tarihi', v_kilitlenme_tarihi,
          'yanlis_giris_sayisi', COALESCE(v_yanlis_giris_sayisi, 0),
          'son_yanlis_giris', v_son_yanlis_giris,
          'mesaj', CASE 
            WHEN v_kilitli THEN 'Hesap kilitli'
            ELSE 'Hesap aktif'
          END
        );
        
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object(
            'basarili', false,
            'mesaj', 'Kilit durumu kontrol edilirken hata oluştu: ' || SQLERRM,
            'kilitli', false
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: checkFuncError } = await supabase.rpc('exec_sql', { query: checkLockStatusFunctionSQL })
    if (checkFuncError) {
      console.error('Check fonksiyon oluşturma hatası:', checkFuncError)
      throw checkFuncError
    }
    
    console.log('✅ check_ogretmen_kilit_durumu fonksiyonu başarıyla oluşturuldu!')
    console.log('✅ Tüm öğretmen kilit yönetimi fonksiyonları hazır!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

createUnlockTeacherFunction()