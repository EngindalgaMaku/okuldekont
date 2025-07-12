#!/usr/bin/env node

/**
 * =================================================================
 * ÖĞRETMEN PIN KONTROL FONKSİYONUNU BUL
 * =================================================================
 * check_ogretmen_pin_giris fonksiyonunun SQL kodunu bulur
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
    log('blue', '    ÖĞRETMEN PIN KONTROL FONKSİYONU');
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
        log('yellow', '🔍 check_ogretmen_pin_giris fonksiyonunu arıyor...');
        
        // Fonksiyonun kodunu al
        const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT 
                    routine_name,
                    routine_definition,
                    routine_type,
                    data_type
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name = 'check_ogretmen_pin_giris'
                ORDER BY routine_name;
            `
        });

        if (funcError) {
            log('red', `❌ Fonksiyon okunamadı: ${funcError.message}`);
            process.exit(1);
        }

        if (!functions || functions.length === 0) {
            log('red', '❌ check_ogretmen_pin_giris fonksiyonu bulunamadı!');
            log('yellow', '💡 Fonksiyon mevcut değil, oluşturulması gerekiyor olabilir.');
            process.exit(1);
        }

        log('green', '✅ Fonksiyon bulundu!');
        const func = functions[0];
        
        log('cyan', '\n📋 FONKSIYON BİLGİLERİ:');
        log('cyan', `  - İsim: ${func.routine_name}`);
        log('cyan', `  - Tip: ${func.routine_type}`);
        log('cyan', `  - Dönüş Tipi: ${func.data_type}`);
        
        log('yellow', '\n📄 FONKSIYON KODU:');
        log('blue', '='.repeat(80));
        console.log(func.routine_definition);
        log('blue', '='.repeat(80));

        // İlgili tabloları da kontrol edelim
        log('yellow', '\n🔍 PIN giriş logları için tablo arıyor...');
        
        const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT table_name, column_name, data_type
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND (table_name ILIKE '%login%' OR table_name ILIKE '%pin%' OR table_name ILIKE '%attempt%')
                ORDER BY table_name, ordinal_position;
            `
        });

        if (tableError) {
            log('red', `❌ Tablolar okunamadı: ${tableError.message}`);
        } else if (tables && tables.length > 0) {
            log('green', '✅ İlgili tablolar bulundu:');
            let currentTable = '';
            tables.forEach(table => {
                if (table.table_name !== currentTable) {
                    currentTable = table.table_name;
                    log('cyan', `\n📋 ${table.table_name}:`);
                }
                log('cyan', `  - ${table.column_name}: ${table.data_type}`);
            });
        } else {
            log('yellow', '⚠️  Login/PIN ile ilgili tablo bulunamadı');
        }

        // Öğretmenler tablosunda kilit alanları kontrol et
        log('yellow', '\n🔍 Öğretmenler tablosundaki kilit alanları kontrol ediliyor...');
        
        const { data: ogretmenCols, error: colError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'ogretmenler'
                AND (column_name ILIKE '%lock%' OR column_name ILIKE '%kilit%' OR column_name ILIKE '%attempt%' OR column_name ILIKE '%fail%')
                ORDER BY ordinal_position;
            `
        });

        if (colError) {
            log('red', `❌ Öğretmenler tablosu okunamadı: ${colError.message}`);
        } else if (ogretmenCols && ogretmenCols.length > 0) {
            log('green', '✅ Öğretmenler tablosunda kilit alanları:');
            ogretmenCols.forEach(col => {
                log('cyan', `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        } else {
            log('yellow', '⚠️  Öğretmenler tablosunda kilit ile ilgili alan bulunamadı');
        }

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