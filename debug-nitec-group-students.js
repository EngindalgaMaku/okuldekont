// Debug script to investigate Nitec Group students and their dekonts
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Starting investigation for Nitec Group students...\n');

  // The 3 students mentioned:
  const targetStudents = [
    'Ceylan Gündüz',
    'Talya Çelik',
    'Talin Altay'
  ];

  console.log('📋 Target students:', targetStudents);
  console.log('');

  // 1. Find these students in the database
  console.log('📌 STEP 1: Finding students in database...');
  for (const studentName of targetStudents) {
    const [name, surname] = studentName.split(' ');
    
    const students = await prisma.student.findMany({
      where: {
        name: { contains: name },
        surname: { contains: surname }
      },
      include: {
        alan: true,
        company: true,
        stajlar: {
          include: {
            company: true,
            teacher: true
          }
        }
      }
    });

    console.log(`\n--- Student: ${studentName} ---`);
    console.log(`Found ${students.length} matching records`);
    
    if (students.length > 0) {
      for (const student of students) {
        console.log(`  ID: ${student.id}`);
        console.log(`  Full Name: ${student.name} ${student.surname}`);
        console.log(`  Class: ${student.className}`);
        console.log(`  Number: ${student.number}`);
        console.log(`  Field: ${student.alan?.name || 'N/A'}`);
        console.log(`  Company: ${student.company?.name || 'N/A'}`);
        console.log(`  Internships: ${student.stajlar.length}`);
        
        for (const staj of student.stajlar) {
          console.log(`    - Staj ID: ${staj.id}`);
          console.log(`      Company: ${staj.company?.name}`);
          console.log(`      Teacher: ${staj.teacher ? `${staj.teacher.name} ${staj.teacher.surname}` : 'N/A'}`);
          console.log(`      Status: ${staj.status}`);
          console.log(`      Start: ${staj.startDate}`);
          console.log(`      End: ${staj.endDate}`);
          console.log(`      Termination Date: ${staj.terminationDate || 'N/A'}`);
          console.log(`      Archived: ${staj.archived}`);
        }
      }
    } else {
      console.log('  ❌ NOT FOUND in database');
    }
  }

  console.log('\n\n📌 STEP 2: Finding dekonts for these students...');
  for (const studentName of targetStudents) {
    const [name, surname] = studentName.split(' ');
    
    // Find student IDs first
    const students = await prisma.student.findMany({
      where: {
        name: { contains: name },
        surname: { contains: surname }
      },
      select: { id: true, name: true, surname: true }
    });

    if (students.length > 0) {
      for (const student of students) {
        console.log(`\n--- ${student.name} ${student.surname} (${student.id}) ---`);
        
        // Find all dekonts for this student
        const dekonts = await prisma.dekont.findMany({
          where: {
            studentId: student.id
          },
          include: {
            staj: {
              include: {
                student: true,
                company: true,
                teacher: true
              }
            },
            company: true,
            teacher: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        console.log(`Total dekonts: ${dekonts.length}`);
        
        if (dekonts.length > 0) {
          for (const dekont of dekonts) {
            console.log(`\n  Dekont ID: ${dekont.id}`);
            console.log(`    Month: ${dekont.month}/${dekont.year}`);
            console.log(`    Amount: ${dekont.amount}`);
            console.log(`    Status: ${dekont.status}`);
            console.log(`    Archived: ${dekont.archived}`);
            console.log(`    Created At: ${dekont.createdAt}`);
            console.log(`    File URL: ${dekont.fileUrl}`);
            console.log(`    Staj ID: ${dekont.stajId}`);
            console.log(`    Staj Status: ${dekont.staj?.status}`);
            console.log(`    Company: ${dekont.company?.name}`);
            console.log(`    Teacher: ${dekont.teacher ? `${dekont.teacher.name} ${dekont.teacher.surname}` : 'N/A'}`);
          }
        } else {
          console.log('  ❌ NO DEKONTS FOUND');
        }
      }
    }
  }

  console.log('\n\n📌 STEP 3: Finding Nitec Group company...');
  const companies = await prisma.companyProfile.findMany({
    where: {
      name: { contains: 'Nitec' }
    },
    include: {
      teacher: true,
      students: true
    }
  });

  console.log(`Found ${companies.length} Nitec companies:`);
  for (const company of companies) {
    console.log(`\n  Company ID: ${company.id}`);
    console.log(`  Name: ${company.name}`);
    console.log(`  Contact: ${company.contact}`);
    console.log(`  Teacher: ${company.teacher ? `${company.teacher.name} ${company.teacher.surname}` : 'N/A'}`);
    console.log(`  Students: ${company.students.length}`);
    
    // Find dekonts for this company
    const companyDekonts = await prisma.dekont.findMany({
      where: {
        companyId: company.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`  Total dekonts: ${companyDekonts.length}`);
    
    if (companyDekonts.length > 0) {
      console.log('  Recent dekonts:');
      for (const dekont of companyDekonts.slice(0, 5)) {
        console.log(`    - ${dekont.month}/${dekont.year} - ${dekont.status} - ${dekont.createdAt}`);
      }
    }
  }

  console.log('\n\n📌 STEP 4: Checking for recently uploaded dekonts (last 24 hours)...');
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const recentDekonts = await prisma.dekont.findMany({
    where: {
      createdAt: {
        gte: oneDayAgo
      }
    },
    include: {
      staj: {
        include: {
          student: true,
          company: true
        }
      },
      company: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${recentDekonts.length} dekonts uploaded in the last 24 hours:\n`);
  for (const dekont of recentDekonts) {
    const studentName = dekont.staj?.student 
      ? `${dekont.staj.student.name} ${dekont.staj.student.surname}`
      : 'Unknown';
    const companyName = dekont.company?.name || dekont.staj?.company?.name || 'Unknown';
    
    console.log(`  - ${studentName} @ ${companyName}`);
    console.log(`    Month: ${dekont.month}/${dekont.year}, Status: ${dekont.status}`);
    console.log(`    Staj Status: ${dekont.staj?.status}, Archived: ${dekont.archived}`);
    console.log(`    Created: ${dekont.createdAt}`);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
