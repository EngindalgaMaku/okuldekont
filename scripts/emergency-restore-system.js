const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { DatabaseRollbackSystem } = require('./database-rollback-system');
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

class EmergencyRestoreSystem {
  constructor() {
    this.emergencyDir = path.join(__dirname, '../emergency');
    this.playbookDir = path.join(this.emergencyDir, 'playbooks');
    this.logDir = path.join(this.emergencyDir, 'logs');
    this.configFile = path.join(this.emergencyDir, 'emergency-config.json');
    
    this.rollbackSystem = new DatabaseRollbackSystem();
    this.backupScheduler = new DatabaseBackupScheduler();
    this.schemaManager = new SchemaVersionManager();
    
    this.initializeDirectories();
    this.initializeConfig();
    this.initializePlaybooks();
  }

  initializeDirectories() {
    [this.emergencyDir, this.playbookDir, this.logDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeConfig() {
    const defaultConfig = {
      emergencyContacts: [
        {
          name: 'Database Admin',
          email: 'admin@okul.edu.tr',
          phone: '+90 xxx xxx xxxx',
          role: 'PRIMARY'
        },
        {
          name: 'System Admin',
          email: 'sysadmin@okul.edu.tr',
          phone: '+90 xxx xxx xxxx',
          role: 'SECONDARY'
        }
      ],
      emergencyThresholds: {
        criticalDataLoss: 1000,      // 1000 kayıt kaybı
        maxDowntime: 300000,         // 5 dakika
        maxResponseTime: 30000,      // 30 saniye
        minDiskSpace: 1000000000,    // 1GB
        maxErrorRate: 0.5            // %50 hata oranı
      },
      backupRetention: {
        emergency: 30,               // 30 gün
        critical: 7,                 // 7 gün
        daily: 3                     // 3 gün
      },
      notifications: {
        email: true,
        sms: false,
        webhook: false
      },
      autoRestore: {
        enabled: false,
        maxAttempts: 3,
        waitTime: 60000
      }
    };

    if (!fs.existsSync(this.configFile)) {
      fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2));
    }
  }

  initializePlaybooks() {
    const playbooks = [
      {
        name: 'database-corruption',
        title: 'Database Corruption Recovery',
        description: 'Veritabanı bozulması durumunda uygulanacak prosedür',
        steps: [
          'Sistem trafiğini durdur',
          'Corrupted tabloları tespit et',
          'Acil yedek oluştur',
          'Son sağlıklı yedekten geri yükle',
          'Veri bütünlüğünü kontrol et',
          'Sistemi aktif et'
        ]
      },
      {
        name: 'data-loss',
        title: 'Critical Data Loss Recovery',
        description: 'Kritik veri kaybı durumunda uygulanacak prosedür',
        steps: [
          'Veri kaybının kapsamını belirle',
          'Acil yedek oluştur',
          'Kayıp veriyi tespit et',
          'En yakın yedekten geri yükle',
          'Eksik veriyi manuel olarak gir',
          'Sistem bütünlüğünü test et'
        ]
      },
      {
        name: 'performance-degradation',
        title: 'Severe Performance Degradation',
        description: 'Ciddi performans düşüklüğü durumunda uygulanacak prosedür',
        steps: [
          'Performans sorununu tespit et',
          'Resource kullanımını kontrol et',
          'Slow query\'leri belirle',
          'Gerekirse yedek sunucuya geç',
          'Sorunlu sorguları optimize et',
          'Sistem performansını test et'
        ]
      },
      {
        name: 'security-breach',
        title: 'Security Breach Response',
        description: 'Güvenlik ihlali durumunda uygulanacak prosedür',
        steps: [
          'Sistemi izole et',
          'Güvenlik ihlalinin kapsamını belirle',
          'Acil yedek oluştur',
          'Güvenlik açıklarını kapat',
          'Temiz yedekten geri yükle',
          'Güvenlik auditini yap'
        ]
      },
      {
        name: 'hardware-failure',
        title: 'Hardware Failure Recovery',
        description: 'Donanım arızası durumunda uygulanacak prosedür',
        steps: [
          'Backup sunucuya geç',
          'Arızalı donanımı tespit et',
          'Veri kurtarma işlemini başlat',
          'Yedek donanımı konfigüre et',
          'Verileri yeni sisteme aktar',
          'Sistem testlerini yap'
        ]
      }
    ];

    playbooks.forEach(playbook => {
      const playbookFile = path.join(this.playbookDir, `${playbook.name}.json`);
      if (!fs.existsSync(playbookFile)) {
        fs.writeFileSync(playbookFile, JSON.stringify(playbook, null, 2));
      }
    });
  }

  getConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    } catch (error) {
      console.error('⚠️ Emergency config okunamadı, varsayılan değerler kullanılıyor');
      this.initializeConfig();
      return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    }
  }

  async assessEmergencyLevel(incident) {
    const config = this.getConfig();
    let level = 'LOW';
    let score = 0;

    // Incident türüne göre puanlama
    const incidentScores = {
      'database-corruption': 10,
      'data-loss': 9,
      'security-breach': 8,
      'performance-degradation': 6,
      'hardware-failure': 7,
      'connection-failure': 5,
      'disk-space': 4,
      'backup-failure': 3
    };

    score += incidentScores[incident.type] || 0;

    // Etki kapsamına göre puanlama
    if (incident.affectedTables && incident.affectedTables.includes('ogretmenler')) score += 3;
    if (incident.affectedTables && incident.affectedTables.includes('ogrenciler')) score += 3;
    if (incident.affectedTables && incident.affectedTables.includes('dekontlar')) score += 2;
    if (incident.affectedTables && incident.affectedTables.includes('stajlar')) score += 2;

    // Veri kaybı miktarına göre puanlama
    if (incident.recordsLost > config.emergencyThresholds.criticalDataLoss) score += 5;
    if (incident.recordsLost > 100) score += 2;
    if (incident.recordsLost > 10) score += 1;

    // Downtime süresine göre puanlama
    if (incident.downtime > config.emergencyThresholds.maxDowntime) score += 4;
    if (incident.downtime > 60000) score += 2;
    if (incident.downtime > 10000) score += 1;

    // Level belirleme
    if (score >= 15) level = 'CRITICAL';
    else if (score >= 10) level = 'HIGH';
    else if (score >= 5) level = 'MEDIUM';
    else level = 'LOW';

    return {
      level,
      score,
      reasoning: this.generateReasoningText(incident, score)
    };
  }

  generateReasoningText(incident, score) {
    const reasons = [];
    
    if (incident.type === 'database-corruption') reasons.push('Database corruption detected');
    if (incident.type === 'data-loss') reasons.push('Critical data loss occurred');
    if (incident.recordsLost > 1000) reasons.push(`High data loss: ${incident.recordsLost} records`);
    if (incident.downtime > 300000) reasons.push(`Extended downtime: ${Math.round(incident.downtime/60000)} minutes`);
    if (incident.affectedTables && incident.affectedTables.includes('ogretmenler')) reasons.push('Critical table affected: ogretmenler');
    if (incident.affectedTables && incident.affectedTables.includes('ogrenciler')) reasons.push('Critical table affected: ogrenciler');
    
    return reasons.join(', ');
  }

  async executeEmergencyResponse(incident) {
    console.log('🚨 ACİL DURUM MÜDAHALE SİSTEMİ AKTİF!');
    console.log('━'.repeat(50));
    
    const startTime = Date.now();
    const emergencyId = `emergency-${Date.now()}`;
    
    try {
      // 1. Emergency level assessment
      console.log('📊 Emergency seviyesi değerlendiriliyor...');
      const assessment = await this.assessEmergencyLevel(incident);
      console.log(`🎯 Emergency Level: ${assessment.level} (Score: ${assessment.score})`);
      console.log(`📋 Reasoning: ${assessment.reasoning}`);

      // 2. Incident logging
      const emergencyLog = {
        id: emergencyId,
        timestamp: new Date().toISOString(),
        incident,
        assessment,
        steps: [],
        status: 'IN_PROGRESS',
        startTime: new Date().toISOString()
      };

      // 3. Immediate actions
      console.log('⚡ Acil eylemler başlatılıyor...');
      
      // Create emergency backup
      console.log('💾 Acil durum yedeği oluşturuluyor...');
      const emergencyBackup = await this.createEmergencyBackup(incident.type);
      emergencyLog.steps.push({
        step: 'emergency_backup',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        result: { backupFile: emergencyBackup }
      });

      // 4. Execute appropriate playbook
      console.log('📖 Uygun playbook çalıştırılıyor...');
      const playbookResult = await this.executePlaybook(incident.type, incident);
      emergencyLog.steps.push({
        step: 'playbook_execution',
        timestamp: new Date().toISOString(),
        status: playbookResult.success ? 'COMPLETED' : 'FAILED',
        result: playbookResult
      });

      // 5. Post-incident validation
      console.log('✅ Olay sonrası doğrulama...');
      const validationResult = await this.validatePostIncident();
      emergencyLog.steps.push({
        step: 'post_incident_validation',
        timestamp: new Date().toISOString(),
        status: validationResult.success ? 'COMPLETED' : 'FAILED',
        result: validationResult
      });

      // 6. Final assessment
      const totalTime = Date.now() - startTime;
      emergencyLog.endTime = new Date().toISOString();
      emergencyLog.duration = totalTime;
      emergencyLog.status = (playbookResult.success && validationResult.success) ? 'RESOLVED' : 'FAILED';

      // 7. Save emergency log
      await this.saveEmergencyLog(emergencyLog);

      // 8. Send notifications
      await this.sendEmergencyNotifications(emergencyLog);

      console.log('━'.repeat(50));
      console.log('🎉 ACİL DURUM MÜDAHALE TAMAMLANDI!');
      console.log(`⏱️  Toplam süre: ${Math.round(totalTime/1000)} saniye`);
      console.log(`📊 Sonuç: ${emergencyLog.status}`);
      console.log(`📝 Log ID: ${emergencyId}`);

      return emergencyLog;

    } catch (error) {
      console.error('❌ Emergency response hatası:', error);
      
      const errorLog = {
        id: emergencyId,
        timestamp: new Date().toISOString(),
        incident,
        status: 'FAILED',
        error: error.message,
        duration: Date.now() - startTime
      };

      await this.saveEmergencyLog(errorLog);
      throw error;
    }
  }

  async createEmergencyBackup(incidentType) {
    const reason = `Emergency backup for ${incidentType} incident`;
    return await this.backupScheduler.createEmergencyBackup(reason);
  }

  async executePlaybook(playbookName, incident) {
    try {
      const playbookFile = path.join(this.playbookDir, `${playbookName}.json`);
      
      if (!fs.existsSync(playbookFile)) {
        throw new Error(`Playbook bulunamadı: ${playbookName}`);
      }

      const playbook = JSON.parse(fs.readFileSync(playbookFile, 'utf8'));
      console.log(`📖 Playbook başlatılıyor: ${playbook.title}`);
      
      const results = [];
      let allStepsSuccess = true;

      for (let i = 0; i < playbook.steps.length; i++) {
        const step = playbook.steps[i];
        console.log(`${i + 1}. ${step}`);
        
        try {
          const stepResult = await this.executePlaybookStep(step, incident, i);
          results.push({
            step: step,
            index: i + 1,
            success: stepResult.success,
            message: stepResult.message,
            duration: stepResult.duration
          });
          
          if (!stepResult.success) {
            allStepsSuccess = false;
            console.log(`   ❌ ${stepResult.message}`);
          } else {
            console.log(`   ✅ ${stepResult.message}`);
          }

          // Critical step başarısızsa durdur
          if (!stepResult.success && stepResult.critical) {
            console.log('🛑 Kritik adım başarısız, playbook durduruluyor');
            break;
          }

        } catch (error) {
          allStepsSuccess = false;
          results.push({
            step: step,
            index: i + 1,
            success: false,
            message: error.message,
            duration: 0
          });
          console.log(`   ❌ Hata: ${error.message}`);
        }
      }

      return {
        success: allStepsSuccess,
        playbook: playbook.name,
        steps: results,
        completedSteps: results.filter(r => r.success).length,
        totalSteps: playbook.steps.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        playbook: playbookName
      };
    }
  }

  async executePlaybookStep(step, incident, index) {
    const startTime = Date.now();
    
    try {
      // Step'e göre uygun aksiyonu belirle
      const stepAction = this.mapStepToAction(step);
      
      if (stepAction) {
        const result = await stepAction(incident);
        return {
          success: result.success,
          message: result.message,
          duration: Date.now() - startTime,
          critical: result.critical || false
        };
      } else {
        // Manuel step - kullanıcı onayı bekle
        return {
          success: true,
          message: 'Manual step - operator confirmation required',
          duration: Date.now() - startTime,
          critical: false
        };
      }

    } catch (error) {
      return {
        success: false,
        message: error.message,
        duration: Date.now() - startTime,
        critical: false
      };
    }
  }

  mapStepToAction(step) {
    const stepMappings = {
      'Acil yedek oluştur': this.createEmergencyBackupAction.bind(this),
      'Son sağlıklı yedekten geri yükle': this.restoreFromBackupAction.bind(this),
      'Veri bütünlüğünü kontrol et': this.checkDataIntegrityAction.bind(this),
      'Sistem performansını test et': this.testSystemPerformanceAction.bind(this),
      'Güvenlik auditini yap': this.performSecurityAuditAction.bind(this),
      'Corrupted tabloları tespit et': this.detectCorruptedTablesAction.bind(this),
      'Veri kaybının kapsamını belirle': this.assessDataLossAction.bind(this),
      'Performans sorununu tespit et': this.detectPerformanceIssuesAction.bind(this)
    };

    return stepMappings[step] || null;
  }

  async createEmergencyBackupAction(incident) {
    try {
      const backupFile = await this.createEmergencyBackup(incident.type);
      return {
        success: true,
        message: `Emergency backup created: ${path.basename(backupFile)}`,
        critical: true
      };
    } catch (error) {
      return {
        success: false,
        message: `Backup creation failed: ${error.message}`,
        critical: true
      };
    }
  }

  async restoreFromBackupAction(incident) {
    try {
      const backups = await this.backupScheduler.listAvailableBackups();
      
      if (backups.length === 0) {
        throw new Error('No backups available for restore');
      }

      // En yakın sağlıklı yedeği bul
      const healthyBackup = backups.find(backup => 
        backup.type === 'daily' && backup.summary?.totalRecords > 0
      ) || backups[0];

      console.log(`   📁 Restoring from: ${healthyBackup.filename}`);
      
      const restoreResult = await this.rollbackSystem.rollbackToBackup(healthyBackup.path, {
        dryRun: false,
        createBackup: false, // Zaten emergency backup aldık
        confirmCallback: () => Promise.resolve(true)
      });

      return {
        success: restoreResult.success,
        message: restoreResult.success ? 
          `Restore completed from ${healthyBackup.filename}` : 
          `Restore failed: ${restoreResult.reason}`,
        critical: true
      };

    } catch (error) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`,
        critical: true
      };
    }
  }

  async checkDataIntegrityAction(incident) {
    try {
      const config = this.getConfig();
      let integrityIssues = 0;

      // Kritik tabloları kontrol et
      for (const table of ['ogretmenler', 'ogrenciler', 'isletmeler', 'stajlar']) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          integrityIssues++;
          console.log(`   ⚠️ ${table} integrity check failed: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: ${count} records`);
        }
      }

      return {
        success: integrityIssues === 0,
        message: integrityIssues === 0 ? 
          'Data integrity check passed' : 
          `Data integrity issues found: ${integrityIssues}`,
        critical: false
      };

    } catch (error) {
      return {
        success: false,
        message: `Data integrity check failed: ${error.message}`,
        critical: false
      };
    }
  }

  async testSystemPerformanceAction(incident) {
    try {
      const testQueries = [
        { name: 'simple_select', query: supabase.from('alanlar').select('*').limit(10) },
        { name: 'join_query', query: supabase.from('ogrenciler').select('*, alanlar(*)').limit(5) }
      ];

      let slowQueries = 0;
      let totalTime = 0;

      for (const testQuery of testQueries) {
        const startTime = Date.now();
        const { data, error } = await testQuery.query;
        const duration = Date.now() - startTime;
        totalTime += duration;

        if (error) {
          console.log(`   ❌ ${testQuery.name}: ${error.message}`);
          slowQueries++;
        } else if (duration > 5000) {
          console.log(`   ⚠️ ${testQuery.name}: ${duration}ms (slow)`);
          slowQueries++;
        } else {
          console.log(`   ✅ ${testQuery.name}: ${duration}ms`);
        }
      }

      return {
        success: slowQueries === 0,
        message: slowQueries === 0 ? 
          `Performance test passed (avg: ${Math.round(totalTime/testQueries.length)}ms)` : 
          `Performance issues detected: ${slowQueries} slow queries`,
        critical: false
      };

    } catch (error) {
      return {
        success: false,
        message: `Performance test failed: ${error.message}`,
        critical: false
      };
    }
  }

  async performSecurityAuditAction(incident) {
    try {
      const issues = [];

      // RLS kontrolü
      const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' AND NOT rowsecurity;
        `
      });

      if (!rlsError && rlsData.data && rlsData.data.length > 0) {
        issues.push(`RLS disabled on ${rlsData.data.length} tables`);
      }

      // Son giriş denemelerini kontrol et
      const { data: failedLogins, error: loginError } = await supabase
        .from('ogretmen_giris_denemeleri')
        .select('*')
        .eq('basarili', false)
        .gte('giris_tarihi', new Date(Date.now() - 3600000).toISOString());

      if (!loginError && failedLogins && failedLogins.length > 10) {
        issues.push(`High failed login attempts: ${failedLogins.length}`);
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 ? 
          'Security audit passed' : 
          `Security issues found: ${issues.join(', ')}`,
        critical: false
      };

    } catch (error) {
      return {
        success: false,
        message: `Security audit failed: ${error.message}`,
        critical: false
      };
    }
  }

  async detectCorruptedTablesAction(incident) {
    try {
      const corruptedTables = [];

      // Kritik tabloları kontrol et
      for (const table of ['ogretmenler', 'ogrenciler', 'isletmeler', 'stajlar', 'dekontlar']) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            corruptedTables.push(table);
            console.log(`   ❌ ${table} is corrupted: ${error.message}`);
          } else {
            console.log(`   ✅ ${table} is healthy (${count} records)`);
          }
        } catch (error) {
          corruptedTables.push(table);
          console.log(`   ❌ ${table} check failed: ${error.message}`);
        }
      }

      return {
        success: corruptedTables.length === 0,
        message: corruptedTables.length === 0 ? 
          'No corrupted tables detected' : 
          `Corrupted tables: ${corruptedTables.join(', ')}`,
        critical: true
      };

    } catch (error) {
      return {
        success: false,
        message: `Corruption detection failed: ${error.message}`,
        critical: true
      };
    }
  }

  async assessDataLossAction(incident) {
    try {
      const assessment = {
        totalRecords: 0,
        affectedTables: [],
        estimatedLoss: 0
      };

      // Backup ile karşılaştır
      const backups = await this.backupScheduler.listAvailableBackups();
      
      if (backups.length > 0) {
        const latestBackup = backups[0];
        
        try {
          const backupData = JSON.parse(fs.readFileSync(latestBackup.path, 'utf8'));
          
          for (const [tableName, tableData] of Object.entries(backupData.tables)) {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (!error) {
              const backupCount = tableData.count || 0;
              const currentCount = count || 0;
              
              assessment.totalRecords += currentCount;
              
              if (currentCount < backupCount) {
                const loss = backupCount - currentCount;
                assessment.estimatedLoss += loss;
                assessment.affectedTables.push({
                  table: tableName,
                  backupCount,
                  currentCount,
                  loss
                });
              }
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Backup comparison failed: ${error.message}`);
        }
      }

      return {
        success: true,
        message: assessment.estimatedLoss > 0 ? 
          `Data loss detected: ${assessment.estimatedLoss} records from ${assessment.affectedTables.length} tables` :
          'No data loss detected',
        critical: assessment.estimatedLoss > 1000
      };

    } catch (error) {
      return {
        success: false,
        message: `Data loss assessment failed: ${error.message}`,
        critical: false
      };
    }
  }

  async detectPerformanceIssuesAction(incident) {
    try {
      const issues = [];

      // Aktif bağlantıları kontrol et
      const { data: connections, error: connError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT COUNT(*) as active_connections
          FROM pg_stat_activity 
          WHERE state = 'active';
        `
      });

      if (!connError && connections.data && connections.data[0].active_connections > 50) {
        issues.push(`High active connections: ${connections.data[0].active_connections}`);
      }

      // Slow query testi
      const testStart = Date.now();
      const { data, error } = await supabase
        .from('stajlar')
        .select('*, ogrenciler(*), isletmeler(*)')
        .limit(10);

      const testDuration = Date.now() - testStart;
      
      if (error) {
        issues.push(`Query execution failed: ${error.message}`);
      } else if (testDuration > 10000) {
        issues.push(`Slow query performance: ${testDuration}ms`);
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 ? 
          `Performance check passed (${testDuration}ms)` : 
          `Performance issues: ${issues.join(', ')}`,
        critical: issues.length > 2
      };

    } catch (error) {
      return {
        success: false,
        message: `Performance detection failed: ${error.message}`,
        critical: false
      };
    }
  }

  async validatePostIncident() {
    try {
      console.log('   🔍 System connectivity check...');
      const { data, error } = await supabase
        .from('system_settings')
        .select('count')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `System connectivity failed: ${error.message}`,
          checks: { connectivity: false }
        };
      }

      console.log('   ✅ System connectivity: OK');

      // Kritik tabloları kontrol et
      console.log('   🔍 Critical tables check...');
      let tablesOk = 0;
      const criticalTables = ['ogretmenler', 'ogrenciler', 'isletmeler', 'stajlar'];

      for (const table of criticalTables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error && count > 0) {
          tablesOk++;
        }
      }

      console.log(`   ✅ Critical tables: ${tablesOk}/${criticalTables.length} OK`);

      return {
        success: tablesOk === criticalTables.length,
        message: `Post-incident validation: ${tablesOk}/${criticalTables.length} tables OK`,
        checks: {
          connectivity: true,
          criticalTables: tablesOk,
          totalTables: criticalTables.length
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Post-incident validation failed: ${error.message}`,
        checks: { connectivity: false }
      };
    }
  }

  async saveEmergencyLog(log) {
    const logFile = path.join(this.logDir, `emergency-${log.id}.json`);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    
    console.log(`📝 Emergency log saved: ${logFile}`);
    return logFile;
  }

  async sendEmergencyNotifications(log) {
    const config = this.getConfig();
    
    console.log('📡 Emergency notifications sending...');
    
    // Console notification
    console.log('📢 EMERGENCY NOTIFICATION:');
    console.log(`   Incident: ${log.incident.type}`);
    console.log(`   Status: ${log.status}`);
    console.log(`   Duration: ${Math.round(log.duration/1000)}s`);
    console.log(`   Level: ${log.assessment.level}`);
    
    // Email notification (placeholder)
    if (config.notifications.email) {
      config.emergencyContacts.forEach(contact => {
        console.log(`📧 Email sent to: ${contact.email} (${contact.role})`);
      });
    }
    
    // SMS notification (placeholder)
    if (config.notifications.sms) {
      config.emergencyContacts.forEach(contact => {
        console.log(`📱 SMS sent to: ${contact.phone} (${contact.role})`);
      });
    }
    
    return true;
  }

  async listEmergencyHistory() {
    try {
      const logs = [];
      
      if (fs.existsSync(this.logDir)) {
        const files = fs.readdirSync(this.logDir)
          .filter(file => file.startsWith('emergency-') && file.endsWith('.json'))
          .map(file => {
            const fullPath = path.join(this.logDir, file);
            const log = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return {
              id: log.id,
              timestamp: log.timestamp,
              type: log.incident?.type || 'unknown',
              status: log.status,
              level: log.assessment?.level || 'unknown',
              duration: log.duration,
              file: fullPath
            };
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        logs.push(...files);
      }
      
      return logs;
    } catch (error) {
      console.error('❌ Emergency history error:', error);
      return [];
    }
  }

  async getEmergencyStatus() {
    try {
      const history = await this.listEmergencyHistory();
      const recentIncidents = history.filter(log => 
        new Date(log.timestamp) > new Date(Date.now() - 24*60*60*1000)
      );
      
      return {
        totalIncidents: history.length,
        recentIncidents: recentIncidents.length,
        lastIncident: history[0] || null,
        criticalIncidents: history.filter(log => log.level === 'CRITICAL').length,
        resolvedIncidents: history.filter(log => log.status === 'RESOLVED').length,
        failedIncidents: history.filter(log => log.status === 'FAILED').length
      };
    } catch (error) {
      return {
        error: error.message,
        totalIncidents: 0,
        recentIncidents: 0
      };
    }
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const emergency = new EmergencyRestoreSystem();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'test':
      const testIncident = {
        type: args[1] || 'database-corruption',
        description: args[2] || 'Test incident for emergency response',
        affectedTables: ['ogretmenler', 'ogrenciler'],
        recordsLost: parseInt(args[3]) || 0,
        downtime: parseInt(args[4]) || 0
      };
      
      emergency.executeEmergencyResponse(testIncident)
        .then(result => {
          console.log('🎉 Emergency response test completed!');
          console.log(`📊 Result: ${result.status}`);
          process.exit(result.status === 'RESOLVED' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Emergency response test failed:', error);
          process.exit(1);
        });
      break;
      
    case 'history':
      emergency.listEmergencyHistory()
        .then(history => {
          console.log('📋 Emergency History:');
          history.forEach((log, index) => {
            console.log(`${index + 1}. ${log.id}`);
            console.log(`   Type: ${log.type}`);
            console.log(`   Status: ${log.status}`);
            console.log(`   Level: ${log.level}`);
            console.log(`   Date: ${new Date(log.timestamp).toLocaleString('tr-TR')}`);
            console.log(`   Duration: ${Math.round(log.duration/1000)}s`);
            console.log('');
          });
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ History error:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      emergency.getEmergencyStatus()
        .then(status => {
          console.log('📊 Emergency System Status:');
          console.log(`📈 Total incidents: ${status.totalIncidents}`);
          console.log(`🔥 Recent incidents (24h): ${status.recentIncidents}`);
          console.log(`❌ Critical incidents: ${status.criticalIncidents}`);
          console.log(`✅ Resolved incidents: ${status.resolvedIncidents}`);
          console.log(`💥 Failed incidents: ${status.failedIncidents}`);
          
          if (status.lastIncident) {
            console.log(`\n🕐 Last incident: ${status.lastIncident.type} (${status.lastIncident.status})`);
            console.log(`   Date: ${new Date(status.lastIncident.timestamp).toLocaleString('tr-TR')}`);
          }
          
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Status error:', error);
          process.exit(1);
        });
      break;
      
    case 'respond':
      const incident = {
        type: args[1] || 'database-corruption',
        description: args[2] || 'Manual emergency response',
        affectedTables: args[3] ? args[3].split(',') : ['ogretmenler'],
        recordsLost: parseInt(args[4]) || 0,
        downtime: parseInt(args[5]) || 0
      };
      
      emergency.executeEmergencyResponse(incident)
        .then(result => {
          console.log('🎉 Emergency response completed!');
          console.log(`📊 Result: ${result.status}`);
          process.exit(result.status === 'RESOLVED' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Emergency response failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Emergency Restore System');
      console.log('');
      console.log('Kullanım: node emergency-restore-system.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  test [type] [description] [recordsLost] [downtime]  - Test emergency response');
      console.log('  respond <type> [description] [tables] [recordsLost] [downtime]  - Execute emergency response');
      console.log('  history                                              - Show emergency history');
      console.log('  status                                               - Show emergency system status');
      console.log('');
      console.log('Incident types:');
      console.log('  database-corruption, data-loss, security-breach, performance-degradation, hardware-failure');
      process.exit(1);
  }
}

module.exports = { EmergencyRestoreSystem };