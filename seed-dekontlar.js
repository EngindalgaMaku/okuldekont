const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const dekontSeedData = [
  // Farklı öğretmenlerden 20 dekont
  {
    teacherName: "Ahmet Yılmaz",
    companyName: "TechCorp A.Ş.",
    studentName: "Ali Demir",
    amount: 2500.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Mehmet Kaya",
    companyName: "SoftWorks Ltd.",
    studentName: "Ayşe Şahin",
    amount: 3000.00,
    month: 6,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Fatma Öz",
    companyName: "DataSys Inc.",
    studentName: "Emre Çelik",
    amount: 2800.00,
    month: 5,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Ahmet Yılmaz",
    companyName: "CloudTech Solutions",
    studentName: "Zeynep Arslan",
    amount: 3200.00,
    month: 5,
    year: 2024,
    status: "REJECTED",
    rejectReason: "Belge eksik"
  },
  {
    teacherName: "Seda Demir",
    companyName: "InnovateLab",
    studentName: "Burak Yıldız",
    amount: 2700.00,
    month: 6,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Esra Tunç",
    companyName: "BakeryTech TR",
    studentName: "Pınar Doğan",
    amount: 2400.00,
    month: 6,
    year: 2024,
    status: "REJECTED",
    rejectReason: "Tarih uyumsuzluğu"
  },
  {
    teacherName: "Esra Tunç",
    companyName: "BakeryTech TR",
    studentName: "İsmail Karaca",
    amount: 2600.00,
    month: 6,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Seda Demir",
    companyName: "BakeryTech TR",
    studentName: "Pınar Yıldız",
    amount: 2500.00,
    month: 5,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Mehmet Kaya",
    companyName: "DigitalFlow",
    studentName: "Can Özkan",
    amount: 3100.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Fatma Öz",
    companyName: "WebMaster Pro",
    studentName: "Deniz Acar",
    amount: 2900.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Ahmet Yılmaz",
    companyName: "MobileDev Studio",
    studentName: "Ece Kılıç",
    amount: 3300.00,
    month: 5,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Seda Demir",
    companyName: "GameDev Turkey",
    studentName: "Mert Aslan",
    amount: 2750.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Esra Tunç",
    companyName: "ECommerce Plus",
    studentName: "Selin Güneş",
    amount: 2850.00,
    month: 5,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Mehmet Kaya",
    companyName: "CyberSec Ltd.",
    studentName: "Kaan Erdoğan",
    amount: 3400.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Fatma Öz",
    companyName: "AITech Solutions",
    studentName: "Dila Koç",
    amount: 3150.00,
    month: 5,
    year: 2024,
    status: "REJECTED",
    rejectReason: "Tutar uyumsuzluğu"
  },
  {
    teacherName: "Ahmet Yılmaz",
    companyName: "BlockChain Pro",
    studentName: "Onur Çakır",
    amount: 3500.00,
    month: 6,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Seda Demir",
    companyName: "AutoTech Systems",
    studentName: "Gizem Polat",
    amount: 2650.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Esra Tunç",
    companyName: "HealthTech Innovation",
    studentName: "Batuhan Yurt",
    amount: 2950.00,
    month: 5,
    year: 2024,
    status: "APPROVED"
  },
  {
    teacherName: "Mehmet Kaya",
    companyName: "FinTech Turkey",
    studentName: "Nisa Bal",
    amount: 3250.00,
    month: 6,
    year: 2024,
    status: "PENDING"
  },
  {
    teacherName: "Fatma Öz",
    companyName: "EduTech Platform",
    studentName: "Arda Çiftçi",
    amount: 2800.00,
    month: 5,
    year: 2024,
    status: "APPROVED"
  }
]

async function seedDekontlar() {
  console.log('🌱 Dekont seed verisi oluşturuluyor...')

  try {
    // Önce alan oluştur (eğer yoksa)
    const alan = await prisma.alan.upsert({
      where: { name: 'Bilişim Teknolojileri' },
      update: {},
      create: {
        name: 'Bilişim Teknolojileri',
        description: 'Bilişim Teknolojileri Alanı',
        active: true
      }
    })

    console.log('✅ Alan oluşturuldu/güncellendi:', alan.name)

    // Eğitim yılı oluştur
    const egitimYili = await prisma.egitimYili.upsert({
      where: { year: '2024-2025' },
      update: {},
      create: {
        year: '2024-2025',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        active: true
      }
    })

    console.log('✅ Eğitim yılı oluşturuldu:', egitimYili.year)

    // Benzersiz öğretmenler listesi
    const teacherNames = [...new Set(dekontSeedData.map(d => d.teacherName))]
    const teachers = []

    for (const teacherName of teacherNames) {
      const [name, surname] = teacherName.split(' ')
      
      // User oluştur
      const user = await prisma.user.create({
        data: {
          email: `${name.toLowerCase()}.${surname.toLowerCase()}@okul.edu.tr`,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
          role: 'TEACHER'
        }
      })

      // Öğretmen profili oluştur
      const teacher = await prisma.teacherProfile.create({
        data: {
          name,
          surname,
          email: user.email,
          phone: `+90 5${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          pin: Math.floor(1000 + Math.random() * 9000).toString(),
          userId: user.id,
          alanId: alan.id,
          active: true
        }
      })

      teachers.push({ name: teacherName, data: teacher })
      console.log(`✅ Öğretmen oluşturuldu: ${teacherName}`)
    }

    // Benzersiz şirketler listesi
    const companyNames = [...new Set(dekontSeedData.map(d => d.companyName))]
    const companies = []

    for (const companyName of companyNames) {
      // User oluştur
      const user = await prisma.user.create({
        data: {
          email: `info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
          role: 'COMPANY'
        }
      })

      // Şirket profili oluştur
      const company = await prisma.companyProfile.create({
        data: {
          name: companyName,
          contact: 'İnsan Kaynakları',
          phone: `+90 2${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          email: user.email,
          address: 'İstanbul, Türkiye',
          pin: Math.floor(1000 + Math.random() * 9000).toString(),
          userId: user.id,
          teacherId: teachers[Math.floor(Math.random() * teachers.length)].data.id,
          teacherAssignedAt: new Date()
        }
      })

      companies.push({ name: companyName, data: company })
      console.log(`✅ Şirket oluşturuldu: ${companyName}`)
    }

    // Benzersiz öğrenci isimleri
    const studentNames = [...new Set(dekontSeedData.map(d => d.studentName))]
    const students = []

    for (const studentName of studentNames) {
      const [name, surname] = studentName.split(' ')
      
      const student = await prisma.student.create({
        data: {
          name,
          surname,
          className: `BT${Math.floor(Math.random() * 4) + 1}A`,
          number: Math.floor(100 + Math.random() * 900).toString(),
          tcNo: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          phone: `+90 5${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          alanId: alan.id
        }
      })

      students.push({ name: studentName, data: student })
      console.log(`✅ Öğrenci oluşturuldu: ${studentName}`)
    }

    // Dekont verilerini oluştur
    let createdCount = 0
    
    for (const dekontData of dekontSeedData) {
      const teacher = teachers.find(t => t.name === dekontData.teacherName)?.data
      const company = companies.find(c => c.name === dekontData.companyName)?.data
      const student = students.find(s => s.name === dekontData.studentName)?.data

      if (!teacher || !company || !student) {
        console.log(`❌ Eksik veri için atlanıyor: ${dekontData.studentName}`)
        continue
      }

      // Önce staj kaydı oluştur
      const staj = await prisma.staj.create({
        data: {
          studentId: student.id,
          companyId: company.id,
          teacherId: teacher.id,
          educationYearId: egitimYili.id,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-06-30'),
          status: 'ACTIVE'
        }
      })

      // Dekont oluştur
      const dekont = await prisma.dekont.create({
        data: {
          stajId: staj.id,
          companyId: company.id,
          teacherId: teacher.id,
          studentId: student.id,
          amount: dekontData.amount,
          paymentDate: new Date(`2024-${dekontData.month.toString().padStart(2, '0')}-15`),
          month: dekontData.month,
          year: dekontData.year,
          status: dekontData.status,
          ...(dekontData.status === 'REJECTED' && {
            rejectReason: dekontData.rejectReason,
            rejectedAt: new Date(),
            rejectedBy: 'admin'
          }),
          ...(dekontData.status === 'APPROVED' && {
            approvedAt: new Date(),
            approvedBy: 'admin'
          })
        }
      })

      createdCount++
      console.log(`✅ Dekont oluşturuldu: ${student.name} ${student.surname} - ${company.name} (${dekont.status})`)
    }

    console.log(`\n🎉 Toplam ${createdCount} dekont başarıyla oluşturuldu!`)
    console.log(`📊 Öğretmen sayısı: ${teachers.length}`)
    console.log(`📊 Şirket sayısı: ${companies.length}`)
    console.log(`📊 Öğrenci sayısı: ${students.length}`)

  } catch (error) {
    console.error('❌ Seed işleminde hata:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Script çalıştır
seedDekontlar()
  .catch((error) => {
    console.error('❌ Seed hatası:', error)
    process.exit(1)
  })