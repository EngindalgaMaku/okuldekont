#!/usr/bin/env node

/**
 * =================================================================
 * RPC FONKSİYONLARI RESTORE SCRİPTİ
 * =================================================================
 * Backup'tan RPC fonksiyonlarını geri yükler ve test eder
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
    log('blue', '='.repeat(80));
    log('blue', '    RPC FONKSİYONLARI RESTORE SCRİPTİ');
    log('blue', '='.repeat(80));

    // Command line argument kontrolü
    const backupFile = process.argv[2];
    if (!backupFile) {
        log('red', '❌ Kullanım: node scripts/restore-rpc-functions.js <backup-dosyasi.json>');
        log('yellow', 'Örnek: node scripts/restore-rpc-functions.js database_backups/enhanced_rpc_backup_2025-07-12_07.json');
        process.exit(1);
    }

    // Backup dosyası kontrolü
    if (!fs.existsSync(backupFile)) {
        log('red', `❌ Backup dosyası bulunamadı: ${backupFile}`);
        process.exit(1);
    }

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
        // Backup verisini oku
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        log('green', `✅ Backup dosyası okundu: ${backupFile}`);
        log('yellow', `📅 Backup tarihi: ${backupData.timestamp}`);
        log('cyan', `📊 Toplam fonksiyon: ${backupData.total_functions}`);

        // Mevcut durumu analiz et
        await analyzeCurrentState(supabase, backupData);

        // Restore işlemi
        await restoreRpcFunctions(supabase, backupData);

        // Final test
        await finalTest(supabase, backupData);

        // Restore raporu oluştur
        await createRestoreReport(backupData, backupFile);

        log('green', '='.repeat(80));
        log('green', '🎉 RPC RESTORE İŞLEMİ TAMAMLANDI!');
        log('green', '='.repeat(80));

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

async function analyzeCurrentState(supabase, backupData) {
    log('blue', '🔍 Mevcut RPC fonksiyon durumu analiz ediliyor...');
    
    const currentState = {
        working: [],
        available: [],
        missing: [],
        total_tested: 0
    };

    for (const [funcName, funcDetails] of Object.entries(backupData.function_details)) {
        try {
            // Test parametrelerini hazırla
            const testParams = funcDetails.test_parameters || {};
            
            // Fonksiyonu test et
            const result = await supabase.rpc(funcName, testParams);
            
            if (result.error) {
                if (result.error.message.includes('function') && result.error.message.includes('does not exist')) {
                    log('red', `  ❌ ${funcName} - EKSİK`);
                    currentState.missing.push(funcName);
                } else {
                    log('yellow', `  🔧 ${funcName} - MEVCUT (Parametre sorunu)`);
                    currentState.available.push(funcName);
                }
            } else {
                log('green', `  ✅ ${funcName} - ÇALIŞIYOR`);
                currentState.working.push(funcName);
            }
            
            currentState.total_tested++;
            
        } catch (error) {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                log('red', `  ❌ ${funcName} - EKSİK`);
                currentState.missing.push(funcName);
            } else {
                log('yellow', `  🔧 ${funcName} - MEVCUT (Exception)`);
                currentState.available.push(funcName);
            }
            currentState.total_tested++;
        }
    }

    log('cyan', '\n📊 MEVCUT DURUM ÖZETİ:');
    log('green', `  ✅ Çalışır: ${currentState.working.length}`);
    log('yellow', `  🔧 Mevcut (sorunlu): ${currentState.available.length}`);
    log('red', `  ❌ Eksik: ${currentState.missing.length}`);

    return currentState;
}

async function restoreRpcFunctions(supabase, backupData) {
    log('blue', '\n🔧 RPC fonksiyonları restore ediliyor...');

    // Admin fonksiyonları için SQL scriptlerini listele
    const adminSqlScripts = [
        'scripts/create-admin-functions.sql',
        'scripts/setup-admin-functions.js',
        'scripts/fix-admin-functions.sql'
    ];

    // Sistem ayarları fonksiyonları
    const systemSqlScripts = [
        'scripts/create-system-settings.sql',
        'scripts/setup-system-settings.js'
    ];

    // Pin fonksiyonları
    const pinSqlScripts = [
        'scripts/create-pin-functions.js'
    ];

    log('yellow', '  📋 Mevcut SQL script dosyaları kontrol ediliyor...');

    const availableScripts = [];
    const allScripts = [...adminSqlScripts, ...systemSqlScripts, ...pinSqlScripts];

    for (const scriptPath of allScripts) {
        if (fs.existsSync(scriptPath)) {
            availableScripts.push(scriptPath);
            log('green', `    ✅ ${scriptPath} - Mevcut`);
        } else {
            log('yellow', `    ⚠️ ${scriptPath} - Bulunamadı`);
        }
    }

    if (availableScripts.length === 0) {
        log('yellow', '  ⚠️ SQL script dosyası bulunamadı. Manuel restore gerekebilir.');
        return;
    }

    log('cyan', `\n  📝 ${availableScripts.length} SQL script bulundu.`);
    log('yellow', '  ℹ️ Bu scriptleri çalıştırmak için ayrı terminalde manuel olarak çalıştırın:');
    
    availableScripts.forEach(script => {
        if (script.endsWith('.js')) {
            log('cyan', `    node ${script}`);
        } else {
            log('cyan', `    psql -f ${script} (veya Supabase SQL Editor'da çalıştırın)`);
        }
    });
}

async function finalTest(supabase, backupData) {
    log('blue', '\n🧪 Final test yapılıyor...');
    
    const finalResults = {
        working: [],
        available: [],
        missing: [],
        improved: []
    };

    // Backup'taki çalışmayan fonksiyonları test et
    const problematicFunctions = [
        ...backupData.available_functions,
        ...backupData.unavailable_functions
    ];

    for (const funcName of problematicFunctions) {
        try {
            const funcDetails = backupData.function_details[funcName];
            const testParams = funcDetails.test_parameters || {};
            
            const result = await supabase.rpc(funcName, testParams);
            
            if (result.error) {
                if (result.error.message.includes('function') && result.error.message.includes('does not exist')) {
                    log('red', `  ❌ ${funcName} - Hala eksik`);
                    finalResults.missing.push(funcName);
                } else {
                    log('yellow', `  🔧 ${funcName} - Hala sorunlu`);
                    finalResults.available.push(funcName);
                }
            } else {
                log('green', `  🎉 ${funcName} - DÜZELDİ!`);
                finalResults.working.push(funcName);
                finalResults.improved.push(funcName);
            }
            
        } catch (error) {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                log('red', `  ❌ ${funcName} - Hala eksik`);
                finalResults.missing.push(funcName);
            } else {
                log('yellow', `  🔧 ${funcName} - Hala sorunlu`);
                finalResults.available.push(funcName);
            }
        }
    }

    if (finalResults.improved.length > 0) {
        log('green', `\n🎉 ${finalResults.improved.length} fonksiyon düzeldi!`);
        finalResults.improved.forEach(func => log('green', `  ✅ ${func}`));
    } else {
        log('yellow', '  ℹ️ Henüz iyileşme yok. SQL scriptleri manuel çalıştırılmalı.');
    }

    return finalResults;
}

async function createRestoreReport(backupData, backupFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];

    const reportContent = `
# RPC FONKSİYON RESTORE RAPORU
**Tarih:** ${new Date().toISOString()}
**Kaynak Backup:** ${backupFile}
**Restore ID:** ${timestamp}

## 📊 RESTORE ÖZETİ
- **Kaynak Backup Tarihi:** ${backupData.timestamp}
- **Toplam Fonksiyon:** ${backupData.total_functions}
- **Restore Öncesi Çalışır:** ${backupData.working_functions.length}
- **Restore Öncesi Sorunlu:** ${backupData.available_functions.length}

## 📝 RESTORE TALİMATLARI

### 1. Manuel SQL Script Çalıştırma
Aşağıdaki scriptleri Supabase SQL Editor'da veya terminal'de çalıştırın:

#### Admin Fonksiyonları
\`\`\`sql
-- scripts/create-admin-functions.sql içeriğini çalıştırın
-- veya
node scripts/setup-admin-functions.js
\`\`\`

#### Sistem Ayarları Fonksiyonları  
\`\`\`sql
-- scripts/create-system-settings.sql içeriğini çalıştırın
-- veya  
node scripts/setup-system-settings.js
\`\`\`

#### PIN Fonksiyonları
\`\`\`sql
node scripts/create-pin-functions.js
\`\`\`

### 2. Test Komutları
Restore işleminden sonra test için:

\`\`\`bash
# Bu script ile tekrar test edin
node scripts/restore-rpc-functions.js ${backupFile}

# veya backup script ile kontrol edin
node scripts/enhanced-backup-with-parameters.js
\`\`\`

## 🔧 FONKSİYON DETAYLARI

${Object.entries(backupData.function_details).map(([name, details]) => `
### ${name}${details.parameter_signature}
- **Durum:** ${details.status}
- **Dönüş:** ${details.return_type}
- **Güvenlik:** ${details.security}
- **Açıklama:** ${details.description}
${details.error ? `- **Hata:** ${details.error}` : ''}

**Kullanım:**
\`\`\`javascript
const { data, error } = await supabase.rpc('${name}', ${JSON.stringify(details.test_parameters || {}, null, 2)});
\`\`\`
`).join('\n')}

## ⚠️ ÖNEMLİ NOTLAR
1. Backup dosyasındaki parametreler doğru şekilde kaydedilmiş
2. SQL scriptleri manuel çalıştırılması gereken durumlar var
3. Restore işleminden sonra mutlaka test edin
4. RLS politikalarını kontrol etmeyi unutmayın

---
**Oluşturulma Tarihi:** ${new Date().toISOString()}
`;

    const reportFile = path.join('./database_backups', `restore_report_${timestamp}.md`);
    fs.writeFileSync(reportFile, reportContent);
    log('green', `📄 Restore raporu oluşturuldu: ${reportFile}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };