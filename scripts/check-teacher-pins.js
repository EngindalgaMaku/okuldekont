#!/usr/bin/env node

/**
 * =================================================================
 * ÖĞRETMEN PIN DEĞERLERINI KONTROL ET
 * =================================================================
 * Öğretmenlerin PIN değerlerini kontrol eder
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
    log('blue', '    ÖĞRETMEN PIN DEĞERLERINI KONTROL');
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
        log('yellow', '🔍 Öğretmenlerin PIN değerlerini kontrol ediliyor...');
        
        // Öğretmenlerin PIN değerlerini kontrol et
        const { data: ogretmenler, error: ogretmenError } = await supabase
            .from('ogretmenler')
            .select('id, ad, soyad, pin')
            .order('ad', { ascending: true });

        if (ogretmenError) {
            log('red', `❌ Öğretmenler tablosu okunamadı: ${ogretmenError.message}`);
            process.exit(1);
        }

        log('green', `✅ ${ogretmenler.length} öğretmen bulundu`);
        log('cyan', '\n📋 Öğretmen PIN değerleri:');
        
        ogretmenler.forEach((teacher, index) => {
            const pinValue = teacher.pin || 'YOK';
            const pinType = typeof teacher.pin;
            const pinLength = teacher.pin ? teacher.pin.length : 0;
            
            log('cyan', `  ${index + 1}. ${teacher.ad} ${teacher.soyad}`);
            log('cyan', `     ID: ${teacher.id}`);
            log('cyan', `     PIN: "${pinValue}" (type: ${pinType}, length: ${pinLength})`);
            log('cyan', `     PIN as JSON: ${JSON.stringify(teacher.pin)}`);
            console.log(); // Boş satır
        });

        // Özel olarak "Öğretmen 1 Soyad 1" arıyor
        log('yellow', '\n🔍 "Öğretmen 1 Soyad 1" öğretmenini arıyor...');
        const { data: testTeacher, error: testError } = await supabase
            .from('ogretmenler')
            .select('id, ad, soyad, pin')
            .or('ad.eq.Öğretmen 1,ad.ilike.%öğretmen%')
            .or('soyad.eq.Soyad 1,soyad.ilike.%soyad%');

        if (testError) {
            log('red', `❌ Test öğretmeni aranırken hata: ${testError.message}`);
        } else if (testTeacher && testTeacher.length > 0) {
            log('green', '✅ Test öğretmeni bulundu:');
            testTeacher.forEach(teacher => {
                log('cyan', `  👨‍🏫 ${teacher.ad} ${teacher.soyad}`);
                log('cyan', `     ID: ${teacher.id}`);
                log('cyan', `     PIN: "${teacher.pin}" (type: ${typeof teacher.pin})`);
                log('cyan', `     PIN length: ${teacher.pin ? teacher.pin.length : 0}`);
                log('cyan', `     PIN as JSON: ${JSON.stringify(teacher.pin)}`);
            });
        } else {
            log('yellow', '⚠️  Test öğretmeni bulunamadı');
        }

        // PIN karşılaştırma testi
        log('yellow', '\n🔍 PIN karşılaştırma testi yapılıyor...');
        const samplePin = '1234';
        const samplePinNum = 1234;
        
        ogretmenler.slice(0, 3).forEach(teacher => {
            const pinMatch1 = teacher.pin === samplePin;
            const pinMatch2 = teacher.pin === samplePinNum;
            const pinMatch3 = teacher.pin == samplePin;
            const pinMatch4 = teacher.pin == samplePinNum;
            
            log('cyan', `  ${teacher.ad} ${teacher.soyad}:`);
            log('cyan', `    PIN: "${teacher.pin}" vs "${samplePin}"`);
            log('cyan', `    Strict equality (===): ${pinMatch1}`);
            log('cyan', `    Loose equality (==): ${pinMatch3}`);
            log('cyan', `    vs number strict: ${pinMatch2}`);
            log('cyan', `    vs number loose: ${pinMatch4}`);
            console.log();
        });

        log('green', '\n🎉 PIN KONTROL TAMAMLANDI!');

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