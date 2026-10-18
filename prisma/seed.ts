import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Türkiye'deki gerçekçi isimler
const firstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Ömer', 'Abdullah', 'Yusuf',
  'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Seda', 'Özlem', 'Esra',
  'Kemal', 'İsmail', 'Osman', 'Süleyman', 'Recep', 'Ercan', 'Serkan', 'Burak', 'Emrah', 'Cem',
  'Zehra', 'Derya', 'Sibel', 'Gül', 'Pınar', 'Nurcan', 'Sevim', 'Filiz', 'Deniz', 'Meltem'
]

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydin', 'Özdemir',
  'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kaya', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
  'Güler', 'Türk', 'Acar', 'Polat', 'Erdoğan', 'Korkmaz', 'Tunç', 'Başaran', 'Güneş', 'Karaca'
]

// Alan bilgileri
const alanlar = [
  {
    name: 'Bilişim Teknolojileri',
    description: 'Bilgisayar programlama, web tasarımı, sistem yönetimi',
    companies: [
      { name: 'TechnoSoft Yazılım', activity: 'Yazılım Geliştirme', contact: 'Murat Yılmaz' },
      { name: 'DataFlow Sistemler', activity: 'Veri Yönetimi', contact: 'Selin Kaya' },
      { name: 'CloudTech Solutions', activity: 'Bulut Hizmetleri', contact: 'Ahmet Demir' },
      { name: 'WebCraft Tasarım', activity: 'Web Tasarımı', contact: 'Ayşe Şahin' },
      { name: 'CyberSec Turkey', activity: 'Siber Güvenlik', contact: 'Kemal Çelik' },
      { name: 'MobileDev Studio', activity: 'Mobil Uygulama', contact: 'Zeynep Yıldız' },
      { name: 'GameTech Istanbul', activity: 'Oyun Geliştirme', contact: 'Burak Yıldırım' },
      { name: 'AIVision Labs', activity: 'Yapay Zeka', contact: 'Elif Öztürk' },
      { name: 'NetworkPro Turkey', activity: 'Ağ Yönetimi', contact: 'Osman Aydın' },
      { name: 'DigitalAge Consulting', activity: 'Dijital Danışmanlık', contact: 'Fatma Özdemir' },
      { name: 'SmartCode Solutions', activity: 'Akıllı Sistemler', contact: 'Serkan Arslan' },
      { name: 'TechHub Ankara', activity: 'Teknoloji Merkezi', contact: 'Pınar Doğan' },
      { name: 'InnovateTech', activity: 'Teknoloji İnovasyonu', contact: 'Mehmet Kılıç' },
      { name: 'ByteWorks Turkey', activity: 'Sistem Entegrasyonu', contact: 'Derya Aslan' },
      { name: 'CloudFirst Systems', activity: 'Bulut Migrasyonu', contact: 'Ali Çetin' },
      { name: 'DevOps Turkey', activity: 'DevOps Hizmetleri', contact: 'Gül Kaya' },
      { name: 'Quantum Computing TR', activity: 'Kuantum Bilişim', contact: 'Yusuf Koç' },
      { name: 'BlockChain Türkiye', activity: 'Blockchain Çözümleri', contact: 'Esra Kurt' },
      { name: 'IoT Solutions Turkey', activity: 'Nesnelerin İnterneti', contact: 'Hasan Özkan' },
      { name: 'DataMining Labs', activity: 'Veri Madenciliği', contact: 'Sibel Şimşek' }
    ]
  },
  {
    name: 'Elektrik Elektronik',
    description: 'Elektrik tesisatı, elektronik devreler, otomasyon sistemleri',
    companies: [
      { name: 'ElektroTürk Enerji', activity: 'Elektrik Tesisatı', contact: 'İbrahim Güler' },
      { name: 'Voltaj Elektronik', activity: 'Elektronik Kartlar', contact: 'Meryem Türk' },
      { name: 'PowerTech Systems', activity: 'Güç Sistemleri', contact: 'Ömer Acar' },
      { name: 'AutoControl Turkey', activity: 'Otomasyon Sistemleri', contact: 'Zehra Polat' },
      { name: 'LightTech Aydınlatma', activity: 'LED Aydınlatma', contact: 'Mustafa Erdoğan' },
      { name: 'CircuitPro Electronics', activity: 'Elektronik Devre', contact: 'Hatice Korkmaz' },
      { name: 'EnergyFlow Türkiye', activity: 'Enerji Yönetimi', contact: 'Abdullah Tunç' },
      { name: 'SmartHome Systems', activity: 'Akıllı Ev Sistemleri', contact: 'Seda Başaran' },
      { name: 'IndustrialTech TR', activity: 'Endüstriyel Otomasyon', contact: 'Hüseyin Güneş' },
      { name: 'RobotiksPro Turkey', activity: 'Robotik Sistemler', contact: 'Özlem Karaca' },
      { name: 'SolarTech Türkiye', activity: 'Güneş Enerjisi', contact: 'Recep Yılmaz' },
      { name: 'ElektroServis Plus', activity: 'Elektrik Servisi', contact: 'Filiz Kaya' },
      { name: 'HighVoltage Systems', activity: 'Yüksek Gerilim', contact: 'İsmail Demir' },
      { name: 'MotorControl Turkey', activity: 'Motor Kontrol', contact: 'Deniz Şahin' },
      { name: 'TransformerTech', activity: 'Trafo Sistemleri', contact: 'Ercan Çelik' },
      { name: 'CableTech Solutions', activity: 'Kablo Sistemleri', contact: 'Meltem Yıldız' },
      { name: 'ElectroPanel TR', activity: 'Elektrik Panoları', contact: 'Süleyman Yıldırım' },
      { name: 'SmartMeter Systems', activity: 'Akıllı Sayaçlar', contact: 'Nurcan Öztürk' },
      { name: 'BatteryTech Turkey', activity: 'Batarya Sistemleri', contact: 'Emrah Aydın' },
      { name: 'ElektroMaintenance', activity: 'Elektrik Bakımı', contact: 'Sevim Özdemir' }
    ]
  },
  {
    name: 'Makine Teknolojisi',
    description: 'CNC işleme, kaynak teknolojileri, makine bakımı',
    companies: [
      { name: 'MetalWorks Turkey', activity: 'Metal İşleme', contact: 'Kemal Arslan' },
      { name: 'CNCPro Makine', activity: 'CNC Tezgahları', contact: 'Ayşe Doğan' },
      { name: 'WeldTech Türkiye', activity: 'Kaynak Teknolojisi', contact: 'Mehmet Kılıç' },
      { name: 'PrecisionMach Systems', activity: 'Hassas İmalat', contact: 'Elif Aslan' },
      { name: 'HydraulicsPro TR', activity: 'Hidrolik Sistemler', contact: 'Burak Çetin' },
      { name: 'ToolMaker Turkey', activity: 'Takım Üretimi', contact: 'Zeynep Kaya' },
      { name: 'AutoMach Solutions', activity: 'Otomotiv Makineleri', contact: 'Osman Koç' },
      { name: 'MoldTech Türkiye', activity: 'Kalıp Üretimi', contact: 'Fatma Kurt' },
      { name: 'TurnMill Systems', activity: 'Tornalama İşleme', contact: 'Serkan Özkan' },
      { name: 'GearTech Turkey', activity: 'Dişli Üretimi', contact: 'Pınar Şimşek' },
      { name: 'MaintenancePro TR', activity: 'Makine Bakımı', contact: 'Ali Güler' },
      { name: 'CastingTech Türkiye', activity: 'Döküm Teknolojisi', contact: 'Derya Türk' },
      { name: 'ForgeTech Systems', activity: 'Dövme Teknolojisi', contact: 'Yusuf Acar' },
      { name: 'QualityControl TR', activity: 'Kalite Kontrol', contact: 'Gül Polat' },
      { name: 'RobotWeld Turkey', activity: 'Robotik Kaynak', contact: 'Hasan Erdoğan' },
      { name: 'PneumaticsPro', activity: 'Pnömatik Sistemler', contact: 'Sibel Korkmaz' },
      { name: 'HeatTreatment TR', activity: 'Isıl İşlem', contact: 'İbrahim Tunç' },
      { name: 'SheetMetal Works', activity: 'Sac Metal İşleme', contact: 'Meryem Başaran' },
      { name: 'MachineDesign TR', activity: 'Makine Tasarımı', contact: 'Ömer Güneş' },
      { name: 'IndustrialMaint', activity: 'Endüstriyel Bakım', contact: 'Zehra Karaca' }
    ]
  },
  {
    name: 'Otomotiv Teknolojisi',
    description: 'Araç bakımı, motor teknolojileri, otomotiv elektroniği',
    companies: [
      { name: 'TürkOto Service', activity: 'Araç Servisi', contact: 'Mustafa Yılmaz' },
      { name: 'MotorTech Turkey', activity: 'Motor Tamiri', contact: 'Hatice Kaya' },
      { name: 'AutoElectronics TR', activity: 'Otomotiv Elektroniği', contact: 'Abdullah Demir' },
      { name: 'TransmissionPro', activity: 'Şanzıman Tamiri', contact: 'Seda Şahin' },
      { name: 'TirePro Türkiye', activity: 'Lastik Servisi', contact: 'Hüseyin Çelik' },
      { name: 'BrakeTech Systems', activity: 'Fren Sistemleri', contact: 'Özlem Yıldız' },
      { name: 'CarDiagnostics TR', activity: 'Araç Tanılama', contact: 'Recep Yıldırım' },
      { name: 'SuspensionPro', activity: 'Süspansiyon Tamiri', contact: 'Filiz Öztürk' },
      { name: 'ExhaustTech Turkey', activity: 'Egzoz Sistemleri', contact: 'İsmail Aydın' },
      { name: 'AutoGlass Türkiye', activity: 'Cam Değişimi', contact: 'Deniz Özdemir' },
      { name: 'FuelSystem Pro', activity: 'Yakıt Sistemleri', contact: 'Ercan Arslan' },
      { name: 'ClimateControl TR', activity: 'Klima Sistemleri', contact: 'Meltem Doğan' },
      { name: 'AutoPaint Systems', activity: 'Araç Boyama', contact: 'Süleyman Kılıç' },
      { name: 'HybridTech Turkey', activity: 'Hibrit Araç Servisi', contact: 'Nurcan Aslan' },
      { name: 'ElectricCar TR', activity: 'Elektrikli Araç', contact: 'Emrah Çetin' },
      { name: 'TruckService Plus', activity: 'Kamyon Servisi', contact: 'Sevim Kaya' },
      { name: 'BikeRepair Turkey', activity: 'Motosiklet Tamiri', contact: 'Kemal Koç' },
      { name: 'AutoUpgrade TR', activity: 'Araç Modifikasyonu', contact: 'Ayşe Kurt' },
      { name: 'RoadAssist Turkey', activity: 'Yol Yardım', contact: 'Mehmet Özkan' },
      { name: 'CarWash Systems', activity: 'Araç Yıkama Sistemleri', contact: 'Elif Şimşek' }
    ]
  },
  {
    name: 'İnşaat Teknolojisi',
    description: 'Yapı tekniği, inşaat makineleri, proje yönetimi',
    companies: [
      { name: 'YapıTürk İnşaat', activity: 'Genel İnşaat', contact: 'Burak Güler' },
      { name: 'ConcretePro Turkey', activity: 'Beton Teknolojisi', contact: 'Zeynep Türk' },
      { name: 'SteelConstruct TR', activity: 'Çelik Yapılar', contact: 'Osman Acar' },
      { name: 'RoofTech Systems', activity: 'Çatı Sistemleri', contact: 'Fatma Polat' },
      { name: 'FloorTech Türkiye', activity: 'Döşeme Sistemleri', contact: 'Serkan Erdoğan' },
      { name: 'WallPro Turkey', activity: 'Duvar Sistemleri', contact: 'Pınar Korkmaz' },
      { name: 'InsulationTech TR', activity: 'Yalıtım Teknolojisi', contact: 'Ali Tunç' },
      { name: 'WindowsPro Systems', activity: 'Pencere Sistemleri', contact: 'Derya Başaran' },
      { name: 'PlumbingTech Turkey', activity: 'Tesisat Teknolojisi', contact: 'Yusuf Güneş' },
      { name: 'ElectricConstruct', activity: 'İnşaat Elektrifiği', contact: 'Gül Karaca' },
      { name: 'ExcavatorPro TR', activity: 'Kazı Makineleri', contact: 'Hasan Yılmaz' },
      { name: 'CraneOperations', activity: 'Vinç Operasyonları', contact: 'Sibel Kaya' },
      { name: 'SurveyTech Turkey', activity: 'Harita Mühendisliği', contact: 'İbrahim Demir' },
      { name: 'QualityConstruct', activity: 'İnşaat Kalite Kontrol', contact: 'Meryem Şahin' },
      { name: 'SafetyFirst TR', activity: 'İş Güvenliği', contact: 'Ömer Çelik' },
      { name: 'ProjectManage Pro', activity: 'Proje Yönetimi', contact: 'Zehra Yıldız' },
      { name: 'GreenBuild Turkey', activity: 'Yeşil Bina', contact: 'Mustafa Yıldırım' },
      { name: 'SmartBuild Systems', activity: 'Akıllı Binalar', contact: 'Hatice Öztürk' },
      { name: 'RestoreTech TR', activity: 'Restorasyon', contact: 'Abdullah Aydın' },
      { name: 'LandscapePro', activity: 'Peyzaj Mimarisi', contact: 'Seda Özdemir' }
    ]
  },
  {
    name: 'Gıda Teknolojisi',
    description: 'Gıda işleme, kalite kontrol, gıda güvenliği',
    companies: [
      { name: 'FoodTech Türkiye', activity: 'Gıda İşleme', contact: 'Hüseyin Arslan' },
      { name: 'QualityFood Systems', activity: 'Gıda Kalite Kontrol', contact: 'Özlem Doğan' },
      { name: 'PackagingPro TR', activity: 'Gıda Ambalajlama', contact: 'Recep Kılıç' },
      { name: 'FrozenTech Turkey', activity: 'Dondurulmuş Gıda', contact: 'Filiz Aslan' },
      { name: 'DairyPro Systems', activity: 'Süt Ürünleri', contact: 'İsmail Çetin' },
      { name: 'BakeryTech TR', activity: 'Fırın Teknolojisi', contact: 'Deniz Kaya' },
      { name: 'MeatProcess Pro', activity: 'Et İşleme', contact: 'Ercan Koç' },
      { name: 'VegetableTech', activity: 'Sebze İşleme', contact: 'Meltem Kurt' },
      { name: 'BeveragePro Turkey', activity: 'İçecek Üretimi', contact: 'Süleyman Özkan' },
      { name: 'OrganicFood TR', activity: 'Organik Gıda', contact: 'Nurcan Şimşek' },
      { name: 'FoodSafety Plus', activity: 'Gıda Güvenliği', contact: 'Emrah Güler' },
      { name: 'CannedFood Systems', activity: 'Konserve Üretimi', contact: 'Sevim Türk' },
      { name: 'SpiceTech Turkey', activity: 'Baharat İşleme', contact: 'Kemal Acar' },
      { name: 'OilPress Pro', activity: 'Yağ Üretimi', contact: 'Ayşe Polat' },
      { name: 'FreshProduce TR', activity: 'Taze Ürün İşleme', contact: 'Mehmet Erdoğan' },
      { name: 'FoodAnalysis Lab', activity: 'Gıda Analiz', contact: 'Elif Korkmaz' },
      { name: 'NutritionTech', activity: 'Beslenme Teknolojisi', contact: 'Burak Tunç' },
      { name: 'FoodEquipment TR', activity: 'Gıda Makineleri', contact: 'Zeynep Başaran' },
      { name: 'HalalFood Systems', activity: 'Helal Gıda Sertifikası', contact: 'Osman Güneş' },
      { name: 'RestaurantTech', activity: 'Restoran Teknolojisi', contact: 'Fatma Karaca' }
    ]
  }
]

// Sınıf isimleri (12 ile başlayan)
const sinifIsimleri = [
  '12A', '12B', '12C', '12D', '12E', '12F', '12G', '12H', '12I', '12J', '12K', '12L'
]

function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function generatePhoneNumber(): string {
  const areaCode = ['532', '533', '534', '535', '536', '537', '538', '539'][Math.floor(Math.random() * 8)]
  const number = Math.floor(1000000 + Math.random() * 9000000)
  return `0${areaCode}${number}`
}

function generateTCNumber(): string {
  // Basit TC no üretici (gerçek TC algoritması değil)
  return '1' + Math.floor(10000000000 + Math.random() * 90000000000).toString().substring(1)
}

function getRandomName(): string {
  return firstNames[Math.floor(Math.random() * firstNames.length)]
}

function getRandomSurname(): string {
  return lastNames[Math.floor(Math.random() * lastNames.length)]
}

function getRandomCompanyFromField(fieldName: string) {
  const field = alanlar.find(a => a.name === fieldName)
  if (!field) return alanlar[0].companies[0]
  return field.companies[Math.floor(Math.random() * field.companies.length)]
}

async function main() {
  console.log('Veritabanı temizleniyor...')
  
  // Veritabanını temizle
  await prisma.dekont.deleteMany()
  await prisma.belge.deleteMany()
  await prisma.internshipHistory.deleteMany()
  await prisma.staj.deleteMany()
  await prisma.gorevBelgesi.deleteMany()
  await prisma.student.deleteMany()
  await prisma.class.deleteMany()
  await prisma.companyProfile.deleteMany()
  await prisma.teacherProfile.deleteMany()
  await prisma.adminProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.alan.deleteMany()
  await prisma.egitimYili.deleteMany()
  
  console.log('Eğitim yılı oluşturuluyor...')
  
  // Eğitim yılı oluştur
  const egitimYili = await prisma.egitimYili.create({
    data: {
      year: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      active: true
    }
  })
  
  console.log('Admin kullanıcısı oluşturuluyor...')
  
  // Admin kullanıcısı oluştur
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@okul.edu.tr',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })
  
  await prisma.adminProfile.create({
    data: {
      name: 'Sistem Yöneticisi',
      email: 'admin@okul.edu.tr',
      role: 'ADMIN',
      userId: adminUser.id
    }
  })
  
  console.log('Alanlar oluşturuluyor...')
  
  // Alanları oluştur
  for (const alanData of alanlar) {
    console.log(`- ${alanData.name} alanı oluşturuluyor...`)
    
    const alan = await prisma.alan.create({
      data: {
        name: alanData.name,
        description: alanData.description,
        active: true
      }
    })
    
    // Her alan için 2 sınıf oluştur
    const usedClassNames: string[] = []
    for (let i = 0; i < 2; i++) {
      let className = sinifIsimleri[Math.floor(Math.random() * sinifIsimleri.length)]
      while (usedClassNames.includes(className)) {
        className = sinifIsimleri[Math.floor(Math.random() * sinifIsimleri.length)]
      }
      usedClassNames.push(className)
      
      const sinif = await prisma.class.create({
        data: {
          name: className,
          alanId: alan.id,
          dal: `${alanData.name} - ${className} Şubesi`
        }
      })
      
      // Her sınıf için ~25 öğrenci oluştur
      const studentCount = 20 + Math.floor(Math.random() * 11) // 20-30 arası
      console.log(`  - ${className} sınıfına ${studentCount} öğrenci ekleniyor...`)
      
      for (let j = 0; j < studentCount; j++) {
        await prisma.student.create({
          data: {
            name: getRandomName(),
            surname: getRandomSurname(),
            className: className,
            number: (1000 + j).toString(),
            tcNo: generateTCNumber(),
            phone: generatePhoneNumber(),
            email: `ogrenci${j}@${className.toLowerCase()}.edu.tr`,
            parentName: `${getRandomName()} ${getRandomSurname()}`,
            parentPhone: generatePhoneNumber(),
            alanId: alan.id,
            classId: sinif.id
          }
        })
      }
    }
    
    // Her alan için 4-6 öğretmen oluştur
    const teacherCount = 4 + Math.floor(Math.random() * 3) // 4-6 arası
    console.log(`  - ${teacherCount} öğretmen oluşturuluyor...`)
    
    for (let i = 0; i < teacherCount; i++) {
      const teacherPassword = await bcrypt.hash('ogretmen123', 10)
      const teacherUser = await prisma.user.create({
        data: {
          email: `ogretmen${i+1}.${alan.name.toLowerCase().replace(/\s+/g, '')}@okul.edu.tr`,
          password: teacherPassword,
          role: 'TEACHER'
        }
      })
      
      await prisma.teacherProfile.create({
        data: {
          name: getRandomName(),
          surname: getRandomSurname(),
          phone: generatePhoneNumber(),
          email: teacherUser.email,
          pin: generatePIN(),
          userId: teacherUser.id,
          alanId: alan.id,
          active: true
        }
      })
    }
    
    // Her alan için 20 işletme oluştur
    console.log(`  - 20 işletme oluşturuluyor...`)
    
    for (let i = 0; i < 20; i++) {
      const company = alanData.companies[i]
      const companyPassword = await bcrypt.hash('isletme123', 10)
      const companyUser = await prisma.user.create({
        data: {
          email: `${company.name.toLowerCase().replace(/\s+/g, '')}@sirket.com`,
          password: companyPassword,
          role: 'COMPANY'
        }
      })
      
      await prisma.companyProfile.create({
        data: {
          name: company.name,
          contact: company.contact,
          phone: generatePhoneNumber(),
          email: companyUser.email,
          address: `${company.name} Merkez Ofisi, ${['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'][Math.floor(Math.random() * 5)]}`,
          taxNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
          pin: generatePIN(),
          userId: companyUser.id,
          activityField: company.activity,
          bankAccountNo: `TR${Math.floor(10 + Math.random() * 90)} 0000 0000 0000 0000 0000 00`,
          employeeCount: ['1-10', '11-50', '51-100', '101-500', '500+'][Math.floor(Math.random() * 5)],
          stateContributionRequest: Math.random() > 0.5 ? 'Evet' : 'Hayır',
          masterTeacherName: `${getRandomName()} ${getRandomSurname()}`,
          masterTeacherPhone: generatePhoneNumber()
        }
      })
    }
  }
  
  console.log('🎉 Sahte veriler başarıyla oluşturuldu!')
  console.log('\n📊 Oluşturulan veriler:')
  console.log(`✅ 6 Alan (${alanlar.length})`)
  console.log(`✅ ${alanlar.length * 2} Sınıf (her alan için 2'şer)`)
  console.log(`✅ ${alanlar.length * 5} Öğretmen (ortalama 5'er)`)
  console.log(`✅ ${alanlar.length * 20} İşletme (her alan için 20'şer)`)
  console.log(`✅ ${alanlar.length * 2 * 25} Öğrenci (ortalama 25'er)`)
  console.log(`✅ 1 Admin Kullanıcısı`)
  console.log(`✅ 1 Aktif Eğitim Yılı`)
  
  console.log('\n🔑 Giriş bilgileri:')
  console.log('Admin: admin@okul.edu.tr / admin123')
  console.log('Öğretmen: ogretmen1.bilisimteknolojileri@okul.edu.tr / ogretmen123')
  console.log('İşletme: technosoftyazilim@sirket.com / isletme123')
}

main()
  .catch((e) => {
    console.error('Hata:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })