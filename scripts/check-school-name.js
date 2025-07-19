const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchoolName() {
  try {
    const schoolSetting = await prisma.systemSetting.findUnique({
      where: { key: 'school_name' }
    });
    console.log('School name setting:', schoolSetting);
    
    const okulAdiSetting = await prisma.systemSetting.findUnique({
      where: { key: 'okul_adi' }
    });
    console.log('Okul adı setting:', okulAdiSetting);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkSchoolName();