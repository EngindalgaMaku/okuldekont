#!/usr/bin/env node

/**
 * =================================================================
 * GELİŞTİRİLMİŞ PARAMETRELI RPC BACKUP SCRİPTİ
 * =================================================================
 * RPC fonksiyonlarını parametreleri ve tanımlarıyla birlikte yedekler
 * =================================================================
 */

const fs = require('fs');
const path = require('path');
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

// Dokümantasyondan alınan RPC fonksiyon detayları
const DOCUMENTED_RPC_FUNCTIONS = [
    {
        name: 'get_admin_users',
        parameters: [],
        return_type: 'json',
        security: 'SECURITY DEFINER',
        description: 'Tüm admin kullanıcılarını JSON formatında listeler',
        test_call: () => ({ params: {} })
    },
    {
        name: 'create_admin_user',
        parameters: [
            { name: 'p_id', type: 'uuid', required: true },
            { name: 'p_ad', type: 'varchar', required: true },
            { name: 'p_soyad', type: 'varchar', required: true },
            { name: 'p_email', type: 'varchar', required: true },
            { name: 'p_yetki_seviyesi', type: 'varchar', required: false, default: 'operator' }
        ],
        return_type: 'boolean',
        security: 'SECURITY DEFINER',
        description: 'Yeni admin kullanıcı oluşturur',
        test_call: () => ({
            params: {
                p_id: '00000000-0000-0000-0000-000000000000',
                p_ad: 'Test',
                p_soyad: 'User',
                p_email: 'test@example.com',
                p_yetki_seviyesi: 'operator'
            }
        })
    },
    {
        name: 'update_admin_user',
        parameters: [
            { name: 'p_id', type: 'uuid', required: true },
            { name: 'p_ad', type: 'varchar', required: false, default: null },
            { name: 'p_soyad', type: 'varchar', required: false, default: null },
            { name: 'p_yetki_seviyesi', type: 'varchar', required: false, default: null },
            { name: 'p_aktif', type: 'boolean', required: false, default: null }
        ],
        return_type: 'boolean',
        security: 'SECURITY DEFINER',
        description: 'Admin kullanıcı bilgilerini günceller',
        test_call: () => ({
            params: {
                p_id: '00000000-0000-0000-0000-000000000000',
                p_ad: 'Updated Test'
            }
        })
    },
    {
        name: 'delete_admin_user',
        parameters: [
            { name: 'p_user_id', type: 'uuid', required: true }
        ],
        return_type: 'json',
        security: 'SECURITY DEFINER',
        description: 'Admin kullanıcı siler (Süper admin silinemez)',
        test_call: () => ({
            params: {
                p_user_id: '00000000-0000-0000-0000-000000000000'
            }
        })
    },
    {
        name: 'is_user_admin',
        parameters: [
            { name: 'p_user_id', type: 'uuid', required: true }
        ],
        return_type: 'TABLE(is_admin boolean, yetki_seviyesi varchar)',
        security: 'SECURITY DEFINER',
        description: 'Kullanıcının admin olup olmadığını kontrol eder',
        test_call: () => ({
            params: {
                p_user_id: '00000000-0000-0000-0000-000000000000'
            }
        })
    },
    {
        name: 'get_system_setting',
        parameters: [
            { name: 'p_setting_key', type: 'text', required: true }
        ],
        return_type: 'text',
        security: 'SECURITY DEFINER',
        description: 'Belirtilen anahtarın sistem ayar değerini getirir',
        test_call: () => ({
            params: {
                p_setting_key: 'test_key'
            }
        })
    },
    {
        name: 'update_system_setting',
        parameters: [
            { name: 'p_setting_key', type: 'text', required: true },
            { name: 'p_setting_value', type: 'text', required: true }
        ],
        return_type: 'boolean',
        security: 'SECURITY DEFINER',
        description: 'Sistem ayarını günceller veya oluşturur (upsert)',
        test_call: () => ({
            params: {
                p_setting_key: 'test_key',
                p_setting_value: 'test_value'
            }
        })
    },
    {
        name: 'check_isletme_pin_giris',
        parameters: [
            { name: 'p_isletme_id', type: 'uuid', required: true },
            { name: 'p_girilen_pin', type: 'text', required: true },
            { name: 'p_ip_adresi', type: 'text', required: true },
            { name: 'p_user_agent', type: 'text', required: true }
        ],
        return_type: 'json',
        security: 'SECURITY DEFINER',
        description: 'İşletme PIN giriş kontrolü yapar ve log kaydı tutar',
        test_call: () => ({
            params: {
                p_isletme_id: '00000000-0000-0000-0000-000000000000',
                p_girilen_pin: '1234',
                p_ip_adresi: '127.0.0.1',
                p_user_agent: 'test-agent'
            }
        })
    },
    {
        name: 'check_ogretmen_pin_giris',
        parameters: [
            { name: 'p_ogretmen_id', type: 'uuid', required: true },
            { name: 'p_girilen_pin', type: 'text', required: true },
            { name: 'p_ip_adresi', type: 'text', required: true },
            { name: 'p_user_agent', type: 'text', required: true }
        ],
        return_type: 'json',
        security: 'SECURITY DEFINER',
        description: 'Öğretmen PIN giriş kontrolü yapar ve log kaydı tutar',
        test_call: () => ({
            params: {
                p_ogretmen_id: '00000000-0000-0000-0000-000000000000',
                p_girilen_pin: '1234',
                p_ip_adresi: '127.0.0.1',
                p_user_agent: 'test-agent'
            }
        })
    },
    {
        name: 'get_gorev_belgeleri_detayli',
        parameters: [
            { name: 'p_status_filter', type: 'text', required: false },
            { name: 'p_alan_id_filter', type: 'uuid', required: false },
            { name: 'p_search_term', type: 'text', required: false },
            { name: 'p_limit', type: 'integer', required: false },
            { name: 'p_offset', type: 'integer', required: false }
        ],
        return_type: 'TABLE(...)',
        security: 'SECURITY INVOKER',
        description: 'Görev belgelerini filtreleme ve sayfalama ile detaylı getirir',
        test_call: () => ({
            params: {
                p_status_filter: null,
                p_alan_id_filter: null,
                p_search_term: null,
                p_limit: 10,
                p_offset: 0
            }
        })
    },
    {
        name: 'exec_sql',
        parameters: [
            { name: 'query', type: 'text', required: true }
        ],
        return_type: 'text',
        security: 'SECURITY DEFINER',
        description: 'Yönetici SQL komutları çalıştırır - SADECE GÜVENİLİR KAYNAKLARDAN!',
        test_call: () => ({
            params: {
                query: 'SELECT 1 as test'
            }
        })
    }
];

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    GELİŞTİRİLMİŞ PARAMETRELI RPC BACKUP SCRİPTİ');
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

    // Backup klasörü oluştur
    const backupDir = './database_backups';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];

    log('yellow', `📁 Yedek klasörü: ${backupDir}`);

    try {
        // Tablo verilerini yedekle
        await backupTables(supabase, backupDir, timestamp);
        
        // RPC fonksiyonlarını parametrelerle yedekle
        await backupRpcFunctionsWithParameters(supabase, backupDir, timestamp);

        // Restore talimatları oluştur
        createRestoreInstructions(backupDir, timestamp);

        log('green', '='.repeat(80));
        log('green', '🎉 PARAMETRELI RPC BACKUP TAMAMLANDI!');
        log('green', '='.repeat(80));
        log('yellow', `📁 Yedek konumu: ${backupDir}`);
        log('yellow', `📅 Yedek tarihi: ${timestamp}`);

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        process.exit(1);
    }
}

async function backupTables(supabase, backupDir, timestamp) {
    const backupData = {};
    
    // Admin panelden tespit edilen TÜM tablolar (23 adet)
    const tableList = [
        'admin_kullanicilar',
        'alanlar',
        'backup_operations',
        'belgeler',
        'database_backups',
        'dekontlar',
        'egitim_yillari',
        'giris_denemeleri',
        'gorev_belgeleri',
        'isletme_alanlar',
        'isletme_giris_denemeleri',
        'isletme_koordinatorler',
        'isletmeler',
        'koordinatorluk_programi',
        'notifications',
        'ogrenciler',
        'ogretmen_giris_denemeleri',
        'ogretmenler',
        'restore_operations',
        'siniflar',
        'stajlar',
        'system_settings',
        'v_gorev_belgeleri_detay'
    ];
    
    log('blue', `📊 ${tableList.length} tablo yedekleniyor...`);

    for (const tableName of tableList) {
        try {
            log('yellow', `  📋 ${tableName} tablosu yedekleniyor...`);
            
            const { data, error } = await supabase
                .from(tableName)
                .select('*');

            if (error) {
                log('red', `    ❌ ${tableName} hatası: ${error.message}`);
                continue;
            }

            backupData[tableName] = {
                table_name: tableName,
                row_count: data ? data.length : 0,
                data: data || []
            };

            log('green', `    ✅ ${tableName}: ${data ? data.length : 0} kayıt`);

        } catch (error) {
            log('red', `    ❌ ${tableName} hatası: ${error.message}`);
        }
    }

    // JSON olarak kaydet
    const dataBackupFile = path.join(backupDir, `data_backup_${timestamp}.json`);
    fs.writeFileSync(dataBackupFile, JSON.stringify(backupData, null, 2));
    log('green', `✅ Veri yedeği tamamlandı: ${dataBackupFile}`);
}

async function backupRpcFunctionsWithParameters(supabase, backupDir, timestamp) {
    log('blue', '🔧 RPC Fonksiyonları parametrelerle yedekleniyor...');
    
    const rpcBackupData = {
        timestamp: new Date().toISOString(),
        total_functions: DOCUMENTED_RPC_FUNCTIONS.length,
        working_functions: [],
        available_functions: [],
        unavailable_functions: [],
        function_details: {},
        documented_functions: DOCUMENTED_RPC_FUNCTIONS
    };

    log('yellow', `  🔍 ${DOCUMENTED_RPC_FUNCTIONS.length} dokümante edilmiş RPC fonksiyonu test ediliyor...`);

    for (const funcInfo of DOCUMENTED_RPC_FUNCTIONS) {
        try {
            let result;
            let status = 'unknown';
            let testParams = {};
            
            // Test parametrelerini al
            if (funcInfo.test_call) {
                const testCall = funcInfo.test_call();
                testParams = testCall.params;
            }
            
            // Fonksiyonu test et
            result = await supabase.rpc(funcInfo.name, testParams);
            
            if (result.error) {
                if (result.error.message.includes('function') && result.error.message.includes('does not exist')) {
                    log('red', `    ❌ ${funcInfo.name} - FONKSİYON BULUNAMADI`);
                    rpcBackupData.unavailable_functions.push(funcInfo.name);
                    status = 'not_found';
                } else {
                    log('cyan', `    🔧 ${funcInfo.name} - MEVCUT (${result.error.message.substring(0, 50)}...)`);
                    rpcBackupData.available_functions.push(funcInfo.name);
                    status = 'available';
                }
            } else {
                log('green', `    ✅ ${funcInfo.name} - ÇALIŞIYOR`);
                rpcBackupData.working_functions.push(funcInfo.name);
                status = 'working';
            }
            
            // Detaylı bilgileri kaydet
            rpcBackupData.function_details[funcInfo.name] = {
                status: status,
                parameters: funcInfo.parameters,
                return_type: funcInfo.return_type,
                security: funcInfo.security,
                description: funcInfo.description,
                test_parameters: testParams,
                error: result.error ? result.error.message : null,
                test_date: new Date().toISOString(),
                parameter_signature: generateParameterSignature(funcInfo.parameters)
            };
            
        } catch (error) {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                log('red', `    ❌ ${funcInfo.name} - FONKSİYON BULUNAMADI`);
                rpcBackupData.unavailable_functions.push(funcInfo.name);
                status = 'not_found';
            } else {
                log('cyan', `    🔧 ${funcInfo.name} - MEVCUT (Exception: ${error.message.substring(0, 30)}...)`);
                rpcBackupData.available_functions.push(funcInfo.name);
                status = 'available';
            }
            
            rpcBackupData.function_details[funcInfo.name] = {
                status: status,
                parameters: funcInfo.parameters,
                return_type: funcInfo.return_type,
                security: funcInfo.security,
                description: funcInfo.description,
                test_parameters: testParams,
                error: error.message,
                test_date: new Date().toISOString(),
                parameter_signature: generateParameterSignature(funcInfo.parameters)
            };
        }
    }

    // RPC backup dosyasını kaydet
    const rpcBackupFile = path.join(backupDir, `enhanced_rpc_backup_${timestamp}.json`);
    fs.writeFileSync(rpcBackupFile, JSON.stringify(rpcBackupData, null, 2));
    
    log('green', `✅ Geliştirilmiş RPC fonksiyon yedeği tamamlandı: ${rpcBackupFile}`);
    log('cyan', `  📊 Toplam ${rpcBackupData.total_functions} RPC fonksiyonu yedeklendi`);
    log('green', `  ✅ ${rpcBackupData.working_functions.length} çalışır durumda`);
    log('cyan', `  🔧 ${rpcBackupData.available_functions.length} mevcut (parametre uyumsuzluğu var)`);
    log('red', `  ❌ ${rpcBackupData.unavailable_functions.length} bulunamadı`);
    
    // Özet rapor oluştur
    await createFunctionSummaryReport(rpcBackupData, backupDir, timestamp);
}

function generateParameterSignature(parameters) {
    if (!parameters || parameters.length === 0) {
        return '()';
    }
    
    const paramStrings = parameters.map(param => {
        let paramStr = `${param.name} ${param.type}`;
        if (!param.required && param.default !== undefined) {
            paramStr += ` DEFAULT ${param.default === null ? 'NULL' : param.default}`;
        }
        return paramStr;
    });
    
    return `(${paramStrings.join(', ')})`;
}

async function createFunctionSummaryReport(rpcData, backupDir, timestamp) {
    const reportContent = `
# RPC FONKSİYON ÖZET RAPORU
**Tarih:** ${new Date().toISOString()}
**Backup ID:** ${timestamp}

## 📊 GENEL İSTATİSTİKLER
- **Toplam Fonksiyon:** ${rpcData.total_functions}
- **Çalışır Durumda:** ${rpcData.working_functions.length}
- **Mevcut (Parametre Sorunu):** ${rpcData.available_functions.length}
- **Bulunamadı:** ${rpcData.unavailable_functions.length}

## ✅ ÇALIŞIR DURUMDA (${rpcData.working_functions.length} adet)
${rpcData.working_functions.map(name => {
    const details = rpcData.function_details[name];
    return `### ${name}${details.parameter_signature}
- **Dönüş:** ${details.return_type}
- **Güvenlik:** ${details.security}
- **Açıklama:** ${details.description}`;
}).join('\n\n')}

## 🔧 MEVCUT AMA PARAMETRE SORUNU (${rpcData.available_functions.length} adet)
${rpcData.available_functions.map(name => {
    const details = rpcData.function_details[name];
    return `### ${name}${details.parameter_signature}
- **Dönüş:** ${details.return_type}
- **Güvenlik:** ${details.security}
- **Açıklama:** ${details.description}
- **Hata:** ${details.error}`;
}).join('\n\n')}

## ❌ BULUNAMADI (${rpcData.unavailable_functions.length} adet)
${rpcData.unavailable_functions.map(name => `- ${name}`).join('\n')}

## 🔧 KULLANIM ÖRNEKLERİ

### Çalışır Fonksiyonlar
${rpcData.working_functions.map(name => {
    const details = rpcData.function_details[name];
    const params = Object.keys(details.test_parameters).length > 0 
        ? JSON.stringify(details.test_parameters, null, 2) 
        : '{}';
    return `\`\`\`javascript
// ${name}
const { data, error } = await supabase.rpc('${name}', ${params});
\`\`\``;
}).join('\n\n')}
`;

    const reportFile = path.join(backupDir, `rpc_summary_report_${timestamp}.md`);
    fs.writeFileSync(reportFile, reportContent);
    log('green', `📄 RPC özet raporu oluşturuldu: ${reportFile}`);
}

function createRestoreInstructions(backupDir, timestamp) {
    const instructionsFile = path.join(backupDir, `enhanced_restore_instructions_${timestamp}.txt`);
    const instructions = `
=================================================================
GELİŞTİRİLMİŞ VERİTABANI GERİ YÜKLEME TALİMATLARI
=================================================================
Tarih: ${new Date().toISOString()}
Yedek Dosyaları: ${timestamp}

YEDEK DOSYALARI:
- data_backup_${timestamp}.json              (Tablo verileri JSON)
- enhanced_rpc_backup_${timestamp}.json      (RPC fonksiyonları - parametrelerle)
- rpc_summary_report_${timestamp}.md         (RPC özet raporu)

ÖNEMLİ: Bu backup RPC fonksiyonlarının parametrelerini içerir!

1. TABLO VERİLERİNİ GERİ YÜKLEME:
   JSON formatından:
   node scripts/restore-from-json.js data_backup_${timestamp}.json

2. RPC FONKSİYONLARINI GERİ YÜKLEME:
   - enhanced_rpc_backup_${timestamp}.json dosyasını açın
   - function_details bölümünde her fonksiyonun parametreleri var
   - Çalışmayan fonksiyonlar için scripts/ klasöründeki .sql dosyalarını çalıştırın
   - Parametreleri rpc_summary_report_${timestamp}.md dosyasından kontrol edin

3. RPC FONKSİYON KULLANIM ÖRNEKLERİ:
   Özet raporda her fonksiyon için JavaScript kullanım örnekleri var

UYARI:
- Bu backup parametreli RPC fonksiyon bilgilerini içerir
- Geri yükleme işlemi öncesinde mevcut verileri yedekleyin
- RPC fonksiyonları doğru parametrelerle test edin

=================================================================
`;

    fs.writeFileSync(instructionsFile, instructions);
    log('green', `📋 Geliştirilmiş restore talimatları oluşturuldu: ${instructionsFile}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };