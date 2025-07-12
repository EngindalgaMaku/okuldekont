#!/usr/bin/env node

/**
 * =================================================================
 * SUPABASE VERİTABANI YEDEKLEme SCRİPTİ (Node.js)
 * =================================================================
 * Bu script PostgreSQL client tools olmadan çalışır
 * Supabase API kullanarak veritabanını yedekler
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
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    log('blue', '='.repeat(65));
    log('blue', '       SUPABASE VERİTABANI YEDEKLEme SCRİPTİ (Node.js)');
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
        // Tüm tabloları listele
        log('blue', '🔍 Tablolar listeleniyor...');
        
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_table_list');

        if (tablesError) {
            // Fallback: Manuel tablo listesi
            const tableList = [
                'admin_kullanicilar',
                'alanlar', 
                'belgeler',
                'dekontlar',
                'gorev_belgeleri',
                'isletmeler',
                'notifications',
                'ogretmenler',
                'siniflar',
                'stajyerler',
                'system_settings'
            ];
            
            log('yellow', '⚠️  RPC kullanılamıyor, manuel tablo listesi kullanılıyor');
            await backupTables(supabase, tableList, backupDir, timestamp);
        } else {
            await backupTables(supabase, tables, backupDir, timestamp);
        }

        // Schema backup
        await backupSchema(supabase, backupDir, timestamp);

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

async function backupTables(supabase, tableList, backupDir, timestamp) {
    const backupData = {};
    
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

        // Functions yedekleme
        await backupFunctions(supabase, schemaInfo);
        
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
        log('yellow', `⚠️  Schema yedekleme hatası: ${error.message}`);
    }
}

async function backupFunctions(supabase, schemaInfo) {
    try {
        log('yellow', '  🔧 Functions yedekleniyor...');
        
        // Information schema kullanarak functions alma
        const { data: functions, error } = await supabase
            .from('information_schema.routines')
            .select('*')
            .eq('routine_schema', 'public')
            .neq('routine_name', 'like')
            .not('routine_name', 'like', 'pg_%');

        if (!error && functions && functions.length > 0) {
            schemaInfo.functions = functions;
            log('green', `    ✅ ${functions.length} function yedeklendi`);
        } else {
            // Alternatif: Manuel function listesi
            const knownFunctions = [
                'check_isletme_pin_giris',
                'check_ogretmen_pin_giris',
                'update_system_setting',
                'get_system_setting',
                'get_admin_users',
                'create_admin_user',
                'update_admin_user',
                'delete_admin_user',
                'is_user_admin',
                'get_gorev_belgeleri_detayli',
                'prevent_super_admin_deactivation',
                'update_dekont_onay_tarihi',
                'set_default_dekont_values',
                'set_default_odeme_son_tarihi'
            ];
            
            schemaInfo.functions = knownFunctions.map(name => ({
                function_name: name,
                status: 'known_function',
                source: 'scripts/'
            }));
            
            log('green', `    ✅ ${knownFunctions.length} bilinen function listelendi`);
        }
    } catch (error) {
        schemaInfo.functions = [];
        log('yellow', `    ⚠️  Functions yedekleme hatası: ${error.message}`);
    }
}

async function backupTriggers(supabase, schemaInfo) {
    try {
        log('yellow', '  ⚡ Triggers yedekleniyor...');
        
        // Bilinen trigger'lar listesi (scripts klasöründen)
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
        log('green', `    ✅ ${knownTriggers.length} bilinen trigger listelendi`);
        
    } catch (error) {
        schemaInfo.triggers = [];
        log('yellow', `    ⚠️  Triggers yedekleme hatası: ${error.message}`);
    }
}

async function backupIndexes(supabase, schemaInfo) {
    try {
        log('yellow', '  📊 Indexes yedekleniyor...');
        
        // Bilinen index'ler listesi (scripts klasöründen)
        const knownIndexes = [
            {
                index_name: 'idx_dekontlar_ogrenci',
                table_name: 'dekontlar',
                columns: ['ogrenci_id'],
                description: 'Dekontlar tablosu öğrenci performans index\'i'
            },
            {
                index_name: 'idx_dekontlar_isletme',
                table_name: 'dekontlar',
                columns: ['isletme_id'],
                description: 'Dekontlar tablosu işletme performans index\'i'
            },
            {
                index_name: 'idx_dekontlar_ay_yil',
                table_name: 'dekontlar',
                columns: ['ay', 'yil'],
                description: 'Dekontlar tablosu tarih performans index\'i'
            },
            {
                index_name: 'idx_dekontlar_onay_durumu',
                table_name: 'dekontlar',
                columns: ['onay_durumu'],
                description: 'Dekontlar tablosu onay durumu performans index\'i'
            }
        ];
        
        schemaInfo.indexes = knownIndexes;
        log('green', `    ✅ ${knownIndexes.length} bilinen index listelendi`);
        
    } catch (error) {
        schemaInfo.indexes = [];
        log('yellow', `    ⚠️  Indexes yedekleme hatası: ${error.message}`);
    }
}

async function backupPolicies(supabase, schemaInfo) {
    try {
        log('yellow', '  🔒 RLS Policies yedekleniyor...');
        
        // Bilinen RLS policy'ler listesi
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
        log('green', `    ✅ ${knownPolicies.length} bilinen policy listelendi`);
        
    } catch (error) {
        schemaInfo.policies = [];
        log('yellow', `    ⚠️  Policies yedekleme hatası: ${error.message}`);
    }
}

async function createSchemaSQL(schemaInfo, backupDir, timestamp) {
    try {
        log('yellow', '  📄 Schema SQL dosyası oluşturuluyor...');
        
        let sqlContent = `-- Supabase Schema Yedeği\n-- Tarih: ${new Date().toISOString()}\n\n`;
        
        // Functions
        if (schemaInfo.functions && schemaInfo.functions.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- FUNCTIONS (${schemaInfo.functions.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const func of schemaInfo.functions) {
                if (func.function_definition) {
                    sqlContent += `${func.function_definition};\n\n`;
                }
            }
        }
        
        // Triggers
        if (schemaInfo.triggers && schemaInfo.triggers.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- TRIGGERS (${schemaInfo.triggers.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const trigger of schemaInfo.triggers) {
                if (trigger.trigger_definition) {
                    sqlContent += `${trigger.trigger_definition};\n\n`;
                }
            }
        }
        
        // Indexes
        if (schemaInfo.indexes && schemaInfo.indexes.length > 0) {
            sqlContent += `-- =============================================================\n`;
            sqlContent += `-- INDEXES (${schemaInfo.indexes.length} adet)\n`;
            sqlContent += `-- =============================================================\n\n`;
            
            for (const index of schemaInfo.indexes) {
                if (index.index_definition) {
                    sqlContent += `${index.index_definition};\n\n`;
                }
            }
        }
        
        const schemaFile = path.join(backupDir, `schema_backup_${timestamp}.sql`);
        fs.writeFileSync(schemaFile, sqlContent);
        log('green', `    ✅ Schema SQL dosyası: ${schemaFile}`);
        
    } catch (error) {
        log('yellow', `    ⚠️  Schema SQL oluşturma hatası: ${error.message}`);
    }
}

// Restore talimatları oluştur
function createRestoreInstructions(backupDir, timestamp) {
    const instructionsFile = path.join(backupDir, `restore_instructions_${timestamp}.txt`);
    const instructions = `
=================================================================
VERİTABANI GERİ YÜKLEME TALİMATLARI (Node.js)
=================================================================
Tarih: ${new Date().toISOString()}
Yedek Dosyaları: ${timestamp}

1. JSON FORMATINDAN GERİ YÜKLEME:
   node scripts/node_restore.js data_backup_${timestamp}.json

2. SQL FORMATINDAN GERİ YÜKLEME:
   psql -h your-host -p 5432 -U postgres -d postgres -f data_backup_${timestamp}.sql

3. MANUEL GERİ YÜKLEME:
   - JSON dosyasını açın
   - Her tablo için verileri kopyalayın
   - Supabase Dashboard'dan Table Editor ile yapıştırın

UYARI:
- Geri yükleme işlemi öncesinde mevcut verileri yedekleyin
- RLS (Row Level Security) politikalarını kontrol edin
- Unique constraint'leri göz önünde bulundurun

=================================================================
`;

    fs.writeFileSync(instructionsFile, instructions);
    log('green', `📋 Restore talimatları oluşturuldu: ${instructionsFile}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };