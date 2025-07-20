const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingHistory() {
  try {
    console.log('🔧 Eksik history kayıtları düzeltiliyor...');
    
    // Get system user ID
    const systemUser = await prisma.user.findUnique({
      where: { email: 'system@okul-dekont.local' }
    });
    
    if (!systemUser) {
      console.log('❌ System user bulunamadı');
      return;
    }
    
    console.log('✅ System user ID:', systemUser.id);
    
    // Get all internships without history records
    const internshipsWithoutHistory = await prisma.staj.findMany({
      where: {
        history: {
          none: {}
        }
      },
      include: {
        student: true,
        company: true,
        teacher: true,
        educationYear: true
      }
    });
    
    console.log(`📋 ${internshipsWithoutHistory.length} adet staj için history kaydı eksik`);
    
    let createdCount = 0;
    
    // Create history records for each internship
    for (const internship of internshipsWithoutHistory) {
      try {
        // Create CREATED history record
        await prisma.internshipHistory.create({
          data: {
            internshipId: internship.id,
            action: 'CREATED',
            newData: {
              studentId: internship.studentId,
              companyId: internship.companyId,
              teacherId: internship.teacherId,
              educationYearId: internship.educationYearId,
              startDate: internship.startDate,
              endDate: internship.endDate,
              status: internship.status
            },
            performedBy: systemUser.id,
            reason: 'Geriye dönük kayıt oluşturma',
            notes: 'Sistem geliştirmesi sırasında otomatik oluşturuldu',
            performedAt: internship.createdAt // Use original creation date
          }
        });
        
        // If terminated, create TERMINATED history record too
        if (internship.status === 'TERMINATED' && internship.terminationDate) {
          await prisma.internshipHistory.create({
            data: {
              internshipId: internship.id,
              action: 'TERMINATED',
              previousData: {
                status: 'ACTIVE'
              },
              newData: {
                status: 'TERMINATED',
                terminationDate: internship.terminationDate,
                terminationReason: internship.terminationReason
              },
              performedBy: systemUser.id,
              reason: internship.terminationReason || 'Staj fesih edildi',
              notes: internship.terminationNotes || 'Geriye dönük fesih kaydı',
              performedAt: internship.terminationDate
            }
          });
        }
        
        createdCount++;
        console.log(`✅ ${internship.student.name} ${internship.student.surname} - ${internship.company.name} için history kaydı oluşturuldu`);
        
      } catch (error) {
        console.log(`❌ ${internship.student.name} ${internship.student.surname} için hata:`, error.message);
      }
    }
    
    console.log(`\n🎉 Toplam ${createdCount} staj için history kayıtları oluşturuldu!`);
    
    // Test Abdullah Demir specifically
    const abdullah = await prisma.student.findFirst({
      where: {
        name: 'Abdullah',
        surname: 'Demir'
      }
    });
    
    if (abdullah) {
      const abdullahHistory = await prisma.internshipHistory.findMany({
        where: {
          internship: {
            studentId: abdullah.id
          }
        },
        include: {
          internship: {
            include: {
              company: true
            }
          }
        }
      });
      
      console.log(`\n👤 Abdullah Demir'in şu anda ${abdullahHistory.length} adet history kaydı var:`);
      abdullahHistory.forEach((record, index) => {
        console.log(`${index + 1}. ${record.action} - ${record.internship.company.name} - ${record.performedAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ History düzeltme hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingHistory();