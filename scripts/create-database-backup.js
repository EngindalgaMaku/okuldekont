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

async function createDatabaseBackup() {
  try {
    console.log('💾 Database backup oluşturuluyor...\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    
    // Backup klasörü oluştur
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupData = {
      timestamp,
      tables: {}
    };

    // Tüm tabloları backup et
    const tables = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar', 
      'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar', 
      'isletme_alanlar', 'system_settings'
    ];

    for (const table of tables) {
      try {
        console.log(`📋 ${table} tablosu yedekleniyor...`);
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.warn(`⚠️ ${table} yedeklenirken hata: ${error.message}`);
          continue;
        }
        
        backupData.tables[table] = data || [];
        console.log(`✅ ${data?.length || 0} ${table} kaydı yedeklendi`);
      } catch (error) {
        console.warn(`⚠️ ${table} yedeklenirken hata: ${error.message}`);
      }
    }

    // Backup dosyasını kaydet
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    // Özet oluştur
    const summary = {
      timestamp,
      totalTables: Object.keys(backupData.tables).length,
      totalRecords: Object.values(backupData.tables).reduce((sum, records) => sum + records.length, 0),
      tables: Object.fromEntries(
        Object.entries(backupData.tables).map(([table, records]) => [table, records.length])
      )
    };

    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log('\n📊 BACKUP ÖZETI:');
    console.log('━'.repeat(50));
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`📁 Backup dosyası: ${backupFile}`);
    console.log(`📋 Toplam tablo: ${summary.totalTables}`);
    console.log(`📊 Toplam kayıt: ${summary.totalRecords}`);
    
    console.log('\n📋 Tablo detayları:');
    Object.entries(summary.tables).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} kayıt`);
    });

    console.log('\n✅ Database backup başarıyla oluşturuldu!');
    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup hatası:', error.message);
    throw error;
  }
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  createDatabaseBackup()
    .then((backupFile) => {
      console.log(`\n🎉 Backup tamamlandı: ${backupFile}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { createDatabaseBackup };