#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminRole() {
    try {
        console.log('🔍 admin@ozdilek kullanıcısının yetki analizi...\n');
        
        // User tablosundan kullanıcıyı bul
        const user = await prisma.user.findUnique({
            where: { email: 'admin@ozdilek' }
        });
        
        if (!user) {
            console.log('❌ admin@ozdilek kullanıcısı bulunamadı!');
            return;
        }
        
        console.log(`👤 Kullanıcı: ${user.email}`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`🏷️ Role: ${user.role}`);
        console.log(`🗓️ Oluşturulma: ${user.createdAt}`);
        
        // Admin profile'ı kontrol et
        const adminProfile = await prisma.adminProfile.findUnique({
            where: { userId: user.id }
        });
        
        if (adminProfile) {
            console.log('\n🛡️ Admin Profili:');
            console.log(`  📋 Ad Soyad: ${adminProfile.firstName} ${adminProfile.lastName}`);
            console.log(`  🎯 Rol: ${adminProfile.role}`);
            console.log(`  ⚡ Durum: ${adminProfile.status}`);
            console.log(`  🔑 Yetkiler: ${adminProfile.permissions}`);
        } else {
            console.log('\n❌ Admin profili bulunamadı!');
        }
        
        // Tüm admin profilleri listele
        const allAdmins = await prisma.adminProfile.findMany({
            include: {
                user: true
            }
        });
        
        console.log(`\n📊 Toplam Admin Sayısı: ${allAdmins.length}`);
        allAdmins.forEach((admin, index) => {
            console.log(`  ${index + 1}. ${admin.user.email} - ${admin.role} (${admin.status})`);
        });
        
    } catch (error) {
        console.error('❌ Admin analizi hatası:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminRole().catch(console.error);