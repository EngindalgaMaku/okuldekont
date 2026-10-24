#!/usr/bin/env node

/**
 * =================================================================
 * PRISMA İLE ÖĞRETMEN PIN KONTROL
 * =================================================================
 * MariaDB + Prisma kullanarak öğretmen PIN'lerini kontrol eder
 * =================================================================
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Renk kodları
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    try {
        log('blue', '='.repeat(80));
        log('blue', '    PRISMA İLE ÖĞRETMEN PIN KONTROL');
        log('blue', '='.repeat(80));

        // Öğretmenleri kontrol et
        log('yellow', '🔍 Öğretmenlerin PIN değerlerini kontrol ediliyor...');
        
        const teachers = await prisma.teacherProfile.findMany({
            select: {
                id: true,
                name: true,
                surname: true,
                pin: true,
                email: true,
                phone: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        log('green', `✅ ${teachers.length} öğretmen bulundu`);
        log('cyan', '\n📋 Öğretmen PIN değerleri:');
        
        teachers.forEach((teacher, index) => {
            const pinValue = teacher.pin || 'YOK';
            const pinType = typeof teacher.pin;
            const pinLength = teacher.pin ? teacher.pin.length : 0;
            
            log('cyan', `  ${index + 1}. ${teacher.name} ${teacher.surname}`);
            log('cyan', `     ID: ${teacher.id}`);
            log('cyan', `     PIN: "${pinValue}" (type: ${pinType}, length: ${pinLength})`);
            log('cyan', `     Email: ${teacher.email || 'YOK'}`);
            log('cyan', `     Phone: ${teacher.phone || 'YOK'}`);
            console.log(); // Boş satır
        });

        // PIN karşılaştırma testi
        log('yellow', '\n🔍 PIN karşılaştırma testi yapılıyor...');
        const testPins = ['1234', '2025', '0000', '1111'];
        
        testPins.forEach(testPin => {
            const matchingTeachers = teachers.filter(t => t.pin === testPin);
            if (matchingTeachers.length > 0) {
                log('green', `✅ PIN "${testPin}" ile eşleşen öğretmenler:`);
                matchingTeachers.forEach(teacher => {
                    log('cyan', `    - ${teacher.name} ${teacher.surname}`);
                });
            } else {
                log('red', `❌ PIN "${testPin}" ile eşleşen öğretmen yok`);
            }
        });

        // Benzersiz PIN'leri göster
        log('yellow', '\n🔍 Benzersiz PIN değerleri:');
        const uniquePins = [...new Set(teachers.map(t => t.pin))];
        uniquePins.forEach(pin => {
            const count = teachers.filter(t => t.pin === pin).length;
            log('cyan', `  PIN "${pin}": ${count} öğretmen`);
        });

        log('green', '\n🎉 PRISMA PIN KONTROL TAMAMLANDI!');
        log('blue', '\n💡 ÇÖZÜM:');
        log('blue', '1. Mevcut öğretmenlerden birini seçin');
        log('blue', '2. O öğretmenin PIN\'ini kullanın');
        log('blue', '3. Eğer hiç PIN yoksa, admin panelinden PIN atayın');

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();