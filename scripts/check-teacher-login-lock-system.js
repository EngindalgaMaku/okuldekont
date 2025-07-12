#!/usr/bin/env node

/**
 * =================================================================
 * ÖĞRETMEN GİRİŞ KİLİT SİSTEMİNİ KONTROL ET
 * =================================================================
 * Öğretmen giriş kilit sistemini ve alanlarını kontrol eder
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Renk kodları
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    ÖĞRETMEN GİRİŞ KİLİT SİSTEMİ KONTROL');
    log('blue', '='.repeat(80));

    // Environment variables kontrol
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    // Supabase client oluştur
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        log('yellow', '🔍 Öğretmenler tablosu yapısını kontrol ediliyor...');
        
        // Öğretmenler tablosundan kilit ile ilgili alanları kontrol et
        const { data: ogretmenler, error: ogretmenError } = await supabase
            .from('ogretmenler')
            .select('*')
            .limit(1);

        if (ogretmenError) {
            log('red', `❌ Öğretmenler tablosu okunamadı: ${ogretmenError.message}`);
        } else {
            log('green', '✅ Öğretmenler tablosu okundu');
            if (ogretmenler.length > 0) {
                log('cyan', '📋 Öğretmenler tablosu alanları:');
                Object.keys(ogretmenler[0]).forEach(key => {
                    log('cyan', `  - ${key}: ${typeof ogretmenler[0][key]}`);
                });
            }
        }

        // PIN kontrolü ile ilgili RPC fonksiyonlarını ara
        log('yellow', '\n🔍 PIN kontrol fonksiyonlarını arıyor...');
        
        const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT 
                    routine_name,
                    routine_definition
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name ILIKE '%pin%'
                OR routine_name ILIKE '%login%'
                OR routine_name ILIKE '%lock%'
                ORDER BY routine_name;
            `
        });

        if (funcError) {
            log('red', `❌ Fonksiyonlar okunamadı: ${funcError.message}`);
        } else {
            log('green', '✅ PIN/Login ile ilgili fonksiyonlar:');
            if (functions && functions.length > 0) {
                functions.forEach(func => {
                    log('cyan', `  📋 ${func.routine_name}`);
                });
            } else {
                log('yellow', '⚠️  PIN/Login ile ilgili fonksiyon bulunamadı');
            }
        }

        // Sistem ayarlarında kilit ile ilgili ayarları kontrol et
        log('yellow', '\n🔍 Sistem ayarlarını kontrol ediliyor...');
        
        const { data: settings, error: settingsError } = await supabase
            .from('system_settings')
            .select('*')
            .or('key.ilike.%login%,key.ilike.%lock%,key.ilike.%attempt%,key.ilike.%pin%');

        if (settingsError) {
            log('red', `❌ Sistem ayarları okunamadı: ${settingsError.message}`);
        } else {
            log('green', '✅ Login ile ilgili sistem ayarları:');
            if (settings && settings.length > 0) {
                settings.forEach(setting => {
                    log('cyan', `  📋 ${setting.key}: ${setting.value}`);
                });
            } else {
                log('yellow', '⚠️  Login ile ilgili sistem ayarı bulunamadı');
            }
        }

        // Kilitlenmiş öğretmenleri kontrol et
        log('yellow', '\n🔍 Kilitlenmiş öğretmenleri arıyor...');
        
        const { data: lockedTeachers, error: lockedError } = await supabase
            .from('ogretmenler')
            .select('id, ad, soyad, pin')
            .limit(5); // İlk 5 öğretmeni kontrol et

        if (lockedError) {
            log('red', `❌ Öğretmenler kontrol edilemedi: ${lockedError.message}`);
        } else {
            log('green', '✅ Öğretmen örnekleri:');
            if (lockedTeachers && lockedTeachers.length > 0) {
                lockedTeachers.forEach(teacher => {
                    log('cyan', `  👨‍🏫 ${teacher.ad} ${teacher.soyad} - PIN: ${teacher.pin || 'YOK'}`);
                });
            }
        }

        // Öğretmen giriş loglarını kontrol et
        log('yellow', '\n🔍 Login log tablosunu kontrol ediliyor...');
        
        const { data: loginLogs, error: logError } = await supabase
            .from('ogretmen_login_logs')
            .select('*')
            .limit(5);

        if (logError) {
            if (logError.code === '42P01') {
                log('yellow', '⚠️  ogretmen_login_logs tablosu bulunamadı');
            } else {
                log('red', `❌ Login logları okunamadı: ${logError.message}`);
            }
        } else {
            log('green', '✅ Öğretmen login logları bulundu:');
            if (loginLogs && loginLogs.length > 0) {
                loginLogs.forEach(logEntry => {
                    log('cyan', `  📋 ${JSON.stringify(logEntry)}`);
                });
            }
        }

        log('green', '\n🎉 KONTROL TAMAMLANDI!');
        log('blue', '\n📋 ÖNERİLER:');
        log('blue', '1. Eğer kilit sistemi yoksa oluşturulması gerekiyor');
        log('blue', '2. Admin panelinde kilit açma özelliği eklenebilir');
        log('blue', '3. Hatalı giriş sayacı ve kilitleme süresi ayarlanabilir');

    } catch (error) {
        log('red', `❌ Beklenmeyen hata: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };