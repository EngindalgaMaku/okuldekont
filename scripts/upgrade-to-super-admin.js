#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upgradeToSuperAdmin() {
    try {
        console.log('🔧 admin@ozdilek kullanıcısı SUPER_ADMIN yetkisine yükseltiliyor...\n');
        
        // User tablosunda rolü güncelle
        const updatedUser = await prisma.user.update({
            where: { email: 'admin@ozdilek' },
            data: { role: 'SUPER_ADMIN' }
        });
        
        console.log(`✅ User tablosu güncellendi:`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Yeni Role: ${updatedUser.role}`);
        
        // Admin Profile tablosunda da rolü güncelle
        const updatedAdminProfile = await prisma.adminProfile.updateMany({
            where: { 
                user: { email: 'admin@ozdilek' }
            },
            data: { 
                role: 'SUPER_ADMIN',
                permissions: 'ALL',
                status: 'ACTIVE'
            }
        });
        
        console.log(`✅ Admin Profile güncellendi (${updatedAdminProfile.count} kayıt)`);
        
        // Final kontrol
        const finalUser = await prisma.user.findUnique({
            where: { email: 'admin@ozdilek' },
            include: {
                adminProfile: true
            }
        });
        
        console.log(`\n🎯 Final Durum:`);
        console.log(`   User Role: ${finalUser.role}`);
        console.log(`   Admin Role: ${finalUser.adminProfile?.role}`);
        console.log(`   Permissions: ${finalUser.adminProfile?.permissions}`);
        console.log(`   Status: ${finalUser.adminProfile?.status}`);
        
        console.log(`\n🎉 admin@ozdilek artık SUPER_ADMIN yetkisine sahip!`);
        console.log(`   🔓 Admin Yönetimi erişimi açıldı`);
        console.log(`   🛡️ Tüm sistem yetkilerine sahip`);
        
    } catch (error) {
        console.error('❌ SUPER_ADMIN yükseltme hatası:', error);
    } finally {
        await prisma.$disconnect();
    }
}

upgradeToSuperAdmin().catch(console.error);