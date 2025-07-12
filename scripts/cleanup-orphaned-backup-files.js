#!/usr/bin/env node

/**
 * =================================================================
 * ORPHANED BACKUP DOSYALARI TEMİZLEME
 * =================================================================
 * Veritabanında kaydı olmayan backup dosyalarını bulur ve temizler
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
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
    log('blue', '    ORPHANED BACKUP DOSYALARI TEMİZLEME');
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
        // Veritabanından kayıtlı backup'ları al
        log('yellow', '📋 Veritabanından kayıtlı backup\'ları alınıyor...');
        const { data: backups, error } = await supabase
            .from('database_backups')
            .select('backup_name');

        if (error) {
            log('red', `❌ Veritabanından backup listesi alınamadı: ${error.message}`);
            process.exit(1);
        }

        const registeredBackups = backups.map(b => b.backup_name);
        log('green', `✅ Veritabanında ${registeredBackups.length} backup kaydı bulundu`);

        // Dosya sistemindeki dosyaları kontrol et
        const backupDirs = [
            './database_backups',
            './backups',
            './backups/daily',
            './backups/weekly',
            './backups/monthly',
            './backups/emergency'
        ];

        let totalFiles = 0;
        let orphanedFiles = [];

        for (const dir of backupDirs) {
            try {
                const files = await fs.readdir(dir);
                log('cyan', `\n📁 ${dir} klasörü kontrol ediliyor...`);
                
                for (const file of files) {
                    totalFiles++;
                    const filePath = path.join(dir, file);
                    const stat = await fs.stat(filePath);
                    
                    if (stat.isFile()) {
                        // Dosya adından backup adını çıkarmaya çalış
                        let isOrphaned = true;
                        
                        for (const backupName of registeredBackups) {
                            if (file.includes(backupName) || 
                                file.includes(backupName.replace(/[_\s]/g, '-')) ||
                                file.includes(backupName.replace(/[-\s]/g, '_'))) {
                                isOrphaned = false;
                                break;
                            }
                        }
                        
                        if (isOrphaned) {
                            orphanedFiles.push({
                                path: filePath,
                                file: file,
                                size: stat.size,
                                modified: stat.mtime
                            });
                        }
                    }
                }
                
                log('cyan', `  📊 ${files.length} dosya bulundu`);
            } catch (error) {
                // Klasör yoksa pas geç
                log('yellow', `  ⚠️ ${dir} klasörü bulunamadı`);
            }
        }

        log('yellow', `\n📊 ÖZET:`);
        log('cyan', `  📋 Kayıtlı backup: ${registeredBackups.length}`);
        log('cyan', `  📂 Toplam dosya: ${totalFiles}`);
        log('red', `  🗑️ Orphaned dosya: ${orphanedFiles.length}`);

        if (orphanedFiles.length === 0) {
            log('green', '\n🎉 Orphaned dosya bulunamadı! Sistem temiz.');
            return;
        }

        // Orphaned dosyaları listele
        log('red', '\n🗑️ ORPHANED DOSYALAR:');
        let totalSize = 0;
        
        orphanedFiles.forEach((file, index) => {
            const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
            totalSize += file.size;
            log('red', `  ${index + 1}. ${file.file} (${sizeInMB} MB) - ${file.modified.toLocaleDateString()}`);
        });

        const totalSizeInMB = (totalSize / 1024 / 1024).toFixed(2);
        log('yellow', `\n💾 Toplam orphaned dosya boyutu: ${totalSizeInMB} MB`);

        // Kullanıcıdan onay al
        log('yellow', '\n❓ Bu orphaned dosyaları silmek istiyor musunuz? (y/N)');
        
        // Bu script için kullanıcı inputu simüle edelim
        const shouldDelete = process.argv.includes('--delete') || process.argv.includes('-d');
        
        if (shouldDelete) {
            log('yellow', '\n🗑️ Orphaned dosyalar siliniyor...');
            
            let deletedCount = 0;
            let failedCount = 0;
            
            for (const file of orphanedFiles) {
                try {
                    await fs.unlink(file.path);
                    log('green', `  ✅ ${file.file} silindi`);
                    deletedCount++;
                } catch (error) {
                    log('red', `  ❌ ${file.file} silinemedi: ${error.message}`);
                    failedCount++;
                }
            }
            
            log('green', `\n🎉 TEMIZLEME TAMAMLANDI!`);
            log('green', `  ✅ Silinen: ${deletedCount} dosya`);
            if (failedCount > 0) {
                log('red', `  ❌ Başarısız: ${failedCount} dosya`);
            }
            log('green', `  💾 Kurtarılan alan: ${totalSizeInMB} MB`);
        } else {
            log('yellow', '\n📝 Orphaned dosyaları silmek için scripti şu şekilde çalıştırın:');
            log('cyan', '  node scripts/cleanup-orphaned-backup-files.js --delete');
            log('yellow', '\n⚠️ DİKKAT: Bu işlem geri alınamaz!');
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