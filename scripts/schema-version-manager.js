const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

class SchemaVersionManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../supabase/migrations');
    this.schemaDir = path.join(__dirname, '../schema');
    this.versionsFile = path.join(this.schemaDir, 'versions.json');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.schemaDir)) {
      fs.mkdirSync(this.schemaDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.versionsFile)) {
      fs.writeFileSync(this.versionsFile, JSON.stringify({
        currentVersion: '0.0.0',
        versions: {},
        lastUpdate: new Date().toISOString()
      }, null, 2));
    }
  }

  async getCurrentSchemaVersion() {
    try {
      const versions = JSON.parse(fs.readFileSync(this.versionsFile, 'utf8'));
      return versions.currentVersion;
    } catch (error) {
      console.warn('⚠️ Versiyon dosyası okunamadı, varsayılan versiyon kullanılıyor');
      return '0.0.0';
    }
  }

  async captureCurrentSchema() {
    console.log('📋 Mevcut veritabanı şeması yakalanıyor...');
    
    try {
      const schema = {
        timestamp: new Date().toISOString(),
        tables: {},
        functions: {},
        triggers: {},
        policies: {},
        types: {},
        indexes: {}
      };

      // Tablo bilgilerini al
      const tablesQuery = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position;
      `;

      const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
        query: tablesQuery
      });

      if (columnsError) {
        console.error('❌ Tablo bilgileri alınırken hata:', columnsError);
        throw columnsError;
      }

      // Tabloları grupla
      if (columns.data) {
        columns.data.forEach(column => {
          const tableName = column.table_name;
          if (!schema.tables[tableName]) {
            schema.tables[tableName] = {
              columns: [],
              constraints: [],
              indexes: []
            };
          }
          
          schema.tables[tableName].columns.push({
            name: column.column_name,
            type: column.data_type,
            nullable: column.is_nullable === 'YES',
            default: column.column_default,
            maxLength: column.character_maximum_length,
            precision: column.numeric_precision,
            scale: column.numeric_scale
          });
        });
      }

      // Constraint bilgilerini al
      const constraintsQuery = `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name;
      `;

      const { data: constraints, error: constraintsError } = await supabase.rpc('exec_sql', {
        query: constraintsQuery
      });

      if (!constraintsError && constraints.data) {
        constraints.data.forEach(constraint => {
          const tableName = constraint.table_name;
          if (schema.tables[tableName]) {
            schema.tables[tableName].constraints.push({
              name: constraint.constraint_name,
              type: constraint.constraint_type,
              column: constraint.column_name,
              foreignTable: constraint.foreign_table_name,
              foreignColumn: constraint.foreign_column_name
            });
          }
        });
      }

      // Fonksiyon bilgilerini al
      const functionsQuery = `
        SELECT 
          routine_name,
          routine_definition,
          routine_type,
          data_type as return_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        ORDER BY routine_name;
      `;

      const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
        query: functionsQuery
      });

      if (!functionsError && functions.data) {
        functions.data.forEach(func => {
          schema.functions[func.routine_name] = {
            name: func.routine_name,
            definition: func.routine_definition,
            type: func.routine_type,
            returnType: func.return_type
          };
        });
      }

      // RLS politikalarını al
      const policiesQuery = `
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
      `;

      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        query: policiesQuery
      });

      if (!policiesError && policies.data) {
        policies.data.forEach(policy => {
          const tableName = policy.tablename;
          if (!schema.policies[tableName]) {
            schema.policies[tableName] = [];
          }
          
          schema.policies[tableName].push({
            name: policy.policyname,
            permissive: policy.permissive,
            roles: policy.roles,
            command: policy.cmd,
            using: policy.qual,
            withCheck: policy.with_check
          });
        });
      }

      // İndeks bilgilerini al
      const indexesQuery = `
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;

      const { data: indexes, error: indexesError } = await supabase.rpc('exec_sql', {
        query: indexesQuery
      });

      if (!indexesError && indexes.data) {
        indexes.data.forEach(index => {
          const tableName = index.tablename;
          if (!schema.indexes[tableName]) {
            schema.indexes[tableName] = [];
          }
          
          schema.indexes[tableName].push({
            name: index.indexname,
            definition: index.indexdef
          });
        });
      }

      console.log('✅ Şema yakalandı!');
      console.log(`📊 Tablolar: ${Object.keys(schema.tables).length}`);
      console.log(`🔧 Fonksiyonlar: ${Object.keys(schema.functions).length}`);
      console.log(`🛡️ Politikalar: ${Object.keys(schema.policies).length}`);

      return schema;
    } catch (error) {
      console.error('❌ Şema yakalama hatası:', error);
      throw error;
    }
  }

  generateSchemaHash(schema) {
    // Şema objesini JSON string'e çevir ve hash oluştur
    const schemaString = JSON.stringify(schema, null, 0);
    return crypto.createHash('sha256').update(schemaString).digest('hex');
  }

  async saveSchemaVersion(version, schema, description = '') {
    const schemaHash = this.generateSchemaHash(schema);
    
    // Versiyon bilgilerini yükle
    const versions = JSON.parse(fs.readFileSync(this.versionsFile, 'utf8'));
    
    // Yeni versiyon ekle
    versions.versions[version] = {
      hash: schemaHash,
      timestamp: new Date().toISOString(),
      description,
      tables: Object.keys(schema.tables).length,
      functions: Object.keys(schema.functions).length,
      policies: Object.keys(schema.policies).length
    };
    
    versions.currentVersion = version;
    versions.lastUpdate = new Date().toISOString();
    
    // Versiyon dosyasını güncelle
    fs.writeFileSync(this.versionsFile, JSON.stringify(versions, null, 2));
    
    // Şema dosyasını kaydet
    const schemaFile = path.join(this.schemaDir, `schema-${version}.json`);
    fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
    
    console.log(`✅ Şema versiyonu kaydedildi: ${version}`);
    console.log(`🔑 Hash: ${schemaHash}`);
    console.log(`📁 Dosya: ${schemaFile}`);
    
    return { version, hash: schemaHash, file: schemaFile };
  }

  async createNewVersion(newVersion, description = '') {
    console.log(`🔄 Yeni şema versiyonu oluşturuluyor: ${newVersion}`);
    
    try {
      // Mevcut şemayı yakala
      const schema = await this.captureCurrentSchema();
      
      // Versiyon kaydet
      const result = await this.saveSchemaVersion(newVersion, schema, description);
      
      // Değişiklikleri analiz et
      const changes = await this.analyzeSchemaChanges(newVersion);
      
      console.log('✅ Yeni versiyon oluşturuldu!');
      
      return {
        ...result,
        changes
      };
    } catch (error) {
      console.error('❌ Versiyon oluşturma hatası:', error);
      throw error;
    }
  }

  async analyzeSchemaChanges(version) {
    try {
      const versions = JSON.parse(fs.readFileSync(this.versionsFile, 'utf8'));
      const versionList = Object.keys(versions.versions).sort();
      
      if (versionList.length < 2) {
        return { changes: [], isFirstVersion: true };
      }
      
      const currentIndex = versionList.indexOf(version);
      if (currentIndex === -1 || currentIndex === 0) {
        return { changes: [], isFirstVersion: true };
      }
      
      const previousVersion = versionList[currentIndex - 1];
      
      // Şema dosyalarını yükle
      const currentSchemaFile = path.join(this.schemaDir, `schema-${version}.json`);
      const previousSchemaFile = path.join(this.schemaDir, `schema-${previousVersion}.json`);
      
      if (!fs.existsSync(currentSchemaFile) || !fs.existsSync(previousSchemaFile)) {
        return { changes: ['Önceki versiyon bulunamadı'], isFirstVersion: false };
      }
      
      const currentSchema = JSON.parse(fs.readFileSync(currentSchemaFile, 'utf8'));
      const previousSchema = JSON.parse(fs.readFileSync(previousSchemaFile, 'utf8'));
      
      const changes = [];
      
      // Tablo değişikliklerini analiz et
      const currentTables = Object.keys(currentSchema.tables);
      const previousTables = Object.keys(previousSchema.tables);
      
      // Yeni tablolar
      const newTables = currentTables.filter(table => !previousTables.includes(table));
      newTables.forEach(table => {
        changes.push({
          type: 'TABLE_ADDED',
          table,
          description: `Yeni tablo eklendi: ${table}`
        });
      });
      
      // Silinen tablolar
      const deletedTables = previousTables.filter(table => !currentTables.includes(table));
      deletedTables.forEach(table => {
        changes.push({
          type: 'TABLE_DELETED',
          table,
          description: `Tablo silindi: ${table}`
        });
      });
      
      // Mevcut tablolardaki değişiklikler
      const commonTables = currentTables.filter(table => previousTables.includes(table));
      commonTables.forEach(table => {
        const currentColumns = currentSchema.tables[table].columns;
        const previousColumns = previousSchema.tables[table].columns;
        
        // Yeni kolonlar
        const newColumns = currentColumns.filter(col => 
          !previousColumns.find(prevCol => prevCol.name === col.name)
        );
        newColumns.forEach(col => {
          changes.push({
            type: 'COLUMN_ADDED',
            table,
            column: col.name,
            description: `${table} tablosuna yeni kolon eklendi: ${col.name} (${col.type})`
          });
        });
        
        // Silinen kolonlar
        const deletedColumns = previousColumns.filter(col => 
          !currentColumns.find(currCol => currCol.name === col.name)
        );
        deletedColumns.forEach(col => {
          changes.push({
            type: 'COLUMN_DELETED',
            table,
            column: col.name,
            description: `${table} tablosundan kolon silindi: ${col.name}`
          });
        });
        
        // Değişen kolonlar
        const changedColumns = currentColumns.filter(col => {
          const prevCol = previousColumns.find(prevCol => prevCol.name === col.name);
          return prevCol && (
            prevCol.type !== col.type ||
            prevCol.nullable !== col.nullable ||
            prevCol.default !== col.default
          );
        });
        
        changedColumns.forEach(col => {
          changes.push({
            type: 'COLUMN_MODIFIED',
            table,
            column: col.name,
            description: `${table} tablosunda kolon değiştirildi: ${col.name}`
          });
        });
      });
      
      // Fonksiyon değişiklikleri
      const currentFunctions = Object.keys(currentSchema.functions);
      const previousFunctions = Object.keys(previousSchema.functions);
      
      const newFunctions = currentFunctions.filter(func => !previousFunctions.includes(func));
      newFunctions.forEach(func => {
        changes.push({
          type: 'FUNCTION_ADDED',
          function: func,
          description: `Yeni fonksiyon eklendi: ${func}`
        });
      });
      
      const deletedFunctions = previousFunctions.filter(func => !currentFunctions.includes(func));
      deletedFunctions.forEach(func => {
        changes.push({
          type: 'FUNCTION_DELETED',
          function: func,
          description: `Fonksiyon silindi: ${func}`
        });
      });
      
      return {
        changes,
        isFirstVersion: false,
        previousVersion,
        summary: {
          totalChanges: changes.length,
          tablesAdded: newTables.length,
          tablesDeleted: deletedTables.length,
          columnsAdded: changes.filter(c => c.type === 'COLUMN_ADDED').length,
          columnsDeleted: changes.filter(c => c.type === 'COLUMN_DELETED').length,
          columnsModified: changes.filter(c => c.type === 'COLUMN_MODIFIED').length,
          functionsAdded: newFunctions.length,
          functionsDeleted: deletedFunctions.length
        }
      };
    } catch (error) {
      console.error('❌ Şema analizi hatası:', error);
      return { changes: [], error: error.message };
    }
  }

  async listVersions() {
    try {
      const versions = JSON.parse(fs.readFileSync(this.versionsFile, 'utf8'));
      
      const versionList = Object.entries(versions.versions)
        .map(([version, info]) => ({
          version,
          ...info
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return {
        currentVersion: versions.currentVersion,
        versions: versionList
      };
    } catch (error) {
      console.error('❌ Versiyon listesi alınırken hata:', error);
      return { currentVersion: '0.0.0', versions: [] };
    }
  }

  async compareVersions(version1, version2) {
    try {
      console.log(`🔍 Versiyon karşılaştırması: ${version1} vs ${version2}`);
      
      const schema1File = path.join(this.schemaDir, `schema-${version1}.json`);
      const schema2File = path.join(this.schemaDir, `schema-${version2}.json`);
      
      if (!fs.existsSync(schema1File) || !fs.existsSync(schema2File)) {
        throw new Error('Karşılaştırma için şema dosyaları bulunamadı');
      }
      
      const schema1 = JSON.parse(fs.readFileSync(schema1File, 'utf8'));
      const schema2 = JSON.parse(fs.readFileSync(schema2File, 'utf8'));
      
      const comparison = {
        version1,
        version2,
        differences: []
      };
      
      // Tablo karşılaştırması
      const tables1 = Object.keys(schema1.tables);
      const tables2 = Object.keys(schema2.tables);
      
      const onlyInV1 = tables1.filter(table => !tables2.includes(table));
      const onlyInV2 = tables2.filter(table => !tables1.includes(table));
      const commonTables = tables1.filter(table => tables2.includes(table));
      
      onlyInV1.forEach(table => {
        comparison.differences.push({
          type: 'TABLE_ONLY_IN_V1',
          table,
          description: `Tablo sadece ${version1}'de var: ${table}`
        });
      });
      
      onlyInV2.forEach(table => {
        comparison.differences.push({
          type: 'TABLE_ONLY_IN_V2',
          table,
          description: `Tablo sadece ${version2}'de var: ${table}`
        });
      });
      
      // Ortak tablolardaki farklılıkları kontrol et
      commonTables.forEach(table => {
        const columns1 = schema1.tables[table].columns;
        const columns2 = schema2.tables[table].columns;
        
        const columnNames1 = columns1.map(col => col.name);
        const columnNames2 = columns2.map(col => col.name);
        
        const onlyInV1Cols = columnNames1.filter(col => !columnNames2.includes(col));
        const onlyInV2Cols = columnNames2.filter(col => !columnNames1.includes(col));
        
        onlyInV1Cols.forEach(col => {
          comparison.differences.push({
            type: 'COLUMN_ONLY_IN_V1',
            table,
            column: col,
            description: `${table}.${col} sadece ${version1}'de var`
          });
        });
        
        onlyInV2Cols.forEach(col => {
          comparison.differences.push({
            type: 'COLUMN_ONLY_IN_V2',
            table,
            column: col,
            description: `${table}.${col} sadece ${version2}'de var`
          });
        });
      });
      
      return comparison;
    } catch (error) {
      console.error('❌ Versiyon karşılaştırma hatası:', error);
      throw error;
    }
  }

  async generateMigrationSQL(fromVersion, toVersion) {
    try {
      console.log(`🔄 Migration SQL oluşturuluyor: ${fromVersion} → ${toVersion}`);
      
      const comparison = await this.compareVersions(fromVersion, toVersion);
      const sqlStatements = [];
      
      comparison.differences.forEach(diff => {
        switch (diff.type) {
          case 'TABLE_ONLY_IN_V2':
            sqlStatements.push(`-- Yeni tablo: ${diff.table}`);
            sqlStatements.push(`-- CREATE TABLE ${diff.table} (...);`);
            sqlStatements.push('');
            break;
            
          case 'COLUMN_ONLY_IN_V2':
            sqlStatements.push(`-- Yeni kolon: ${diff.table}.${diff.column}`);
            sqlStatements.push(`-- ALTER TABLE ${diff.table} ADD COLUMN ${diff.column} ...;`);
            sqlStatements.push('');
            break;
            
          case 'TABLE_ONLY_IN_V1':
            sqlStatements.push(`-- Silinen tablo: ${diff.table}`);
            sqlStatements.push(`-- DROP TABLE ${diff.table};`);
            sqlStatements.push('');
            break;
            
          case 'COLUMN_ONLY_IN_V1':
            sqlStatements.push(`-- Silinen kolon: ${diff.table}.${diff.column}`);
            sqlStatements.push(`-- ALTER TABLE ${diff.table} DROP COLUMN ${diff.column};`);
            sqlStatements.push('');
            break;
        }
      });
      
      const migrationSQL = [
        `-- Migration from ${fromVersion} to ${toVersion}`,
        `-- Generated on ${new Date().toISOString()}`,
        '',
        ...sqlStatements
      ].join('\n');
      
      // Migration dosyasını kaydet
      const migrationFile = path.join(this.schemaDir, `migration-${fromVersion}-to-${toVersion}.sql`);
      fs.writeFileSync(migrationFile, migrationSQL);
      
      console.log(`✅ Migration SQL oluşturuldu: ${migrationFile}`);
      
      return {
        sql: migrationSQL,
        file: migrationFile,
        changes: comparison.differences.length
      };
    } catch (error) {
      console.error('❌ Migration SQL oluşturma hatası:', error);
      throw error;
    }
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const manager = new SchemaVersionManager();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'capture':
      const version = args[1];
      const description = args.slice(2).join(' ');
      
      if (!version) {
        console.error('❌ Versiyon belirtilmedi!');
        console.log('Kullanım: node schema-version-manager.js capture <version> [description]');
        process.exit(1);
      }
      
      manager.createNewVersion(version, description)
        .then(result => {
          console.log('🎉 Şema versiyonu oluşturuldu!');
          console.log(`📋 Değişiklikler: ${result.changes.changes.length}`);
        })
        .catch(error => {
          console.error('❌ Hata:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      manager.listVersions()
        .then(result => {
          console.log('📋 Şema Versiyonları:');
          console.log(`🔵 Mevcut: ${result.currentVersion}`);
          console.log('');
          
          result.versions.forEach((version, index) => {
            console.log(`${index + 1}. ${version.version}`);
            console.log(`   📅 ${new Date(version.timestamp).toLocaleString('tr-TR')}`);
            console.log(`   📊 Tablolar: ${version.tables}, Fonksiyonlar: ${version.functions}`);
            console.log(`   💬 ${version.description || 'Açıklama yok'}`);
            console.log('');
          });
        })
        .catch(error => {
          console.error('❌ Hata:', error);
          process.exit(1);
        });
      break;
      
    case 'compare':
      const v1 = args[1];
      const v2 = args[2];
      
      if (!v1 || !v2) {
        console.error('❌ İki versiyon belirtilmedi!');
        console.log('Kullanım: node schema-version-manager.js compare <version1> <version2>');
        process.exit(1);
      }
      
      manager.compareVersions(v1, v2)
        .then(comparison => {
          console.log(`🔍 Karşılaştırma: ${v1} vs ${v2}`);
          console.log(`📊 Toplam fark: ${comparison.differences.length}`);
          console.log('');
          
          comparison.differences.forEach((diff, index) => {
            console.log(`${index + 1}. ${diff.description}`);
          });
        })
        .catch(error => {
          console.error('❌ Hata:', error);
          process.exit(1);
        });
      break;
      
    case 'migrate':
      const from = args[1];
      const to = args[2];
      
      if (!from || !to) {
        console.error('❌ Kaynak ve hedef versiyon belirtilmedi!');
        console.log('Kullanım: node schema-version-manager.js migrate <from> <to>');
        process.exit(1);
      }
      
      manager.generateMigrationSQL(from, to)
        .then(result => {
          console.log('🔄 Migration SQL oluşturuldu!');
          console.log(`📁 Dosya: ${result.file}`);
          console.log(`📊 Değişiklik sayısı: ${result.changes}`);
        })
        .catch(error => {
          console.error('❌ Hata:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Schema Version Manager');
      console.log('');
      console.log('Kullanım: node schema-version-manager.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  capture <version> [description]  - Mevcut şemayı yakala ve versiyon oluştur');
      console.log('  list                             - Tüm versiyonları listele');
      console.log('  compare <v1> <v2>               - İki versiyon arasındaki farkları göster');
      console.log('  migrate <from> <to>             - Migration SQL oluştur');
      process.exit(1);
  }
}

module.exports = { SchemaVersionManager };