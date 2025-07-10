const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { DatabaseBackupScheduler } = require('./database-backup-scheduler');
const { DatabaseRollbackSystem } = require('./database-rollback-system');

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

class StagingEnvironmentManager {
  constructor() {
    this.stagingDir = path.join(__dirname, '../staging');
    this.configsDir = path.join(this.stagingDir, 'configs');
    this.dataDir = path.join(this.stagingDir, 'data');
    this.logsDir = path.join(this.stagingDir, 'logs');
    this.configFile = path.join(this.stagingDir, 'staging-config.json');
    
    this.backupScheduler = new DatabaseBackupScheduler();
    this.rollbackSystem = new DatabaseRollbackSystem();
    
    this.initializeDirectories();
    this.initializeConfig();
  }

  initializeDirectories() {
    [this.stagingDir, this.configsDir, this.dataDir, this.logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeConfig() {
    const defaultConfig = {
      environments: {
        production: {
          name: 'Production',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          isProduction: true,
          backupBeforeSync: true
        },
        staging: {
          name: 'Staging',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL || '',
          supabaseKey: process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY || '',
          isProduction: false,
          allowDataLoss: true,
          refreshFromProduction: true
        },
        development: {
          name: 'Development',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || '',
          supabaseKey: process.env.SUPABASE_DEV_SERVICE_ROLE_KEY || '',
          isProduction: false,
          allowDataLoss: true,
          useTestData: true
        }
      },
      syncOptions: {
        createBackupBeforeSync: true,
        validateAfterSync: true,
        skipLargeTables: [],
        includeOnlyTables: [],
        anonymizeData: true,
        maxSyncTime: 1800000, // 30 dakika
        batchSize: 1000
      },
      anonymization: {
        enabled: true,
        rules: {
          ogretmenler: {
            pin: 'REPLACE_WITH_DEFAULT',
            telefon: 'ANONYMIZE',
            email: 'ANONYMIZE'
          },
          ogrenciler: {
            tc_no: 'ANONYMIZE',
            telefon: 'ANONYMIZE',
            email: 'ANONYMIZE',
            veli_telefon: 'ANONYMIZE'
          },
          isletmeler: {
            pin: 'REPLACE_WITH_DEFAULT',
            telefon: 'ANONYMIZE',
            email: 'ANONYMIZE',
            vergi_no: 'ANONYMIZE'
          }
        },
        defaults: {
          pin: '1234',
          email: 'test@example.com',
          telefon: '555-0000'
        }
      },
      testData: {
        generateTestUsers: true,
        testUserCount: 50,
        generateTestCompanies: true,
        testCompanyCount: 20,
        generateTestInternships: true,
        testInternshipCount: 100
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
      console.error('⚠️ Staging config okunamadı, varsayılan değerler kullanılıyor');
      this.initializeConfig();
      return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    }
  }

  createSupabaseClient(environment) {
    const config = this.getConfig();
    const envConfig = config.environments[environment];
    
    if (!envConfig || !envConfig.supabaseUrl || !envConfig.supabaseKey) {
      throw new Error(`${environment} environment configuration is incomplete`);
    }

    return createClient(envConfig.supabaseUrl, envConfig.supabaseKey);
  }

  async syncEnvironments(sourceEnv, targetEnv, options = {}) {
    console.log(`🔄 Syncing ${sourceEnv} → ${targetEnv}`);
    console.log('━'.repeat(50));
    
    const startTime = Date.now();
    const syncId = `sync-${sourceEnv}-to-${targetEnv}-${Date.now()}`;
    
    try {
      const config = this.getConfig();
      const sourceConfig = config.environments[sourceEnv];
      const targetConfig = config.environments[targetEnv];

      // Environment validation
      if (!sourceConfig || !targetConfig) {
        throw new Error('Invalid source or target environment');
      }

      if (targetConfig.isProduction && !options.forceProduction) {
        throw new Error('Cannot sync to production without --force-production flag');
      }

      // Create clients
      const sourceClient = this.createSupabaseClient(sourceEnv);
      const targetClient = this.createSupabaseClient(targetEnv);

      const syncLog = {
        id: syncId,
        sourceEnv,
        targetEnv,
        startTime: new Date().toISOString(),
        status: 'IN_PROGRESS',
        steps: [],
        options
      };

      // 1. Pre-sync backup
      if (config.syncOptions.createBackupBeforeSync && !targetConfig.allowDataLoss) {
        console.log('💾 Pre-sync backup oluşturuluyor...');
        const backupFile = await this.createPreSyncBackup(targetEnv);
        syncLog.steps.push({
          step: 'pre_sync_backup',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          result: { backupFile }
        });
      }

      // 2. Source data extraction
      console.log('📊 Source verileri çıkarılıyor...');
      const sourceData = await this.extractEnvironmentData(sourceClient, config);
      syncLog.steps.push({
        step: 'source_extraction',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        result: { 
          tablesExtracted: Object.keys(sourceData).length,
          totalRecords: Object.values(sourceData).reduce((sum, table) => sum + table.length, 0)
        }
      });

      // 3. Data anonymization (if enabled and not production target)
      if (config.anonymization.enabled && !targetConfig.isProduction) {
        console.log('🔒 Veriler anonimleştiriliyor...');
        const anonymizedData = await this.anonymizeData(sourceData, config.anonymization);
        syncLog.steps.push({
          step: 'data_anonymization',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          result: { anonymizedTables: Object.keys(anonymizedData).length }
        });
        Object.assign(sourceData, anonymizedData);
      }

      // 4. Target environment preparation
      console.log('🧹 Target environment hazırlanıyor...');
      await this.prepareTargetEnvironment(targetClient, config);
      syncLog.steps.push({
        step: 'target_preparation',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED'
      });

      // 5. Data synchronization
      console.log('🔄 Veriler senkronize ediliyor...');
      const syncResult = await this.synchronizeData(targetClient, sourceData, config);
      syncLog.steps.push({
        step: 'data_synchronization',
        timestamp: new Date().toISOString(),
        status: syncResult.success ? 'COMPLETED' : 'FAILED',
        result: syncResult
      });

      // 6. Post-sync validation
      if (config.syncOptions.validateAfterSync) {
        console.log('✅ Post-sync doğrulama...');
        const validationResult = await this.validateSyncResult(targetClient, sourceData);
        syncLog.steps.push({
          step: 'post_sync_validation',
          timestamp: new Date().toISOString(),
          status: validationResult.success ? 'COMPLETED' : 'FAILED',
          result: validationResult
        });
      }

      // 7. Test data generation (for development)
      if (targetEnv === 'development' && config.testData.generateTestUsers) {
        console.log('🧪 Test verileri oluşturuluyor...');
        const testDataResult = await this.generateTestData(targetClient, config.testData);
        syncLog.steps.push({
          step: 'test_data_generation',
          timestamp: new Date().toISOString(),
          status: testDataResult.success ? 'COMPLETED' : 'FAILED',
          result: testDataResult
        });
      }

      const totalTime = Date.now() - startTime;
      syncLog.endTime = new Date().toISOString();
      syncLog.duration = totalTime;
      syncLog.status = syncLog.steps.every(step => step.status === 'COMPLETED') ? 'COMPLETED' : 'FAILED';

      // Sync log'u kaydet
      await this.saveSyncLog(syncLog);

      console.log('━'.repeat(50));
      console.log('🎉 SYNC TAMAMLANDI!');
      console.log(`⏱️  Toplam süre: ${Math.round(totalTime/1000)} saniye`);
      console.log(`📊 Sonuç: ${syncLog.status}`);
      console.log(`📝 Sync ID: ${syncId}`);

      return syncLog;

    } catch (error) {
      console.error('❌ Sync hatası:', error);
      
      const errorLog = {
        id: syncId,
        sourceEnv,
        targetEnv,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'FAILED',
        error: error.message,
        duration: Date.now() - startTime
      };

      await this.saveSyncLog(errorLog);
      throw error;
    }
  }

  async createPreSyncBackup(environment) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.dataDir, `pre-sync-backup-${environment}-${timestamp}.json`);
    
    try {
      const client = this.createSupabaseClient(environment);
      const data = await this.extractEnvironmentData(client, this.getConfig());
      
      const backup = {
        environment,
        timestamp: new Date().toISOString(),
        type: 'pre-sync-backup',
        tables: {}
      };

      Object.entries(data).forEach(([tableName, tableData]) => {
        backup.tables[tableName] = {
          data: tableData,
          count: tableData.length
        };
      });

      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      console.log(`   ✅ Pre-sync backup oluşturuldu: ${path.basename(backupFile)}`);
      
      return backupFile;
    } catch (error) {
      console.error(`   ❌ Pre-sync backup hatası: ${error.message}`);
      throw error;
    }
  }

  async extractEnvironmentData(client, config) {
    const tables = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar',
      'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar',
      'isletme_alanlar', 'system_settings'
    ];

    const data = {};

    for (const tableName of tables) {
      try {
        // Skip if in skipLargeTables
        if (config.syncOptions.skipLargeTables.includes(tableName)) {
          console.log(`   ⏭️ ${tableName} tablosu atlanıyor (büyük tablo)`);
          continue;
        }

        // Skip if includeOnlyTables is specified and table is not in it
        if (config.syncOptions.includeOnlyTables.length > 0 && 
            !config.syncOptions.includeOnlyTables.includes(tableName)) {
          console.log(`   ⏭️ ${tableName} tablosu atlanıyor (sadece belirtilen tablolar)`);
          continue;
        }

        console.log(`   📋 ${tableName} tablosu çıkarılıyor...`);
        
        const { data: tableData, error } = await client
          .from(tableName)
          .select('*');

        if (error) {
          console.warn(`   ⚠️ ${tableName} çıkarılırken hata: ${error.message}`);
          continue;
        }

        data[tableName] = tableData || [];
        console.log(`   ✅ ${tableName}: ${tableData?.length || 0} kayıt`);

      } catch (error) {
        console.warn(`   ⚠️ ${tableName} çıkarılırken hata: ${error.message}`);
      }
    }

    return data;
  }

  async anonymizeData(data, anonymizationConfig) {
    console.log('   🔒 Veri anonimleştirme başlatılıyor...');
    
    const anonymizedData = {};

    for (const [tableName, tableData] of Object.entries(data)) {
      if (!anonymizationConfig.rules[tableName]) {
        anonymizedData[tableName] = tableData;
        continue;
      }

      const rules = anonymizationConfig.rules[tableName];
      const defaults = anonymizationConfig.defaults;

      anonymizedData[tableName] = tableData.map(record => {
        const anonymizedRecord = { ...record };

        Object.entries(rules).forEach(([field, rule]) => {
          if (anonymizedRecord[field] !== undefined) {
            switch (rule) {
              case 'REPLACE_WITH_DEFAULT':
                anonymizedRecord[field] = defaults[field] || 'DEFAULT';
                break;
              case 'ANONYMIZE':
                if (field.includes('email')) {
                  anonymizedRecord[field] = `user${Math.random().toString(36).substr(2, 9)}@test.com`;
                } else if (field.includes('telefon')) {
                  anonymizedRecord[field] = `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                } else if (field.includes('tc') || field.includes('vergi')) {
                  anonymizedRecord[field] = String(Math.floor(Math.random() * 90000000000) + 10000000000);
                } else {
                  anonymizedRecord[field] = `ANON_${Math.random().toString(36).substr(2, 9)}`;
                }
                break;
              case 'REMOVE':
                delete anonymizedRecord[field];
                break;
            }
          }
        });

        return anonymizedRecord;
      });

      console.log(`   ✅ ${tableName}: ${anonymizedData[tableName].length} kayıt anonimleştirildi`);
    }

    return anonymizedData;
  }

  async prepareTargetEnvironment(client, config) {
    console.log('   🧹 Target tablolar temizleniyor...');

    const tables = [
      'dekontlar', 'stajlar', 'ogrenciler', 'isletmeler', 
      'ogretmenler', 'siniflar', 'isletme_alanlar'
    ];

    for (const tableName of tables) {
      try {
        const { error } = await client
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil

        if (error && !error.message.includes('violates foreign key constraint')) {
          console.warn(`   ⚠️ ${tableName} temizlenirken hata: ${error.message}`);
        } else {
          console.log(`   ✅ ${tableName} temizlendi`);
        }
      } catch (error) {
        console.warn(`   ⚠️ ${tableName} temizlenirken hata: ${error.message}`);
      }
    }
  }

  async synchronizeData(client, data, config) {
    console.log('   🔄 Veri senkronizasyonu başlatılıyor...');
    
    const result = {
      success: true,
      syncedTables: [],
      errors: [],
      totalRecords: 0
    };

    // Bağımlılık sırasına göre tablolar
    const syncOrder = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar',
      'isletmeler', 'ogrenciler', 'isletme_alanlar', 'stajlar', 'dekontlar'
    ];

    for (const tableName of syncOrder) {
      if (!data[tableName] || data[tableName].length === 0) {
        console.log(`   ⏭️ ${tableName} atlanıyor (veri yok)`);
        continue;
      }

      try {
        console.log(`   📝 ${tableName} senkronize ediliyor...`);
        
        const tableData = data[tableName];
        const batchSize = config.syncOptions.batchSize;
        let syncedCount = 0;

        // Batch'ler halinde insert et
        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize);
          
          const { error } = await client
            .from(tableName)
            .insert(batch);

          if (error) {
            result.errors.push(`${tableName}: ${error.message}`);
            console.warn(`   ⚠️ ${tableName} batch ${Math.floor(i/batchSize) + 1} hatası: ${error.message}`);
            
            // Individual insert deneme
            for (const record of batch) {
              const { error: individualError } = await client
                .from(tableName)
                .insert(record);
              
              if (!individualError) {
                syncedCount++;
              }
            }
          } else {
            syncedCount += batch.length;
          }
        }

        result.syncedTables.push({
          table: tableName,
          totalRecords: tableData.length,
          syncedRecords: syncedCount,
          success: syncedCount > 0
        });

        result.totalRecords += syncedCount;
        console.log(`   ✅ ${tableName}: ${syncedCount}/${tableData.length} kayıt senkronize edildi`);

      } catch (error) {
        result.errors.push(`${tableName}: ${error.message}`);
        console.error(`   ❌ ${tableName} senkronizasyon hatası: ${error.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async validateSyncResult(client, originalData) {
    console.log('   ✅ Sync sonucu doğrulanıyor...');
    
    const validation = {
      success: true,
      validatedTables: [],
      issues: []
    };

    for (const [tableName, originalTableData] of Object.entries(originalData)) {
      try {
        const { count, error } = await client
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          validation.issues.push(`${tableName}: Count check failed - ${error.message}`);
          continue;
        }

        const originalCount = originalTableData.length;
        const currentCount = count || 0;
        const difference = Math.abs(originalCount - currentCount);
        const tolerance = Math.max(1, Math.floor(originalCount * 0.05)); // %5 tolerans

        const tableValidation = {
          table: tableName,
          originalCount,
          currentCount,
          difference,
          withinTolerance: difference <= tolerance,
          success: difference <= tolerance
        };

        validation.validatedTables.push(tableValidation);

        if (!tableValidation.success) {
          validation.success = false;
          validation.issues.push(`${tableName}: Record count mismatch - Expected: ${originalCount}, Found: ${currentCount}`);
        }

        console.log(`   ${tableValidation.success ? '✅' : '⚠️'} ${tableName}: ${currentCount}/${originalCount} kayıt`);

      } catch (error) {
        validation.issues.push(`${tableName}: Validation error - ${error.message}`);
        console.warn(`   ⚠️ ${tableName} doğrulama hatası: ${error.message}`);
      }
    }

    return validation;
  }

  async generateTestData(client, testDataConfig) {
    console.log('   🧪 Test verileri oluşturuluyor...');
    
    const result = {
      success: true,
      generatedData: {},
      errors: []
    };

    try {
      // Test öğretmenler
      if (testDataConfig.generateTestUsers) {
        const testTeachers = [];
        for (let i = 1; i <= Math.min(testDataConfig.testUserCount, 20); i++) {
          testTeachers.push({
            ad: `Test Öğretmen ${i}`,
            soyad: `Soyad ${i}`,
            pin: '1234',
            telefon: `555-${String(1000 + i).padStart(4, '0')}`,
            email: `ogretmen${i}@test.com`
          });
        }

        const { error: teacherError } = await client
          .from('ogretmenler')
          .insert(testTeachers);

        if (teacherError) {
          result.errors.push(`Test teachers: ${teacherError.message}`);
        } else {
          result.generatedData.teachers = testTeachers.length;
          console.log(`   ✅ ${testTeachers.length} test öğretmen oluşturuldu`);
        }
      }

      // Test öğrenciler
      if (testDataConfig.generateTestUsers) {
        const testStudents = [];
        for (let i = 1; i <= Math.min(testDataConfig.testUserCount, 50); i++) {
          testStudents.push({
            ad: `Test Öğrenci ${i}`,
            soyad: `Soyad ${i}`,
            sinif: `11-${String.fromCharCode(65 + (i % 4))}`, // 11-A, 11-B, 11-C, 11-D
            no: String(i).padStart(3, '0'),
            tc_no: `${String(10000000000 + i).substring(0, 11)}`,
            telefon: `555-${String(2000 + i).padStart(4, '0')}`,
            email: `ogrenci${i}@test.com`
          });
        }

        const { error: studentError } = await client
          .from('ogrenciler')
          .insert(testStudents);

        if (studentError) {
          result.errors.push(`Test students: ${studentError.message}`);
        } else {
          result.generatedData.students = testStudents.length;
          console.log(`   ✅ ${testStudents.length} test öğrenci oluşturuldu`);
        }
      }

      // Test işletmeler
      if (testDataConfig.generateTestCompanies) {
        const testCompanies = [];
        for (let i = 1; i <= Math.min(testDataConfig.testCompanyCount, 20); i++) {
          testCompanies.push({
            ad: `Test İşletme ${i}`,
            yetkili_kisi: `Yetkili ${i}`,
            pin: '1234',
            telefon: `555-${String(3000 + i).padStart(4, '0')}`,
            email: `isletme${i}@test.com`,
            adres: `Test Adres ${i}`,
            vergi_no: `${String(1000000000 + i)}`
          });
        }

        const { error: companyError } = await client
          .from('isletmeler')
          .insert(testCompanies);

        if (companyError) {
          result.errors.push(`Test companies: ${companyError.message}`);
        } else {
          result.generatedData.companies = testCompanies.length;
          console.log(`   ✅ ${testCompanies.length} test işletme oluşturuldu`);
        }
      }

    } catch (error) {
      result.errors.push(`Test data generation: ${error.message}`);
      result.success = false;
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async saveSyncLog(log) {
    const logFile = path.join(this.logsDir, `sync-${log.id}.json`);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    
    console.log(`📝 Sync log saved: ${path.basename(logFile)}`);
    return logFile;
  }

  async listEnvironments() {
    const config = this.getConfig();
    const environments = [];

    for (const [envName, envConfig] of Object.entries(config.environments)) {
      const envInfo = {
        name: envName,
        displayName: envConfig.name,
        isProduction: envConfig.isProduction,
        configured: !!(envConfig.supabaseUrl && envConfig.supabaseKey),
        canSync: !envConfig.isProduction || envConfig.allowDataLoss
      };

      // Test connection
      if (envInfo.configured) {
        try {
          const client = this.createSupabaseClient(envName);
          const { data, error } = await client
            .from('alanlar')
            .select('count')
            .limit(1);
          
          envInfo.connectionStatus = error ? 'ERROR' : 'CONNECTED';
          envInfo.connectionError = error?.message;
        } catch (error) {
          envInfo.connectionStatus = 'ERROR';
          envInfo.connectionError = error.message;
        }
      } else {
        envInfo.connectionStatus = 'NOT_CONFIGURED';
      }

      environments.push(envInfo);
    }

    return environments;
  }

  async getSyncHistory() {
    try {
      const logs = [];
      
      if (fs.existsSync(this.logsDir)) {
        const files = fs.readdirSync(this.logsDir)
          .filter(file => file.startsWith('sync-') && file.endsWith('.json'))
          .map(file => {
            const fullPath = path.join(this.logsDir, file);
            const log = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return {
              id: log.id,
              sourceEnv: log.sourceEnv,
              targetEnv: log.targetEnv,
              status: log.status,
              startTime: log.startTime,
              endTime: log.endTime,
              duration: log.duration,
              file: fullPath
            };
          })
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        logs.push(...files);
      }
      
      return logs;
    } catch (error) {
      console.error('❌ Sync history error:', error);
      return [];
    }
  }

  async refreshStagingFromProduction() {
    return await this.syncEnvironments('production', 'staging', {
      anonymizeData: true,
      skipValidation: false
    });
  }

  async setupDevelopmentEnvironment() {
    return await this.syncEnvironments('production', 'development', {
      anonymizeData: true,
      generateTestData: true,
      skipValidation: true
    });
  }

  async cleanupOldSyncLogs(keepCount = 20) {
    try {
      const history = await this.getSyncHistory();
      
      if (history.length > keepCount) {
        const filesToDelete = history.slice(keepCount);
        
        for (const log of filesToDelete) {
          try {
            fs.unlinkSync(log.file);
            console.log(`🗑️ Eski sync log silindi: ${path.basename(log.file)}`);
          } catch (error) {
            console.warn(`⚠️ Sync log silinirken hata: ${path.basename(log.file)}`);
          }
        }
      }
      
      console.log(`🧹 Sync log temizliği tamamlandı: ${Math.max(0, history.length - keepCount)} dosya silindi`);
    } catch (error) {
      console.error('❌ Sync log cleanup hatası:', error);
    }
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const staging = new StagingEnvironmentManager();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'sync':
      const sourceEnv = args[1];
      const targetEnv = args[2];
      const forceProduction = args.includes('--force-production');
      
      if (!sourceEnv || !targetEnv) {
        console.error('❌ Source ve target environment belirtilmedi!');
        console.log('Kullanım: node staging-environment-manager.js sync <source> <target> [--force-production]');
        process.exit(1);
      }
      
      staging.syncEnvironments(sourceEnv, targetEnv, { forceProduction })
        .then(result => {
          console.log('🎉 Environment sync completed!');
          console.log(`📊 Status: ${result.status}`);
          process.exit(result.status === 'COMPLETED' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Sync failed:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      staging.listEnvironments()
        .then(environments => {
          console.log('🌍 Available Environments:');
          environments.forEach((env, index) => {
            console.log(`${index + 1}. ${env.displayName} (${env.name})`);
            console.log(`   🔧 Configured: ${env.configured ? 'YES' : 'NO'}`);
            console.log(`   🔗 Connection: ${env.connectionStatus}`);
            console.log(`   🚀 Production: ${env.isProduction ? 'YES' : 'NO'}`);
            console.log(`   🔄 Can Sync: ${env.canSync ? 'YES' : 'NO'}`);
            if (env.connectionError) {
              console.log(`   ❌ Error: ${env.connectionError}`);
            }
            console.log('');
          });
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ List environments error:', error);
          process.exit(1);
        });
      break;
      
    case 'history':
      staging.getSyncHistory()
        .then(history => {
          console.log('📋 Sync History:');
          history.forEach((log, index) => {
            console.log(`${index + 1}. ${log.id}`);
            console.log(`   🔄 ${log.sourceEnv} → ${log.targetEnv}`);
            console.log(`   📊 Status: ${log.status}`);
            console.log(`   📅 ${new Date(log.startTime).toLocaleString('tr-TR')}`);
            if (log.duration) {
              console.log(`   ⏱️ Duration: ${Math.round(log.duration/1000)}s`);
            }
            console.log('');
          });
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ History error:', error);
          process.exit(1);
        });
      break;
      
    case 'refresh-staging':
      staging.refreshStagingFromProduction()
        .then(result => {
          console.log('🎉 Staging refresh completed!');
          console.log(`📊 Status: ${result.status}`);
          process.exit(result.status === 'COMPLETED' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Staging refresh failed:', error);
          process.exit(1);
        });
      break;
      
    case 'setup-dev':
      staging.setupDevelopmentEnvironment()
        .then(result => {
          console.log('🎉 Development setup completed!');
          console.log(`📊 Status: ${result.status}`);
          process.exit(result.status === 'COMPLETED' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Development setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      const keepCount = parseInt(args[1]) || 20;
      staging.cleanupOldSyncLogs(keepCount)
        .then(() => {
          console.log('🧹 Cleanup completed!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Cleanup error:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Staging Environment Manager');
      console.log('');
      console.log('Kullanım: node staging-environment-manager.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  sync <source> <target> [--force-production]  - Environment\'lar arası sync');
      console.log('  list                                         - Mevcut environment\'ları listele');
      console.log('  history                                      - Sync geçmişini göster');
      console.log('  refresh-staging                              - Staging\'i production\'dan yenile');
      console.log('  setup-dev                                    - Development environment kur');
      console.log('  cleanup [count]                              - Eski sync log\'larını temizle');
      console.log('');
      console.log('Environment\'lar: production, staging, development');
      process.exit(1);
  }
}

module.exports = { StagingEnvironmentManager };