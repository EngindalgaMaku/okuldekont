#!/usr/bin/env node

/**
 * =================================================================
 * PIN DOĞRULAMA API TEST
 * =================================================================
 * PIN doğrulama API'sini test eder
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

async function testPinVerification() {
    try {
        log('blue', '='.repeat(80));
        log('blue', '    PIN DOĞRULAMA API TEST');
        log('blue', '='.repeat(80));

        // Test öğretmenini bul
        log('yellow', '🔍 "Öğretmen 1 Soyad 1" öğretmenini arıyor...');
        
        const teacher = await prisma.teacherProfile.findFirst({
            where: {
                name: 'Öğretmen 1',
                surname: 'Soyad 1'
            },
            select: {
                id: true,
                name: true,
                surname: true,
                pin: true
            }
        });

        if (!teacher) {
            log('red', '❌ Öğretmen bulunamadı!');
            return;
        }

        log('green', `✅ Öğretmen bulundu:`);
        log('cyan', `   ID: ${teacher.id}`);
        log('cyan', `   Ad: ${teacher.name} ${teacher.surname}`);
        log('cyan', `   PIN: "${teacher.pin}"`);
        log('cyan', `   PIN type: ${typeof teacher.pin}`);
        log('cyan', `   PIN length: ${teacher.pin ? teacher.pin.length : 0}`);

        // PIN doğrulama testi
        log('yellow', '\n🔍 PIN doğrulama testi yapılıyor...');
        
        const testPins = ['1234', '0000', '1111', teacher.pin];
        
        for (const testPin of testPins) {
            const isMatch = teacher.pin === testPin;
            const isMatchLoose = teacher.pin == testPin;
            
            if (isMatch) {
                log('green', `✅ PIN "${testPin}" DOĞRU (===)`);
            } else if (isMatchLoose) {
                log('yellow', `⚠️  PIN "${testPin}" DOĞRU (==) ama strict değil`);
            } else {
                log('red', `❌ PIN "${testPin}" YANLIŞ`);
            }
            
            log('cyan', `   Karşılaştırma: "${teacher.pin}" === "${testPin}" = ${isMatch}`);
            log('cyan', `   Karşılaştırma: "${teacher.pin}" == "${testPin}" = ${isMatchLoose}`);
            console.log();
        }

        // API endpoint'i simüle et
        log('yellow', '🔍 API endpoint simüle ediliyor...');
        
        const apiTestData = {
            type: 'ogretmen',
            entityId: teacher.id,
            pin: '1234'
        };

        log('cyan', `   Test verileri: ${JSON.stringify(apiTestData)}`);

        // Manuel doğrulama
        const foundTeacher = await prisma.teacherProfile.findUnique({
            where: { id: apiTestData.entityId },
            select: { id: true, name: true, surname: true, pin: true }
        });

        if (!foundTeacher) {
            log('red', '❌ API Test: Öğretmen bulunamadı');
        } else {
            log('green', '✅ API Test: Öğretmen bulundu');
            
            const pinMatch = foundTeacher.pin === apiTestData.pin;
            if (pinMatch) {
                log('green', '✅ API Test: PIN doğru');
            } else {
                log('red', `❌ API Test: PIN yanlış - DB: "${foundTeacher.pin}" vs Input: "${apiTestData.pin}"`);
            }
        }

        log('green', '\n🎉 PIN TEST TAMAMLANDI!');

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testPinVerification();