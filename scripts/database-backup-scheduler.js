const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { createDatabaseBackup } = require('./create-database-backup');

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

class DatabaseBackupScheduler {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.maxBackups = {
      daily: 7,    // 7 günlük yedek
      weekly: 4,   // 4 haftalık yedek  
      monthly: 12  // 12 aylık yedek
    };
    
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Alt klasörler oluştur
    ['daily', 'weekly', 'monthly', 'emergency'].forEach(type => {
      const dir = path.join(this.backupDir, type);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async createScheduledBackup(type = 'daily') {
    try {
      console.log(`🔄 ${type.toUpperCase()} yedekleme başlatılıyor...`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = await this.createFullBackup(timestamp);
      
      // Yedek dosyasını doğru klasöre kaydet
      const backupFile = path.join(this.backupDir, type, `database-backup-${type}-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      // Özet dosyası
      const summary = this.createBackupSummary(backupData, timestamp, type);
      const summaryFile = path.join(this.backupDir, type, `backup-summary-${type}-${timestamp}.json`);
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      
      // Eski yedekleri temizle
      await this.cleanupOldBackups(type);
      
      // Yedek doğrulama
      const validationResult = await this.validateBackup(backupFile);
      
      console.log(`✅ ${type.toUpperCase()} yedekleme tamamlandı!`);
      console.log(`📁 Dosya: ${backupFile}`);
      console.log(`📊 Toplam kayıt: ${summary.totalRecords}`);
      console.log(`✔️ Doğrulama: ${validationResult.isValid ? 'BAŞARILI' : 'BAŞARISIZ'}`);
      
      return {
        success: true,
        file: backupFile,
        summary: summary,
        validation: validationResult
      };
      
    } catch (error) {
      console.error(`❌ ${type.toUpperCase()} yedekleme hatası:`, error.message);
      throw error;
    }
  }

  async createFullBackup(timestamp) {
    const backupData = {
      timestamp,
      type: 'full',
      version: '1.0.0',
      tables: {},
      metadata: {
        supabaseUrl: supabaseUrl,
        backupDate: new Date().toISOString(),
        nodeVersion: process.version,
        systemInfo: {
          platform: process.platform,
          arch: process.arch
        }
      }
    };

    // Tüm tabloları yedekle
    const tables = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar', 
      'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar', 
      'isletme_alanlar', 'system_settings', 'isletme_koordinatorler',
      'isletme_giris_denemeleri', 'ogretmen_giris_denemeleri'
    ];

    for (const table of tables) {
      try {
        console.log(`📋 ${table} tablosu yedekleniyor...`);
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
        
        console.log(`✅ ${data?.length || 0} ${table} kaydı yedeklendi`);
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

  async cleanupOldBackups(type) {
    const maxBackups = this.maxBackups[type] || 7;
    const backupDir = path.join(this.backupDir, type);
    
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith(`database-backup-${type}-`))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stats: fs.statSync(path.join(backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (files.length > maxBackups) {
        const filesToDelete = files.slice(maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          
          // Özet dosyasını da sil
          const summaryFile = file.path.replace('database-backup-', 'backup-summary-');
          if (fs.existsSync(summaryFile)) {
            fs.unlinkSync(summaryFile);
          }
          
          console.log(`🗑️ Eski yedek silindi: ${file.name}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Eski yedekleri temizlerken hata: ${error.message}`);
    }
  }

  async validateBackup(backupFile) {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          totalTables: Object.keys(backupData.tables).length,
          totalRecords: 0,
          emptyTables: 0,
          tablesWithErrors: 0
        }
      };

      // Her tabloyu doğrula
      for (const [tableName, tableData] of Object.entries(backupData.tables)) {
        if (tableData.error) {
          validation.errors.push(`${tableName}: ${tableData.error}`);
          validation.stats.tablesWithErrors++;
          continue;
        }

        validation.stats.totalRecords += tableData.count;
        
        if (tableData.count === 0) {
          validation.stats.emptyTables++;
          validation.warnings.push(`${tableName} tablosu boş`);
        }

        // Veri formatını kontrol et
        if (tableData.data && !Array.isArray(tableData.data)) {
          validation.errors.push(`${tableName}: Veri formatı hatalı`);
        }
      }

      // Kritik tablolar kontrolü
      const criticalTables = ['alanlar', 'ogretmenler', 'isletmeler', 'ogrenciler'];
      for (const table of criticalTables) {
        if (!backupData.tables[table]) {
          validation.errors.push(`Kritik tablo eksik: ${table}`);
        }
      }

      validation.isValid = validation.errors.length === 0;
      
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Yedek dosyası okunamadı: ${error.message}`],
        warnings: [],
        stats: {}
      };
    }
  }

  async createEmergencyBackup(reason = 'Manuel yedek') {
    console.log('🚨 ACİL DURUM YEDEKLEMESİ BAŞLATIYOR...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = await this.createFullBackup(timestamp);
    
    // Acil durum yedeklerini ayrı klasöre kaydet
    const emergencyDir = path.join(this.backupDir, 'emergency');
    const backupFile = path.join(emergencyDir, `emergency-backup-${timestamp}.json`);
    
    // Sebep bilgisini ekle
    backupData.emergencyInfo = {
      reason,
      timestamp: new Date().toISOString(),
      triggered: 'manual'
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    const summary = this.createBackupSummary(backupData, timestamp, 'emergency');
    const summaryFile = path.join(emergencyDir, `emergency-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('🚨 ACİL DURUM YEDEKLEMESİ TAMAMLANDI!');
    console.log(`📁 Dosya: ${backupFile}`);
    
    return backupFile;
  }

  // Haftalık yedekleme (Pazartesi)
  async weeklyBackup() {
    const today = new Date();
    if (today.getDay() === 1) { // Pazartesi
      return await this.createScheduledBackup('weekly');
    }
    return null;
  }

  // Aylık yedekleme (Ayın 1'i)
  async monthlyBackup() {
    const today = new Date();
    if (today.getDate() === 1) { // Ayın 1'i
      return await this.createScheduledBackup('monthly');
    }
    return null;
  }

  // Günlük yedekleme
  async dailyBackup() {
    return await this.createScheduledBackup('daily');
  }

  // Tüm yedeklemeleri çalıştır
  async runAllBackups() {
    const results = {};
    
    try {
      // Günlük yedek
      results.daily = await this.dailyBackup();
      
      // Haftalık yedek (sadece Pazartesi)
      const weeklyResult = await this.weeklyBackup();
      if (weeklyResult) {
        results.weekly = weeklyResult;
      }
      
      // Aylık yedek (sadece ayın 1'i)
      const monthlyResult = await this.monthlyBackup();
      if (monthlyResult) {
        results.monthly = monthlyResult;
      }
      
      return results;
    } catch (error) {
      console.error('❌ Yedekleme döngüsü hatası:', error);
      throw error;
    }
  }
}

// Komut satırından çalıştırma
if (require.main === module) {
  const scheduler = new DatabaseBackupScheduler();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'daily';
  
  switch (command) {
    case 'daily':
      scheduler.dailyBackup()
        .then(result => {
          console.log('🎉 Günlük yedekleme tamamlandı!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Günlük yedekleme hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'weekly':
      scheduler.weeklyBackup()
        .then(result => {
          if (result) {
            console.log('🎉 Haftalık yedekleme tamamlandı!');
          } else {
            console.log('ℹ️ Haftalık yedekleme sadece Pazartesi günleri yapılır.');
          }
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Haftalık yedekleme hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'monthly':
      scheduler.monthlyBackup()
        .then(result => {
          if (result) {
            console.log('🎉 Aylık yedekleme tamamlandı!');
          } else {
            console.log('ℹ️ Aylık yedekleme sadece ayın 1\'inde yapılır.');
          }
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Aylık yedekleme hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'emergency':
      const reason = args[1] || 'Manuel acil durum yedeği';
      scheduler.createEmergencyBackup(reason)
        .then(backupFile => {
          console.log(`🚨 Acil durum yedeği oluşturuldu: ${backupFile}`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Acil durum yedeği hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'all':
      scheduler.runAllBackups()
        .then(results => {
          console.log('🎉 Tüm yedeklemeler tamamlandı!');
          console.log('📊 Sonuçlar:', Object.keys(results));
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Yedekleme döngüsü hatası:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Kullanım: node database-backup-scheduler.js [daily|weekly|monthly|emergency|all]');
      process.exit(1);
  }
}

module.exports = { DatabaseBackupScheduler };