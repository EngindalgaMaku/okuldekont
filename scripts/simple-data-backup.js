#!/usr/bin/env node

/**
 * =================================================================
 * BASİT VERİ YEDEKLEME SİSTEMİ
 * =================================================================
 * Sadece tablo verilerini yedekler - SQL yapısı dahil değil
 * =================================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message, prefix = '') {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${prefix}${colors[color]}${message}${colors.reset}`);
}

// Yedeklenecek tablolar listesi
const DATA_TABLES = [
    'admin_kullanicilar',
    'alanlar',
    'belgeler', 
    'dekontlar',
    'egitim_yillari',
    'gorev_belgeleri',
    'isletme_alanlar',
    'isletme_koordinatorler', 
    'isletmeler',
    'koordinatorluk_programi',
    'ogrenciler',
    'ogretmenler',
    'siniflar',
    'stajlar',
    'system_settings'
];

async function main() {
    log('bold', '='.repeat(60));
    log('bold', '🗂️ BASİT VERİ YEDEKLEME SİSTEMİ');
    log('bold', '='.repeat(60));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', 'Environment variables eksik!', '❌ ');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const backupDir = './database_backups';
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];

    try {
        const backupData = {
            metadata: {
                version: '1.0.0',
                created_at: new Date().toISOString(),
                backup_type: 'data_only',
                total_tables: DATA_TABLES.length,
                note: 'Sadece tablo verileri - SQL yapısı dahil değil'
            },
            tables: {},
            statistics: {
                total_tables: 0,
                total_records: 0,
                successful_tables: 0,
                failed_tables: 0
            }
        };

        // Sadece veri yedekleme
        await backupTableData(supabase, backupData);
        
        // Dosyaları kaydet
        const files = await saveBackupFiles(backupData, backupDir, timestamp);
        
        // Rapor yazdır
        printFinalReport(backupData, files);

    } catch (error) {
        log('red', `Veri yedekleme hatası: ${error.message}`, '💥 ');
        process.exit(1);
    }
}

async function backupTableData(supabase, backupData) {
    log('blue', `${DATA_TABLES.length} tablonun verisi yedekleniyor...`, '📊 ');
    
    for (const tableName of DATA_TABLES) {
        try {
            log('yellow', `Yedekleniyor: ${tableName}`, '  📋 ');
            
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' });
            
            if (error) {
                log('red', `Başarısız: ${tableName} - ${error.message}`, '    ❌ ');
                backupData.statistics.failed_tables++;
                continue;
            }
            
            const recordCount = count !== null ? count : (data ? data.length : 0);
            backupData.tables[tableName] = {
                table_name: tableName,
                record_count: recordCount,
                data: data || [],
                backed_up_at: new Date().toISOString()
            };
            
            backupData.statistics.total_records += recordCount;
            backupData.statistics.successful_tables++;
            
            log('green', `✓ ${tableName}: ${recordCount} kayıt`, '    ');
            
        } catch (error) {
            log('red', `Hata: ${tableName} - ${error.message}`, '    ❌ ');
            backupData.statistics.failed_tables++;
        }
    }
    
    backupData.statistics.total_tables = DATA_TABLES.length;
    log('green', `Veri yedekleme tamamlandı: ${backupData.statistics.successful_tables}/${DATA_TABLES.length} tablo`, '✅ ');
}

async function saveBackupFiles(backupData, backupDir, timestamp) {
    log('blue', 'Yedek dosyaları kaydediliyor...', '💾 ');
    
    // JSON backup
    const jsonFile = path.join(backupDir, `data_backup_${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
    
    // Rapor dosyası
    const reportFile = path.join(backupDir, `data_backup_report_${timestamp}.md`);
    const reportContent = generateReport(backupData, timestamp);
    fs.writeFileSync(reportFile, reportContent);
    
    const jsonSize = fs.statSync(jsonFile).size;
    
    log('green', 'Yedek dosyaları kaydedildi', '✅ ');
    
    return { jsonFile, reportFile, size: jsonSize };
}

function generateReport(backupData, timestamp) {
    const successRate = Math.round((backupData.statistics.successful_tables / backupData.statistics.total_tables) * 100);
    
    return `# VERİ YEDEKLEME RAPORU

## Yedek Bilgileri
- **Oluşturulma:** ${backupData.metadata.created_at}
- **Tip:** ${backupData.metadata.backup_type}
- **Versiyon:** ${backupData.metadata.version}
- **Timestamp:** ${timestamp}

## İstatistikler
- **Toplam Tablo:** ${backupData.statistics.total_tables}
- **Başarılı:** ${backupData.statistics.successful_tables}
- **Başarısız:** ${backupData.statistics.failed_tables}
- **Başarı Oranı:** ${successRate}%
- **Toplam Kayıt:** ${backupData.statistics.total_records}

## Tablo Detayları
${Object.entries(backupData.tables).map(([table, info]) => 
    `- **${table}:** ${info.record_count} kayıt`
).join('\n')}

## Oluşturulan Dosyalar
- \`data_backup_${timestamp}.json\` - Veri yedek dosyası
- \`data_backup_report_${timestamp}.md\` - Bu rapor

## Not
Bu yedek sadece tablo verilerini içerir. SQL yapısı, fonksiyonlar, triggerlar dahil değildir.

---
*Basit Veri Yedekleme Sistemi v${backupData.metadata.version} tarafından oluşturuldu*
`;
}

function printFinalReport(backupData, files) {
    log('bold', '='.repeat(60));
    log('green', '🎉 VERİ YEDEKLEME TAMAMLANDI!', '');
    log('bold', '='.repeat(60));
    
    log('cyan', 'OLUŞTURULAN DOSYALAR:', '📁 ');
    log('white', `  JSON: ${path.basename(files.jsonFile)}`, '');
    log('white', `  Rapor: ${path.basename(files.reportFile)}`, '');
    
    log('cyan', 'İSTATİSTİKLER:', '📊 ');
    log('white', `  Tablolar: ${backupData.statistics.successful_tables}/${backupData.statistics.total_tables}`, '');
    log('white', `  Kayıtlar: ${backupData.statistics.total_records}`, '');
    log('white', `  Boyut: ${(files.size / 1024 / 1024).toFixed(2)} MB`, '');
    
    if (backupData.statistics.failed_tables > 0) {
        log('yellow', `⚠️ ${backupData.statistics.failed_tables} tablo başarısız`, '');
    } else {
        log('green', '✅ TÜM TABLOLAR BAŞARIYLA YEDEKLENDİ!', '');
    }
    
    // Console output for API
    console.log(`JSON: ${files.jsonFile}`);
    console.log(`Report: ${files.reportFile}`);
    console.log(`Records: ${backupData.statistics.total_records}`);
    console.log(`Size: ${(files.size / 1024 / 1024).toFixed(2)} MB`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };