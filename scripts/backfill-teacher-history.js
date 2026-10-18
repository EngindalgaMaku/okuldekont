const { PrismaClient } = require('@prisma/client');

async function backfillTeacherHistory() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting teacher history backfill...');
    
    // Get all terminated internships that have teacher assignments
    const terminatedInternships = await prisma.staj.findMany({
      where: {
        status: 'TERMINATED',
        teacherId: { not: null }
      },
      include: {
        student: true,
        company: true,
        teacher: true
      },
      orderBy: {
        terminationDate: 'desc'
      }
    });
    
    console.log(`Found ${terminatedInternships.length} terminated internships with teachers`);
    
    let created = 0;
    let skipped = 0;
    
    for (const internship of terminatedInternships) {
      try {
        // Check if teacher history record already exists
        const existingRecord = await prisma.teacherHistory.findFirst({
          where: {
            teacherId: internship.teacherId,
            fieldName: 'internship_assignment',
            validFrom: internship.terminationDate || internship.lastModifiedAt || internship.createdAt
          }
        });
        
        if (existingRecord) {
          console.log(`Skipping existing record for teacher ${internship.teacher.name} ${internship.teacher.surname}`);
          skipped++;
          continue;
        }
        
        // Create teacher history record for termination
        await prisma.teacherHistory.create({
          data: {
            teacherId: internship.teacherId,
            changeType: 'OTHER_UPDATE',
            fieldName: 'internship_assignment',
            previousValue: JSON.stringify({
              action: 'ACTIVE_INTERNSHIP',
              studentName: `${internship.student.name} ${internship.student.surname}`,
              companyName: internship.company.name,
              startDate: internship.startDate
            }),
            newValue: JSON.stringify({
              action: 'TERMINATED_INTERNSHIP',
              terminationDate: internship.terminationDate,
              reason: internship.terminationReason || 'Fesih edildi'
            }),
            validFrom: internship.terminationDate || internship.lastModifiedAt || internship.createdAt,
            changedBy: internship.terminatedBy || internship.lastModifiedBy || 'system',
            reason: `Staj fesih edildi: ${internship.terminationReason || 'Sebep belirtilmemiş'}`,
            notes: `${internship.student.name} ${internship.student.surname} - ${internship.company.name} stajı fesih edildi (Backfill)`
          }
        });
        
        console.log(`Created history record for ${internship.teacher.name} ${internship.teacher.surname} - ${internship.student.name} ${internship.student.surname}`);
        created++;
        
      } catch (error) {
        console.error(`Error processing internship ${internship.id}:`, error.message);
      }
    }
    
    // Also backfill active internships
    const activeInternships = await prisma.staj.findMany({
      where: {
        status: 'ACTIVE',
        teacherId: { not: null }
      },
      include: {
        student: true,
        company: true,
        teacher: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    console.log(`Found ${activeInternships.length} active internships with teachers`);
    
    for (const internship of activeInternships) {
      try {
        // Check if teacher history record already exists for assignment
        const existingRecord = await prisma.teacherHistory.findFirst({
          where: {
            teacherId: internship.teacherId,
            fieldName: 'internship_assignment',
            validFrom: internship.createdAt
          }
        });
        
        if (existingRecord) {
          console.log(`Skipping existing assignment record for teacher ${internship.teacher.name} ${internship.teacher.surname}`);
          skipped++;
          continue;
        }
        
        // Create teacher history record for assignment
        await prisma.teacherHistory.create({
          data: {
            teacherId: internship.teacherId,
            changeType: 'OTHER_UPDATE',
            fieldName: 'internship_assignment',
            previousValue: null,
            newValue: JSON.stringify({
              action: 'ASSIGNED_INTERNSHIP',
              studentName: `${internship.student.name} ${internship.student.surname}`,
              companyName: internship.company.name,
              startDate: internship.startDate
            }),
            validFrom: internship.createdAt,
            changedBy: 'system',
            reason: `Staj ataması yapıldı`,
            notes: `${internship.student.name} ${internship.student.surname} - ${internship.company.name} stajı başlatıldı (Backfill)`
          }
        });
        
        console.log(`Created assignment history record for ${internship.teacher.name} ${internship.teacher.surname} - ${internship.student.name} ${internship.student.surname}`);
        created++;
        
      } catch (error) {
        console.error(`Error processing active internship ${internship.id}:`, error.message);
      }
    }
    
    console.log(`\nBackfill completed:`);
    console.log(`- Created: ${created} records`);
    console.log(`- Skipped: ${skipped} records`);
    
    // Verify the specific teacher
    const teacherId = 'cmf2gq0u00005pb0ko9ug220u';
    const teacherRecords = await prisma.teacherHistory.findMany({
      where: { teacherId },
      include: {
        teacher: {
          select: { name: true, surname: true }
        }
      },
      orderBy: { validFrom: 'desc' }
    });
    
    console.log(`\nTeacher ${teacherId} now has ${teacherRecords.length} history records`);
    
  } catch (error) {
    console.error('Backfill error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillTeacherHistory();
