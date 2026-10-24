/**
 * API Endpoint Analizi ve Tutarlılık Kontrolü
 * Tüm API endpoint'lerini tarar ve tutarlılığını kontrol eder
 */

const fs = require('fs');
const path = require('path');

// API dizini
const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// Sonuç objesi
const analysisResults = {
  totalEndpoints: 0,
  validEndpoints: 0,
  invalidEndpoints: 0,
  missingRoutes: [],
  duplicateRoutes: [],
  endpoints: [],
  issues: []
};

// Endpoint analizi
function analyzeEndpoint(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const endpoint = {
      path: relativePath,
      file: filePath,
      methods: [],
      hasAuth: false,
      hasValidation: false,
      hasErrorHandling: false,
      issues: []
    };

    // HTTP metodlarını tespit et
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    methods.forEach(method => {
      if (content.includes(`export async function ${method}`) || 
          content.includes(`export function ${method}`)) {
        endpoint.methods.push(method);
      }
    });

    // Auth kontrolü
    if (content.includes('getServerSession') || 
        content.includes('authOptions') ||
        content.includes('session.user.role')) {
      endpoint.hasAuth = true;
    }

    // Error handling kontrolü
    if (content.includes('try {') && content.includes('catch')) {
      endpoint.hasErrorHandling = true;
    }

    // Validation kontrolü
    if (content.includes('zod') || 
        content.includes('yup') ||
        content.includes('joi') ||
        content.includes('validation')) {
      endpoint.hasValidation = true;
    }

    // Route.ts dosyası kontrolü
    if (!filePath.endsWith('route.ts')) {
      endpoint.issues.push('Route dosyası standart isimlendirmeyi kullanmıyor');
    }

    // Yetkilendirme eksikliği kontrolü (admin endpoint'leri için)
    if (relativePath.includes('/admin/') && !endpoint.hasAuth) {
      endpoint.issues.push('Admin endpoint yetkilendirme eksik');
    }

    // Error handling eksikliği
    if (endpoint.methods.length > 0 && !endpoint.hasErrorHandling) {
      endpoint.issues.push('Error handling eksik');
    }

    // Metod eksikliği
    if (endpoint.methods.length === 0) {
      endpoint.issues.push('HTTP metodu tespit edilemedi');
    }

    return endpoint;
  } catch (error) {
    return {
      path: relativePath,
      file: filePath,
      methods: [],
      hasAuth: false,
      hasValidation: false,
      hasErrorHandling: false,
      issues: [`Dosya okunamadı: ${error.message}`]
    };
  }
}

// Dizini recursive olarak tara
function scanDirectory(dir, baseDir = dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, baseDir);
    } else if (item === 'route.ts') {
      const relativePath = path.relative(baseDir, fullPath);
      const apiPath = '/' + relativePath.replace(/\\/g, '/').replace('/route.ts', '');
      
      analysisResults.totalEndpoints++;
      const endpoint = analyzeEndpoint(fullPath, apiPath);
      analysisResults.endpoints.push(endpoint);
      
      if (endpoint.issues.length > 0) {
        analysisResults.invalidEndpoints++;
        analysisResults.issues.push(...endpoint.issues.map(issue => ({
          endpoint: apiPath,
          issue
        })));
      } else {
        analysisResults.validEndpoints++;
      }
    }
  }
}

// Analizi başlat
function runAnalysis() {
  console.log('🔍 API Endpoint Analizi Başlatılıyor...\n');
  
  if (!fs.existsSync(API_DIR)) {
    console.log('❌ API dizini bulunamadı:', API_DIR);
    return;
  }

  scanDirectory(API_DIR);
  
  // Sonuçları raporla
  console.log('📊 ANALIZ SONUÇLARI');
  console.log('='.repeat(50));
  console.log(`📈 Toplam endpoint: ${analysisResults.totalEndpoints}`);
  console.log(`✅ Geçerli endpoint: ${analysisResults.validEndpoints}`);
  console.log(`❌ Sorunlu endpoint: ${analysisResults.invalidEndpoints}`);
  console.log(`📊 Başarı oranı: ${((analysisResults.validEndpoints / analysisResults.totalEndpoints) * 100).toFixed(1)}%\n`);

  // Endpoint listesi
  console.log('📋 ENDPOINT LİSTESİ:');
  console.log('-'.repeat(50));
  analysisResults.endpoints
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(endpoint => {
      const status = endpoint.issues.length === 0 ? '✅' : '❌';
      const methods = endpoint.methods.join(', ') || 'Yok';
      const auth = endpoint.hasAuth ? '🔒' : '🔓';
      const error = endpoint.hasErrorHandling ? '🛡️' : '⚠️';
      
      console.log(`${status} ${endpoint.path}`);
      console.log(`   Metodlar: ${methods} | Auth: ${auth} | Error: ${error}`);
      
      if (endpoint.issues.length > 0) {
        endpoint.issues.forEach(issue => {
          console.log(`   ⚠️ ${issue}`);
        });
      }
      console.log('');
    });

  // Ana kategori analizi
  console.log('🏗️ KATEGORİ ANALİZİ:');
  console.log('-'.repeat(50));
  
  const categories = {};
  analysisResults.endpoints.forEach(endpoint => {
    const category = endpoint.path.split('/')[1] || 'root';
    if (!categories[category]) {
      categories[category] = { total: 0, valid: 0, invalid: 0 };
    }
    categories[category].total++;
    if (endpoint.issues.length === 0) {
      categories[category].valid++;
    } else {
      categories[category].invalid++;
    }
  });

  Object.entries(categories)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([category, stats]) => {
      const successRate = ((stats.valid / stats.total) * 100).toFixed(1);
      console.log(`📁 /${category}: ${stats.total} endpoint (${successRate}% başarılı)`);
    });

  // Kritik sorunlar
  if (analysisResults.issues.length > 0) {
    console.log('\n🚨 KRİTİK SORUNLAR:');
    console.log('-'.repeat(50));
    
    const criticalIssues = analysisResults.issues.filter(issue => 
      issue.issue.includes('Admin endpoint yetkilendirme eksik') ||
      issue.issue.includes('HTTP metodu tespit edilemedi')
    );

    if (criticalIssues.length > 0) {
      criticalIssues.forEach(issue => {
        console.log(`🔴 ${issue.endpoint}: ${issue.issue}`);
      });
    } else {
      console.log('✅ Kritik sorun bulunamadı');
    }
  }

  return analysisResults;
}

// Çalıştır
if (require.main === module) {
  runAnalysis();
}

module.exports = { runAnalysis, analysisResults };