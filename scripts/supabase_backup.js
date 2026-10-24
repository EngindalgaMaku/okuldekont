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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase bağlantı bilgileri .env.local dosyasında eksik!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const backupDir = path.join(__dirname, '../database_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `professional_backup_${timestamp}.sql`);
const reportFile = path.join(backupDir, `professional_backup_report_${timestamp}.md`);

// Ana tablolar listesi
const mainTables = [
  'ogrenciler', 'ogretmenler', 'isletmeler', 'dekontlar', 'stajlar',
  'alan', 'siniflar', 'admin_users', 'system_settings', 'gorev_belgeleri'
];

async function createBackup() {
  console.log('🚀 Supabase veritabanı yedeği oluşturuluyor...');
  console.log(`📁 Yedek dosyası: ${backupFile}`);

  try {
    let sqlContent = '';
    let totalRecords = 0;
    let tableCount = 0;
    const backupStats = {};

    // Header ekle
    sqlContent += `-- Supabase Database Backup\n`;
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlContent += `-- Tables: ${mainTables.join(', ')}\n\n`;

    // Her tablo için veri al
    for (const tableName of mainTables) {
      try {
        console.log(`📋 ${tableName} tablosu yedekleniyor...`);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.log(`⚠️ ${tableName} tablosu bulunamadı, atlanıyor: ${error.message}`);
          continue;
        }

        if (data && data.length > 0) {
          tableCount++;
          const recordCount = data.length;
          totalRecords += recordCount;
          backupStats[tableName] = recordCount;

          sqlContent += `-- Table: ${tableName} (${recordCount} records)\n`;
          sqlContent += `-- Backup data for ${tableName}\n`;
          
          // JSON formatında veriyi yaz
          sqlContent += `/*\n`;
          sqlContent += `INSERT INTO ${tableName} DATA:\n`;
          sqlContent += JSON.stringify(data, null, 2);
          sqlContent += `\n*/\n\n`;

          console.log(`✅ ${tableName}: ${recordCount} kayıt yedeklendi`);
        } else {
          console.log(`ℹ️ ${tableName}: Boş tablo`);
          backupStats[tableName] = 0;
        }
      } catch (tableError) {
        console.log(`⚠️ ${tableName} tablosu yedeklenirken hata: ${tableError.message}`);
      }
    }

    // SQL dosyasını yaz
    fs.writeFileSync(backupFile, sqlContent);
    const fileSize = fs.statSync(backupFile).size;

    console.log('✅ Veritabanı yedeği başarıyla tamamlandı.');

    // Rapor oluştur
    const reportContent = `
# Supabase Yedekleme Raporu

- **Tarih:** ${new Date().toLocaleString('tr-TR')}
- **Dosya:** \`${path.basename(backupFile)}\`
- **Boyut:** ${(fileSize / 1024 / 1024).toFixed(2)} MB
- **Durum:** Başarılı
- **Toplam Tablo:** ${tableCount}
- **Toplam Kayıt:** ${totalRecords}

## Tablo Detayları

${Object.entries(backupStats).map(([table, count]) => `- **${table}:** ${count} kayıt`).join('\n')}

## Backup Türü

Bu yedek Supabase API kullanılarak oluşturulmuştur ve tüm ana tablo verilerini JSON formatında içerir.

## Restore Talimatları

1. Supabase Dashboard'a gidin
2. SQL Editor'ı açın
3. Backup dosyasındaki JSON verilerini kullanarak INSERT komutları çalıştırın
4. Alternatif olarak, Supabase import araçlarını kullanın
    `;
    
    fs.writeFileSync(reportFile, reportContent);
    console.log(`📋 Rapor oluşturuldu: ${reportFile}`);

    return {
      success: true,
      backupFile: path.basename(backupFile),
      reportFile: path.basename(reportFile),
      stats: {
        tableCount,
        totalRecords,
        fileSize,
        tables: backupStats
      }
    };

  } catch (error) {
    console.error('❌ Yedekleme sırasında hata:', error);
    throw error;
  }
}

// Script doğrudan çalıştırıldığında
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log('🎉 Backup işlemi tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backup işlemi başarısız:', error);
      process.exit(1);
    });
}

module.exports = { createBackup };