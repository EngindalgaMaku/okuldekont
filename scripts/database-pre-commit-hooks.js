const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { DatabaseBackupScheduler } = require('./database-backup-scheduler');
const { SchemaVersionManager } = require('./schema-version-manager');

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

class DatabasePreCommitHooks {
  constructor() {
    this.hooksDir = path.join(__dirname, '../.git/hooks');
    this.configFile = path.join(__dirname, '../database-security-config.json');
    this.backupScheduler = new DatabaseBackupScheduler();
    this.schemaManager = new SchemaVersionManager();
    this.initializeConfig();
  }

  initializeConfig() {
    const defaultConfig = {
      preCommitChecks: {
        schemaValidation: true,
        dataIntegrityCheck: true,
        performanceCheck: true,
        securityCheck: true,
        backupValidation: true,
        migrationValidation: true
      },
      thresholds: {
        maxQueryTime: 5000,        // 5 saniye
        maxTableSize: 1000000,     // 1 milyon kayıt
        maxIndexSize: 100,         // 100 indeks
        minBackupAge: 3600000,     // 1 saat (ms)
        maxErrorRate: 0.05         // %5 hata oranı
      },
      criticalTables: [
        'ogretmenler',
        'ogrenciler', 
        'isletmeler',
        'stajlar',
        'dekontlar'
      ],
      securityRules: {
        requireRLS: true,
        requireAuthentication: true,
        prohibitedOperations: ['DROP TABLE', 'TRUNCATE', 'DELETE FROM.*WHERE.*1.*=.*1'],
        requireEncryption: ['pin', 'password', 'token']
      }
    };

    if (!fs.existsSync(this.configFile)) {
      fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2));
    }
  }

  getConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    } catch (error) {
      console.error('⚠️ Konfig dosyası okunamadı, varsayılan değerler kullanılıyor');
      return this.initializeConfig();
    }
  }

  async runAllChecks() {
    console.log('🔍 Pre-commit güvenlik kontrolleri başlatılıyor...');
    
    const config = this.getConfig();
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'PASS',
      checks: {},
      warnings: [],
      errors: [],
      recommendations: []
    };

    try {
      // 1. Schema Validation
      if (config.preCommitChecks.schemaValidation) {
        console.log('📋 Schema validasyonu...');
        results.checks.schemaValidation = await this.validateSchema();
      }

      // 2. Data Integrity Check
      if (config.preCommitChecks.dataIntegrityCheck) {
        console.log('🔗 Veri bütünlüğü kontrolü...');
        results.checks.dataIntegrity = await this.checkDataIntegrity();
      }

      // 3. Performance Check
      if (config.preCommitChecks.performanceCheck) {
        console.log('⚡ Performans kontrolü...');
        results.checks.performance = await this.checkPerformance();
      }

      // 4. Security Check
      if (config.preCommitChecks.securityCheck) {
        console.log('🛡️ Güvenlik kontrolü...');
        results.checks.security = await this.checkSecurity();
      }

      // 5. Backup Validation
      if (config.preCommitChecks.backupValidation) {
        console.log('💾 Yedek validasyonu...');
        results.checks.backup = await this.validateBackups();
      }

      // 6. Migration Validation
      if (config.preCommitChecks.migrationValidation) {
        console.log('🔄 Migration validasyonu...');
        results.checks.migration = await this.validateMigrations();
      }

      // Sonuçları değerlendir
      const hasErrors = Object.values(results.checks).some(check => check.status === 'FAIL');
      const hasWarnings = Object.values(results.checks).some(check => check.warnings?.length > 0);

      if (hasErrors) {
        results.overall = 'FAIL';
        results.errors = Object.values(results.checks)
          .filter(check => check.status === 'FAIL')
          .flatMap(check => check.errors || []);
      } else if (hasWarnings) {
        results.overall = 'WARN';
        results.warnings = Object.values(results.checks)
          .flatMap(check => check.warnings || []);
      }

      // Öneriler oluştur
      results.recommendations = this.generateRecommendations(results);

      console.log('\n📊 PRE-COMMIT KONTROL SONUÇLARI:');
      console.log('━'.repeat(50));
      console.log(`🎯 Genel Sonuç: ${results.overall}`);
      console.log(`⚠️ Uyarılar: ${results.warnings.length}`);
      console.log(`❌ Hatalar: ${results.errors.length}`);
      console.log(`💡 Öneriler: ${results.recommendations.length}`);

      if (results.errors.length > 0) {
        console.log('\n❌ HATALAR:');
        results.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      if (results.warnings.length > 0) {
        console.log('\n⚠️ UYARILAR:');
        results.warnings.forEach((warning, index) => {
          console.log(`${index + 1}. ${warning}`);
        });
      }

      if (results.recommendations.length > 0) {
        console.log('\n💡 ÖNERİLER:');
        results.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }

      // Sonuçları dosyaya kaydet
      const resultsFile = path.join(__dirname, '../pre-commit-results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

      return results;
    } catch (error) {
      console.error('❌ Pre-commit kontrol hatası:', error);
      results.overall = 'FAIL';
      results.errors.push(`Sistem hatası: ${error.message}`);
      return results;
    }
  }

  async validateSchema() {
    try {
      const schema = await this.schemaManager.captureCurrentSchema();
      const config = this.getConfig();
      
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {
          totalTables: Object.keys(schema.tables).length,
          totalFunctions: Object.keys(schema.functions).length,
          totalPolicies: Object.keys(schema.policies).length
        }
      };

      // Kritik tabloları kontrol et
      const missingTables = config.criticalTables.filter(table => !schema.tables[table]);
      if (missingTables.length > 0) {
        result.errors.push(`Kritik tablolar eksik: ${missingTables.join(', ')}`);
        result.status = 'FAIL';
      }

      // RLS politikalarını kontrol et
      if (config.securityRules.requireRLS) {
        const tablesWithoutRLS = Object.keys(schema.tables)
          .filter(table => !schema.policies[table] || schema.policies[table].length === 0);
        
        if (tablesWithoutRLS.length > 0) {
          result.warnings.push(`RLS politikası olmayan tablolar: ${tablesWithoutRLS.join(', ')}`);
        }
      }

      // Orphaned indeksleri kontrol et
      Object.entries(schema.indexes).forEach(([table, indexes]) => {
        if (!schema.tables[table]) {
          result.warnings.push(`Orphaned indeksler bulundu: ${table}`);
        }
      });

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Schema validasyon hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  async checkDataIntegrity() {
    try {
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {}
      };

      const config = this.getConfig();

      // Kritik tabloları kontrol et
      for (const table of config.criticalTables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            result.errors.push(`${table} tablosu erişim hatası: ${error.message}`);
            result.status = 'FAIL';
            continue;
          }

          result.details[table] = { count };

          // Tablo boyutu kontrolü
          if (count > config.thresholds.maxTableSize) {
            result.warnings.push(`${table} tablosu çok büyük: ${count} kayıt`);
          }

          // Null değer kontrolü (ID alanları için)
          const { data: nullIds, error: nullError } = await supabase
            .from(table)
            .select('id')
            .is('id', null);

          if (!nullError && nullIds && nullIds.length > 0) {
            result.warnings.push(`${table} tablosunda null ID'ler bulundu: ${nullIds.length}`);
          }

        } catch (error) {
          result.errors.push(`${table} kontrol hatası: ${error.message}`);
          result.status = 'FAIL';
        }
      }

      // Foreign key bütünlüğü kontrolü
      const fkChecks = [
        {
          table: 'ogrenciler',
          foreign: 'alan_id',
          reference: 'alanlar',
          referenceField: 'id'
        },
        {
          table: 'stajlar',
          foreign: 'ogrenci_id',
          reference: 'ogrenciler',
          referenceField: 'id'
        },
        {
          table: 'dekontlar',
          foreign: 'staj_id',
          reference: 'stajlar',
          referenceField: 'id'
        }
      ];

      for (const fkCheck of fkChecks) {
        try {
          // Orphaned kayıtları kontrol et
          const { data: orphaned, error } = await supabase
            .from(fkCheck.table)
            .select(`${fkCheck.foreign}, ${fkCheck.reference}!inner(${fkCheck.referenceField})`)
            .is(`${fkCheck.reference}.${fkCheck.referenceField}`, null);

          if (!error && orphaned && orphaned.length > 0) {
            result.warnings.push(`${fkCheck.table} tablosunda orphaned kayıtlar: ${orphaned.length}`);
          }
        } catch (error) {
          result.warnings.push(`FK kontrol hatası: ${fkCheck.table} -> ${fkCheck.reference}`);
        }
      }

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Veri bütünlüğü kontrol hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  async checkPerformance() {
    try {
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {}
      };

      const config = this.getConfig();

      // Slow query tespiti
      const testQueries = [
        {
          name: 'ogretmenler_list',
          query: supabase.from('ogretmenler').select('*').limit(100)
        },
        {
          name: 'ogrenciler_with_alan',
          query: supabase.from('ogrenciler').select('*, alanlar(*)').limit(100)
        },
        {
          name: 'stajlar_with_relations',
          query: supabase.from('stajlar').select('*, ogrenciler(*), isletmeler(*)').limit(50)
        }
      ];

      for (const testQuery of testQueries) {
        const startTime = Date.now();
        
        try {
          const { data, error } = await testQuery.query;
          const duration = Date.now() - startTime;
          
          result.details[testQuery.name] = {
            duration,
            success: !error,
            recordCount: data?.length || 0
          };

          if (error) {
            result.errors.push(`Query hatası (${testQuery.name}): ${error.message}`);
            result.status = 'FAIL';
          } else if (duration > config.thresholds.maxQueryTime) {
            result.warnings.push(`Yavaş query (${testQuery.name}): ${duration}ms`);
          }
        } catch (error) {
          result.errors.push(`Query test hatası (${testQuery.name}): ${error.message}`);
          result.status = 'FAIL';
        }
      }

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Performans kontrol hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  async checkSecurity() {
    try {
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {}
      };

      const config = this.getConfig();

      // RLS kontrolü
      const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `
      });

      if (tablesError) {
        result.errors.push(`RLS kontrol hatası: ${tablesError.message}`);
        result.status = 'FAIL';
      } else if (tables.data) {
        const tablesWithoutRLS = tables.data.filter(table => !table.rowsecurity);
        result.details.rlsEnabled = tables.data.length - tablesWithoutRLS.length;
        result.details.rlsDisabled = tablesWithoutRLS.length;

        if (config.securityRules.requireRLS && tablesWithoutRLS.length > 0) {
          result.warnings.push(`RLS devre dışı tablolar: ${tablesWithoutRLS.map(t => t.tablename).join(', ')}`);
        }
      }

      // Politika kontrolü
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            tablename,
            COUNT(*) as policy_count
          FROM pg_policies 
          WHERE schemaname = 'public'
          GROUP BY tablename
          ORDER BY tablename;
        `
      });

      if (!policiesError && policies.data) {
        result.details.policyCounts = policies.data.reduce((acc, policy) => {
          acc[policy.tablename] = policy.policy_count;
          return acc;
        }, {});

        // Politikası olmayan tablolar
        const tablesWithoutPolicies = config.criticalTables.filter(table => 
          !policies.data.find(p => p.tablename === table)
        );

        if (tablesWithoutPolicies.length > 0) {
          result.warnings.push(`Politikası olmayan kritik tablolar: ${tablesWithoutPolicies.join(', ')}`);
        }
      }

      // Dangerous function kontrolü
      const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            routine_name,
            routine_definition
          FROM information_schema.routines 
          WHERE routine_schema = 'public'
          AND routine_definition ILIKE ANY(ARRAY['%DROP%', '%DELETE%', '%TRUNCATE%']);
        `
      });

      if (!functionsError && functions.data && functions.data.length > 0) {
        result.warnings.push(`Potansiyel tehlikeli fonksiyonlar bulundu: ${functions.data.length}`);
        result.details.dangerousFunctions = functions.data.map(f => f.routine_name);
      }

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Güvenlik kontrol hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  async validateBackups() {
    try {
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {}
      };

      const config = this.getConfig();

      // Son yedek kontrolü
      const backups = await this.backupScheduler.listAvailableBackups();
      
      if (backups.length === 0) {
        result.errors.push('Hiç yedek bulunamadı!');
        result.status = 'FAIL';
        return result;
      }

      const latestBackup = backups[0];
      const backupAge = Date.now() - latestBackup.created.getTime();

      result.details.latestBackup = {
        file: latestBackup.filename,
        age: backupAge,
        ageHours: Math.round(backupAge / 3600000),
        type: latestBackup.type
      };

      if (backupAge > config.thresholds.minBackupAge) {
        result.warnings.push(`Son yedek çok eski: ${Math.round(backupAge / 3600000)} saat`);
      }

      // Yedek dosyası bütünlüğü kontrolü
      try {
        const backupData = JSON.parse(fs.readFileSync(latestBackup.path, 'utf8'));
        const totalRecords = Object.values(backupData.tables || {})
          .reduce((sum, table) => sum + (table.count || 0), 0);

        result.details.backupIntegrity = {
          totalTables: Object.keys(backupData.tables || {}).length,
          totalRecords,
          isValid: totalRecords > 0
        };

        if (totalRecords === 0) {
          result.warnings.push('Son yedek boş görünüyor');
        }
      } catch (error) {
        result.errors.push(`Yedek dosyası bozuk: ${error.message}`);
        result.status = 'FAIL';
      }

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Yedek validasyon hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  async validateMigrations() {
    try {
      const result = {
        status: 'PASS',
        warnings: [],
        errors: [],
        details: {}
      };

      // Migration dosyalarını kontrol et
      const migrationsDir = path.join(__dirname, '../supabase/migrations');
      
      if (!fs.existsSync(migrationsDir)) {
        result.warnings.push('Migrations klasörü bulunamadı');
        return result;
      }

      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      result.details.totalMigrations = migrationFiles.length;

      if (migrationFiles.length === 0) {
        result.warnings.push('Hiç migration dosyası bulunamadı');
        return result;
      }

      // Son migration dosyasını kontrol et
      const latestMigration = migrationFiles[migrationFiles.length - 1];
      const migrationPath = path.join(migrationsDir, latestMigration);
      
      try {
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        
        // Tehlikeli operasyonları kontrol et
        const dangerousOperations = [
          'DROP TABLE',
          'TRUNCATE',
          'DELETE FROM .* WHERE 1=1',
          'ALTER TABLE .* DROP COLUMN'
        ];

        const foundDangerous = dangerousOperations.filter(op => 
          new RegExp(op, 'i').test(migrationContent)
        );

        if (foundDangerous.length > 0) {
          result.warnings.push(`Son migration'da tehlikeli operasyonlar: ${foundDangerous.join(', ')}`);
        }

        result.details.latestMigration = {
          file: latestMigration,
          size: migrationContent.length,
          dangerousOperations: foundDangerous.length
        };

      } catch (error) {
        result.errors.push(`Migration dosyası okunamadı: ${error.message}`);
        result.status = 'FAIL';
      }

      return result;
    } catch (error) {
      return {
        status: 'FAIL',
        errors: [`Migration validasyon hatası: ${error.message}`],
        warnings: []
      };
    }
  }

  generateRecommendations(results) {
    const recommendations = [];

    // Hata bazlı öneriler
    if (results.checks.backup?.status === 'FAIL') {
      recommendations.push('Acil yedek oluşturun: node scripts/database-backup-scheduler.js emergency');
    }

    if (results.checks.security?.warnings?.length > 0) {
      recommendations.push('RLS politikalarını gözden geçirin ve eksik olanları ekleyin');
    }

    if (results.checks.performance?.warnings?.length > 0) {
      recommendations.push('Yavaş sorguları optimize edin, gerekirse indeks ekleyin');
    }

    if (results.checks.dataIntegrity?.warnings?.length > 0) {
      recommendations.push('Veri bütünlüğü sorunlarını giderin, orphaned kayıtları temizleyin');
    }

    // Genel öneriler
    if (results.overall === 'WARN') {
      recommendations.push('Tüm uyarıları gözden geçirin ve mümkün olanları düzeltin');
    }

    if (results.overall === 'PASS' && results.warnings.length === 0) {
      recommendations.push('Mükemmel! Tüm kontroller başarılı');
    }

    return recommendations;
  }

  async setupGitHooks() {
    console.log('🔧 Git hooks kuruluyor...');
    
    if (!fs.existsSync(this.hooksDir)) {
      console.log('⚠️ Git hooks klasörü bulunamadı, oluşturuluyor...');
      fs.mkdirSync(this.hooksDir, { recursive: true });
    }

    const preCommitHook = `#!/bin/sh
# Database Pre-commit Security Hooks

echo "🔍 Database güvenlik kontrolleri çalıştırılıyor..."

# Pre-commit kontrolleri çalıştır
node scripts/database-pre-commit-hooks.js check

# Sonucu kontrol et
if [ $? -ne 0 ]; then
    echo "❌ Pre-commit kontrolleri başarısız! Commit iptal ediliyor."
    echo "💡 Hataları düzeltip tekrar deneyin."
    exit 1
fi

echo "✅ Tüm kontroller başarılı! Commit onaylandı."
exit 0
`;

    const hookFile = path.join(this.hooksDir, 'pre-commit');
    fs.writeFileSync(hookFile, preCommitHook);
    
    // Executable yetkisi ver (Unix sistemlerde)
    try {
      fs.chmodSync(hookFile, '755');
    } catch (error) {
      console.log('⚠️ Hook dosyası execute yetkisi verilemedi (Windows?)');
    }

    console.log('✅ Git pre-commit hook kuruldu!');
    console.log(`📁 Konum: ${hookFile}`);
  }

  async removeGitHooks() {
    const hookFile = path.join(this.hooksDir, 'pre-commit');
    
    if (fs.existsSync(hookFile)) {
      fs.unlinkSync(hookFile);
      console.log('✅ Git pre-commit hook kaldırıldı!');
    } else {
      console.log('ℹ️ Pre-commit hook zaten yok');
    }
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const hooks = new DatabasePreCommitHooks();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check':
      hooks.runAllChecks()
        .then(results => {
          console.log('\n🎉 Pre-commit kontrolleri tamamlandı!');
          process.exit(results.overall === 'FAIL' ? 1 : 0);
        })
        .catch(error => {
          console.error('❌ Pre-commit kontrol hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'setup':
      hooks.setupGitHooks()
        .then(() => {
          console.log('🎉 Git hooks kuruldu!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Hook kurulum hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'remove':
      hooks.removeGitHooks()
        .then(() => {
          console.log('🎉 Git hooks kaldırıldı!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Hook kaldırma hatası:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Database Pre-commit Security Hooks');
      console.log('');
      console.log('Kullanım: node database-pre-commit-hooks.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  check   - Tüm güvenlik kontrollerini çalıştır');
      console.log('  setup   - Git pre-commit hook\'unu kur');
      console.log('  remove  - Git pre-commit hook\'unu kaldır');
      process.exit(1);
  }
}

module.exports = { DatabasePreCommitHooks };