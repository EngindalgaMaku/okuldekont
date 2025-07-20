#!/usr/bin/env node

/**
 * =================================================================
 * MariaDB VERİ YEDEKLEME SİSTEMİ
 * =================================================================
 * Prisma kullanarak MariaDB verilerini SQL formatında yedekler
 * =================================================================
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PrismaClient } = require('@prisma/client');

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

// MariaDB Tablolar
const MARIADB_TABLES = [
    'users',
    'admin_profiles', 
    'teachers',
    'companies',
    'education_years',
    'fields',
    'classes',
    'students',
    'internships',
    'dekonts',
    'gorev_belgeleri',
    'belgeler',
    'notifications',
    'system_settings'
];

const prisma = new PrismaClient();

async function main() {
    const backupType = process.argv[2] || 'full'; // 'full' or comma-separated table names
    const selectedTables = backupType === 'full' ? MARIADB_TABLES : backupType.split(',');
    
    log('bold', '='.repeat(60));
    log('bold', '🗄️ MariaDB VERİ YEDEKLEME SİSTEMİ');
    log('bold', `📋 Yedek Türü: ${backupType === 'full' ? 'Tam Yedek' : 'Seçili Tablolar'}`);
    log('bold', '='.repeat(60));

    const backupDir = './database_backups';
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
        const backupData = {
            metadata: {
                version: '2.0.0',
                created_at: new Date().toISOString(),
                backup_type: backupType === 'full' ? 'full_backup' : 'selective_backup',
                database_type: 'MariaDB',
                selected_tables: selectedTables,
                total_tables: selectedTables.length
            },
            tables: {},
            statistics: {
                total_tables: 0,
                total_records: 0,
                successful_tables: 0,
                failed_tables: 0
            }
        };

        // Veri yedekleme
        await backupSelectedTables(selectedTables, backupData);
        
        // SQL ve JSON dosyalarını kaydet
        const files = await saveBackupFiles(backupData, backupDir, timestamp);
        
        // Rapor yazdır
        printFinalReport(backupData, files);

    } catch (error) {
        log('red', `Yedekleme hatası: ${error.message}`, '💥 ');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function backupSelectedTables(selectedTables, backupData) {
    log('blue', `${selectedTables.length} tablonun verisi yedekleniyor...`, '📊 ');
    
    for (const tableName of selectedTables) {
        try {
            log('yellow', `Yedekleniyor: ${tableName}`, '  📋 ');
            
            const data = await getTableData(tableName);
            const recordCount = data ? data.length : 0;
            
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
    
    backupData.statistics.total_tables = selectedTables.length;
    log('green', `Veri yedekleme tamamlandı: ${backupData.statistics.successful_tables}/${selectedTables.length} tablo`, '✅ ');
}

async function getTableData(tableName) {
    switch (tableName) {
        case 'users':
            return await prisma.user.findMany();
        case 'admin_profiles':
            return await prisma.adminProfile.findMany();
        case 'teachers':
            return await prisma.teacherProfile.findMany();
        case 'companies':
            return await prisma.companyProfile.findMany();
        case 'education_years':
            return await prisma.egitimYili.findMany();
        case 'fields':
            return await prisma.alan.findMany();
        case 'classes':
            return await prisma.class.findMany();
        case 'students':
            return await prisma.student.findMany();
        case 'internships':
            return await prisma.staj.findMany();
        case 'dekonts':
            return await prisma.dekont.findMany();
        case 'gorev_belgeleri':
            return await prisma.gorevBelgesi.findMany();
        case 'belgeler':
            return await prisma.belge.findMany();
        case 'notifications':
            return await prisma.notification.findMany();
        case 'system_settings':
            return await prisma.systemSetting.findMany();
        default:
            throw new Error(`Bilinmeyen tablo: ${tableName}`);
    }
}

function generateSQLInserts(backupData) {
    let sql = `-- MariaDB Veri Yedeği\n`;
    sql += `-- Oluşturulma: ${backupData.metadata.created_at}\n`;
    sql += `-- Yedek Türü: ${backupData.metadata.backup_type}\n`;
    sql += `-- Toplam Tablo: ${backupData.metadata.total_tables}\n\n`;
    
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
    
    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
        if (tableData.data && tableData.data.length > 0) {
            sql += `-- Tablo: ${tableName} (${tableData.record_count} kayıt)\n`;
            sql += `DELETE FROM \`${tableName}\`;\n`;
            
            const firstRecord = tableData.data[0];
            const columns = Object.keys(firstRecord);
            
            sql += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n`;
            
            const values = tableData.data.map(record => {
                const recordValues = columns.map(col => {
                    const value = record[col];
                    if (value === null || value === undefined) {
                        return 'NULL';
                    } else if (typeof value === 'string') {
                        return `'${value.replace(/'/g, "''")}'`;
                    } else if (value instanceof Date) {
                        return `'${value.toISOString()}'`;
                    } else if (typeof value === 'boolean') {
                        return value ? '1' : '0';
                    } else {
                        return `'${value}'`;
                    }
                });
                return `(${recordValues.join(', ')})`;
            });
            
            sql += values.join(',\n') + ';\n\n';
        }
    }
    
    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sql;
}

async function saveBackupFiles(backupData, backupDir, timestamp) {
    log('blue', 'Yedek dosyaları kaydediliyor...', '💾 ');
    
    // JSON backup
    const jsonFile = path.join(backupDir, `mariadb_backup_${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
    
    // SQL backup
    const sqlFile = path.join(backupDir, `mariadb_backup_${timestamp}.sql`);
    const sqlContent = generateSQLInserts(backupData);
    fs.writeFileSync(sqlFile, sqlContent);
    
    // Fiziksel dosyalar yedekleme (ZIP)
    const filesZipFile = await createFilesBackup(backupDir, timestamp);
    
    // Rapor dosyası
    const reportFile = path.join(backupDir, `mariadb_backup_report_${timestamp}.md`);
    const reportContent = generateReport(backupData, timestamp, filesZipFile !== null);
    fs.writeFileSync(reportFile, reportContent);
    
    const jsonSize = fs.statSync(jsonFile).size;
    const sqlSize = fs.statSync(sqlFile).size;
    const filesSize = filesZipFile ? fs.statSync(filesZipFile).size : 0;
    
    log('green', 'Yedek dosyaları kaydedildi', '✅ ');
    
    return { jsonFile, sqlFile, reportFile, filesZipFile, jsonSize, sqlSize, filesSize };
}

async function createFilesBackup(backupDir, timestamp) {
    return new Promise((resolve, reject) => {
        log('blue', 'Fiziksel dosyalar yedekleniyor...', '📁 ');
        
        const filesZipPath = path.join(backupDir, `mariadb_files_backup_${timestamp}.zip`);
        const output = fs.createWriteStream(filesZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        let hasFiles = false;
        
        output.on('close', () => {
            if (hasFiles) {
                const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
                log('green', `✅ Fiziksel dosyalar yedeklendi: ${sizeInMB} MB`, '');
                resolve(filesZipPath);
            } else {
                // Boş ZIP dosyasını sil
                fs.unlinkSync(filesZipPath);
                log('yellow', 'ℹ️ Fiziksel dosya bulunmadı', '');
                resolve(null);
            }
        });
        
        output.on('error', reject);
        archive.on('error', reject);
        
        archive.pipe(output);
        
        // Dekont dosyalarını yedekle
        const dekontlarPath = path.join('./public/uploads/dekontlar');
        if (fs.existsSync(dekontlarPath)) {
            const dekontFiles = fs.readdirSync(dekontlarPath);
            if (dekontFiles.length > 0) {
                log('yellow', `${dekontFiles.length} dekont dosyası yedekleniyor...`, '  📄 ');
                archive.directory(dekontlarPath, 'dekontlar');
                hasFiles = true;
            }
        }
        
        // Belge dosyalarını yedekle
        const belgelerPath = path.join('./public/uploads/belgeler');
        if (fs.existsSync(belgelerPath)) {
            const belgeFiles = fs.readdirSync(belgelerPath);
            if (belgeFiles.length > 0) {
                log('yellow', `${belgeFiles.length} belge dosyası yedekleniyor...`, '  📋 ');
                archive.directory(belgelerPath, 'belgeler');
                hasFiles = true;
            }
        }
        
        archive.finalize();
    });
}

function generateReport(backupData, timestamp, filesZipExists = false) {
    const successRate = Math.round((backupData.statistics.successful_tables / backupData.statistics.total_tables) * 100);
    
    let filesSection = '';
    if (filesZipExists) {
        filesSection = `- \`mariadb_files_backup_${timestamp}.zip\` - Fiziksel dosyalar (dekontlar + belgeler)
`;
    }
    
    return `# MariaDB KAPSAMLI VERİ YEDEKLEME RAPORU

## Yedek Bilgileri
- **Oluşturulma:** ${backupData.metadata.created_at}
- **Tip:** ${backupData.metadata.backup_type}
- **Veritabanı:** ${backupData.metadata.database_type}
- **Versiyon:** ${backupData.metadata.version}
- **Timestamp:** ${timestamp}

## İstatistikler
- **Toplam Tablo:** ${backupData.statistics.total_tables}
- **Başarılı:** ${backupData.statistics.successful_tables}
- **Başarısız:** ${backupData.statistics.failed_tables}
- **Başarı Oranı:** ${successRate}%
- **Toplam Kayıt:** ${backupData.statistics.total_records}

## Yedeklenen Tablolar
${backupData.metadata.selected_tables.map(table =>
    `- **${table}:** ${backupData.tables[table] ? backupData.tables[table].record_count : 0} kayıt`
).join('\n')}

## Oluşturulan Dosyalar
- \`mariadb_backup_${timestamp}.json\` - JSON formatında veri yedek dosyası
- \`mariadb_backup_${timestamp}.sql\` - SQL formatında veri yedek dosyası
- \`mariadb_backup_report_${timestamp}.md\` - Bu rapor
${filesSection}
## Kullanım

### Veritabanı Geri Yükleme
SQL dosyasını MariaDB'ye geri yüklemek için:
\`\`\`bash
mysql -u kullanici -p veritabani_adi < mariadb_backup_${timestamp}.sql
\`\`\`

### Fiziksel Dosya Geri Yükleme
${filesZipExists ? `ZIP dosyasını \`public/uploads/\` klasörüne çıkartın:
\`\`\`bash
unzip mariadb_files_backup_${timestamp}.zip -d public/uploads/
\`\`\`` : 'Fiziksel dosya yedeklenmedi (dosya bulunamadı)'}

---
*MariaDB Kapsamlı Yedekleme Sistemi v${backupData.metadata.version} tarafından oluşturuldu*
`;
}

function printFinalReport(backupData, files) {
    log('bold', '='.repeat(60));
    log('green', '🎉 MariaDB KAPSAMLI YEDEKLEME TAMAMLANDI!', '');
    log('bold', '='.repeat(60));
    
    log('cyan', 'OLUŞTURULAN DOSYALAR:', '📁 ');
    log('white', `  JSON: ${path.basename(files.jsonFile)}`, '');
    log('white', `  SQL: ${path.basename(files.sqlFile)}`, '');
    log('white', `  Rapor: ${path.basename(files.reportFile)}`, '');
    if (files.filesZipFile) {
        log('white', `  Dosyalar: ${path.basename(files.filesZipFile)}`, '');
    }
    
    log('cyan', 'İSTATİSTİKLER:', '📊 ');
    log('white', `  Tablolar: ${backupData.statistics.successful_tables}/${backupData.statistics.total_tables}`, '');
    log('white', `  Kayıtlar: ${backupData.statistics.total_records}`, '');
    log('white', `  JSON Boyut: ${(files.jsonSize / 1024 / 1024).toFixed(2)} MB`, '');
    log('white', `  SQL Boyut: ${(files.sqlSize / 1024 / 1024).toFixed(2)} MB`, '');
    if (files.filesSize > 0) {
        log('white', `  Dosyalar Boyut: ${(files.filesSize / 1024 / 1024).toFixed(2)} MB`, '');
    }
    
    if (backupData.statistics.failed_tables > 0) {
        log('yellow', `⚠️ ${backupData.statistics.failed_tables} tablo başarısız`, '');
    } else {
        log('green', '✅ TÜM TABLOLAR BAŞARIYLA YEDEKLENDİ!', '');
    }
    
    if (files.filesZipFile) {
        log('green', '✅ FİZİKSEL DOSYALAR BAŞARIYLA YEDEKLENDİ!', '');
    } else {
        log('yellow', 'ℹ️ Fiziksel dosya bulunamadı', '');
    }
    
    // Console output for API
    console.log(`JSON: ${files.jsonFile}`);
    console.log(`SQL: ${files.sqlFile}`);
    console.log(`Report: ${files.reportFile}`);
    if (files.filesZipFile) {
        console.log(`Files: ${files.filesZipFile}`);
    }
    console.log(`Records: ${backupData.statistics.total_records}`);
    console.log(`JSONSize: ${(files.jsonSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`SQLSize: ${(files.sqlSize / 1024 / 1024).toFixed(2)} MB`);
    if (files.filesSize > 0) {
        console.log(`FilesSize: ${(files.filesSize / 1024 / 1024).toFixed(2)} MB`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };