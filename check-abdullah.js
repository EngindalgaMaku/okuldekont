const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAbdullah() {
  try {
    console.log('🔍 Abdullah Demir kontrolü...');
    
    // Check if Abdullah exists in students table
    const abdullah = await prisma.student.findFirst({
      where: {
        name: 'Abdullah',
        surname: 'Demir'
      },
      include: {
        alan: true,
        company: true
      }
    });
    
    if (!abdullah) {
      console.log('❌ Abdullah Demir öğrenci tablosunda bulunamadı');
      
      // Let's check all students with Abdullah name
      const abdullahs = await prisma.student.findMany({
        where: {
          name: {
            contains: 'Abdullah'
          }
        }
      });
      
      console.log(`📋 Abdullah içeren ${abdullahs.length} öğrenci var:`);
      abdullahs.forEach(student => {
        console.log(`- ${student.name} ${student.surname} (${student.className})`);
      });
      
      return;
    }
    
    console.log('✅ Abdullah Demir bulundu:', {
      id: abdullah.id,
      name: abdullah.name,
      surname: abdullah.surname,
      className: abdullah.className,
      number: abdullah.number,
      companyId: abdullah.companyId,
      company: abdullah.company?.name,
      alan: abdullah.alan?.name
    });
    
    // Check internships
    const internships = await prisma.staj.findMany({
      where: {
        studentId: abdullah.id
      },
      include: {
        company: true,
        teacher: true
      }
    });
    
    console.log(`\n📋 Abdullah'ın ${internships.length} adet staj kaydı var:`);
    internships.forEach((internship, index) => {
      console.log(`${index + 1}. ${internship.company?.name} - ${internship.status} - ${internship.createdAt}`);
    });
    
    if (internships.length === 0) {
      console.log('\n⚠️ Abdullah Demir\'in hiç staj kaydı yok!');
      console.log('Bu yüzden history modal\'ında "Henüz kayıt bulunamadı" görünüyor.');
      
      // Let's create a test internship
      console.log('\n🔧 Test için staj kaydı oluşturalım...');
      
      // Get an active education year
      const educationYear = await prisma.egitimYili.findFirst({
        where: { active: true }
      });
      
      if (!educationYear) {
        console.log('❌ Aktif eğitim yılı bulunamadı');
        return;
      }
      
      // Get a company
      const company = await prisma.companyProfile.findFirst();
      
      if (!company) {
        console.log('❌ Hiç şirket bulunamadı');
        return;
      }
      
      // Get a teacher
      const teacher = await prisma.teacherProfile.findFirst({
        where: { active: true }
      });
      
      console.log('📝 Test staj kaydı oluşturuluyor:', {
        student: `${abdullah.name} ${abdullah.surname}`,
        company: company.name,
        teacher: teacher ? `${teacher.name} ${teacher.surname}` : 'Yok',
        educationYear: educationYear.year
      });
      
      // Create internship with history
      const newInternship = await prisma.staj.create({
        data: {
          studentId: abdullah.id,
          companyId: company.id,
          teacherId: teacher?.id || null,
          educationYearId: educationYear.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months later
          status: 'ACTIVE'
        }
      });
      
      // Create history record
      const systemUser = await prisma.user.findUnique({
        where: { email: 'system@okul-dekont.local' }
      });
      
      await prisma.internshipHistory.create({
        data: {
          internshipId: newInternship.id,
          action: 'CREATED',
          newData: {
            studentId: abdullah.id,
            companyId: company.id,
            teacherId: teacher?.id || null,
            status: 'ACTIVE'
          },
          performedBy: systemUser.id,
          reason: 'Test için oluşturuldu',
          notes: 'Debug amaçlı test kaydı'
        }
      });
      
      console.log('✅ Test staj kaydı ve history kaydı oluşturuldu!');
      console.log('Şimdi frontend\'de history modal\'ını test edebilirsiniz.');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAbdullah();