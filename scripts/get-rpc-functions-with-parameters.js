#!/usr/bin/env node

/**
 * =================================================================
 * RPC FONKSİYONLARI VE PARAMETRELERİNİ ALMA SCRİPTİ
 * =================================================================
 * Supabase client ile RPC fonksiyonlarını parametreleriyle birlikte alır
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
    log('blue', '    RPC FONKSİYONLARI VE PARAMETRELERİNİ ALMA SCRİPTİ');
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
        // RPC fonksiyonlarını detaylı al
        await getRpcFunctionsWithDetails(supabase);

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        process.exit(1);
    }
}

async function getRpcFunctionsWithDetails(supabase) {
    log('blue', '🔧 RPC Fonksiyonları detaylı alınıyor...');
    
    // RPC fonksiyonlarının detaylarını almak için SQL sorgusu
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
            obj_description(p.oid, 'pg_proc') as description,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname = 'public'
            AND l.lanname != 'internal'
            AND p.proname NOT LIKE 'pg_%'
            AND p.proname NOT LIKE 'information_schema_%'
        ORDER BY p.proname;
    `;

    try {
        log('yellow', '  📋 RPC fonksiyon detayları SQL ile alınıyor...');
        
        const { data: functions, error: sqlError } = await supabase.rpc('exec_sql', { 
            query: functionsQuery 
        });
        
        if (sqlError) {
            log('red', `    ❌ SQL hatası: ${sqlError.message}`);
            return;
        }

        if (!functions || !Array.isArray(functions) || functions.length === 0) {
            log('yellow', '    ⚠️ Hiç RPC fonksiyonu bulunamadı');
            return;
        }

        log('green', `✅ ${functions.length} RPC fonksiyonu bulundu:`);
        log('cyan', '='.repeat(80));

        functions.forEach((func, index) => {
            log('green', `${index + 1}. ${func.function_name}(${func.arguments || 'parametresiz'})`);
            log('blue', `   📤 Dönüş: ${func.return_type}`);
            log('yellow', `   🔧 Dil: ${func.language.toUpperCase()}`);
            log('cyan', `   🔒 Güvenlik: ${func.security}`);
            if (func.description) {
                log('yellow', `   📝 Açıklama: ${func.description}`);
            }
            
            // Parametre detayını göster
            if (func.arguments && func.arguments.trim() !== '') {
                log('cyan', `   📥 Parametreler: ${func.arguments}`);
            } else {
                log('yellow', '   📥 Parametreler: Yok');
            }
            
            console.log('');
        });

        // Sadece admin fonksiyonlarını göster
        const adminFunctions = functions.filter(f => 
            f.function_name.toLowerCase().includes('admin') ||
            f.function_name.toLowerCase().includes('user') ||
            f.function_name.toLowerCase().includes('setting')
        );

        if (adminFunctions.length > 0) {
            log('blue', '\n🔧 Admin Fonksiyonları Detay:');
            log('cyan', '='.repeat(80));
            
            adminFunctions.forEach((func, index) => {
                log('green', `${index + 1}. ${func.function_name}(${func.arguments || 'parametresiz'})`);
                log('yellow', `   Tanım:`);
                
                // Fonksiyon tanımını güzelce göster
                if (func.definition) {
                    const lines = func.definition.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            log('cyan', `     ${line}`);
                        }
                    });
                }
                console.log('');
            });
        }

        // Fonksiyonları JSON formatında kaydet
        const fs = require('fs');
        const path = require('path');
        
        const outputFile = path.join('./database_backups', `rpc_functions_detailed_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}.json`);
        
        const detailedData = {
            timestamp: new Date().toISOString(),
            total_functions: functions.length,
            functions: functions.map(func => ({
                name: func.function_name,
                arguments: func.arguments || null,
                return_type: func.return_type,
                language: func.language,
                security: func.security,
                description: func.description || null,
                definition: func.definition || null
            }))
        };

        fs.writeFileSync(outputFile, JSON.stringify(detailedData, null, 2));
        log('green', `\n📄 Detaylı fonksiyon bilgileri kaydedildi: ${outputFile}`);

    } catch (error) {
        log('red', `❌ RPC fonksiyon alma hatası: ${error.message}`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };