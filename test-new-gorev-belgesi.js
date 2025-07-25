const fetch = require('node-fetch');

async function createTestGorevBelgesi() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/gorev-belgeleri', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ogretmenId: 'cmd1j3j9',  // Ahmet Başaran
                hafta: '2025-W04',
                isletmeIdler: ['cmd1hpe1']  // QualityFood Systems
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Yeni görev belgesi oluşturuldu:', result);
            console.log('📦 Barkod:', result.barcode);
        } else {
            const error = await response.text();
            console.log('❌ Hata:', response.status, error);
        }
    } catch (error) {
        console.error('❌ İstek hatası:', error.message);
    }
}

createTestGorevBelgesi();