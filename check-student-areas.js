// Sadece console.log kullanarak API'yi test edelim
async function checkStudentAreas() {
  try {
    console.log('🔍 Öğrenci alan bilgilerini kontrol ediyorum...\n');
    
    // Localhost API'yi çağır (öğretmen ID'si lazım)
    const response = await fetch('http://localhost:3000/api/admin/teachers/1/internships');
    
    if (!response.ok) {
      console.log(`❌ API hatası: ${response.status}`);
      return;
    }
    
    const companies = await response.json();
    
    console.log(`📊 Toplam ${companies.length} işletme bulundu\n`);
    
    companies.forEach(company => {
      console.log(`🏢 ${company.ad}`);
      console.log(`👥 ${company.ogrenciler.length} öğrenci:`);
      
      company.ogrenciler.forEach(student => {
        console.log(`  • ${student.ad} ${student.soyad}`);
        console.log(`    Sınıf: ${student.sinif}, No: ${student.no}`);
        console.log(`    Alan: ${student.alan || 'YOK!'}`);
        console.log('');
      });
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

checkStudentAreas();