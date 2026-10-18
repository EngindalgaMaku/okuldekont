#!/usr/bin/env node

/**
 * =================================================================
 * MEVCUT SİSTEMİ KURULU OLARAK İŞARETLE
 * =================================================================
 * Çalışan bir sistemi installation tablosunda 'installed' olarak işaretler
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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
    log('blue', '='.repeat(80));
    log('blue', '    MEVCUT SİSTEMİ KURULU OLARAK İŞARETLE');
    log('blue', '='.repeat(80));

    // Environment variables kontrol
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    // Supabase client oluştur
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        log('yellow', '🔍 Mevcut kurulum durumunu kontrol ediliyor...');
        
        // Önce installation tablosunun var olup olmadığını kontrol et
        const { data: tableExists, error: tableError } = await supabase
            .from('system_installation')
            .select('count')
            .limit(1);

        if (tableError && tableError.code === '42P01') {
            log('red', '❌ system_installation tablosu bulunamadı!');
            log('yellow', '💡 Önce scripts/create-installation-system.js çalıştırılmalı');
            process.exit(1);
        }

        // Mevcut kurulum kaydını kontrol et
        const { data: existingInstallation, error: checkError } = await supabase
            .from('system_installation')
            .select('*')
            .eq('installation_status', 'installed')
            .limit(1);

        if (checkError) {
            log('red', `❌ Kurulum kontrolü hatası: ${checkError.message}`);
            process.exit(1);
        }

        if (existingInstallation && existingInstallation.length > 0) {
            log('green', '✅ Sistem zaten kurulu olarak işaretli!');
            log('cyan', `📋 Kurulum Bilgileri:`);
            log('cyan', `  - Kurulum ID: ${existingInstallation[0].id}`);
            log('cyan', `  - Kurulum Tarihi: ${new Date(existingInstallation[0].installation_date).toLocaleString('tr-TR')}`);
            log('cyan', `  - Environment: ${existingInstallation[0].environment_type}`);
            return;
        }

        log('yellow', '🔧 Sistem kurulu olarak işaretleniyor...');

        // Admin kullanıcı sayısını kontrol et
        const { data: adminUsers, error: adminError } = await supabase
            .from('admin_kullanicilar')
            .select('id')
            .limit(1);

        if (adminError) {
            log('red', `❌ Admin kullanıcıları kontrol edilemedi: ${adminError.message}`);
            process.exit(1);
        }

        if (!adminUsers || adminUsers.length === 0) {
            log('red', '❌ Hiç admin kullanıcısı bulunamadı! Sistem düzgün kurulu değil.');
            process.exit(1);
        }

        const adminUserId = adminUsers[0].id;

        // Sistem kurulum kaydı oluştur
        const installationId = crypto.randomUUID();
        const { data: insertResult, error: insertError } = await supabase
            .from('system_installation')
            .insert({
                id: installationId,
                installation_status: 'installed',
                installation_date: new Date().toISOString(),
                installation_version: '1.0.0',
                environment_type: 'production',
                hostname: 'existing-system',
                installation_method: 'manual_marking',
                admin_user_id: adminUserId,
                installation_notes: 'Existing system marked as installed',
                installation_config: {
                    source: 'manual_marking',
                    marked_at: new Date().toISOString(),
                    marked_by: 'system_admin'
                }
            });

        if (insertError) {
            log('red', `❌ Kurulum kaydı oluşturulamadı: ${insertError.message}`);
            process.exit(1);
        }

        log('green', '✅ Sistem başarıyla kurulu olarak işaretlendi!');
        log('cyan', `📋 Yeni Kurulum Bilgileri:`);
        log('cyan', `  - Kurulum ID: ${installationId}`);
        log('cyan', `  - Admin User ID: ${adminUserId}`);
        log('cyan', `  - Environment: production`);
        log('cyan', `  - Kurulum Tarihi: ${new Date().toLocaleString('tr-TR')}`);

        // Son kontrol
        log('yellow', '\n🔍 Kurulum durumu yeniden kontrol ediliyor...');
        const { data: finalCheck, error: finalError } = await supabase.rpc('check_installation_status');

        if (finalError) {
            log('red', `❌ Final kontrol hatası: ${finalError.message}`);
        } else {
            log('green', '✅ Final kontrol başarılı!');
            log('cyan', `📋 Final Durum:`);
            log('cyan', `  - Kurulu: ${finalCheck.is_installed ? 'EVET' : 'HAYIR'}`);
            log('cyan', `  - Sistem Hazır: ${finalCheck.system_ready ? 'EVET' : 'HAYIR'}`);
            log('cyan', `  - Tablo Sayısı: ${finalCheck.table_count}`);
            log('cyan', `  - Admin Sayısı: ${finalCheck.admin_count}`);
        }

        log('green', '\n🎉 İŞLEM TAMAMLANDI!');
        log('blue', '🔄 Artık sisteme normal şekilde giriş yapabilirsiniz.');

    } catch (error) {
        log('red', `❌ Beklenmeyen hata: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };