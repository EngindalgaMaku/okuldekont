const { prisma } = require('./src/lib/prisma.ts');

async function checkEsraTunc() {
  try {
    console.log('🔍 Esra Tunç için veritabanı kontrolü başlatılıyor...\n');
    
    // Esra Tunç'u bul
    const esra = await prisma.ogrenciler.findFirst({
      where: {
        ad: 'Esra',
        soyad: 'Tunç'
      },
      include: {
        alanlar: true,
        stajlar: {
          include: {
            isletmeler: true
          }
        }
      }
    });

    if (!esra) {
      console.log('❌ Esra Tunç bulunamadı!');
      return;
    }

    console.log('👤 Esra Tunç Bilgileri:');
    console.log('ID:', esra.id);
    console.log('Ad Soyad:', esra.ad, esra.soyad);
    console.log('Sınıf:', esra.sinif);
    console.log('No:', esra.no);
    console.log('Alan ID:', esra.alan_id);
    console.log('\n📚 Alan Bilgisi:');
    
    if (esra.alanlar) {
      console.log('✅ Alan adı:', esra.alanlar.ad);
      console.log('Alan açıklaması:', esra.alanlar.aciklama);
    } else {
      console.log('❌ Alan bilgisi bulunamadı!');
      
      // Tüm alanları listeleyelim
      console.log('\n📋 Sistemdeki tüm alanlar:');
      const alanlar = await prisma.alanlar.findMany();
      alanlar.forEach(alan => {
        console.log(`- ID: ${alan.id}, Ad: ${alan.ad}`);
      });
    }

    console.log('\n🏢 Staj Bilgileri:');
    if (esra.stajlar && esra.stajlar.length > 0) {
      esra.stajlar.forEach(staj => {
        console.log(`- İşletme: ${staj.isletmeler.ad}`);
        console.log(`- Başlangıç: ${staj.baslangic_tarihi}`);
        console.log(`- Durum: ${staj.durum}`);
      });
    } else {
      console.log('❌ Staj kaydı bulunamadı!');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEsraTunc();