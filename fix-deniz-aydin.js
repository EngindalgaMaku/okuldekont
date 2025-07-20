const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDenizAydin() {
  try {
    // Find Bilişim Teknolojileri area
    const bilisimAlani = await prisma.alan.findFirst({
      where: {
        name: 'Bilişim Teknolojileri'
      }
    });
    
    if (!bilisimAlani) {
      console.log('Bilişim Teknolojileri alanı bulunamadı!');
      return;
    }
    
    // Update Deniz Aydın's area
    const result = await prisma.teacher.updateMany({
      where: {
        name: 'Deniz',
        surname: 'Aydın'
      },
      data: {
        alanId: bilisimAlani.id
      }
    });
    
    console.log(`Deniz Aydın güncellendi. Etkilenen kayıt sayısı: ${result.count}`);
    
    // Verify the update
    const updatedTeacher = await prisma.teacher.findFirst({
      where: {
        name: 'Deniz',
        surname: 'Aydın'
      },
      include: {
        alan: true
      }
    });
    
    console.log('Güncellenmiş Deniz Aydın:', JSON.stringify(updatedTeacher, null, 2));
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDenizAydin();