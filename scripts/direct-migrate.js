const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// .env dosyasını projenin kök dizininden yükle
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Veritabanı bağlantı bilgilerini .env dosyasından al
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment değişkeni gerekli!');
  process.exit(1);
}

// Migration dosyalarını okuma fonksiyonu
async function readMigrationFiles(migrationName) {
  const migrationsDir = path.join(__dirname, '../prisma/migrations', migrationName);
  const sqlFilePath = path.join(migrationsDir, 'migration.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Migration dosyası bulunamadı: ${sqlFilePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sqlFilePath, 'utf8');
  return {
    name: migrationName,
    content: content,
  };
}

async function runMigrations() {
  let connection;
  try {
    console.log('🚀 Veritabanına bağlanılıyor...');
    connection = await mysql.createConnection(dbUrl);
    console.log('✅ Veritabanı bağlantısı başarılı.');

    // Komut satırı argümanını doğru al (node, script.js, arg1)
    const migrationName = process.argv;
    if (!migrationName) {
      console.error('Lütfen bir migrasyon adı belirtin. Kullanım: node scripts/direct-migrate.js <migration_folder_name>');
      process.exit(1);
    }

    console.log(`🚀 Migration başlatılıyor: ${migrationName}`);
    const migration = await readMigrationFiles(migrationName);

    if (migration.content.trim().length === 0) {
      console.log(`\n📄 ${migration.name} boş, geçiliyor.`);
    } else {
      console.log(`\n📄 Migration çalıştırılıyor: ${migration.name}`);
      try {
        // SQL içeriğini noktalı virgüllere göre ayırarak her bir ifadeyi ayrı ayrı çalıştır
        const statements = migration.content.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
          await connection.query(statement);
        }
        console.log(`   ✅ Başarılı: ${migration.name}`);
      } catch (error) {
        console.error(`   ❌ Hata (${migration.name}):`, error.message);
      }
    }

    console.log('='.repeat(50));
    console.log(`\n🎉 Migration işlemi tamamlandı!`);

  } catch (error) {
    console.error('❌ Kritik Hata:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Veritabanı bağlantısı kapatıldı.');
    }
  }
}

runMigrations();