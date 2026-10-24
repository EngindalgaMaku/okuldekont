#!/usr/bin/env node

/**
 * =================================================================
 * ÖĞRETMEN PIN FONKSİYONU DIREKT ALMA
 * =================================================================
 * check_ogretmen_pin_giris fonksiyonunun kodunu direkt alır
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
    log('blue', '    ÖĞRETMEN PIN FONKSİYONU DIREKT ALMA');
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
        log('yellow', '🔍 check_ogretmen_pin_giris fonksiyonunun kodunu alıyor...');
        
        // PostgreSQL pg_proc tablosundan fonksiyon kodunu al
        const { data: result, error } = await supabase.rpc('exec_sql', {
            query: `
                SELECT 
                    p.proname as function_name,
                    pg_get_functiondef(p.oid) as function_definition
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'check_ogretmen_pin_giris';
            `
        });

        if (error) {
            log('red', `❌ Hata: ${error.message}`);
            process.exit(1);
        }

        if (!result || result.length === 0) {
            log('red', '❌ check_ogretmen_pin_giris fonksiyonu bulunamadı!');
            
            // Alternatif arama
            log('yellow', '🔍 Alternatif arama yapılıyor...');
            const { data: altResult, error: altError } = await supabase.rpc('exec_sql', {
                query: `
                    SELECT proname 
                    FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname = 'public'
                    AND proname ILIKE '%pin%'
                    ORDER BY proname;
                `
            });

            if (!altError && altResult) {
                log('cyan', 'PIN ile ilgili fonksiyonlar:');
                console.log(JSON.stringify(altResult, null, 2));
            }
            return;
        }

        log('green', '✅ Fonksiyon bulundu!');
        log('cyan', `📋 Fonksiyon adı: ${result[0].function_name}`);
        
        log('yellow', '\n📄 FONKSIYON KODU:');
        log('blue', '='.repeat(80));
        console.log(result[0].function_definition);
        log('blue', '='.repeat(80));

        // Kilit ile ilgili tabloları kontrol et
        log('yellow', '\n🔍 Login attempt tabloları arıyor...');
        const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT 
                    table_name,
                    string_agg(column_name, ', ') as columns
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND (table_name ILIKE '%login%' OR table_name ILIKE '%attempt%' OR table_name ILIKE '%log%')
                GROUP BY table_name
                ORDER BY table_name;
            `
        });

        if (!tableError && tables) {
            log('green', '✅ İlgili tablolar:');
            console.log(JSON.stringify(tables, null, 2));
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