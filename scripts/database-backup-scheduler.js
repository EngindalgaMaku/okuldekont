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
      version: '2.0.0',
      tables: {},
      functions: {},
      triggers: {},
      policies: {},
      types: {},
      views: {},
      sequences: {},
      indexes: {},
      constraints: {},
      extensions: {},
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

    console.log('📊 Full database backup başlatılıyor (tables + schema objects)...');

    // 1. Tüm tabloları yedekle
    await this.backupTables(backupData);
    
    // 2. Fonksiyonları yedekle (RPC'ler dahil)
    await this.backupFunctions(backupData);
    
    // 3. Trigger'ları yedekle
    await this.backupTriggers(backupData);
    
    // 4. RLS Policies yedekle
    await this.backupPolicies(backupData);
    
    // 5. Custom Types yedekle
    await this.backupTypes(backupData);
    
    // 6. Views yedekle
    await this.backupViews(backupData);
    
    // 7. Sequences yedekle
    await this.backupSequences(backupData);
    
    // 8. Indexes yedekle
    await this.backupIndexes(backupData);
    
    // 9. Constraints yedekle
    await this.backupConstraints(backupData);
    
    // 10. Extensions yedekle
    await this.backupExtensions(backupData);

    return backupData;
  }

  async backupTables(backupData) {
    console.log('📋 Tablo verileri yedekleniyor...');
    
    const tables = [
      'alanlar', 'egitim_yillari', 'ogretmenler', 'siniflar',
      'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar',
      'isletme_alanlar', 'system_settings', 'isletme_koordinatorler',
      'isletme_giris_denemeleri', 'ogretmen_giris_denemeleri'
    ];

    for (const table of tables) {
      try {
        console.log(`   📋 ${table} tablosu...`);
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.warn(`   ⚠️ ${table} yedeklenirken hata: ${error.message}`);
          continue;
        }
        
        backupData.tables[table] = {
          data: data || [],
          count: data?.length || 0,
          lastUpdated: new Date().toISOString()
        };
        
        console.log(`   ✅ ${data?.length || 0} ${table} kaydı yedeklendi`);
      } catch (error) {
        console.warn(`   ⚠️ ${table} yedeklenirken hata: ${error.message}`);
        backupData.tables[table] = {
          data: [],
          count: 0,
          error: error.message
        };
      }
    }
  }

  async backupFunctions(backupData) {
    console.log('🔧 Fonksiyonlar ve RPC\'ler yedekleniyor...');
    
    try {
      const { data: functions, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            routine_name,
            routine_definition,
            routine_type,
            data_type as return_type,
            routine_schema,
            security_type,
            is_deterministic,
            sql_data_access,
            routine_body,
            external_language
          FROM information_schema.routines
          WHERE routine_schema = 'public'
          ORDER BY routine_name;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Fonksiyon backup hatası: ${error.message}`);
        return;
      }

      if (functions.data && functions.data.length > 0) {
        functions.data.forEach(func => {
          backupData.functions[func.routine_name] = {
            name: func.routine_name,
            definition: func.routine_definition,
            type: func.routine_type,
            returnType: func.return_type,
            schema: func.routine_schema,
            securityType: func.security_type,
            isDeterministic: func.is_deterministic,
            dataAccess: func.sql_data_access,
            body: func.routine_body,
            language: func.external_language,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${functions.data.length} fonksiyon yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç fonksiyon bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Fonksiyon backup hatası: ${error.message}`);
    }
  }

  async backupTriggers(backupData) {
    console.log('⚡ Trigger\'lar yedekleniyor...');
    
    try {
      const { data: triggers, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            trigger_name,
            trigger_schema,
            event_object_table,
            action_statement,
            action_timing,
            event_manipulation,
            action_orientation,
            action_condition
          FROM information_schema.triggers
          WHERE trigger_schema = 'public'
          ORDER BY trigger_name;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Trigger backup hatası: ${error.message}`);
        return;
      }

      if (triggers.data && triggers.data.length > 0) {
        triggers.data.forEach(trigger => {
          const triggerKey = `${trigger.event_object_table}.${trigger.trigger_name}`;
          backupData.triggers[triggerKey] = {
            name: trigger.trigger_name,
            schema: trigger.trigger_schema,
            table: trigger.event_object_table,
            statement: trigger.action_statement,
            timing: trigger.action_timing,
            event: trigger.event_manipulation,
            orientation: trigger.action_orientation,
            condition: trigger.action_condition,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${triggers.data.length} trigger yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç trigger bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Trigger backup hatası: ${error.message}`);
    }
  }

  async backupPolicies(backupData) {
    console.log('🛡️ RLS Policies yedekleniyor...');
    
    try {
      const { data: policies, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Policy backup hatası: ${error.message}`);
        return;
      }

      if (policies.data && policies.data.length > 0) {
        policies.data.forEach(policy => {
          const policyKey = `${policy.tablename}.${policy.policyname}`;
          backupData.policies[policyKey] = {
            schema: policy.schemaname,
            table: policy.tablename,
            name: policy.policyname,
            permissive: policy.permissive,
            roles: policy.roles,
            command: policy.cmd,
            using: policy.qual,
            withCheck: policy.with_check,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${policies.data.length} RLS policy yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç RLS policy bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Policy backup hatası: ${error.message}`);
    }
  }

  async backupTypes(backupData) {
    console.log('🏷️ Custom Types yedekleniyor...');
    
    try {
      const { data: types, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            t.typname,
            t.typtype,
            pg_catalog.format_type(t.oid, NULL) AS formatted_type,
            CASE
              WHEN t.typtype = 'e' THEN array_to_string(array_agg(e.enumlabel ORDER BY e.enumsortorder), ',')
              ELSE NULL
            END as enum_values
          FROM pg_type t
          LEFT JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND t.typtype IN ('e', 'c', 'd')
          GROUP BY t.typname, t.typtype, t.oid
          ORDER BY t.typname;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Type backup hatası: ${error.message}`);
        return;
      }

      if (types.data && types.data.length > 0) {
        types.data.forEach(type => {
          backupData.types[type.typname] = {
            name: type.typname,
            type: type.typtype,
            formattedType: type.formatted_type,
            enumValues: type.enum_values ? type.enum_values.split(',') : null,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${types.data.length} custom type yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç custom type bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Type backup hatası: ${error.message}`);
    }
  }

  async backupViews(backupData) {
    console.log('👁️ Views yedekleniyor...');
    
    try {
      const { data: views, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            table_name,
            view_definition,
            check_option,
            is_updatable,
            is_insertable_into,
            is_trigger_updatable,
            is_trigger_deletable,
            is_trigger_insertable_into
          FROM information_schema.views
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `
      });

      if (error) {
        console.warn(`   ⚠️ View backup hatası: ${error.message}`);
        return;
      }

      if (views.data && views.data.length > 0) {
        views.data.forEach(view => {
          backupData.views[view.table_name] = {
            name: view.table_name,
            definition: view.view_definition,
            checkOption: view.check_option,
            isUpdatable: view.is_updatable,
            isInsertable: view.is_insertable_into,
            isTriggerUpdatable: view.is_trigger_updatable,
            isTriggerDeletable: view.is_trigger_deletable,
            isTriggerInsertable: view.is_trigger_insertable_into,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${views.data.length} view yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç view bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ View backup hatası: ${error.message}`);
    }
  }

  async backupSequences(backupData) {
    console.log('🔢 Sequences yedekleniyor...');
    
    try {
      const { data: sequences, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            sequence_name,
            data_type,
            start_value,
            minimum_value,
            maximum_value,
            increment,
            cycle_option
          FROM information_schema.sequences
          WHERE sequence_schema = 'public'
          ORDER BY sequence_name;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Sequence backup hatası: ${error.message}`);
        return;
      }

      if (sequences.data && sequences.data.length > 0) {
        // Her sequence için current value'yu da al
        for (const seq of sequences.data) {
          try {
            const { data: currentVal, error: valError } = await supabase.rpc('exec_sql', {
              query: `SELECT last_value FROM ${seq.sequence_name};`
            });
            
            backupData.sequences[seq.sequence_name] = {
              name: seq.sequence_name,
              dataType: seq.data_type,
              startValue: seq.start_value,
              minValue: seq.minimum_value,
              maxValue: seq.maximum_value,
              increment: seq.increment,
              cycleOption: seq.cycle_option,
              currentValue: !valError && currentVal.data ? currentVal.data[0].last_value : null,
              backupDate: new Date().toISOString()
            };
          } catch (error) {
            backupData.sequences[seq.sequence_name] = {
              ...seq,
              currentValue: null,
              error: error.message,
              backupDate: new Date().toISOString()
            };
          }
        }
        
        console.log(`   ✅ ${sequences.data.length} sequence yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç sequence bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Sequence backup hatası: ${error.message}`);
    }
  }

  async backupIndexes(backupData) {
    console.log('📚 Indexes yedekleniyor...');
    
    try {
      const { data: indexes, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            indexname,
            tablename,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'
          ORDER BY tablename, indexname;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Index backup hatası: ${error.message}`);
        return;
      }

      if (indexes.data && indexes.data.length > 0) {
        indexes.data.forEach(index => {
          const indexKey = `${index.tablename}.${index.indexname}`;
          backupData.indexes[indexKey] = {
            name: index.indexname,
            table: index.tablename,
            definition: index.indexdef,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${indexes.data.length} index yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç custom index bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Index backup hatası: ${error.message}`);
    }
  }

  async backupConstraints(backupData) {
    console.log('🔒 Constraints yedekleniyor...');
    
    try {
      const { data: constraints, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule,
            cc.check_clause
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
          LEFT JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          LEFT JOIN information_schema.check_constraints cc
            ON tc.constraint_name = cc.constraint_name
          WHERE tc.table_schema = 'public'
          AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
          ORDER BY tc.table_name, tc.constraint_name;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Constraint backup hatası: ${error.message}`);
        return;
      }

      if (constraints.data && constraints.data.length > 0) {
        constraints.data.forEach(constraint => {
          const constraintKey = `${constraint.table_name}.${constraint.constraint_name}`;
          backupData.constraints[constraintKey] = {
            table: constraint.table_name,
            name: constraint.constraint_name,
            type: constraint.constraint_type,
            column: constraint.column_name,
            foreignTable: constraint.foreign_table_name,
            foreignColumn: constraint.foreign_column_name,
            updateRule: constraint.update_rule,
            deleteRule: constraint.delete_rule,
            checkClause: constraint.check_clause,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${constraints.data.length} constraint yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç custom constraint bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Constraint backup hatası: ${error.message}`);
    }
  }

  async backupExtensions(backupData) {
    console.log('🧩 Extensions yedekleniyor...');
    
    try {
      const { data: extensions, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT
            extname as name,
            extversion as version,
            extrelocatable as relocatable
          FROM pg_extension
          WHERE extname NOT IN ('plpgsql')
          ORDER BY extname;
        `
      });

      if (error) {
        console.warn(`   ⚠️ Extension backup hatası: ${error.message}`);
        return;
      }

      if (extensions.data && extensions.data.length > 0) {
        extensions.data.forEach(ext => {
          backupData.extensions[ext.name] = {
            name: ext.name,
            version: ext.version,
            relocatable: ext.relocatable,
            backupDate: new Date().toISOString()
          };
        });
        
        console.log(`   ✅ ${extensions.data.length} extension yedeklendi`);
      } else {
        console.log(`   ℹ️ Hiç custom extension bulunamadı`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Extension backup hatası: ${error.message}`);
    }
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