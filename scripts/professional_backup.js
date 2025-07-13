const { exec } = require('child_process');
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

const dbHost = process.env.SUPABASE_DB_HOST;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbName = 'postgres';
const dbUser = 'postgres';

if (!dbHost || !dbPassword) {
  console.error('❌ Veritabanı bağlantı bilgileri .env.local dosyasında eksik!');
  process.exit(1);
}

const backupDir = path.join(__dirname, '../database_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `professional_backup_${timestamp}.sql`);
const reportFile = path.join(backupDir, `professional_backup_report_${timestamp}.md`);

const pgDumpCommand = `pg_dump -h "${dbHost}" -U "${dbUser}" -d "${dbName}" -F p -b -v -f "${backupFile}"`;

console.log('🚀 Profesyonel veritabanı yedeği oluşturuluyor...');
console.log(`📁 Yedek dosyası: ${backupFile}`);

const backupProcess = exec(pgDumpCommand, { env: { ...process.env, PGPASSWORD: dbPassword } });

backupProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

backupProcess.stderr.on('data', (data) => {
  console.error(`⚠️ Hata: ${data.toString()}`);
});

backupProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Veritabanı yedeği başarıyla tamamlandı.');
    const reportContent = `
# Profesyonel Yedekleme Raporu

- **Tarih:** ${new Date().toLocaleString()}
- **Dosya:** \`${backupFile}\`
- **Boyut:** ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB
- **Durum:** Başarılı

Bu yedek, \`pg_dump\` kullanılarak oluşturulmuştur ve tüm veritabanı şemasını, verileri, fonksiyonları ve politikaları içerir.
    `;
    fs.writeFileSync(reportFile, reportContent);
    console.log(`📋 Rapor oluşturuldu: ${reportFile}`);
  } else {
    console.error(`❌ Yedekleme işlemi ${code} koduyla başarısız oldu.`);
  }
});