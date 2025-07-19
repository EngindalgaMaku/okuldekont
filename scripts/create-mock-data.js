const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createMockData() {
  console.log('🚀 Creating mock data...')

  try {
    // 1. Create Admin Users
    console.log('📝 Creating admin users...')
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@okul.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
        adminProfile: {
          create: {
            name: 'Admin User',
            email: 'admin@okul.com',
            role: 'ADMIN'
          }
        }
      }
    })

    // 2. Create Education Years
    console.log('📚 Creating education years...')
    const currentYear = new Date().getFullYear()
    const educationYear = await prisma.egitimYili.create({
      data: {
        year: `${currentYear}-${currentYear + 1}`,
        active: true
      }
    })

    // 3. Create Fields (Alan)
    console.log('🏢 Creating fields...')
    const fields = await Promise.all([
      prisma.alan.create({
        data: {
          name: 'Bilgisayar Programcılığı',
          description: 'Bilgisayar programlama alanı',
          active: true
        }
      }),
      prisma.alan.create({
        data: {
          name: 'Muhasebe ve Vergi Uygulamaları',
          description: 'Muhasebe ve vergi alanı',
          active: true
        }
      }),
      prisma.alan.create({
        data: {
          name: 'Büro Yönetimi ve Sekreterlik',
          description: 'Büro yönetimi alanı',
          active: true
        }
      })
    ])

    // 4. Create Classes
    console.log('🎓 Creating classes...')
    const classes = await Promise.all([
      prisma.class.create({
        data: {
          name: '12-A',
          alanId: fields[0].id
        }
      }),
      prisma.class.create({
        data: {
          name: '12-B',
          alanId: fields[1].id
        }
      }),
      prisma.class.create({
        data: {
          name: '12-C',
          alanId: fields[2].id
        }
      })
    ])

    // 5. Create Teachers
    console.log('👨‍🏫 Creating teachers...')
    const teachers = []
    for (let i = 0; i < 3; i++) {
      const teacherUser = await prisma.user.create({
        data: {
          email: `teacher${i + 1}@okul.com`,
          password: await bcrypt.hash('teacher123', 10),
          role: 'TEACHER',
          teacherProfile: {
            create: {
              name: `Öğretmen ${i + 1}`,
              surname: `Soyad ${i + 1}`,
              phone: `555-000-${1000 + i}`,
              email: `teacher${i + 1}@okul.com`,
              pin: `T${1000 + i}`,
              alanId: fields[i].id
            }
          }
        },
        include: {
          teacherProfile: true
        }
      })
      teachers.push(teacherUser.teacherProfile)
    }

    // 6. Create Companies
    console.log('🏭 Creating companies...')
    const companies = []
    const companyNames = [
      'Teknoloji A.Ş.',
      'Yazılım Çözümleri Ltd.',
      'Dijital Medya Hizmetleri',
      'Muhasebe Danışmanlık',
      'Finans ve Yatırım A.Ş.',
      'Büro Sistemleri Ltd.'
    ]

    for (let i = 0; i < companyNames.length; i++) {
      const companyUser = await prisma.user.create({
        data: {
          email: `company${i + 1}@firma.com`,
          password: await bcrypt.hash('company123', 10),
          role: 'COMPANY',
          companyProfile: {
            create: {
              name: companyNames[i],
              contact: `İletişim Kişisi ${i + 1}`,
              phone: `555-100-${2000 + i}`,
              email: `company${i + 1}@firma.com`,
              address: `Şirket Adresi ${i + 1}, İstanbul`,
              taxNumber: `1234567890${i}`,
              pin: `C${2000 + i}`,
              teacherId: teachers[i % teachers.length].id
            }
          }
        },
        include: {
          companyProfile: true
        }
      })
      companies.push(companyUser.companyProfile)
    }

    // 7. Create Students
    console.log('👨‍🎓 Creating students...')
    const students = []
    const studentNames = [
      { name: 'Ahmet', surname: 'Yılmaz' },
      { name: 'Mehmet', surname: 'Demir' },
      { name: 'Ayşe', surname: 'Kaya' },
      { name: 'Fatma', surname: 'Şahin' },
      { name: 'Ali', surname: 'Özdemir' },
      { name: 'Zeynep', surname: 'Arslan' },
      { name: 'Mustafa', surname: 'Doğan' },
      { name: 'Elif', surname: 'Koç' },
      { name: 'Emre', surname: 'Güler' },
      { name: 'Seda', surname: 'Avcı' }
    ]

    for (let i = 0; i < studentNames.length; i++) {
      const student = await prisma.student.create({
        data: {
          name: studentNames[i].name,
          surname: studentNames[i].surname,
          className: classes[i % classes.length].name,
          number: `${1000 + i}`,
          tcNo: `1234567890${i}`,
          phone: `555-200-${3000 + i}`,
          email: `student${i + 1}@okul.com`,
          parentName: `Veli ${i + 1}`,
          parentPhone: `555-300-${4000 + i}`,
          alanId: fields[i % fields.length].id,
          companyId: companies[i % companies.length].id,
          classId: classes[i % classes.length].id
        }
      })
      students.push(student)
    }

    // 8. Create Internships (Staj)
    console.log('💼 Creating internships...')
    const internships = []
    for (let i = 0; i < students.length; i++) {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 2) // Start 2 months ago
      
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 4) // End 4 months from now
      
      const internship = await prisma.staj.create({
        data: {
          studentId: students[i].id,
          companyId: companies[i % companies.length].id,
          teacherId: teachers[i % teachers.length].id,
          educationYearId: educationYear.id,
          startDate: startDate,
          endDate: endDate,
          status: 'ACTIVE'
        }
      })
      internships.push(internship)
    }

    // 9. Create Dekontlar (Payment Receipts)
    console.log('💰 Creating dekontlar...')
    for (let i = 0; i < internships.length; i++) {
      const internship = internships[i]
      
      // Create 2-3 dekontlar for each internship
      for (let j = 0; j < 2 + (i % 2); j++) {
        const paymentDate = new Date()
        paymentDate.setMonth(paymentDate.getMonth() - j)
        
        await prisma.dekont.create({
          data: {
            stajId: internship.id,
            companyId: internship.companyId,
            teacherId: internship.teacherId,
            studentId: internship.studentId,
            amount: 1500 + (j * 200), // Varying amounts
            paymentDate: paymentDate,
            month: paymentDate.getMonth() + 1,
            year: paymentDate.getFullYear(),
            status: j === 0 ? 'APPROVED' : 'PENDING',
            approvedBy: j === 0 ? adminUser.id : null,
            approvedAt: j === 0 ? new Date() : null
          }
        })
      }
    }

    console.log('✅ Mock data created successfully!')
    console.log('📊 Summary:')
    console.log(`- Admin Users: 1`)
    console.log(`- Education Years: 1`)
    console.log(`- Fields: ${fields.length}`)
    console.log(`- Classes: ${classes.length}`)
    console.log(`- Teachers: ${teachers.length}`)
    console.log(`- Companies: ${companies.length}`)
    console.log(`- Students: ${students.length}`)
    console.log(`- Internships: ${internships.length}`)
    console.log(`- Dekontlar: ${internships.length * 2.5} (approx)`)
    
    console.log('\n🔑 Login credentials:')
    console.log('Admin: admin@okul.com / admin123')
    console.log('Teacher: teacher1@okul.com / teacher123')
    console.log('Company: company1@firma.com / company123')

  } catch (error) {
    console.error('❌ Error creating mock data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createMockData()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })