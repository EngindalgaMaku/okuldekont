// This script will add barcodes to existing GorevBelgesi records
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateBarcode = () => {
  const prefix = 'GB'; // GorevBelgesi prefix
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

async function updateExistingBarcodes() {
  try {
    console.log('🔍 Barkod alanı olmayan belgeleri buluyorum...');
    
    // Find all records without barcodes
    const belgelerWithoutBarcode = await prisma.gorevBelgesi.findMany({
      where: {
        OR: [
          { barcode: null },
          { barcode: '' }
        ]
      }
    });

    console.log(`📦 ${belgelerWithoutBarcode.length} belge için barkod oluşturulacak`);

    // Update each record with a new barcode
    for (const belge of belgelerWithoutBarcode) {
      const newBarcode = generateBarcode();
      
      await prisma.gorevBelgesi.update({
        where: { id: belge.id },
        data: { barcode: newBarcode }
      });
      
      console.log(`✅ ${belge.id} -> ${newBarcode}`);
    }

    console.log('🎉 Tüm belgeler için barkod oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingBarcodes();