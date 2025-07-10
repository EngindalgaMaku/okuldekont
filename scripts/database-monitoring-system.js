const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { DatabaseBackupScheduler } = require('./database-backup-scheduler');

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

class DatabaseMonitoringSystem {
  constructor() {
    this.monitoringDir = path.join(__dirname, '../monitoring');
    this.alertsDir = path.join(this.monitoringDir, 'alerts');
    this.logsDir = path.join(this.monitoringDir, 'logs');
    this.reportsDir = path.join(this.monitoringDir, 'reports');
    this.configFile = path.join(this.monitoringDir, 'monitoring-config.json');
    this.backupScheduler = new DatabaseBackupScheduler();
    this.initializeDirectories();
    this.initializeConfig();
  }

  initializeDirectories() {
    [this.monitoringDir, this.alertsDir, this.logsDir, this.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeConfig() {
    const defaultConfig = {
      monitoring: {
        enabled: true,
        interval: 300000,           // 5 dakika
        alertThresholds: {
          maxConnections: 80,       // %80 connection limit
          maxCPU: 85,              // %85 CPU kullanımı
          maxMemory: 90,           // %90 Memory kullanımı
          maxDiskUsage: 85,        // %85 Disk kullanımı
          minFreeSpace: 1000,      // 1GB minimum boş alan
          maxQueryTime: 10000,     // 10 saniye
          maxActiveQueries: 100,   // 100 aktif sorgu
          maxErrorRate: 0.1,       // %10 hata oranı
          maxResponseTime: 2000,   // 2 saniye response time
          minBackupFrequency: 86400000 // 24 saat
        },
        tables: {
          criticalTables: [
            'ogretmenler',
            'ogrenciler',
            'isletmeler',
            'stajlar',
            'dekontlar'
          ],
          maxRecordsPerTable: 1000000,
          maxTableSize: '500MB'
        },
        notifications: {
          email: {
            enabled: false,
            recipients: []
          },
          webhook: {
            enabled: false,
            url: ''
          },
          console: {
            enabled: true
          }
        }
      },
      healthCheck: {
        enabled: true,
        interval: 60000,           // 1 dakika
        timeout: 10000,            // 10 saniye timeout
        retries: 3
      },
      logging: {
        enabled: true,
        level: 'info',             // error, warn, info, debug
        maxLogFiles: 30,
        maxLogSize: '10MB'
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
      console.error('⚠️ Monitoring config okunamadı, varsayılan değerler kullanılıyor');
      this.initializeConfig();
      return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    }
  }

  async startMonitoring() {
    const config = this.getConfig();
    
    if (!config.monitoring.enabled) {
      console.log('⚠️ Monitoring devre dışı');
      return;
    }

    console.log('🔍 Database monitoring başlatılıyor...');
    console.log(`📊 Monitoring interval: ${config.monitoring.interval / 1000} saniye`);
    console.log(`🔔 Health check interval: ${config.healthCheck.interval / 1000} saniye`);

    // Health check döngüsü
    if (config.healthCheck.enabled) {
      setInterval(() => {
        this.performHealthCheck().catch(error => {
          this.logError('Health check hatası:', error);
        });
      }, config.healthCheck.interval);
    }

    // Ana monitoring döngüsü
    setInterval(() => {
      this.performMonitoring().catch(error => {
        this.logError('Monitoring hatası:', error);
      });
    }, config.monitoring.interval);

    // İlk kontrolü hemen yap
    await this.performHealthCheck();
    await this.performMonitoring();

    console.log('✅ Database monitoring başlatıldı!');
  }

  async performHealthCheck() {
    const config = this.getConfig();
    const timestamp = new Date().toISOString();
    
    try {
      const startTime = Date.now();
      
      // Basit connectivity testi
      const { data, error } = await supabase
        .from('system_settings')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      const healthStatus = {
        timestamp,
        status: error ? 'UNHEALTHY' : 'HEALTHY',
        responseTime,
        error: error?.message || null,
        details: {
          connectivity: !error,
          responseTimeOk: responseTime < config.monitoring.alertThresholds.maxResponseTime
        }
      };

      // Health check sonucunu logla
      this.logHealthCheck(healthStatus);

      // Alert kontrolü
      if (healthStatus.status === 'UNHEALTHY') {
        await this.triggerAlert('DATABASE_UNHEALTHY', {
          message: `Database erişilemez: ${error?.message}`,
          responseTime,
          timestamp
        });
      } else if (responseTime > config.monitoring.alertThresholds.maxResponseTime) {
        await this.triggerAlert('SLOW_RESPONSE', {
          message: `Yavaş yanıt süresi: ${responseTime}ms`,
          responseTime,
          threshold: config.monitoring.alertThresholds.maxResponseTime,
          timestamp
        });
      }

      return healthStatus;
    } catch (error) {
      const healthStatus = {
        timestamp,
        status: 'CRITICAL',
        responseTime: null,
        error: error.message,
        details: {
          connectivity: false,
          responseTimeOk: false
        }
      };

      this.logHealthCheck(healthStatus);
      
      await this.triggerAlert('DATABASE_CRITICAL', {
        message: `Database kritik hata: ${error.message}`,
        timestamp
      });

      return healthStatus;
    }
  }

  async performMonitoring() {
    const config = this.getConfig();
    const timestamp = new Date().toISOString();
    
    console.log('📊 Monitoring kontrolü başlatılıyor...');
    
    try {
      const monitoringReport = {
        timestamp,
        database: await this.monitorDatabase(),
        tables: await this.monitorTables(),
        performance: await this.monitorPerformance(),
        security: await this.monitorSecurity(),
        backups: await this.monitorBackups(),
        alerts: [],
        summary: {
          status: 'HEALTHY',
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0
        }
      };

      // Alert kontrolü
      await this.evaluateAlerts(monitoringReport, config);

      // Raporu kaydet
      await this.saveMonitoringReport(monitoringReport);

      console.log(`✅ Monitoring tamamlandı - Status: ${monitoringReport.summary.status}`);
      console.log(`📊 Issues: ${monitoringReport.summary.totalIssues}, Kritik: ${monitoringReport.summary.criticalIssues}`);

      return monitoringReport;
    } catch (error) {
      console.error('❌ Monitoring hatası:', error);
      await this.triggerAlert('MONITORING_ERROR', {
        message: `Monitoring sistemi hatası: ${error.message}`,
        timestamp
      });
      throw error;
    }
  }

  async monitorDatabase() {
    try {
      const dbStats = {
        connectionStatus: 'CONNECTED',
        version: null,
        uptime: null,
        activeConnections: null,
        totalConnections: null,
        errors: []
      };

      // Database versiyon bilgisi
      try {
        const { data: version, error: versionError } = await supabase.rpc('exec_sql', {
          query: 'SELECT version();'
        });

        if (!versionError && version.data && version.data.length > 0) {
          dbStats.version = version.data[0].version;
        }
      } catch (error) {
        dbStats.errors.push(`Version bilgisi alınamadı: ${error.message}`);
      }

      // Aktif bağlantı sayısı
      try {
        const { data: connections, error: connError } = await supabase.rpc('exec_sql', {
          query: `
            SELECT 
              COUNT(*) as active_connections,
              COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries
            FROM pg_stat_activity 
            WHERE datname = current_database();
          `
        });

        if (!connError && connections.data && connections.data.length > 0) {
          dbStats.activeConnections = connections.data[0].active_connections;
          dbStats.activeQueries = connections.data[0].active_queries;
        }
      } catch (error) {
        dbStats.errors.push(`Bağlantı bilgisi alınamadı: ${error.message}`);
      }

      return dbStats;
    } catch (error) {
      return {
        connectionStatus: 'ERROR',
        error: error.message,
        errors: [error.message]
      };
    }
  }

  async monitorTables() {
    const config = this.getConfig();
    const tableStats = {
      criticalTables: {},
      totalTables: 0,
      totalRecords: 0,
      largeTables: [],
      emptyTables: [],
      errors: []
    };

    try {
      // Kritik tabloları kontrol et
      for (const tableName of config.monitoring.tables.criticalTables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            tableStats.errors.push(`${tableName}: ${error.message}`);
            continue;
          }

          const tableInfo = {
            name: tableName,
            recordCount: count,
            status: 'HEALTHY',
            lastChecked: new Date().toISOString()
          };

          // Tablo boyutu kontrolü
          if (count > config.monitoring.tables.maxRecordsPerTable) {
            tableInfo.status = 'WARNING';
            tableInfo.issue = `Çok fazla kayıt: ${count}`;
            tableStats.largeTables.push(tableName);
          }

          if (count === 0) {
            tableInfo.status = 'WARNING';
            tableInfo.issue = 'Tablo boş';
            tableStats.emptyTables.push(tableName);
          }

          tableStats.criticalTables[tableName] = tableInfo;
          tableStats.totalRecords += count;
          tableStats.totalTables++;

        } catch (error) {
          tableStats.errors.push(`${tableName} kontrol hatası: ${error.message}`);
        }
      }

      return tableStats;
    } catch (error) {
      tableStats.errors.push(`Tablo monitoring hatası: ${error.message}`);
      return tableStats;
    }
  }

  async monitorPerformance() {
    const config = this.getConfig();
    const performanceStats = {
      queryPerformance: {},
      slowQueries: [],
      resourceUsage: {},
      errors: []
    };

    try {
      // Test sorguları performansı
      const testQueries = [
        {
          name: 'simple_select',
          query: supabase.from('alanlar').select('*').limit(10)
        },
        {
          name: 'join_query',
          query: supabase.from('ogrenciler').select('*, alanlar(ad)').limit(10)
        },
        {
          name: 'complex_query',
          query: supabase.from('stajlar').select('*, ogrenciler(ad, soyad), isletmeler(ad)').limit(5)
        }
      ];

      for (const testQuery of testQueries) {
        const startTime = Date.now();
        
        try {
          const { data, error } = await testQuery.query;
          const duration = Date.now() - startTime;
          
          const queryStats = {
            name: testQuery.name,
            duration,
            success: !error,
            recordCount: data?.length || 0,
            status: duration > config.monitoring.alertThresholds.maxQueryTime ? 'SLOW' : 'FAST'
          };

          if (error) {
            queryStats.error = error.message;
            queryStats.status = 'ERROR';
          }

          performanceStats.queryPerformance[testQuery.name] = queryStats;

          if (duration > config.monitoring.alertThresholds.maxQueryTime) {
            performanceStats.slowQueries.push(queryStats);
          }

        } catch (error) {
          performanceStats.errors.push(`Query test hatası (${testQuery.name}): ${error.message}`);
        }
      }

      return performanceStats;
    } catch (error) {
      performanceStats.errors.push(`Performance monitoring hatası: ${error.message}`);
      return performanceStats;
    }
  }

  async monitorSecurity() {
    const securityStats = {
      rlsStatus: {},
      recentLogins: {},
      failedAttempts: {},
      suspiciousActivity: [],
      errors: []
    };

    try {
      // RLS durumu kontrolü
      const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename;
        `
      });

      if (!rlsError && rlsData.data) {
        const rlsEnabled = rlsData.data.filter(table => table.rowsecurity).length;
        const rlsDisabled = rlsData.data.filter(table => !table.rowsecurity).length;
        
        securityStats.rlsStatus = {
          enabled: rlsEnabled,
          disabled: rlsDisabled,
          total: rlsData.data.length,
          coverage: Math.round((rlsEnabled / rlsData.data.length) * 100)
        };
      }

      // Son giriş denemelerini kontrol et
      try {
        const { data: loginAttempts, error: loginError } = await supabase
          .from('ogretmen_giris_denemeleri')
          .select('*')
          .gte('giris_tarihi', new Date(Date.now() - 3600000).toISOString()) // Son 1 saat
          .order('giris_tarihi', { ascending: false });

        if (!loginError && loginAttempts) {
          const successfulLogins = loginAttempts.filter(attempt => attempt.basarili).length;
          const failedLogins = loginAttempts.filter(attempt => !attempt.basarili).length;
          
          securityStats.recentLogins = {
            total: loginAttempts.length,
            successful: successfulLogins,
            failed: failedLogins,
            failureRate: loginAttempts.length > 0 ? 
              Math.round((failedLogins / loginAttempts.length) * 100) : 0
          };

          // Şüpheli aktivite kontrolü
          const suspiciousIPs = {};
          loginAttempts.forEach(attempt => {
            if (!attempt.basarili) {
              suspiciousIPs[attempt.ip_adresi] = (suspiciousIPs[attempt.ip_adresi] || 0) + 1;
            }
          });

          Object.entries(suspiciousIPs).forEach(([ip, count]) => {
            if (count >= 5) {
              securityStats.suspiciousActivity.push({
                type: 'MULTIPLE_FAILED_LOGINS',
                ip,
                count,
                message: `${ip} adresinden ${count} başarısız giriş denemesi`
              });
            }
          });
        }
      } catch (error) {
        securityStats.errors.push(`Giriş denemesi kontrolü hatası: ${error.message}`);
      }

      return securityStats;
    } catch (error) {
      securityStats.errors.push(`Security monitoring hatası: ${error.message}`);
      return securityStats;
    }
  }

  async monitorBackups() {
    const config = this.getConfig();
    const backupStats = {
      latestBackup: null,
      backupFrequency: null,
      backupSizes: [],
      backupValidation: {},
      errors: []
    };

    try {
      // Son yedekleri kontrol et
      const backups = await this.backupScheduler.listAvailableBackups();
      
      if (backups.length === 0) {
        backupStats.errors.push('Hiç yedek bulunamadı!');
        return backupStats;
      }

      const latestBackup = backups[0];
      const backupAge = Date.now() - latestBackup.created.getTime();
      
      backupStats.latestBackup = {
        file: latestBackup.filename,
        created: latestBackup.created,
        age: backupAge,
        ageHours: Math.round(backupAge / 3600000),
        size: latestBackup.size,
        type: latestBackup.type,
        status: backupAge > config.monitoring.alertThresholds.minBackupFrequency ? 'OLD' : 'RECENT'
      };

      // Yedek boyutlarını analiz et
      backupStats.backupSizes = backups.slice(0, 10).map(backup => ({
        file: backup.filename,
        size: backup.size,
        created: backup.created
      }));

      // Ortalama yedek boyutu
      const avgSize = backups.slice(0, 5).reduce((sum, backup) => sum + backup.size, 0) / 5;
      backupStats.averageSize = Math.round(avgSize);

      // Son yedek boyut kontrolü
      if (latestBackup.size < avgSize * 0.5) {
        backupStats.errors.push('Son yedek normalden çok küçük');
      }

      return backupStats;
    } catch (error) {
      backupStats.errors.push(`Backup monitoring hatası: ${error.message}`);
      return backupStats;
    }
  }

  async evaluateAlerts(monitoringReport, config) {
    const alerts = [];

    // Database alerts
    if (monitoringReport.database.connectionStatus !== 'CONNECTED') {
      alerts.push({
        type: 'DATABASE_CONNECTION',
        severity: 'CRITICAL',
        message: 'Database bağlantısı yok',
        timestamp: new Date().toISOString()
      });
    }

    // Table alerts
    if (monitoringReport.tables.largeTables.length > 0) {
      alerts.push({
        type: 'LARGE_TABLES',
        severity: 'WARNING',
        message: `Büyük tablolar: ${monitoringReport.tables.largeTables.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    if (monitoringReport.tables.emptyTables.length > 0) {
      alerts.push({
        type: 'EMPTY_TABLES',
        severity: 'WARNING',
        message: `Boş tablolar: ${monitoringReport.tables.emptyTables.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Performance alerts
    if (monitoringReport.performance.slowQueries.length > 0) {
      alerts.push({
        type: 'SLOW_QUERIES',
        severity: 'WARNING',
        message: `Yavaş sorgular bulundu: ${monitoringReport.performance.slowQueries.length}`,
        timestamp: new Date().toISOString()
      });
    }

    // Security alerts
    if (monitoringReport.security.suspiciousActivity.length > 0) {
      alerts.push({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        message: `Şüpheli aktivite: ${monitoringReport.security.suspiciousActivity.length} olay`,
        timestamp: new Date().toISOString()
      });
    }

    // Backup alerts
    if (monitoringReport.backups.latestBackup?.status === 'OLD') {
      alerts.push({
        type: 'OLD_BACKUP',
        severity: 'HIGH',
        message: `Son yedek çok eski: ${monitoringReport.backups.latestBackup.ageHours} saat`,
        timestamp: new Date().toISOString()
      });
    }

    monitoringReport.alerts = alerts;
    
    // Summary güncelle
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
    const highAlerts = alerts.filter(a => a.severity === 'HIGH');
    const warningAlerts = alerts.filter(a => a.severity === 'WARNING');

    monitoringReport.summary = {
      status: criticalAlerts.length > 0 ? 'CRITICAL' : 
              highAlerts.length > 0 ? 'HIGH' : 
              warningAlerts.length > 0 ? 'WARNING' : 'HEALTHY',
      totalIssues: alerts.length,
      criticalIssues: criticalAlerts.length,
      warnings: warningAlerts.length
    };

    // Alertleri tetikle
    for (const alert of alerts) {
      await this.triggerAlert(alert.type, alert);
    }
  }

  async triggerAlert(type, details) {
    const config = this.getConfig();
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      ...details
    };

    // Alert'i kaydet
    const alertFile = path.join(this.alertsDir, `alert-${Date.now()}.json`);
    fs.writeFileSync(alertFile, JSON.stringify(alert, null, 2));

    // Console notification
    if (config.monitoring.notifications.console.enabled) {
      console.log(`🚨 ALERT [${type}]: ${details.message}`);
    }

    // Email notification (placeholder)
    if (config.monitoring.notifications.email.enabled) {
      // E-posta gönderme kodu buraya eklenebilir
      console.log(`📧 Email alert sent: ${type}`);
    }

    // Webhook notification (placeholder)
    if (config.monitoring.notifications.webhook.enabled) {
      // Webhook çağrısı buraya eklenebilir
      console.log(`🔗 Webhook alert sent: ${type}`);
    }

    return alert;
  }

  async saveMonitoringReport(report) {
    const reportFile = path.join(this.reportsDir, `monitoring-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Son raporu ayrı dosyaya kaydet
    const latestReportFile = path.join(this.reportsDir, 'latest-report.json');
    fs.writeFileSync(latestReportFile, JSON.stringify(report, null, 2));
    
    return reportFile;
  }

  logHealthCheck(healthStatus) {
    const logFile = path.join(this.logsDir, `health-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${healthStatus.timestamp} - ${healthStatus.status} - ${healthStatus.responseTime}ms\n`;
    fs.appendFileSync(logFile, logEntry);
  }

  logError(message, error) {
    const errorFile = path.join(this.logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    const errorEntry = `${new Date().toISOString()} - ERROR - ${message}: ${error.message}\n`;
    fs.appendFileSync(errorFile, errorEntry);
    console.error(`❌ ${message}`, error);
  }

  async getMonitoringStatus() {
    try {
      const latestReportFile = path.join(this.reportsDir, 'latest-report.json');
      
      if (!fs.existsSync(latestReportFile)) {
        return { status: 'NO_DATA', message: 'Henüz monitoring raporu yok' };
      }

      const report = JSON.parse(fs.readFileSync(latestReportFile, 'utf8'));
      const reportAge = Date.now() - new Date(report.timestamp).getTime();
      
      return {
        status: report.summary.status,
        reportAge: Math.round(reportAge / 60000), // dakika cinsinden
        lastUpdate: report.timestamp,
        totalIssues: report.summary.totalIssues,
        criticalIssues: report.summary.criticalIssues,
        warnings: report.summary.warnings
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async generateDailyReport() {
    console.log('📊 Günlük monitoring raporu oluşturuluyor...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const reportsToday = fs.readdirSync(this.reportsDir)
        .filter(file => file.includes(today) && file.startsWith('monitoring-report-'))
        .map(file => {
          const fullPath = path.join(this.reportsDir, file);
          return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (reportsToday.length === 0) {
        console.log('ℹ️ Bugün için monitoring raporu bulunamadı');
        return null;
      }

      const dailyReport = {
        date: today,
        totalReports: reportsToday.length,
        summary: {
          healthyReports: reportsToday.filter(r => r.summary.status === 'HEALTHY').length,
          warningReports: reportsToday.filter(r => r.summary.status === 'WARNING').length,
          criticalReports: reportsToday.filter(r => r.summary.status === 'CRITICAL').length,
          totalAlerts: reportsToday.reduce((sum, r) => sum + r.alerts.length, 0)
        },
        trends: {
          avgResponseTime: this.calculateAverage(reportsToday, 'database.responseTime'),
          avgTableRecords: this.calculateAverage(reportsToday, 'tables.totalRecords'),
          avgQueryTime: this.calculateAverage(reportsToday, 'performance.queryPerformance.simple_select.duration')
        },
        alerts: reportsToday.flatMap(r => r.alerts),
        firstReport: reportsToday[0].timestamp,
        lastReport: reportsToday[reportsToday.length - 1].timestamp
      };

      const dailyReportFile = path.join(this.reportsDir, `daily-report-${today}.json`);
      fs.writeFileSync(dailyReportFile, JSON.stringify(dailyReport, null, 2));
      
      console.log(`✅ Günlük rapor oluşturuldu: ${dailyReportFile}`);
      console.log(`📊 Toplam rapor: ${dailyReport.totalReports}`);
      console.log(`🚨 Toplam alert: ${dailyReport.summary.totalAlerts}`);
      
      return dailyReport;
    } catch (error) {
      console.error('❌ Günlük rapor oluşturma hatası:', error);
      throw error;
    }
  }

  calculateAverage(reports, path) {
    const values = reports.map(report => {
      const pathParts = path.split('.');
      let value = report;
      
      for (const part of pathParts) {
        value = value?.[part];
      }
      
      return typeof value === 'number' ? value : 0;
    }).filter(v => v > 0);
    
    return values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
  }
}

// Komut satırı kullanımı
if (require.main === module) {
  const monitoring = new DatabaseMonitoringSystem();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'start':
      monitoring.startMonitoring()
        .then(() => {
          console.log('🎉 Monitoring başlatıldı! Ctrl+C ile durdurun.');
          
          // Graceful shutdown
          process.on('SIGINT', () => {
            console.log('\n🛑 Monitoring durduruluyor...');
            process.exit(0);
          });
        })
        .catch(error => {
          console.error('❌ Monitoring başlatma hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'check':
      monitoring.performMonitoring()
        .then(report => {
          console.log('🎉 Monitoring kontrolü tamamlandı!');
          console.log(`📊 Status: ${report.summary.status}`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Monitoring kontrolü hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'health':
      monitoring.performHealthCheck()
        .then(health => {
          console.log('🎉 Health check tamamlandı!');
          console.log(`💓 Status: ${health.status}`);
          console.log(`⚡ Response Time: ${health.responseTime}ms`);
          process.exit(health.status === 'HEALTHY' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Health check hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      monitoring.getMonitoringStatus()
        .then(status => {
          console.log('📊 Monitoring Durumu:');
          console.log(`🎯 Status: ${status.status}`);
          console.log(`🕐 Son güncelleme: ${status.reportAge} dakika önce`);
          console.log(`🚨 Toplam sorun: ${status.totalIssues}`);
          console.log(`❌ Kritik: ${status.criticalIssues}`);
          console.log(`⚠️ Uyarı: ${status.warnings}`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Status kontrolü hatası:', error);
          process.exit(1);
        });
      break;
      
    case 'report':
      monitoring.generateDailyReport()
        .then(report => {
          if (report) {
            console.log('🎉 Günlük rapor oluşturuldu!');
          } else {
            console.log('ℹ️ Rapor oluşturulamadı');
          }
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Rapor oluşturma hatası:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Database Monitoring System');
      console.log('');
      console.log('Kullanım: node database-monitoring-system.js <komut>');
      console.log('');
      console.log('Komutlar:');
      console.log('  start   - Monitoring\'i başlat (sürekli çalışır)');
      console.log('  check   - Tek monitoring kontrolü yap');
      console.log('  health  - Health check yap');
      console.log('  status  - Mevcut durumu göster');
      console.log('  report  - Günlük rapor oluştur');
      process.exit(1);
  }
}

module.exports = { DatabaseMonitoringSystem };