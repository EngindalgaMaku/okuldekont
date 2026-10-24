#!/usr/bin/env node

/**
 * =================================================================
 * PIN API DOĞRUDAN TEST
 * =================================================================
 * localhost:3000/api/auth/check-pin endpoint'ini test eder
 * =================================================================
 */

const http = require('http');

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

function makeRequest(postData) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(postData);
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/check-pin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function testPinAPI() {
    try {
        log('blue', '='.repeat(80));
        log('blue', '    PIN API DOĞRUDAN TEST');
        log('blue', '='.repeat(80));

        // Test verileri
        const testCases = [
            {
                name: 'Doğru PIN ile test',
                data: {
                    type: 'ogretmen',
                    entityId: 'cmd57qqgb000eqvb03ms6apxi', // Öğretmen 1 Soyad 1
                    pin: '1234'
                },
                expected: 'SUCCESS'
            },
            {
                name: 'Yanlış PIN ile test',
                data: {
                    type: 'ogretmen',
                    entityId: 'cmd57qqgb000eqvb03ms6apxi', // Öğretmen 1 Soyad 1
                    pin: '0000'
                },
                expected: 'FAIL'
            },
            {
                name: 'Yanlış ID ile test',
                data: {
                    type: 'ogretmen',
                    entityId: 'wrong-id',
                    pin: '1234'
                },
                expected: 'FAIL'
            }
        ];

        log('yellow', '🔍 API endpoint testleri yapılıyor...');
        log('cyan', '   URL: http://localhost:3000/api/auth/check-pin');
        console.log();

        for (const testCase of testCases) {
            log('yellow', `🔍 ${testCase.name}...`);
            log('cyan', `   Test verileri: ${JSON.stringify(testCase.data)}`);
            
            try {
                const result = await makeRequest(testCase.data);
                
                log('cyan', `   Status Code: ${result.statusCode}`);
                log('cyan', `   Response: ${JSON.stringify(result.data)}`);
                
                if (result.statusCode === 200 && testCase.expected === 'SUCCESS') {
                    log('green', '   ✅ TEST BAŞARILI');
                } else if (result.statusCode !== 200 && testCase.expected === 'FAIL') {
                    log('green', '   ✅ TEST BAŞARILI (beklenen hata)');
                } else {
                    log('red', '   ❌ TEST BAŞARISIZ');
                }
                
            } catch (error) {
                log('red', `   ❌ REQUEST HATASI: ${error.message}`);
                if (error.code === 'ECONNREFUSED') {
                    log('yellow', '   ⚠️  Sunucu çalışmıyor olabilir. npm run dev çalıştırın.');
                }
            }
            
            console.log();
        }

        log('green', '🎉 PIN API TEST TAMAMLANDI!');

    } catch (error) {
        log('red', `❌ Genel hata: ${error.message}`);
        console.error(error);
    }
}

// Kısa bir süre bekleyip test et
log('yellow', '⏳ Sunucunun başlaması için 3 saniye bekleniyor...');
setTimeout(() => {
    testPinAPI();
}, 3000);