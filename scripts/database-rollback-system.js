const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local dosyasındaki çevre değişkenlerini yükle
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/"/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      });
    }
  } catch (error) {
    console.error('⚠️ .env.local dosyası okunurken hata oluştu:', error);
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class DatabaseRollbackSystem {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.rollbackDir = path.join(this.backupDir, 'rollback');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.rollbackDir)) {
      fs.mkdirSync(this.rollbackDir, { recursive: true });
    }
  }

  async listAvailableBackups() {
    const backups = [];
    const backupTypes = ['daily', 'weekly', 'monthly', 'emergency'];
    
    for (const type of backupTypes) {
      const typeDir = path.join(this.backupDir, type);
      if (fs.existsSync(typeDir)) {
        const files = fs.readdirSync(typeDir)
          .filter(file => file.startsWith('database-backup-') && file.endsWith('.json'))
          .map(file => {
            const fullPath = path.join(typeDir, file);
            const stats = fs.statSync(fullPath);
            const summaryFile = fullPath.replace('database-backup-', 'backup-summary-');
            
            let summary = null;
            if (fs.existsSync(summaryFile)) {
              try {
                summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
              } catch (error) {
                console.warn(`⚠️ Özet dosyası okunamadı: ${summaryFile}`);
              }
            }
            
            return {
              type,
              filename: file,
              path: fullPath,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
              summary
            };
          })
          .sort((a, b) => b.created - a.created);
        
        backups.push(...files);
      }
    }
    
    return backups.sort((a, b) => b.created - a.created);
  }

  async createPreRollbackBackup(reason = 'Pre-rollback backup') {
    console.log('🔄 Rollback öncesi güvenlik yedeği oluşturuluyor...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = await this.createCurrentStateBackup(timestamp);
    
    const backupFile = path.join(this.rollbackDir, `pre-rollback-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    const summary = this.createBackupSummary(backupData, timestamp, 'pre-rollback');
    const summaryFile = path.join(this.rollbackDir, `pre-rollback-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('✅ Rollback öncesi yedek oluşturuldu!');
    return backupFile;
  }

  async createCurrentStateBackup(timestamp) {
    const backupData = {
      timestamp,
      type: 'pre-rollback',
      version: '1.0.0',
      tables: {},
      metadata: {
        supabaseUrl: supabaseUrl,
        backupDate: new Date().toISOString(),
        nodeVersion: process.version,
        purpose: 'pre-rollback-safety-backup'
      }
    };

    const tables = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar', 
      'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar', 
      'isletme_alanlar', 'system_settings', 'isletme_koordinatorler',
      'isletme_giris_denemeleri', 'ogretmen_giris_denemeleri'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.warn(`⚠️ ${table} yedeklenirken hata: ${error.message}`);
          continue;
        }
        
        backupData.tables[table] = {
          data: data || [],
          count: data?.length || 0,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.warn(`⚠️ ${table} yedeklenirken hata: ${error.message}`);
        backupData.tables[table] = {
          data: [],
          count: 0,
          error: error.message
        };
      }
    }

    return backupData;
  }

  createBackupSummary(backupData, timestamp, type) {
    const totalRecords = Object.values(backupData.tables)
      .reduce((sum, table) => sum + (table.count || 0), 0);

    return {
      timestamp,
      type,
      totalTables: Object.keys(backupData.tables).length,
      totalRecords,
      tables: Object.fromEntries(
        Object.entries(backupData.tables).map(([name, table]) => [name, table.count || 0])
      ),
      metadata: backupData.metadata
    };
  }

  async validateBackupFile(backupFilePath) {
    try {
      console.log(`🔍 Yedek dosyası doğrulanıyor: ${backupFilePath}`);
      
      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Yedek dosyası bulunamadı!');
      }

      const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
      
      // Temel yapı kontrolü
      if (!backupData.tables || typeof backupData.tables !== 'object') {
        throw new Error('Yedek dosyası format hatası: tables alanı eksik veya hatalı');
      }

      // Kritik tablolar kontrolü
      const criticalTables = ['alanlar', 'ogretmenler', 'isletmeler', 'ogrenciler'];
      const missingTables = criticalTables.filter(table => !backupData.tables[table]);
      
      if (missingTables.length > 0) {
        throw new Error(`Kritik tablolar eksik: ${missingTables.join(', ')}`);
      }

      // Veri formatı kontrolü
      for (const [tableName, tableData] of Object.entries(backupData.tables)) {
        if (tableData.data && !Array.isArray(tableData.data)) {
          throw new Error(`${tableName} tablosu veri formatı hatalı`);
        }
      }

      console.log('✅ Yedek dosyası doğrulandı!');
      return true;
    } catch (error) {
      console.error(`❌ Yedek dosyası doğrulama hatası: ${error.message}`);
      return false;
    }
  }

  async rollbackToBackup(backupFilePath, options = {}) {
    const {
      dryRun = false,
      skipTables = [],
      onlyTables = [],
      createBackup = true,
      confirmCallback = null
    } = options;

    try {
      console.log('🔄 ROLLBACK İŞLEMİ BAŞLATIYOR...');
      console.log(`📁 Hedef yedek: ${backupFilePath}`);
      
      // Yedek dosyasını doğrula
      const isValid = await this.validateBackupFile(backupFilePath);
      if (!isValid) {
        throw new Error('Yedek dosyası doğrulanamadı!');
      }

      // Yedek dosyasını yükle
      const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
      
      // Rollback öncesi güvenlik yedeği oluştur
      let preRollbackBackup = null;
      if (createBackup) {
        preRollbackBackup = await this.createPreRollbackBackup('Rollback öncesi otomatik yedek');
      }

      // Hangi tablolar işlenecek
      let tablesToProcess = Object.keys(backupData.tables);
      
      if (onlyTables.length > 0) {
        tablesToProcess = tablesToProcess.filter(table => onlyTables.includes(table));
      }
      
      if (skipTables.length > 0) {
        tablesToProcess = tablesToProcess.filter(table => !skipTables.includes(table));
      }

      console.log(`📋 İşlenecek tablolar: ${tablesToProcess.join(', ')}`);

      // Kullanıcı onayı
      if (confirmCallback) {
        const confirmed = await confirmCallback({
          backupFile: backupFilePath,
          tables: tablesToProcess,
          totalRecords: tablesToProcess.reduce((sum, table) => 
            sum + (backupData.tables[table]?.count || 0), 0),
          dryRun,
          preRollbackBackup
        });
        
        if (!confirmed) {
          console.log('❌ Rollback işlemi kullanıcı tarafından iptal edildi');
          return { success: false, reason: 'User cancelled' };
        }
      }

      if (dryRun) {
        console.log('🔍 DRY RUN MODU - Gerçek değişiklik yapılmayacak');
        return this.simulateRollback(backupData, tablesToProcess);
      }

      // Gerçek rollback işlemi
      const result = await this.executeRollback(backupData, tablesToProcess);
      
      // Rollback log'u oluştur
      const rollbackLog = {
        timestamp: new Date().toISOString(),
        sourceBackup: backupFilePath,
        preRollbackBackup,
        processedTables: tablesToProcess,
        result,
        success: result.success
      };
      
      const logFile = path.join(this.rollbackDir, `rollback-log-${Date.now()}.json`);
      fs.writeFileSync(logFile, JSON.stringify(rollbackLog, null, 2));

      console.log('✅ ROLLBACK İŞLEMİ TAMAMLANDI!');
      console.log(`📄 Log dosyası: ${logFile}`);
      
      return rollbackLog;
      
    } catch (error) {
      console.error(`❌ Rollback hatası: ${error.message}`);
      throw error;
    }
  }

  async simulateRollback(backupData, tablesToProcess) {
    console.log('🔍 Rollback simülasyonu başlatılıyor...');
    
    const simulation = {
      success: true,
      operations: [],
      warnings: [],
      errors: []
    };

    for (const tableName of tablesToProcess) {
      const tableData = backupData.tables[tableName];
      
      if (!tableData) {
        simulation.warnings.push(`${tableName} tablosu yedekte bulunamadı`);
        continue;
      }

      try {
        // Mevcut kayıt sayısını kontrol et
        const { count: currentCount, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          simulation.errors.push(`${tableName}: ${error.message}`);
          continue;
        }

        const backupCount = tableData.count || 0;
        const operation = {
          table: tableName,
          currentRecords: currentCount,
          backupRecords: backupCount,
          operation: 'REPLACE_ALL',
          impact: currentCount > backupCount ? 
            `${currentCount - backupCount} kayıt silinecek` :
            backupCount > currentCount ?
            `${backupCount - currentCount} kayıt eklenecek` :
            'Kayıt sayısı aynı'
        };

        simulation.operations.push(operation);
        
      } catch (error) {
        simulation.errors.push(`${tableName}: ${error.message}`);
      }
    }

    console.log('🔍 Simülasyon tamamlandı!');
    return simulation;
  }

  async executeRollback(backupData, tablesToProcess) {
    console.log('⚡ Rollback işlemi başlatılıyor...');
    
    const result = {
      success: true,
      processedTables: [],
      errors: [],
      warnings: []
    };

    for (const tableName of tablesToProcess) {
      const tableData = backupData.tables[tableName];
      
      if (!tableData || !tableData.data) {
        result.warnings.push(`${tableName} tablosu atlanıyor (veri yok)`);
        continue;
      }

      try {
        console.log(`🔄 ${tableName} tablosu geri yükleniyor...`);
        
        // Mevcut verileri sil
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil

        if (deleteError) {
          result.errors.push(`${tableName} silme hatası: ${deleteError.message}`);
          continue;
        }

        // Yedek verileri ekle
        if (tableData.data.length > 0) {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert(tableData.data);

          if (insertError) {
            result.errors.push(`${tableName} ekleme hatası: ${insertError.message}`);
            continue;
          }
        }

        result.processedTables.push({
          table: tableName,
          recordsRestored: tableData.data.length,
          success: true
        });

        console.log(`✅ ${tableName} geri yüklendi (${tableData.data.length} kayıt)`);
        
      } catch (error) {
        result.errors.push(`${tableName}: ${error.message}`);
        console.error(`❌ ${tableName} geri yükleme hatası: ${error.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async listRollbackHistory() {
    const rollbackLogs = [];
    
    if (fs.existsSync(this.rollbackDir)) {
      const files = fs.readdirSync(this.rollbackDir)
        .filter(file => file.startsWith('rollback-log-') && file.endsWith('.json'))
        .map(file => {
          const fullPath = path.join(this.rollbackDir, file);
          const stats = fs.statSync(fullPath);
          
          try {
            const log = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return {
              filename: file,
              path: fullPath,
              timestamp: log.timestamp,
              success: log.success,
              sourceBackup: log.sourceBackup,
              processedTables: log.processedTables?.length || 0,
              fileSize: stats.size,
              created: stats.birthtime
            };
          } catch (error) {
            console.warn(`⚠️ Rollback log okunamadı: ${file}`);
            return null;
          }
        })
        .filter(log => log !== null)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      rollbackLogs.push(...files);
    }
    
    return rollbackLogs;
  }

  async cleanupRollbackFiles(keepCount = 10) {
    const logs = await this.listRollbackHistory();
    
    if (logs.length > keepCount) {
      const filesToDelete = logs.slice(keepCount);
      
      for (const log of filesToDelete) {
        try {
          fs.unlinkSync(log.path);
          console.log(`🗑️ Eski rollback log silindi: ${log.filename}`);
        } catch (error) {
          console.warn(`⚠️ Log silinirken hata: ${log.filename}`);
        }
      }
    }
    
    // Pre-rollback yedeklerini de temizle
    const preRollbackFiles = fs.readdirSync(this.rollbackDir)
      .filter(file => file.startsWith('pre-rollback-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.rollbackDir, file),
        stats: fs.statSync(path.join(this.rollbackDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    if (preRollbackFiles.length > keepCount) {
      const filesToDelete = preRollbackFiles.slice(keepCount);
      
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          
          // Özet dosyasını da sil
          const summaryFile = file.path.replace('pre-rollback-', 'pre-rollback-summary-');
          if (fs.existsSync(summaryFile)) {
            fs.unlinkSync(summaryFile);
          }
          
          console.log(`🗑️ Eski pre-rollback yedeği silindi: ${file.name}`);
        } catch (error) {
          console.warn(`⚠️ Pre-rollback yedeği silinirken hata: ${file.name}`);
        }
      }
    }
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const rollbackSystem = new DatabaseRollbackSystem();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      rollbackSystem.listAvailableBackups()
        .then(backups => {
          console.log('📋 Mevcut yedekler:');
          backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.filename}`);
            console.log(`   Tür: ${backup.type}`);
            console.log(`   Tarih: ${backup.created.toLocaleString('tr-TR')}`);
            console.log(`   Boyut: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
            if (backup.summary) {
              console.log(`   Kayıt sayısı: ${backup.summary.totalRecords}`);
            }
            console.log('');
          });
        })
        .catch(error => {
          console.error('❌ Yedek listesi alınırken hata:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('❌ Yedek dosyası belirtilmedi!');
        console.log('Kullanım: node database-rollback-system.js rollback <yedek-dosya-yolu>');
        process.exit(1);
      }
      
      // Basit onay sistemi
      const confirmCallback = (info) => {
        console.log('⚠️ ROLLBACK ONAY BİLGİLERİ:');
        console.log(`📁 Yedek: ${info.backupFile}`);
        console.log(`📋 Tablolar: ${info.tables.join(', ')}`);
        console.log(`📊 Toplam kayıt: ${info.totalRecords}`);
        console.log(`🔄 Dry run: ${info.dryRun ? 'EVET' : 'HAYIR'}`);
        
        // Gerçek uygulamada readline kullanılabilir
        return Promise.resolve(true);
      };
      
      const dryRun = args.includes('--dry-run');
      
      rollbackSystem.rollbackToBackup(backupFile, {
        dryRun,
        confirmCallback
      })
        .then(result => {
          console.log('🎉 Rollback işlemi tamamlandı!');
          console.log(`📊 Sonuç: ${result.success ? 'BAŞARILI' : 'BAŞARISIZ'}`);
        })
        .catch(error => {
          console.error('❌ Rollback hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'history':
      rollbackSystem.listRollbackHistory()
        .then(logs => {
          console.log('📋 Rollback geçmişi:');
          logs.forEach((log, index) => {
            console.log(`${index + 1}. ${log.filename}`);
            console.log(`   Tarih: ${new Date(log.timestamp).toLocaleString('tr-TR')}`);
            console.log(`   Başarı: ${log.success ? 'EVET' : 'HAYIR'}`);
            console.log(`   Tablo sayısı: ${log.processedTables}`);
            console.log('');
          });
        })
        .catch(error => {
          console.error('❌ Rollback geçmişi alınırken hata:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      rollbackSystem.cleanupRollbackFiles()
        .then(() => {
          console.log('🧹 Rollback dosyaları temizlendi!');
        })
        .catch(error => {
          console.error('❌ Temizleme hatası:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Kullanım: node database-rollback-system.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  list           - Mevcut yedekleri listele');
      console.log('  rollback <file> - Belirtilen yedekten geri yükle');
      console.log('  rollback <file> --dry-run - Sadece simülasyon yap');
      console.log('  history        - Rollback geçmişini göster');
      console.log('  cleanup        - Eski rollback dosyalarını temizle');
      process.exit(1);
  }
}

module.exports = { DatabaseRollbackSystem };