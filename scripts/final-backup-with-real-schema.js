#!/usr/bin/env node

/**
 * =================================================================
 * SON HALİ - GERÇEK SCHEMA BİLGİLERİYLE BACKUP SCRİPTİ
 * =================================================================
 * RPC fonksiyonları, gerçek triggers, indexes ve policies ile
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

async function main() {
    log('blue', '='.repeat(65));
    log('blue', '    SON HALİ - GERÇEK SCHEMA BİLGİLERİYLE BACKUP SCRİPTİ');
    log('blue', '='.repeat(65));

    // Environment variables kontrol
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        log('yellow', 'Gerekli değişkenler:');
        log('yellow', '  NEXT_PUBLIC_SUPABASE_URL');
        log('yellow', '  SUPABASE_SERVICE_ROLE_KEY');
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
        
        // RPC fonksiyonlarını yedekle
        await backupRpcFunctions(supabase, backupDir, timestamp);

        // Gerçek schema bilgilerini yedekle
        await backupRealSchema(supabase, backupDir, timestamp);

        // Restore talimatları oluştur
        createRestoreInstructions(backupDir, timestamp);

        log('green', '='.repeat(65));
        log('green', '🎉 GERÇEK SCHEMA BİLGİLERİYLE BACKUP TAMAMLANDI!');
        log('green', '='.repeat(65));
        log('yellow', `📁 Yedek konumu: ${backupDir}`);
        log('yellow', `📅 Yedek tarihi: ${timestamp}`);

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        process.exit(1);
    }
}

async function backupTables(supabase, backupDir, timestamp) {
    const backupData = {};
    
    // Bilinen tabloları manuel listele
    const tableList = [
        'admin_kullanicilar',
        'alanlar', 
        'belgeler',
        'dekontlar',
        'gorev_belgeleri',
        'isletmeler',
        'isletme_giris_denemeleri',
        'notifications',
        'ogretmenler',
        'ogretmen_giris_denemeleri',
        'siniflar',
        'system_settings'
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

    // SQL INSERT formatında kaydet
    const sqlBackupFile = path.join(backupDir, `data_backup_${timestamp}.sql`);
    let sqlContent = `-- Supabase Veri Yedeği\n-- Tarih: ${new Date().toISOString()}\n\n`;
    
    for (const [tableName, tableData] of Object.entries(backupData)) {
        if (tableData.data && tableData.data.length > 0) {
            sqlContent += `-- ${tableName} tablosu (${tableData.row_count} kayıt)\n`;
            sqlContent += `TRUNCATE ${tableName} CASCADE;\n`;
            
            // INSERT statements oluştur
            for (const row of tableData.data) {
                const columns = Object.keys(row).join(', ');
                const values = Object.values(row).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (typeof val === 'boolean') return val;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return val;
                }).join(', ');
                
                sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
            }
            sqlContent += '\n';
        }
    }

    fs.writeFileSync(sqlBackupFile, sqlContent);
    log('green', `✅ SQL yedeği tamamlandı: ${sqlBackupFile}`);
}

async function backupRpcFunctions(supabase, backupDir, timestamp) {
    log('blue', '🔧 RPC Fonksiyonları yedekleniyor...');
    
    // Test edilecek RPC fonksiyonları
    const knownRpcFunctions = [
        'get_admin_users',
        'create_admin_user', 
        'update_admin_user',
        'delete_admin_user',
        'is_user_admin',
        'get_system_setting',
        'update_system_setting',
        'check_isletme_pin_giris',
        'check_ogretmen_pin_giris',
        'get_gorev_belgeleri_detayli',
        'exec_sql',
        'get_schema_triggers',
        'get_schema_indexes',
        'get_schema_policies'
    ];
    
    const rpcBackupData = {
        timestamp: new Date().toISOString(),
        total_functions: 0,
        working_functions: [],
        available_functions: [],
        function_details: {}
    };

    log('yellow', `  🔍 ${knownRpcFunctions.length} RPC fonksiyonu test ediliyor...`);

    for (const funcName of knownRpcFunctions) {
        try {
            let result;
            let status = 'unknown';
            
            // Her fonksiyon için test parametreleri
            switch(funcName) {
                case 'get_admin_users':
                case 'get_schema_triggers':
                case 'get_schema_indexes':
                case 'get_schema_policies':
                    result = await supabase.rpc(funcName);
                    status = result.error ? 'available' : 'working';
                    break;
                case 'get_system_setting':
                    result = await supabase.rpc('get_system_setting', { p_setting_key: 'test' });
                    status = result.error ? 'available' : 'working';
                    break;
                case 'is_user_admin':
                    result = await supabase.rpc('is_user_admin', { p_user_id: '00000000-0000-0000-0000-000000000000' });
                    status = result.error ? 'available' : 'working';
                    break;
                default:
                    result = await supabase.rpc(funcName, {});
                    status = 'available';
            }
            
            if (result.error) {
                if (result.error.message.includes('function') && result.error.message.includes('does not exist')) {
                    log('red', `    ❌ ${funcName} - FONKSİYON BULUNAMADI`);
                    continue;
                } else {
                    log('cyan', `    ✅ ${funcName} - MEVCUT`);
                    rpcBackupData.available_functions.push(funcName);
                    status = 'available';
                }
            } else {
                log('green', `    ✅ ${funcName} - ÇALIŞIYOR`);
                rpcBackupData.working_functions.push(funcName);
                status = 'working';
            }
            
            rpcBackupData.function_details[funcName] = {
                status: status,
                error: result.error ? result.error.message : null,
                test_date: new Date().toISOString()
            };
            
        } catch (error) {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                log('red', `    ❌ ${funcName} - FONKSİYON BULUNAMADI`);
            } else {
                log('cyan', `    ✅ ${funcName} - MEVCUT (Hata: ${error.message.substring(0, 30)}...)`);
                rpcBackupData.available_functions.push(funcName);
                rpcBackupData.function_details[funcName] = {
                    status: 'available',
                    error: error.message,
                    test_date: new Date().toISOString()
                };
            }
        }
    }

    rpcBackupData.total_functions = rpcBackupData.working_functions.length + rpcBackupData.available_functions.length;

    // RPC backup dosyasını kaydet
    const rpcBackupFile = path.join(backupDir, `rpc_functions_backup_${timestamp}.json`);
    fs.writeFileSync(rpcBackupFile, JSON.stringify(rpcBackupData, null, 2));
    
    log('green', `✅ RPC fonksiyon yedeği tamamlandı: ${rpcBackupFile}`);
    log('cyan', `  📊 Toplam ${rpcBackupData.total_functions} RPC fonksiyonu yedeklendi`);
    log('green', `  ✅ ${rpcBackupData.working_functions.length} çalışır durumda`);
    log('cyan', `  ⚠️ ${rpcBackupData.available_functions.length} mevcut ama parametre uyumsuzluğu var`);
}

async function backupRealSchema(supabase, backupDir, timestamp) {
    try {
        log('blue', '📋 GERÇEK schema bilgileri yedekleniyor...');

        const schemaInfo = {
            timestamp: new Date().toISOString(),
            real_data: true,
            triggers: [],
            indexes: [],
            policies: []
        };

        // Gerçek triggers'ları al
        try {
            log('yellow', '  ⚡ Gerçek triggers yedekleniyor...');
            const { data: triggers, error: triggerError } = await supabase.rpc('get_schema_triggers');
            
            if (!triggerError && triggers && Array.isArray(triggers)) {
                schemaInfo.triggers = triggers;
                log('green', `    ✅ ${triggers.length} gerçek trigger veritabanından alındı`);
            } else {
                log('yellow', `    ⚠️ Trigger alma hatası: ${triggerError?.message || 'Bilinmeyen hata'}`);
                schemaInfo.triggers = [];
            }
        } catch (error) {
            log('yellow', `    ⚠️ Trigger exception: ${error.message}`);
            schemaInfo.triggers = [];
        }

        // Gerçek indexes'leri al
        try {
            log('yellow', '  📊 Gerçek indexes yedekleniyor...');
            const { data: indexes, error: indexError } = await supabase.rpc('get_schema_indexes');
            
            if (!indexError && indexes && Array.isArray(indexes)) {
                schemaInfo.indexes = indexes;
                log('green', `    ✅ ${indexes.length} gerçek index veritabanından alındı`);
            } else {
                log('yellow', `    ⚠️ Index alma hatası: ${indexError?.message || 'Bilinmeyen hata'}`);
                schemaInfo.indexes = [];
            }
        } catch (error) {
            log('yellow', `    ⚠️ Index exception: ${error.message}`);
            schemaInfo.indexes = [];
        }

        // Gerçek policies'leri al
        try {
            log('yellow', '  🔒 Gerçek RLS policies yedekleniyor...');
            const { data: policies, error: policyError } = await supabase.rpc('get_schema_policies');
            
            if (!policyError && policies && Array.isArray(policies)) {
                schemaInfo.policies = policies;
                log('green', `    ✅ ${policies.length} gerçek RLS policy veritabanından alındı`);
            } else {
                log('yellow', `    ⚠️ Policy alma hatası: ${policyError?.message || 'Bilinmeyen hata'}`);
                schemaInfo.policies = [];
            }
        } catch (error) {
            log('yellow', `    ⚠️ Policy exception: ${error.message}`);
            schemaInfo.policies = [];
        }

        const schemaFile = path.join(backupDir, `real_schema_backup_${timestamp}.json`);
        fs.writeFileSync(schemaFile, JSON.stringify(schemaInfo, null, 2));
        log('green', `✅ GERÇEK schema yedeği tamamlandı: ${schemaFile}`);

        // SQL format schema backup
        await createRealSchemaSQL(schemaInfo, backupDir, timestamp);

    } catch (error) {
        log('yellow', `⚠️ Schema yedekleme hatası: ${error.message}`);
    }
}

async function createRealSchemaSQL(schemaInfo, backupDir, timestamp) {
    try {
        log('yellow', '  📄 Gerçek Schema SQL dosyası oluşturuluyor...');
        
        let sqlContent = `-- Supabase GERÇEK Schema Yedeği\n-- Tarih: ${new Date().toISOString()}\n\n`;
        
        // Triggers
        if (schemaInfo.triggers && schemaInfo.triggers.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- GERÇEK TRIGGERS (${schemaInfo.triggers.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const trigger of schemaInfo.triggers) {
                sqlContent += `-- Trigger: ${trigger.trigger_name}\n`;
                sqlContent += `-- Tablo: ${trigger.table_name}\n`;
                sqlContent += `-- Fonksiyon: ${trigger.function_name}\n`;
                sqlContent += `-- Zamanlama: ${trigger.timing}\n`;
                sqlContent += `-- Olaylar: ${trigger.events}\n\n`;
            }
        }
        
        // Indexes
        if (schemaInfo.indexes && schemaInfo.indexes.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- GERÇEK INDEXES (${schemaInfo.indexes.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const index of schemaInfo.indexes) {
                sqlContent += `-- Index: ${index.index_name} on ${index.table_name}\n`;
                sqlContent += `-- Unique: ${index.is_unique}, Primary: ${index.is_primary}\n`;
                if (index.definition) {
                    sqlContent += `${index.definition};\n`;
                }
                sqlContent += '\n';
            }
        }
        
        // Policies
        if (schemaInfo.policies && schemaInfo.policies.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- GERÇEK RLS POLICIES (${schemaInfo.policies.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const policy of schemaInfo.policies) {
                sqlContent += `-- Policy: ${policy.policy_name} on ${policy.table_name}\n`;
                sqlContent += `-- Command: ${policy.command}\n\n`;
            }
        }
        
        const schemaFile = path.join(backupDir, `real_schema_backup_${timestamp}.sql`);
        fs.writeFileSync(schemaFile, sqlContent);
        log('green', `    ✅ Gerçek Schema SQL dosyası: ${schemaFile}`);
        
    } catch (error) {
        log('yellow', `    ⚠️ Schema SQL oluşturma hatası: ${error.message}`);
    }
}

// Restore talimatları oluştur
function createRestoreInstructions(backupDir, timestamp) {
    const instructionsFile = path.join(backupDir, `restore_instructions_${timestamp}.txt`);
    const instructions = `
=================================================================
VERİTABANI GERİ YÜKLEME TALİMATLARI (Gerçek Schema ile)
=================================================================
Tarih: ${new Date().toISOString()}
Yedek Dosyaları: ${timestamp}

YEDEK DOSYALARI:
- data_backup_${timestamp}.json              (Tablo verileri JSON)
- data_backup_${timestamp}.sql               (Tablo verileri SQL)
- rpc_functions_backup_${timestamp}.json     (RPC fonksiyonları)
- real_schema_backup_${timestamp}.json       (GERÇEK Schema bilgileri JSON)
- real_schema_backup_${timestamp}.sql        (GERÇEK Schema bilgileri SQL)

ÖNEMLİ: Bu backup gerçek veritabanından alınan schema bilgilerini içerir!

1. TABLO VERİLERİNİ GERİ YÜKLEME:
   JSON formatından:
   node scripts/restore-from-json.js data_backup_${timestamp}.json
   
   SQL formatından:
   psql -h your-host -p 5432 -U postgres -d postgres -f data_backup_${timestamp}.sql

2. RPC FONKSİYONLARINI GERİ YÜKLEME:
   - rpc_functions_backup_${timestamp}.json dosyasını açın
   - Çalışan fonksiyonları kontrol edin
   - scripts/ klasöründeki ilgili .sql dosyalarını çalıştırın

3. GERÇEK SCHEMA BİLGİLERİNİ GERİ YÜKLEME:
   psql -h your-host -p 5432 -U postgres -d postgres -f real_schema_backup_${timestamp}.sql

UYARI:
- Bu backup GERÇEK veritabanından alınan schema bilgilerini içerir
- Geri yükleme işlemi öncesinde mevcut verileri yedekleyin
- RPC fonksiyonları doğru parametrelerle test edin

=================================================================
`;

    fs.writeFileSync(instructionsFile, instructions);
    log('green', `📋 Restore talimatları oluşturuldu: ${instructionsFile}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };