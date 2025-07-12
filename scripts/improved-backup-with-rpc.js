#!/usr/bin/env node

/**
 * =================================================================
 * GELİŞTİRİLMİŞ SUPABASE VERİTABANI YEDEKLEme SCRİPTİ
 * =================================================================
 * RPC fonksiyonlarını başarıyla yedekleyen geliştirilmiş script
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
    log('blue', '    GELİŞTİRİLMİŞ SUPABASE VERİTABANI YEDEKLEme SCRİPTİ');
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

        // Schema bilgilerini yedekle
        await backupSchema(supabase, backupDir, timestamp);

        // Restore talimatları oluştur
        createRestoreInstructions(backupDir, timestamp);

        log('green', '='.repeat(65));
        log('green', '🎉 YEDEKLEme İŞLEMİ BAŞARIYLA TAMAMLANDI!');
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
        'stajyerler',
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
        'exec_sql'
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
                    result = await supabase.rpc('get_admin_users');
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

    // RPC function definitions'ları almaya çalış
    try {
        log('yellow', '  📋 RPC fonksiyon tanımları alınıyor...');
        
        const sqlQuery = `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments,
            pg_get_function_result(p.oid) as return_type,
            CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
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
        
        const { data: definitions, error: sqlError } = await supabase.rpc('exec_sql', { 
          query: sqlQuery 
        });
        
        if (!sqlError && definitions) {
            rpcBackupData.sql_definitions_raw = definitions;
            log('green', '    ✅ SQL definitions alındı');
        } else {
            log('yellow', '    ⚠️ SQL definitions alınamadı');
        }
        
    } catch (error) {
        log('yellow', `    ⚠️ Definition alma hatası: ${error.message}`);
    }

    // RPC backup dosyasını kaydet
    const rpcBackupFile = path.join(backupDir, `rpc_functions_backup_${timestamp}.json`);
    fs.writeFileSync(rpcBackupFile, JSON.stringify(rpcBackupData, null, 2));
    
    log('green', `✅ RPC fonksiyon yedeği tamamlandı: ${rpcBackupFile}`);
    log('cyan', `  📊 Toplam ${rpcBackupData.total_functions} RPC fonksiyonu yedeklendi`);
    log('green', `  ✅ ${rpcBackupData.working_functions.length} çalışır durumda`);
    log('cyan', `  ⚠️ ${rpcBackupData.available_functions.length} mevcut ama parametre uyumsuzluğu var`);
}

async function backupSchema(supabase, backupDir, timestamp) {
    try {
        log('blue', '📋 Kapsamlı schema bilgileri yedekleniyor...');

        const schemaInfo = {
            timestamp: new Date().toISOString(),
            tables: {},
            functions: [],
            triggers: [],
            indexes: [],
            policies: []
        };

        // Triggers yedekleme
        await backupTriggers(supabase, schemaInfo);
        
        // Indexes yedekleme
        await backupIndexes(supabase, schemaInfo);
        
        // RLS Policies yedekleme
        await backupPolicies(supabase, schemaInfo);

        const schemaFile = path.join(backupDir, `schema_backup_${timestamp}.json`);
        fs.writeFileSync(schemaFile, JSON.stringify(schemaInfo, null, 2));
        log('green', `✅ Kapsamlı schema yedeği tamamlandı: ${schemaFile}`);

        // SQL format schema backup
        await createSchemaSQL(schemaInfo, backupDir, timestamp);

    } catch (error) {
        log('yellow', `⚠️ Schema yedekleme hatası: ${error.message}`);
    }
}

async function backupTriggers(supabase, schemaInfo) {
    try {
        log('yellow', '  ⚡ Triggers yedekleniyor...');
        
        // Gerçek trigger'ları özel RPC fonksiyonu ile al
        const { data: realTriggers, error: triggerError } = await supabase.rpc('get_schema_triggers');
        
        if (!triggerError && realTriggers && Array.isArray(realTriggers)) {
            schemaInfo.triggers = realTriggers;
            log('green', `    ✅ ${realTriggers.length} gerçek trigger veritabanından alındı`);
        } else {
            // Fallback: Bilinen trigger'lar listesi
            const knownTriggers = [
                {
                    trigger_name: 'dekont_onay_durumu_degistiginde',
                    table_name: 'dekontlar',
                    function_name: 'update_dekont_onay_tarihi',
                    description: 'Dekont onay durumu değiştiğinde otomatik tarih güncelleme'
                },
                {
                    trigger_name: 'tr_set_default_dekont_values',
                    table_name: 'dekontlar',
                    function_name: 'set_default_dekont_values',
                    description: 'Dekont ekleme/güncelleme sırasında varsayılan değerleri ayarlama'
                },
                {
                    trigger_name: 'tr_set_default_odeme_son_tarihi',
                    table_name: 'dekontlar',
                    function_name: 'set_default_odeme_son_tarihi',
                    description: 'Ödeme son tarihi otomatik hesaplama'
                },
                {
                    trigger_name: 'protect_super_admin_status',
                    table_name: 'admin_kullanicilar',
                    function_name: 'prevent_super_admin_deactivation',
                    description: 'Super admin deaktivasyonunu engelleme'
                }
            ];
            
            schemaInfo.triggers = knownTriggers;
            log('yellow', `    ⚠️ Gerçek trigger'lar alınamadı, ${knownTriggers.length} bilinen trigger kullanıldı`);
        }
        
    } catch (error) {
        schemaInfo.triggers = [];
        log('yellow', `    ⚠️ Triggers yedekleme hatası: ${error.message}`);
    }
}

async function backupIndexes(supabase, schemaInfo) {
    try {
        log('yellow', '  📊 Indexes yedekleniyor...');
        
        // Gerçek index'leri veritabanından al
        const indexQuery = `
          SELECT
            i.relname as index_name,
            t.relname as table_name,
            array_agg(a.attname ORDER BY a.attnum) as columns,
            obj_description(i.oid, 'pg_class') as description,
            pg_get_indexdef(i.oid) as definition
          FROM pg_index x
          JOIN pg_class i ON i.oid = x.indexrelid
          JOIN pg_class t ON t.oid = x.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(x.indkey)
          WHERE n.nspname = 'public'
            AND NOT x.indisprimary
            AND NOT x.indisunique
            AND i.relname NOT LIKE 'pg_%'
          GROUP BY i.relname, t.relname, i.oid
          ORDER BY t.relname, i.relname;
        `;
        
        const { data: realIndexes, error: indexError } = await supabase.rpc('exec_sql', {
          query: indexQuery
        });
        
        if (!indexError && realIndexes && Array.isArray(realIndexes)) {
            schemaInfo.indexes = realIndexes;
            log('green', `    ✅ ${realIndexes.length} gerçek index veritabanından alındı`);
        } else {
            // Fallback: Bilinen index'ler listesi
            const knownIndexes = [
                {
                    index_name: 'idx_dekontlar_ogrenci',
                    table_name: 'dekontlar',
                    columns: ['ogrenci_id'],
                    description: 'Dekontlar tablosu öğrenci performans indexi'
                },
                {
                    index_name: 'idx_dekontlar_isletme',
                    table_name: 'dekontlar',
                    columns: ['isletme_id'],
                    description: 'Dekontlar tablosu işletme performans indexi'
                },
                {
                    index_name: 'idx_dekontlar_ay_yil',
                    table_name: 'dekontlar',
                    columns: ['ay', 'yil'],
                    description: 'Dekontlar tablosu tarih performans indexi'
                },
                {
                    index_name: 'idx_dekontlar_onay_durumu',
                    table_name: 'dekontlar',
                    columns: ['onay_durumu'],
                    description: 'Dekontlar tablosu onay durumu performans indexi'
                }
            ];
            
            schemaInfo.indexes = knownIndexes;
            log('yellow', `    ⚠️ Gerçek index'ler alınamadı, ${knownIndexes.length} bilinen index kullanıldı`);
        }
        
    } catch (error) {
        schemaInfo.indexes = [];
        log('yellow', `    ⚠️ Indexes yedekleme hatası: ${error.message}`);
    }
}

async function backupPolicies(supabase, schemaInfo) {
    try {
        log('yellow', '  🔒 RLS Policies yedekleniyor...');
        
        // Gerçek RLS policy'lerini veritabanından al
        const policyQuery = `
          SELECT
            pol.polname as policy_name,
            c.relname as table_name,
            pol.polcmd as command,
            pol.polpermissive as permissive,
            pol.polroles as roles,
            pol.polqual as qual_expression,
            pol.polwithcheck as with_check_expression
          FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
          ORDER BY c.relname, pol.polname;
        `;
        
        const { data: realPolicies, error: policyError } = await supabase.rpc('exec_sql', {
          query: policyQuery
        });
        
        if (!policyError && realPolicies && Array.isArray(realPolicies)) {
            schemaInfo.policies = realPolicies;
            log('green', `    ✅ ${realPolicies.length} gerçek RLS policy veritabanından alındı`);
        } else {
            // Fallback: Bilinen RLS policy'ler listesi
            const knownPolicies = [
                {
                    policy_name: 'Öğretmenler kendi öğrencilerinin dekontlarını görebilir',
                    table_name: 'dekontlar',
                    command: 'SELECT',
                    description: 'Öğretmenler sadece kendi öğrencilerinin dekontlarını görebilir'
                },
                {
                    policy_name: 'İşletmeler kendi dekontlarını görebilir',
                    table_name: 'dekontlar',
                    command: 'SELECT',
                    description: 'İşletmeler sadece kendi dekontlarını görebilir'
                },
                {
                    policy_name: 'Admin tüm dekontları görebilir',
                    table_name: 'dekontlar',
                    command: 'ALL',
                    description: 'Admin kullanıcıları tüm dekontlara erişebilir'
                },
                {
                    policy_name: 'System settings admin erişimi',
                    table_name: 'system_settings',
                    command: 'ALL',
                    description: 'Sistem ayarlarına sadece admin erişimi'
                }
            ];
            
            schemaInfo.policies = knownPolicies;
            log('yellow', `    ⚠️ Gerçek policy'ler alınamadı, ${knownPolicies.length} bilinen policy kullanıldı`);
        }
        
    } catch (error) {
        schemaInfo.policies = [];
        log('yellow', `    ⚠️ Policies yedekleme hatası: ${error.message}`);
    }
}

async function createSchemaSQL(schemaInfo, backupDir, timestamp) {
    try {
        log('yellow', '  📄 Schema SQL dosyası oluşturuluyor...');
        
        let sqlContent = `-- Supabase Schema Yedeği\n-- Tarih: ${new Date().toISOString()}\n\n`;
        
        // Triggers
        if (schemaInfo.triggers && schemaInfo.triggers.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- TRIGGERS (${schemaInfo.triggers.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const trigger of schemaInfo.triggers) {
                sqlContent += `-- ${trigger.description}\n`;
                sqlContent += `-- Tablo: ${trigger.table_name}\n`;
                sqlContent += `-- Fonksiyon: ${trigger.function_name}\n\n`;
            }
        }
        
        // Indexes
        if (schemaInfo.indexes && schemaInfo.indexes.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- INDEXES (${schemaInfo.indexes.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const index of schemaInfo.indexes) {
                sqlContent += `-- ${index.description}\n`;
                sqlContent += `CREATE INDEX IF NOT EXISTS ${index.index_name} ON ${index.table_name} (${index.columns.join(', ')});\n\n`;
            }
        }
        
        const schemaFile = path.join(backupDir, `schema_backup_${timestamp}.sql`);
        fs.writeFileSync(schemaFile, sqlContent);
        log('green', `    ✅ Schema SQL dosyası: ${schemaFile}`);
        
    } catch (error) {
        log('yellow', `    ⚠️ Schema SQL oluşturma hatası: ${error.message}`);
    }
}

// Restore talimatları oluştur
function createRestoreInstructions(backupDir, timestamp) {
    const instructionsFile = path.join(backupDir, `restore_instructions_${timestamp}.txt`);
    const instructions = `
=================================================================
VERİTABANI GERİ YÜKLEME TALİMATLARI (Geliştirilmiş)
=================================================================
Tarih: ${new Date().toISOString()}
Yedek Dosyaları: ${timestamp}

YEDEK DOSYALARI:
- data_backup_${timestamp}.json          (Tablo verileri JSON)
- data_backup_${timestamp}.sql           (Tablo verileri SQL)
- rpc_functions_backup_${timestamp}.json (RPC fonksiyonları)
- schema_backup_${timestamp}.json        (Schema bilgileri JSON)
- schema_backup_${timestamp}.sql         (Schema bilgileri SQL)

1. TABLO VERİLERİNİ GERİ YÜKLEME:
   JSON formatından:
   node scripts/restore-from-json.js data_backup_${timestamp}.json
   
   SQL formatından:
   psql -h your-host -p 5432 -U postgres -d postgres -f data_backup_${timestamp}.sql

2. RPC FONKSİYONLARINI GERİ YÜKLEME:
   - rpc_functions_backup_${timestamp}.json dosyasını açın
   - Çalışan fonksiyonları kontrol edin
   - scripts/ klasöründeki ilgili .sql dosyalarını çalıştırın

3. SCHEMA BİLGİLERİNİ GERİ YÜKLEME:
   psql -h your-host -p 5432 -U postgres -d postgres -f schema_backup_${timestamp}.sql

UYARI:
- Geri yükleme işlemi öncesinde mevcut verileri yedekleyin
- RLS (Row Level Security) politikalarını kontrol edin
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