/**
 * Kapsamlı Sistem Test Scripti
 * Okul Staj Yönetim Sisteminin tüm modüllerini test eder
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test konfigürasyonu
const CONFIG = {
  baseURL: 'http://localhost:3001',
  apiBase: 'http://localhost:3001/api',
  adminApiBase: 'http://localhost:3001/api/admin',
  timeout: 5000
};

// Test sonuçları
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Yardımcı fonksiyonlar
function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName} - BAŞARILI`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - BAŞARISIZ: ${message}`);
  }
  testResults.details.push({
    name: testName,
    passed,
    message
  });
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      timeout: CONFIG.timeout,
      ...options
    });
    return {
      ok: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : null,
      error: !response.ok ? await response.text() : null
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

// Test fonksiyonları
async function testHealthCheck() {
  console.log('\n🏥 Health Check Testleri');
  
  // API Health
  const health = await makeRequest(`${CONFIG.apiBase}/health`);
  logTest('API Health Check', health.ok, health.error);
  
  // Database Health
  const dbHealth = await makeRequest(`${CONFIG.apiBase}/health/database`);
  logTest('Database Health Check', dbHealth.ok, dbHealth.error);
}

async function testDataIntegrity() {
  console.log('\n🔍 Veri Bütünlüğü Testleri');
  
  // Data integrity check
  const integrity = await makeRequest(`${CONFIG.adminApiBase}/data-integrity`);
  logTest('Veri Bütünlüğü Kontrolü', integrity.ok, integrity.error);
  
  if (integrity.ok && integrity.data) {
    console.log(`   📊 Toplam sorun: ${integrity.data.stats?.totalIssues || 0}`);
    console.log(`   🔴 Kritik: ${integrity.data.stats?.criticalIssues || 0}`);
    console.log(`   🟡 Orta: ${integrity.data.stats?.mediumIssues || 0}`);
  }
}

async function testDashboardStats() {
  console.log('\n📊 Dashboard İstatistik Testleri');
  
  const stats = await makeRequest(`${CONFIG.adminApiBase}/dashboard-stats`);
  logTest('Dashboard İstatistikleri', stats.ok, stats.error);
  
  if (stats.ok && stats.data) {
    console.log(`   👨‍🏫 Öğretmen: ${stats.data.teacherCount}`);
    console.log(`   🏢 İşletme: ${stats.data.companyCount}`);
    console.log(`   👤 Kullanıcı: ${stats.data.userCount}`);
  }
}

async function testCompanyAPI() {
  console.log('\n🏢 İşletme API Testleri');
  
  // List companies
  const companies = await makeRequest(`${CONFIG.adminApiBase}/companies`);
  logTest('İşletme Listesi', companies.ok, companies.error);
  
  if (companies.ok && companies.data?.data) {
    const firstCompany = companies.data.data[0];
    if (firstCompany) {
      // Company details
      const companyDetail = await makeRequest(`${CONFIG.adminApiBase}/companies/${firstCompany.id}`);
      logTest('İşletme Detayı', companyDetail.ok, companyDetail.error);
      
      // Company students
      const companyStudents = await makeRequest(`${CONFIG.adminApiBase}/companies/${firstCompany.id}/students`);
      logTest('İşletme Öğrencileri', companyStudents.ok, companyStudents.error);
    }
  }
}

async function testTeacherAPI() {
  console.log('\n👨‍🏫 Öğretmen API Testleri');
  
  // List teachers
  const teachers = await makeRequest(`${CONFIG.adminApiBase}/teachers`);
  logTest('Öğretmen Listesi', teachers.ok, teachers.error);
  
  if (teachers.ok && teachers.data) {
    const firstTeacher = teachers.data[0];
    if (firstTeacher) {
      // Teacher details
      const teacherDetail = await makeRequest(`${CONFIG.adminApiBase}/teachers/${firstTeacher.id}`);
      logTest('Öğretmen Detayı', teacherDetail.ok, teacherDetail.error);
      
      // Teacher statistics
      const teacherStats = await makeRequest(`${CONFIG.adminApiBase}/teachers/${firstTeacher.id}/statistics`);
      logTest('Öğretmen İstatistikleri', teacherStats.ok, teacherStats.error);
    }
  }
}

async function testStudentAPI() {
  console.log('\n👨‍🎓 Öğrenci API Testleri');
  
  // List students
  const students = await makeRequest(`${CONFIG.adminApiBase}/students`);
  logTest('Öğrenci Listesi', students.ok, students.error);
  
  if (students.ok && students.data) {
    const firstStudent = students.data[0];
    if (firstStudent) {
      // Student details
      const studentDetail = await makeRequest(`${CONFIG.adminApiBase}/students/${firstStudent.id}`);
      logTest('Öğrenci Detayı', studentDetail.ok, studentDetail.error);
    }
  }
}

async function testInternshipAPI() {
  console.log('\n🎓 Staj API Testleri');
  
  // List internships
  const internships = await makeRequest(`${CONFIG.adminApiBase}/internships`);
  logTest('Staj Listesi', internships.ok, internships.error);
  
  // Internship consistency check
  const consistency = await makeRequest(`${CONFIG.adminApiBase}/internships/consistency-check`);
  logTest('Staj Tutarlılık Kontrolü', consistency.ok, consistency.error);
}

async function testDekontAPI() {
  console.log('\n💰 Dekont API Testleri');
  
  // List dekonts
  const dekonts = await makeRequest(`${CONFIG.adminApiBase}/dekontlar`);
  logTest('Dekont Listesi', dekonts.ok, dekonts.error);
}

async function testMessagingAPI() {
  console.log('\n💬 Mesajlaşma API Testleri');
  
  // List conversations
  const conversations = await makeRequest(`${CONFIG.adminApiBase}/messaging/conversations`);
  logTest('Konuşma Listesi', conversations.ok, conversations.error);
}

async function testFieldsAPI() {
  console.log('\n📚 Alan API Testleri');
  
  // List fields
  const fields = await makeRequest(`${CONFIG.adminApiBase}/fields`);
  logTest('Alan Listesi', fields.ok, fields.error);
}

async function testSecurityAPI() {
  console.log('\n🔒 Güvenlik API Testleri');
  
  // Security status
  const securityStatus = await makeRequest(`${CONFIG.adminApiBase}/security/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType: 'teacher', entityId: 'test-id' })
  });
  logTest('Güvenlik Durumu Kontrolü', securityStatus.status !== 500, securityStatus.error);
}

async function testSystemSettings() {
  console.log('\n⚙️ Sistem Ayarları Testleri');
  
  // System settings
  const settings = await makeRequest(`${CONFIG.adminApiBase}/settings`);
  logTest('Sistem Ayarları', settings.ok, settings.error);
  
  // School name
  const schoolName = await makeRequest(`${CONFIG.apiBase}/system-settings/school-name`);
  logTest('Okul Adı Ayarı', schoolName.ok, schoolName.error);
}

// Ana test fonksiyonu
async function runAllTests() {
  console.log('🚀 Okul Staj Yönetim Sistemi - Kapsamlı Test Başlatılıyor...\n');
  console.log(`📡 Test Sunucusu: ${CONFIG.baseURL}`);
  console.log(`🔗 API Base: ${CONFIG.apiBase}\n`);
  
  const startTime = Date.now();
  
  try {
    await testHealthCheck();
    await testDashboardStats();
    await testDataIntegrity();
    await testCompanyAPI();
    await testTeacherAPI();
    await testStudentAPI();
    await testInternshipAPI();
    await testDekontAPI();
    await testMessagingAPI();
    await testFieldsAPI();
    await testSecurityAPI();
    await testSystemSettings();
    
  } catch (error) {
    console.error(`\n❌ Test sürecinde hata: ${error.message}`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Sonuçları göster
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SONUÇLARI');
  console.log('='.repeat(60));
  console.log(`⏱️  Toplam süre: ${duration}s`);
  console.log(`📊 Toplam test: ${testResults.total}`);
  console.log(`✅ Başarılı: ${testResults.passed}`);
  console.log(`❌ Başarısız: ${testResults.failed}`);
  console.log(`📈 Başarı oranı: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Başarısız Testler:');
    testResults.details
      .filter(t => !t.passed)
      .forEach(t => console.log(`   ❌ ${t.name}: ${t.message}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Test'i çalıştır
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testResults,
  CONFIG
};